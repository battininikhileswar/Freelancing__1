import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';

// Dynamically import Leaflet to avoid SSR issues
let L = null;

async function loadLeaflet() {
  if (L) return L;
  L = await import('leaflet');
  // Fix default marker icon
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
  return L;
}

/**
 * MapPicker — Leaflet map for selecting complaint location
 * Props:
 *   initialLat, initialLng — starting position (default: India center)
 *   onLocationSelect(lat, lng, address) — called when user clicks map or drags marker
 *   height — CSS height string (default '300px')
 */
export default function MapPicker({
  initialLat = 20.5937,
  initialLng = 78.9629,
  onLocationSelect,
  height = '300px',
  readOnly = false,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [status, setStatus] = useState('Click on the map to pin your location');

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const Leaflet = await loadLeaflet();
      if (!mounted || !mapRef.current || mapInstanceRef.current) return;

      // Init map
      const map = Leaflet.map(mapRef.current, {
        center: [initialLat, initialLng],
        zoom: initialLat === 20.5937 ? 5 : 13,
        zoomControl: true,
        attributionControl: true,
      });

      // Tile layer (OpenStreetMap)
      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // If initial coords given (GPS detected), drop a marker
      if (initialLat !== 20.5937) {
        const marker = Leaflet.marker([initialLat, initialLng], { draggable: !readOnly }).addTo(map);
        markerRef.current = marker;
        if (!readOnly) {
          marker.on('dragend', async (e) => {
            const { lat, lng } = e.target.getLatLng();
            await reverseGeocode(lat, lng);
          });
        }
      }

      // Click to place marker
      if (!readOnly) {
        map.on('click', async (e) => {
          const { lat, lng } = e.latlng;

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            const marker = Leaflet.marker([lat, lng], { draggable: true }).addTo(map);
            markerRef.current = marker;
            marker.on('dragend', async (ev) => {
              const pos = ev.target.getLatLng();
              await reverseGeocode(pos.lat, pos.lng);
            });
          }

          await reverseGeocode(lat, lng);
        });
      }
    };

    const reverseGeocode = async (lat, lng) => {
      setStatus('Getting address...');
      let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        address = data.display_name?.split(',').slice(0, 4).join(',').trim() || address;
      } catch {}

      setStatus(address);
      if (onLocationSelect) onLocationSelect(lat, lng, address);
    };

    init();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update marker if initialLat/Lng changes (GPS detected externally)
  useEffect(() => {
    if (!mapInstanceRef.current || initialLat === 20.5937) return;
    const L = mapInstanceRef.current;
    if (markerRef.current) {
      markerRef.current.setLatLng([initialLat, initialLng]);
    }
    mapInstanceRef.current.setView([initialLat, initialLng], 14);
  }, [initialLat, initialLng]);

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
      <div ref={mapRef} style={{ height }} className="w-full" />
      {!readOnly && (
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <MapPin size={13} className="text-brand-500 flex-shrink-0" />
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{status}</span>
        </div>
      )}
    </div>
  );
}
