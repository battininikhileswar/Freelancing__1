import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Map, Filter, RefreshCw, Layers } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

// Dynamically load Leaflet and Leaflet Heat plugin
let L = null;

async function loadLeafletWithHeat() {
  if (L && L.heatLayer) return L;
  
  // 1. Import base Leaflet
  L = await import('leaflet');
  
  // Fix standard default icon
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  // 2. Inject Leaflet Heat plugin script from CDN dynamically
  if (!L.heatLayer) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
      script.onload = () => {
        console.log('✅ Leaflet.heat plugin loaded successfully.');
        resolve();
      };
      script.onerror = () => {
        console.error('❌ Failed to load Leaflet.heat script.');
        reject(new Error('Leaflet Heat plugin failed to load'));
      };
      document.head.appendChild(script);
    });
  }

  return L;
}

const CATEGORIES_MAPPING = {
  crime: { label: '🚨 Crime', color: '#ef4444' },
  corruption: { label: '⚖️ Corruption', color: '#a855f7' },
  civic_issue: { label: '🏙️ Civic Issue', color: '#14b8a6' }
};

const SEVERITY_COLORS = {
  Low: '#22c55e',       // Green
  Medium: '#0ea5e9',    // Sky Blue
  High: '#f59e0b',      // Amber
  Emergency: '#f43f5e'  // Rose Red
};

