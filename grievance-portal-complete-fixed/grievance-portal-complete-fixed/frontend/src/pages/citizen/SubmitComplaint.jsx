import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import {
  MapPin, Upload, X, AlertCircle, CheckCircle, Navigation,
  FileImage, FileVideo, Eye, EyeOff, ChevronRight, Info, Clipboard,
  Sparkles, Loader2, WifiOff
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { CATEGORIES, INDIAN_STATES } from '../../utils/constants';
import { saveOfflineComplaint } from '../../utils/indexedDb';
import { useTranslation } from '../../utils/i18n';

const STEPS = ['Category', 'Description', 'Location', 'Attachments', 'Review', 'Success'];

const DISTRICTS_MAP = {
  'andhra pradesh': ['Guntur', 'Krishna', 'Visakhapatnam', 'East Godavari', 'West Godavari', 'Kurnool', 'Kadapa', 'Chittoor', 'Nellore'],
  telangana: ['Hyderabad', 'Warangal', 'Khammam', 'Karimnagar', 'Nizamabad', 'Rangareddy'],
  maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane'],
  karnataka: ['Bengaluru', 'Mysuru', 'Hubli', 'Mangaluru', 'Belagavi'],
};

export default function SubmitComplaint() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [submittedComplaintId, setSubmittedComplaintId] = useState(null);
  const [submittedAuthorityType, setSubmittedAuthorityType] = useState(null);
  const [form, setForm] = useState({
    category: '',
    subcategory: '',
    description: '',
    isAnonymous: false,
    location: { address: '', state: '', district: '', pincode: '', lat: null, lng: null },
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isOfflineSuccess, setIsOfflineSuccess] = useState(false);

  useEffect(() => {
    const preCategory = localStorage.getItem('voice_preselect_category');
    const preSubcategory = localStorage.getItem('voice_preselect_subcategory');
    if (preCategory) {
      setForm(f => ({ ...f, category: preCategory, subcategory: preSubcategory || '' }));
      localStorage.removeItem('voice_preselect_category');
      localStorage.removeItem('voice_preselect_subcategory');
      toast.success(`Voice pre-filled: ${preCategory} / ${preSubcategory}`);
    }
  }, []);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
  const setLoc = (field, val) => setForm(f => ({ ...f, location: { ...f.location, [field]: val } }));

  const handleAiPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size too large. Max 50MB allowed.');
      return;
    }

    setAiLoading(true);
    setAiResult(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post('/complaints/detect-issue', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { data } = res.data;
      setAiResult(data);

      // Pre-select category and subcategory automatically
      setForm(f => ({
        ...f,
        category: data.mappedCategory,
        subcategory: data.mappedSubcategory
      }));

      // Proactively add file to files array so it is attached as evidence
      const withPreview = Object.assign(file, { preview: URL.createObjectURL(file) });
      setFiles(prev => {
        if (prev.some(f => f.name === file.name && f.size === file.size)) return prev;
        if (prev.length >= 5) return prev;
        return [...prev, withPreview];
      });

      toast.success(`AI detected: ${data.detectedCategory} (${Math.round(data.confidence * 100)}% Confidence)`);
    } catch (err) {
      console.error('AI upload error:', err);
      toast.error(err.response?.data?.message || 'AI Photo detection failed. Please select manually.');
    } finally {
      setAiLoading(false);
    }
  };

  const onDrop = useCallback((accepted) => {
    if (files.length + accepted.length > 5) { toast.error('Max 5 files allowed'); return; }
    const withPreview = accepted.map(f => Object.assign(f, { preview: URL.createObjectURL(f) }));
    setFiles(prev => [...prev, ...withPreview]);
  }, [files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, maxFiles: 5, maxSize: 50 * 1024 * 1024,
    accept: { 'image/*': [], 'video/*': [], 'application/pdf': [] }
  });

  const matchStateAndDistrict = (detectedState, detectedDistrict, rawAddressData) => {
    const cleanStr = (str) => {
      if (!str) return '';
      return str.toLowerCase()
        .replace(/\b(state|district|division|city|corporation|union territory|ut)\b/gi, '')
        .trim();
    };

    const cleanState = cleanStr(detectedState);
    const cleanDistrict = cleanStr(detectedDistrict);

    let matchedState = '';
    for (const s of INDIAN_STATES) {
      const sLower = s.toLowerCase();
      if (sLower === cleanState || sLower.includes(cleanState) || cleanState.includes(sLower)) {
        matchedState = sLower;
        break;
      }
    }

    if (!matchedState && rawAddressData) {
      const addressValues = Object.values(rawAddressData).map(v => typeof v === 'string' ? cleanStr(v) : '');
      for (const s of INDIAN_STATES) {
        const sLower = s.toLowerCase();
        if (addressValues.includes(sLower)) {
          matchedState = sLower;
          break;
        }
      }
    }

    let matchedDistrict = '';
    if (matchedState && DISTRICTS_MAP[matchedState]) {
      const validDistricts = DISTRICTS_MAP[matchedState];
      for (const d of validDistricts) {
        const dLower = d.toLowerCase();
        if (dLower === cleanDistrict || dLower.includes(cleanDistrict) || cleanDistrict.includes(dLower)) {
          matchedDistrict = dLower;
          break;
        }
      }

      if (!matchedDistrict && rawAddressData) {
        const searchKeys = ['county', 'state_district', 'city', 'suburb', 'town', 'village', 'municipality'];
        for (const key of searchKeys) {
          const value = cleanStr(rawAddressData[key]);
          if (value) {
            for (const d of validDistricts) {
              const dLower = d.toLowerCase();
              if (dLower === value || dLower.includes(value) || value.includes(dLower)) {
                matchedDistrict = dLower;
                break;
              }
            }
          }
          if (matchedDistrict) break;
        }
      }
    }

    return { matchedState, matchedDistrict };
  };

  const reverseGeocode = async (lat, lng) => {
    console.log(`📡 [GPS] Initiating reverse geocoding for coordinates: lat=${lat}, lng=${lng}`);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'JanShaktiGrievancePortal/1.0.0 (citizen@janshakti.gov.in)',
          'Accept-Language': 'en'
        }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Nominatim reverse lookup failed');
      const geoData = await response.json();
      console.log('✅ [GPS] Geocoding API response received:', JSON.stringify(geoData.address));
      
      if (geoData && geoData.address) {
        const addr = geoData.address;
        const detectedState = addr.state || addr.region || '';
        const detectedDistrict = addr.district || addr.state_district || addr.county || addr.city || addr.suburb || '';
        const pincode = addr.postcode || '';
        const address = geoData.display_name || `GPS Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        console.log(`📡 [GPS] Mapping address keys. State: ${detectedState}, District: ${detectedDistrict}, Pincode: ${pincode}`);
        const { matchedState, matchedDistrict } = matchStateAndDistrict(detectedState, detectedDistrict, addr);
        console.log(`📡 [GPS] Mapping complete. Resolved State: ${matchedState}, Resolved District: ${matchedDistrict}`);

        setForm(f => ({
          ...f,
          location: {
            ...f.location,
            lat,
            lng,
            address: address,
            state: matchedState || f.location.state,
            district: matchedDistrict || f.location.district,
            pincode: pincode || f.location.pincode
          }
        }));

        if (!matchedState || !matchedDistrict) {
          toast.error('GPS captured coordinates, but state/district could not be resolved. Please select your district manually.', { duration: 6000 });
        } else {
          toast.success(`Location auto-detected: ${matchedDistrict.toUpperCase()}, ${matchedState.toUpperCase()}!`);
        }
        return true;
      }
    } catch (err) {
      console.error('❌ [GPS] Reverse geocoding failed:', err);
    }
    
    // Fallback if Nominatim failed or returned no address, but we have lat/lng
    console.log('⚠️ [GPS] Reverse geocoding failed. Auto-filling raw coordinates as address fallback.');
    setForm(f => ({
      ...f,
      location: {
        ...f.location,
        lat,
        lng,
        address: f.location.address || `GPS Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
      }
    }));
    toast.error('Location coordinates captured, but address lookup failed. Please enter address details manually.', { duration: 6000 });
    return false;
  };

  const detectGPS = () => {
    // 1. Secure context / Production check
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHttps = window.location.protocol === 'https:';

    if (!isHttps && !isLocalhost) {
      console.warn('❌ [GPS] Geolocation rejected: Not in a secure context.');
      toast.error('GPS Geolocation requires a secure (HTTPS) connection in production.');
      return;
    }

    console.log('📡 [GPS] Geolocation requested. Requesting browser telemetry (30s timeout)...');
    setGpsLoading(true);
    
    const browserGeoSuccess = async (pos) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      console.log(`✅ [GPS] Browser geolocation succeeded. Lat: ${lat}, Lng: ${lng}, Accuracy: ${accuracy}m`);
      await reverseGeocode(lat, lng);
      setGpsLoading(false);
    };

    const browserGeoError = async (err) => {
      console.warn('⚠️ [GPS] Browser Geolocation failed/denied. Code:', err.code, 'Message:', err.message);
      
      let geoErrorMessage = 'Unable to detect location.';
      if (err.code === 1) {
        geoErrorMessage = 'Location access denied. Please allow location permission and try again.';
      } else if (err.code === 2) {
        geoErrorMessage = 'Position unavailable. Please allow location or enter manually.';
      } else if (err.code === 3) {
        geoErrorMessage = 'Location request timed out. Trying fast network IP fallback...';
      }
      
      toast.error(geoErrorMessage);
      console.log('📡 [GPS] Launching secure backend IP geolocation proxy fallback...');

      try {
        // Secure call to backend proxy endpoint instead of calling ipapi.co directly
        const res = await api.get('/complaints/ip-geolocation');
        const proxyData = res.data;
        
        if (proxyData.success && proxyData.data) {
          const { latitude, longitude, city, region, pincode } = proxyData.data;
          console.log(`✅ [GPS] Backend proxy geolocation succeeded using ${proxyData.source}. Coords: ${latitude}, ${longitude}`);
          
          await reverseGeocode(latitude, longitude);
          
          // Auto-fill postal/pincode if resolved
          if (pincode) {
            setLoc('pincode', pincode);
          }
          
          setGpsLoading(false);
          return;
        }
      } catch (proxyErr) {
        console.error('❌ [GPS] Backend proxy geolocation fallback failed:', proxyErr.message);
      }
      
      setGpsLoading(false);
      // Specific error messages
      if (err.code === 1) {
        toast.error('Please allow location permission and try again.');
      } else if (err.code === 3) {
        toast.error('Location request timed out. Please enter location manually.');
      } else {
        toast.error('Could not detect location automatically. Please enter manually.');
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        browserGeoSuccess,
        browserGeoError,
        { timeout: 30000, enableHighAccuracy: true, maximumAge: 0 }
      );
    } else {
      console.error('❌ [GPS] browser navigator.geolocation is not available');
      setGpsLoading(false);
      toast.error('Geolocation is not supported by your browser.');
    }
  };

  const canNext = () => {
    if (step === 0) return form.category && form.subcategory;
    if (step === 1) return form.description.length >= 20;
    if (step === 2) return form.location.address && form.location.state;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    // 1. Offline Mode Check
    if (!navigator.onLine) {
      try {
        const offlineReport = {
          category: form.category,
          subcategory: form.subcategory,
          description: form.description,
          isAnonymous: form.isAnonymous,
          location: form.location,
          isEmergency: false,
          severity: 'Medium',
          offlineFiles: files.map(f => ({
            name: f.name,
            type: f.type,
            size: f.size,
            blob: f
          }))
        };
        
        await saveOfflineComplaint(offlineReport);
        
        setSubmittedComplaintId('OFFLINE-QUEUE');
        setSubmittedAuthorityType('Local DB Sync pending');
        setIsOfflineSuccess(true);
        setStep(STEPS.length - 1); // Success step
        toast.dismiss();
        toast.success('💾 Saved offline! Complaint stored locally.');
      } catch (err) {
        toast.dismiss();
        toast.error('Failed to store report locally.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
        const formData = new FormData();
      formData.append('category', form.category);
      formData.append('subcategory', form.subcategory);
      formData.append('description', form.description);
      formData.append('isAnonymous', form.isAnonymous);
      formData.append('location', JSON.stringify(form.location));
      files.forEach(f => formData.append('attachments', f));

      const res = await api.post('/complaints', formData);
      const { complaintId, authorityType } = res.data.data;

      queryClient.invalidateQueries(['myComplaints']);
      setSubmittedComplaintId(complaintId);
      setSubmittedAuthorityType(authorityType);
      setStep(STEPS.length - 1); // Move to the last step (Success)
      toast.dismiss();
      toast.success(`Complaint ${complaintId} filed successfully!`, { duration: 5000 });
    } catch (err) {
      if (err.message === 'Network Error' || !navigator.onLine) {
        try {
          const offlineReport = {
            category: form.category,
            subcategory: form.subcategory,
            description: form.description,
            isAnonymous: form.isAnonymous,
            location: form.location,
            isEmergency: false,
            severity: 'Medium',
            offlineFiles: files.map(f => ({
              name: f.name,
              type: f.type,
              size: f.size,
              blob: f
            }))
          };
          await saveOfflineComplaint(offlineReport);
          setSubmittedComplaintId('OFFLINE-QUEUE');
          setSubmittedAuthorityType('Local DB Sync pending');
          setIsOfflineSuccess(true);
          setStep(STEPS.length - 1);
          toast.dismiss();
          toast.success('💾 Saved offline! Network connection timed out.');
          return;
        } catch (offlineErr) {
          console.error('Failed to save offline:', offlineErr);
        }
      }
      toast.dismiss();
      toast.error(err.response?.data?.message || 'Submission failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const preSubmitCheck = async () => {
    if (form.location.lat === null || form.location.lng === null) {
      await handleSubmit();
      return;
    }

    setDuplicateLoading(true);
    try {
      const res = await api.post('/complaints/check-duplicate', {
        category: form.category,
        location: form.location,
        description: form.description
      });
      
      const { isPotentialDuplicate, matches } = res.data.data;
      if (isPotentialDuplicate) {
        setDuplicateData(matches);
        setShowDuplicateModal(true);
      } else {
        await handleSubmit();
      }
    } catch (err) {
      console.warn('⚠️ Duplicate check failed, bypassing:', err.message);
      await handleSubmit();
    } finally {
      setDuplicateLoading(false);
    }
  };

  const selectedCategory = CATEGORIES[form.category];
  const districts = DISTRICTS_MAP[form.location.state.toLowerCase()] || [];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="page-header">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">File a Complaint</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Your complaint will be automatically routed to the appropriate authority.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0 transition-all duration-300
                ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                {i < step ? <CheckCircle size={14} /> : i + 1}
              </div>
              <div className={`text-xs ml-1.5 font-medium hidden sm:block ${i === step ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`}>{s}</div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded transition-all duration-300 ${i < step ? 'bg-green-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

            {/* Step 0: Category */}
            {step === 0 && (
              <div className="space-y-4">
                {/* AI Photo Detection Enhancement Box */}
                <div className="card p-5 bg-gradient-to-br from-indigo-50/70 to-cyan-50/70 dark:from-indigo-950/20 dark:to-cyan-950/20 border border-white dark:border-white/5 shadow-md mb-6 relative overflow-hidden" style={{ borderRadius: '24px' }}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex gap-4 items-start relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center flex-shrink-0 shadow-md border border-white/20" style={{ boxShadow: 'var(--clay-btn-primary)' }}>
                      <Sparkles size={20} className="animate-pulse" />
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                          🤖 AI Smart Categorization
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                          Upload a photo of the civic issue, and our OpenAI Vision model will automatically analyze and classify it!
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <label className="btn-primary py-2 px-4 text-[10px] uppercase cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 transition-all">
                          <Upload size={13} />
                          {aiLoading ? 'Analyzing Photo...' : 'Scan Photo with AI'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAiPhotoUpload}
                            disabled={aiLoading}
                            className="sr-only"
                          />
                        </label>
                        
                        {aiLoading && (
                          <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 animate-pulse">
                            <Loader2 size={13} className="animate-spin" /> Processing image buffer...
                          </div>
                        )}
                      </div>

                      {aiResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white/80 dark:bg-slate-900/60 p-4 border border-white/60 dark:border-white/5 space-y-2 text-xs"
                          style={{ boxShadow: 'var(--clay-shadow-sm)', borderRadius: '18px' }}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Detected Issue:</span>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
                              {aiResult.detectedCategory}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Confidence Score:</span>
                            <span className="font-black text-slate-800 dark:text-slate-100">
                              {Math.round(aiResult.confidence * 100)}% Match
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">AI Severity:</span>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200/50 animate-pulse">
                              {aiResult.severity}
                            </span>
                          </div>

                          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 space-y-1">
                            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">AI Analysis:</span>
                            <p className="text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                              {aiResult.reason}
                            </p>
                          </div>

                          {aiResult.severityReason && (
                            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 space-y-1">
                              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Severity Reason:</span>
                              <p className="text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                                {aiResult.severityReason}
                              </p>
                            </div>
                          )}

                          <div className="pt-1.5 flex gap-2">
                            <span className="text-[10px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle size={11} /> Auto-Mapped: {aiResult.mappedCategory} &gt; {aiResult.mappedSubcategory.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select Category</h2>
                <div className="grid gap-3">
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <button key={key} onClick={() => { set('category', key); set('subcategory', ''); }}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-150 ${form.category === key
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/50'
                        : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 bg-white dark:bg-slate-800'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cat.icon}</span>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{cat.label}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {key === 'crime' && 'Routed to Police Station (PS)'}
                            {key === 'corruption' && 'Routed to Anti-Corruption Bureau (ACB)'}
                            {key === 'civic_issue' && 'Routed to Municipal Authority'}
                            {key === 'fire' && 'Routed to Fire Department'}
                            {key === 'hospital' && 'Routed to Healthcare & Hospital Authority'}
                          </div>
                        </div>
                        {form.category === key && <CheckCircle size={18} className="ml-auto text-brand-500 flex-shrink-0" />}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedCategory && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <label className="label mt-4">Subcategory</label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedCategory.subcategories.map(sub => (
                        <button key={sub.value} onClick={() => set('subcategory', sub.value)}
                          className={`px-3 py-2.5 rounded-lg border text-sm text-left transition-all ${form.subcategory === sub.value
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-400 font-medium'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-700 bg-white dark:bg-slate-800'}`}>
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Anonymous toggle */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mt-4">
                  <label className="relative inline-flex items-center cursor-pointer mt-0.5">
                    <input type="checkbox" checked={form.isAnonymous} onChange={e => set('isAnonymous', e.target.checked)} className="sr-only peer" />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-brand-300 dark:peer-focus:ring-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600" />
                  </label>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                      {form.isAnonymous ? <EyeOff size={14} /> : <Eye size={14} />}
                      Submit Anonymously
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Your identity will be hidden. You won't receive status notifications.</div>
                    {form.isAnonymous && (
                      <div className="p-2 mt-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex gap-2 text-xs text-red-700 dark:text-red-400">
                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                        Anonymous complaints will NOT appear on your dashboard.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Description */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Describe Your Complaint</h2>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex gap-2 text-sm text-blue-700 dark:text-blue-400">
                  <Info size={16} className="flex-shrink-0 mt-0.5" />
                  Be specific. Include dates, names, locations, and any relevant details. Do NOT include your contact info in the description.
                </div>
                <div>
                  <label className="label">Detailed Description <span className="text-red-500">*</span></label>
                  <textarea rows={8} value={form.description} onChange={e => set('description', e.target.value)}
                    className="input resize-none" placeholder="Describe the incident in detail. What happened? When? Who was involved? What evidence do you have?" />
                  <div className={`text-right text-xs mt-1 ${form.description.length < 20 ? 'text-red-400' : 'text-slate-400'}`}>
                    {form.description.length}/5000 {form.description.length < 20 && '(min. 20 chars)'}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Location Details</h2>
                <div className="flex gap-2">
                  <button onClick={detectGPS} disabled={gpsLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-400 text-sm font-medium hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors">
                    <Navigation size={15} className={gpsLoading ? 'animate-spin' : ''} />
                    {gpsLoading ? 'Detecting location...' : 'Auto-detect GPS'}
                  </button>
                  {form.location.lat && (
                    <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                      <CheckCircle size={13} /> GPS coordinates captured
                    </span>
                  )}
                </div>

                <div>
                  <label className="label">Incident Address <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <textarea rows={2} value={form.location.address} onChange={e => setLoc('address', e.target.value)}
                      className="input pl-10 resize-none" placeholder="House/Plot No., Street, Area, Landmark" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">State <span className="text-red-500">*</span></label>
                    <select value={form.location.state} onChange={e => { setLoc('state', e.target.value); setLoc('district', ''); }}
                      className="input">
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">District <span className="text-red-500">*</span></label>
                    <select value={form.location.district} onChange={e => setLoc('district', e.target.value)} className="input" disabled={!form.location.state}>
                      <option value="">Select District</option>
                      {districts.length > 0 ? districts.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>) : <option value="other">Other</option>}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Pincode</label>
                  <input type="text" maxLength={6} pattern="[0-9]{6}" value={form.location.pincode} onChange={e => setLoc('pincode', e.target.value)} className="input" placeholder="500001" />
                </div>
              </div>
            )}

            {/* Step 3: Attachments */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Attach Evidence <span className="text-slate-400 font-normal text-base">(Optional)</span></h2>
                <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                  ${isDragActive ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : 'border-slate-300 dark:border-slate-600 hover:border-brand-400 dark:hover:border-brand-600 bg-slate-50 dark:bg-slate-800/50'}`}>
                  <input {...getInputProps()} />
                  <Upload size={28} className="mx-auto mb-3 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to select'}</p>
                  <p className="text-xs text-slate-400 mt-1.5">Images, Videos, PDFs • Max 5 files • 50MB each</p>
                </div>

                {files.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {files.map((file, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        {file.type.startsWith('image/') ? (
                          <img src={file.preview} alt="" className="w-full h-24 object-cover" />
                        ) : (
                          <div className="w-full h-24 flex flex-col items-center justify-center gap-1 bg-slate-100 dark:bg-slate-700">
                            {file.type.startsWith('video/') ? <FileVideo size={24} className="text-slate-400" /> : <FileImage size={24} className="text-slate-400" />}
                            <span className="text-xs text-slate-500 truncate px-2 w-full text-center">{file.name}</span>
                          </div>
                        )}
                        <button onClick={() => setFiles(f => f.filter((_, j) => j !== i))}
                          className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={10} />
                        </button>
                        <div className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">{file.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Review & Submit</h2>
                <div className="card divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
                  {[
                    { label: 'Category', value: `${selectedCategory?.icon} ${selectedCategory?.label}` },
                    { label: 'Subcategory', value: form.subcategory.replace(/_/g, ' ') },
                    { label: 'Description', value: form.description.substring(0, 200) + (form.description.length > 200 ? '...' : '') },
                    { label: 'Location', value: `${form.location.address}, ${form.location.district}, ${form.location.state}` },
                    { label: 'Attachments', value: `${files.length} file(s)` },
                    { label: 'Anonymous', value: form.isAnonymous ? '✅ Yes - Identity hidden' : '❌ No - Linked to account' },
                    { label: 'Authority', value: form.category === 'crime' ? '🚔 Police Station (PS)' : form.category === 'corruption' ? '⚖️ Anti-Corruption Bureau' : form.category === 'fire' ? '🔥 Fire Department' : form.category === 'hospital' ? '🏥 Healthcare / Hospital' : '🏛️ Municipal Authority' },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-4 py-3 flex gap-4">
                      <span className="text-sm text-slate-500 dark:text-slate-400 w-28 flex-shrink-0">{label}</span>
                      <span className="text-sm text-slate-900 dark:text-white font-medium capitalize">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
                  Your complaint will be automatically routed to the correct authority. You will receive a unique Complaint ID for tracking.
                </div>
                {form.isAnonymous && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex gap-2 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    You have chosen to submit anonymously. This complaint will NOT appear on your personal dashboard.
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Success */}
            {step === STEPS.length - 1 && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
                className="card p-8 text-center bg-white/70 dark:bg-[#121828]/60 border border-white dark:border-white/5 shadow-xl"
                style={{ borderRadius: '28px' }}
              >
                {isOfflineSuccess ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-6">
                      <WifiOff size={32} className="animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Offline Report Saved! 💾</h2>
                    <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-md mx-auto leading-relaxed text-xs">
                      Your internet connection is currently down. Your report has been saved locally on your device in our secure offline queue database.
                    </p>
                    <p className="text-xs text-brand-600 dark:text-brand-400 font-bold mb-6 animate-pulse">
                      📡 Auto-sync will submit this to city servers the moment internet connection returns.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
                      <Link to="/dashboard" className="btn-primary flex-1">Go to Dashboard</Link>
                      <button onClick={() => {
                        setIsOfflineSuccess(false);
                        setSubmittedComplaintId(null);
                        setSubmittedAuthorityType(null);
                        setFiles([]);
                        setForm({
                          category: '',
                          subcategory: '',
                          description: '',
                          isAnonymous: false,
                          location: { address: '', state: '', district: '', pincode: '', lat: null, lng: null },
                        });
                        setStep(0);
                      }} className="btn-secondary flex-1">File Another</button>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Complaint Filed Successfully!</h2>
                    <p className="text-slate-600 dark:text-slate-300 mb-6">
                      Your complaint has been successfully submitted and routed to the appropriate authority.
                    </p>
                    
                    {submittedComplaintId && (
                      <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg mb-6">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Your Complaint ID:</p>
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-xl font-bold text-brand-600 dark:text-brand-400">{submittedComplaintId}</span>
                          <button onClick={() => { navigator.clipboard.writeText(submittedComplaintId); toast.success('Copied to clipboard!'); }}
                            className="btn-icon-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400">
                            <Clipboard size={18} />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Please save this ID to track your complaint status.
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
                      <Link to={`/track?id=${submittedComplaintId}`} className="btn-outline">Track Complaint</Link>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        {step < STEPS.length - 1 && (
          <div className="flex justify-between mt-8">
            <button onClick={() => setStep(s => s - 1)} disabled={step === 0} className="btn-secondary">
              Previous
            </button>
            {step === STEPS.length - 2 ? (
              <button onClick={preSubmitCheck} disabled={submitting || duplicateLoading || !canNext()} className="btn-primary">
                {submitting ? 'Submitting...' : duplicateLoading ? 'Checking...' : 'Confirm & Submit'}
              </button>
            ) : (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="btn-primary">
                Next <ChevronRight size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Soft Warning Modal for Duplicate Complaints */}
      <AnimatePresence>
        {showDuplicateModal && duplicateData && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white/90 dark:bg-[#121828]/90 border border-white dark:border-white/5 shadow-2xl p-6 w-full max-w-lg flex flex-col gap-4 relative"
              style={{ borderRadius: '28px', boxShadow: 'var(--clay-shadow-md)' }}
            >
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <AlertCircle size={22} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                    Potential Duplicate Found Nearby
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                    A similar issue in this category has already been reported nearby
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-left">
                We detected <strong>{duplicateData.length}</strong> matching report(s) within 300 meters of your coordinates. Please review them below:
              </div>

              {/* Duplicate list container */}
              <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                {duplicateData.map(match => (
                  <div 
                    key={match.complaintId} 
                    className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 flex flex-col gap-1.5 text-left"
                  >
                    <div className="flex items-center justify-between text-[10px] font-extrabold">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg">
                        {match.complaintId}
                      </span>
                      <span className="text-slate-400">
                        📍 {match.distance}m away • {match.similarityScore}% text match
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-2">
                      "{match.description}"
                    </p>
                    <div className="flex flex-col gap-0.5 text-[9px] font-bold text-slate-400 mt-1">
                      <span>Address: {match.address}</span>
                      <span className="text-slate-500 uppercase mt-0.5">Status: {match.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold leading-normal text-center mt-1">
                You can still submit your complaint if you believe it is a new or separate issue.
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button 
                  onClick={() => setShowDuplicateModal(false)}
                  className="btn-secondary py-2.5 flex-1 order-2 sm:order-1"
                >
                  Cancel & Edit
                </button>
                <button 
                  onClick={async () => {
                    setShowDuplicateModal(false);
                    await handleSubmit();
                  }}
                  className="btn-primary py-2.5 flex-1 order-1 sm:order-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-0"
                >
                  Submit Anyway
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}