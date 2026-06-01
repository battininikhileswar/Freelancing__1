import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { motion as framerMotion } from 'framer-motion';
import { AlertTriangle, MapPin, Upload, X, ShieldAlert, Compass, CheckCircle, Home, WifiOff, FileText, Clipboard } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { saveOfflineComplaint } from '../../utils/indexedDb';

const EMERGENCY_CATEGORIES = [
  { id: 'emergency_fire', label: 'Fire 🚒', color: 'from-red-600 to-rose-500', shadow: 'rgba(239, 68, 68, 0.4)' },
  { id: 'emergency_flood', label: 'Flood 🌊', color: 'from-amber-600 to-orange-500', shadow: 'rgba(245, 158, 11, 0.4)' },
  { id: 'emergency_accident', label: 'Accident 🚗', color: 'from-rose-600 to-red-500', shadow: 'rgba(244, 63, 94, 0.4)' },
  { id: 'emergency_electrical', label: 'Electrical Hazard ⚡', color: 'from-yellow-600 to-amber-500', shadow: 'rgba(234, 179, 8, 0.4)' },
];

export default function EmergencyReport() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [submittedId, setSubmittedId] = useState('');

  const [location, setLocation] = useState({
    address: 'Fetching coordinates...',
    state: 'andhra pradesh', // Default standard
    district: 'guntur',
    lat: null,
    lng: null,
  });

  // Geolocation Cascade on mount
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = () => {
    setGpsLoading(true);
    
    const browserGeoSuccess = (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setLocation({
        address: `Emergency location: (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        state: 'andhra pradesh',
        district: 'guntur',
        lat,
        lng
      });
      setGpsLoading(false);
    };

    const browserGeoError = async (err) => {
      console.warn('⚠️ Geolocation cascade fallback: HTML5 failed. Trying IP Geolocation...');
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          setLocation({
            address: `${data.city || 'Guntur'}, ${data.region || 'Andhra Pradesh'} (IP Resolved)`,
            state: (data.region || 'Andhra Pradesh').toLowerCase(),
            district: (data.city || 'Guntur').toLowerCase(),
            lat: parseFloat(data.latitude),
            lng: parseFloat(data.longitude)
          });
          setGpsLoading(false);
          return;
        }
      } catch (ipErr) {
        console.warn('⚠️ Geolocation cascade fallback: ipapi failed. Trying IPWHOIS...');
      }

      try {
        const res = await fetch('https://ipwhois.app/json/');
        if (res.ok) {
          const data = await res.json();
          setLocation({
            address: `${data.city || 'Guntur'}, ${data.region || 'Andhra Pradesh'} (IP Resolved)`,
            state: (data.region || 'Andhra Pradesh').toLowerCase(),
            district: (data.city || 'Guntur').toLowerCase(),
            lat: parseFloat(data.latitude),
            lng: parseFloat(data.longitude)
          });
          setGpsLoading(false);
          return;
        }
      } catch (whoisErr) {
        console.error('❌ Geolocation cascade failed fully.');
      }

      setLocation({
        address: 'Guntur, Andhra Pradesh (Default Location)',
        state: 'andhra pradesh',
        district: 'guntur',
        lat: 16.3067,
        lng: 80.4365
      });
      setGpsLoading(false);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(browserGeoSuccess, browserGeoError, { timeout: 4000 });
    } else {
      browserGeoError(new Error('HTML5 geolocation not supported'));
    }
  };

  const handleEmergencySubmit = async () => {
    if (!category) {
      toast.error('Please select an emergency category.');
      return;
    }
    if (!description || description.trim().length < 10) {
      toast.error('Please describe the emergency in at least 10 characters.');
      return;
    }

    setSubmitting(true);

    const reportData = {
      category: 'civic_issue', // Statically stored under civic issues for fast routing
      subcategory: category,
      description: `[EMERGENCY BROADCAST] ${description}`,
      isAnonymous: true, // Emergency defaults anonymous for speed
      location: {
        address: location.address,
        state: location.state || 'andhra pradesh',
        district: location.district || 'guntur',
        lat: location.lat || 16.3067,
        lng: location.lng || 80.4365,
      },
      isEmergency: true,
      severity: 'Emergency',
    };

    // Check online status
    if (!navigator.onLine) {
      try {
        console.log('📡 Browser is offline. Storing emergency report locally.');
        await saveOfflineComplaint(reportData);
        setIsSavedOffline(true);
        setIsSuccess(true);
        toast.success('💾 Emergency saved offline! Stored locally.');
      } catch (err) {
        toast.error('Failed to store report locally.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const res = await api.post('/complaints', reportData);
      const { complaintId } = res.data.data;
      setSubmittedId(complaintId);
      setIsSuccess(true);
      toast.success('🚨 Emergency Broadcast Dispatched Successfully!');
    } catch (err) {
      console.warn('❌ Online submit failed:', err.message);
      if (err.response) {
        // The server responded with an error status (e.g., 400, 403, 500)
        // This means the user is online, but the backend rejected the request.
        const errorMsg = err.response.data?.message || 'Server rejected the emergency dispatch.';
        toast.error(`Submission Failed: ${errorMsg}`);
      } else {
        // No response was received (e.g., network down, server offline)
        // In this case, fall back to offline local storage.
        try {
          await saveOfflineComplaint(reportData);
          setIsSavedOffline(true);
          setIsSuccess(true);
          toast.success('💾 Saved locally in offline queue due to connection issues.');
        } catch (offlineErr) {
          toast.error('Emergency transmission failed.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto flex flex-col gap-5">
        
        {/* Glow Alert Banner */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-5 text-center flex flex-col items-center gap-2" style={{ boxShadow: 'inset 0 0 15px rgba(239, 68, 68, 0.15)' }}>
          <ShieldAlert className="text-red-500 animate-pulse" size={40} />
          <h2 className="font-extrabold text-red-600 dark:text-red-400 text-lg uppercase tracking-wider font-display mt-1">
            🚨 EMERGENCY REPORTING PORTAL
          </h2>
          <p className="text-xs text-red-500 font-semibold leading-relaxed">
            Report high-risk events directly. Reports bypass standard workflows and route instantly with maximum priority.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <framerMotion.div 
              key="emergency-form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="card p-6 bg-white/70 dark:bg-[#121828]/60 border border-white dark:border-white/5 shadow-xl flex flex-col gap-5"
              style={{ borderRadius: '28px' }}
            >
              {/* Category Selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2.5">
                  1. Select Emergency Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {EMERGENCY_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`p-4 text-xs font-black rounded-2xl border text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 ${
                        category === cat.id
                          ? `bg-gradient-to-r ${cat.color} text-white border-0 shadow-lg`
                          : 'bg-white dark:bg-[#1f2937]/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-red-400/50'
                      }`}
                      style={{
                        boxShadow: category === cat.id ? `0 6px 16px ${cat.shadow}` : 'none'
                      }}
                    >
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  2. Describe the Hazard / Situation
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide immediate details... (e.g. fire broke out at electric transformer next to primary school, children inside)."
                  className="input resize-none text-xs font-semibold"
                />
              </div>

              {/* Location telemetry display */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  3. Emergency Location
                </label>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500">
                    <MapPin size={16} className={gpsLoading ? 'animate-bounce' : ''} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] text-slate-400 uppercase font-black">Dynamic Coordinates</div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 font-bold truncate">{location.address}</div>
                  </div>
                  <button
                    onClick={detectLocation}
                    disabled={gpsLoading}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center flex-shrink-0 text-indigo-500 transition-colors disabled:opacity-40"
                  >
                    <Compass size={16} className={gpsLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Dispatch Action */}
              <button
                onClick={handleEmergencySubmit}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-lg shadow-red-500/20 uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Transmitting...
                  </>
                ) : (
                  <>🚨 BroadCast Dispatch</>
                )}
              </button>
            </framerMotion.div>
          ) : (
            <framerMotion.div 
              key="emergency-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-8 text-center bg-white/70 dark:bg-[#121828]/60 border border-white dark:border-white/5 shadow-xl flex flex-col items-center gap-5"
              style={{ borderRadius: '28px' }}
            >
              {isSavedOffline ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <WifiOff size={32} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white font-display mb-1.5">Offline Report Saved! 💾</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Your internet connection is currently down. The emergency dispatch has been securely saved in your device's local storage database (IndexedDB).
                    </p>
                    <p className="text-xs text-brand-600 font-bold mt-2 animate-pulse">
                      📡 Auto-sync will dispatch to city servers the instant connectivity returns.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                    <CheckCircle size={32} className="animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white font-display mb-1.5">Dispatch Dispatched! 📡</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Emergency broadcast successfully written to Guntur public safety queue. Authorities have been paged immediately.
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40 w-full max-w-sm">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Emergency Complaint Reference</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono font-black text-red-500 tracking-wider text-lg">{submittedId}</span>
                      <button onClick={() => { navigator.clipboard.writeText(submittedId); toast.success('Reference copied!'); }}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors">
                        <Clipboard size={14} />
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mt-2">
                <Link to="/dashboard" className="btn-secondary py-2.5 flex-1 flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider text-xs">
                  <Home size={14} /> Dashboard
                </Link>
                <button onClick={() => { setIsSuccess(false); setIsSavedOffline(false); setCategory(''); setDescription(''); }}
                  className="btn-primary py-2.5 flex-1 font-bold uppercase tracking-wider text-xs bg-gradient-to-r from-red-600 to-rose-600 border-0">
                  Report New 🚨
                </button>
              </div>
            </framerMotion.div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