export default function CivicHeatmap() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const heatLayerRef = useRef(null);
  const markersGroupRef = useRef(null);

  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showMarkers, setShowMarkers] = useState(true);
  const [showHeat, setShowHeat] = useState(true);

  // Query complaint coordinates
  const { data: heatmapData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['complaintsHeatmap'],
    queryFn: () => api.get('/complaints/heatmap').then(res => res.data.data),
    staleTime: 60000 // Cache for 1 min
  });

  const rawPoints = heatmapData || [];

  // Filter complaints coordinates
  const filteredPoints = rawPoints.filter(p => {
    const matchesCat = filterCategory === 'all' || p.category === filterCategory;
    const matchesSev = filterSeverity === 'all' || p.severity === filterSeverity;
    const matchesStat = filterStatus === 'all' || p.status === filterStatus;
    return matchesCat && matchesSev && matchesStat;
  });

  useEffect(() => {
    let mounted = true;
    let map = null;

    const initMap = async () => {
      try {
        const Leaflet = await loadLeafletWithHeat();
        if (!mounted || !mapContainerRef.current || mapInstanceRef.current) return;

        // Create Leaflet map centered at India's geographic center
        map = Leaflet.map(mapContainerRef.current, {
          center: [20.5937, 78.9629],
          zoom: 5,
          zoomControl: true,
          scrollWheelZoom: true
        });

        // Add OpenStreetMap Tile Layer
        Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;

        // Initialize layer groups for markers and heat zone
        markersGroupRef.current = Leaflet.layerGroup().addTo(map);

        // Center map to resolved coordinate clusters if available
        if (filteredPoints.length > 0) {
          const latSum = filteredPoints.reduce((sum, p) => sum + p.lat, 0);
          const lngSum = filteredPoints.reduce((sum, p) => sum + p.lng, 0);
          map.setView([latSum / filteredPoints.length, lngSum / filteredPoints.length], 12);
        }
      } catch (err) {
        console.error('Failed to initialize Leaflet Heatmap:', err);
        toast.error('Failed to initialize Leaflet Maps.');
      }
    };

    initMap();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        heatLayerRef.current = null;
        markersGroupRef.current = null;
      }
    };
  }, []);

  // Update map overlays (heat and markers) whenever filtered data or view flags change
  useEffect(() => {
    const updateOverlays = async () => {
      if (!mapInstanceRef.current) return;
      const Leaflet = L;

      // 1. Clear previous layers
      if (heatLayerRef.current) {
        mapInstanceRef.current.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      if (markersGroupRef.current) {
        markersGroupRef.current.clearLayers();
      }

      // 2. Render Heat Zones
      if (showHeat && filteredPoints.length > 0) {
        // Map points to [lat, lng, intensity]
        const heatPoints = filteredPoints.map(p => {
          // Emergency severity adds higher heat density
          const intensity = p.severity === 'Emergency' ? 1.0 : p.severity === 'High' ? 0.8 : p.severity === 'Medium' ? 0.5 : 0.2;
          return [p.lat, p.lng, intensity];
        });

        heatLayerRef.current = Leaflet.heatLayer(heatPoints, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          gradient: {
            0.2: '#0ea5e9', // Low/Medium (Blue)
            0.5: '#22c55e', // resolved/medium (Green)
            0.8: '#f59e0b', // High (Yellow/Orange)
            1.0: '#f43f5e'  // Emergency (Red)
          }
        }).addTo(mapInstanceRef.current);
      }

      // 3. Render Severity Color Markers
      if (showMarkers) {
        filteredPoints.forEach(p => {
          const markerColor = SEVERITY_COLORS[p.severity] || '#94a3b8';
          const catInfo = CATEGORIES_MAPPING[p.category] || { label: p.category };

          // Render circular severity dot
          const circleIcon = Leaflet.divIcon({
            className: 'custom-leaflet-marker',
            html: `<div style="
              width: 14px; 
              height: 14px; 
              border-radius: 50%; 
              background-color: ${markerColor}; 
              border: 2px solid white; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              animation: ${p.severity === 'Emergency' ? 'pulse-marker 1.2s infinite ease-in-out' : 'none'};
            "></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          });

          // Custom styles for pulsing animations on emergencies
          if (!document.getElementById('leaflet-custom-styles')) {
            const style = document.createElement('style');
            style.id = 'leaflet-custom-styles';
            style.innerHTML = `
              @keyframes pulse-marker {
                0%, 100% { transform: scale(1); filter: brightness(1); }
                50% { transform: scale(1.3); filter: brightness(1.2); }
              }
            `;
            document.head.appendChild(style);
          }

          const popupContent = `
            <div style="font-family: sans-serif; font-size: 11px; padding: 4px; min-width: 160px; line-height: 1.4;">
              <div style="font-weight: 800; color: #1e293b; font-size: 12px; margin-bottom: 3px;">${p.complaintId}</div>
              <div style="margin-bottom: 5px;">
                <span style="font-weight: 700; color: white; background: #6366f1; padding: 1.5px 6px; border-radius: 9px; font-size: 9px; text-transform: uppercase;">
                  ${catInfo.label}
                </span>
                <span style="font-weight: 700; color: white; background: ${markerColor}; padding: 1.5px 6px; border-radius: 9px; font-size: 9px; text-transform: uppercase; margin-left: 3.5px;">
                  ${p.severity}
                </span>
              </div>
              <div style="color: #475569; font-weight: 600; margin-bottom: 2px;">
                <strong>Status:</strong> <span style="text-transform: uppercase; font-weight: 800;">${p.status.replace(/_/g, ' ')}</span>
              </div>
              <div style="color: #64748b; font-weight: 500; font-size: 10px;">
                <strong>Location:</strong> ${p.address}
              </div>
            </div>
          `;

          const marker = Leaflet.marker([p.lat, p.lng], { icon: circleIcon })
            .bindPopup(popupContent, { closeButton: false, offset: [0, -5] });
            
          markersGroupRef.current.addLayer(marker);
        });
      }
    };

    updateOverlays();
  }, [filteredPoints, showHeat, showMarkers]);

  const handleRefetch = () => {
    refetch();
    toast.success('Heatmap data reloaded!');
  };

  return (
    <div className="card p-5 bg-white/70 dark:bg-[#121828]/60 border border-white dark:border-white/5 shadow-md flex flex-col gap-4" style={{ borderRadius: '28px' }}>
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-white/20">
            <Map size={18} className="animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Live Civic Heatmap
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
              Live coordinates analysis showing smart city civic load & severity densities
            </p>
          </div>
        </div>

        <button 
          onClick={handleRefetch} 
          disabled={isLoading || isFetching}
          className="btn-secondary py-2 px-3 self-end sm:self-center flex items-center gap-1.5 active:scale-95 disabled:opacity-40"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
          <span className="text-[10px] uppercase font-bold tracking-wider">Reload Feed</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50/50 dark:bg-slate-900/10 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40">
        
        {/* Category Filter */}
        <div className="flex flex-col flex-1 min-w-[120px]">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Filter size={9} /> Category
          </span>
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
            className="input py-1.5 px-2 text-xs font-semibold rounded-lg"
          >
            <option value="all">📁 All Categories</option>
            <option value="crime">🚨 Crime</option>
            <option value="corruption">⚖️ Corruption</option>
            <option value="civic_issue">🏙️ Civic Issues</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div className="flex flex-col flex-1 min-w-[120px]">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Filter size={9} /> Severity
          </span>
          <select 
            value={filterSeverity} 
            onChange={e => setFilterSeverity(e.target.value)}
            className="input py-1.5 px-2 text-xs font-semibold rounded-lg"
          >
            <option value="all">🔥 All Severities</option>
            <option value="Low">🟢 Low</option>
            <option value="Medium">🔵 Medium</option>
            <option value="High">🟠 High</option>
            <option value="Emergency">🔴 Emergency</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex flex-col flex-1 min-w-[120px]">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Filter size={9} /> Status
          </span>
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            className="input py-1.5 px-2 text-xs font-semibold rounded-lg"
          >
            <option value="all">✅ All Statuses</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="investigating">Investigating</option>
            <option value="action_taken">Action Taken</option>
            <option value="closed">Closed / Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Overlays toggles */}
        <div className="flex flex-col flex-shrink-0">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Layers size={9} /> Layers
          </span>
          <div className="flex items-center gap-3 h-[32px]">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showHeat} 
                onChange={e => setShowHeat(e.target.checked)}
                className="rounded accent-indigo-500" 
              />
              Heat Zones
            </label>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showMarkers} 
                onChange={e => setShowMarkers(e.target.checked)}
                className="rounded accent-indigo-500" 
              />
              Dots
            </label>
          </div>
        </div>

      </div>

      {/* Map Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800" style={{ height: '360px' }}>
        {isLoading && (
          <div className="absolute inset-0 bg-slate-50/70 dark:bg-slate-950/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <span className="text-xs font-bold text-brand-600 animate-pulse">Loading live telemetry coordinates...</span>
          </div>
        )}

        <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 0 }} />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 dark:bg-slate-900/95 p-3 rounded-2xl border border-white/60 dark:border-slate-800/60 shadow-lg text-[10px] space-y-1.5 font-semibold text-slate-700 dark:text-slate-300 backdrop-blur-sm" style={{ borderRadius: '16px' }}>
          <div className="font-extrabold uppercase tracking-wide border-b border-slate-100 dark:border-slate-800/80 pb-1 text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-1">
            🔥 Heat Severity
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Emergency (Severe risk)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>High (Major disruption)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span>Medium / Low (Routine)</span>
          </div>
          <div className="pt-1.5 text-[8px] border-t border-slate-100 dark:border-slate-800/60 text-slate-400 font-bold">
            Showing {filteredPoints.length} of {rawPoints.length} reports
          </div>
        </div>
      </div>

    </div>
  );
}
