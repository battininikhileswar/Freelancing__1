import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, User, Mail, Lock, Phone, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import Navbar from '../../components/Navbar';
import { useTranslation } from '../../utils/i18n';
import { INDIAN_STATES } from '../../utils/constants';

// Comprehensive districts mapping for all states
const DISTRICTS = {
  'andhra pradesh': [
    'Guntur', 'Krishna', 'Visakhapatnam', 'East Godavari', 'West Godavari',
    'Kurnool', 'Kadapa', 'Chittoor', 'Nellore', 'Srikakulam', 'Anantapur',
    'Prakasam', 'Vizianagaram'
  ],
  'telangana': [
    'Hyderabad', 'Warangal', 'Khammam', 'Karimnagar', 'Nizamabad',
    'Rangareddy', 'Medak', 'Nalgonda', 'Mahbubnagar', 'Adilabad'
  ],
  'maharashtra': [
    'Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane',
    'Akola', 'Amravati', 'Buldhana', 'Jalgaon', 'Kolhapur', 'Latur',
    'Nanded', 'Parbhani', 'Ratnagiri', 'Sangli', 'Satara', 'Solapur',
    'Wardha', 'Yavatmal', 'Alibag'
  ],
  'karnataka': [
    'Bangalore', 'Mysore', 'Belgaum', 'Mangalore', 'Hubli', 'Gulbarga',
    'Tumkur', 'Davangere', 'Shimoga', 'Bijapur', 'Kolar', 'Chikmagalur',
    'Hassan', 'Chitradurga', 'Raichur', 'Uttara Kannada', 'Kodagu'
  ],
  'tamil nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli',
    'Erode', 'Tirunelveli', 'Cuddalore', 'Villupuram', 'Kanchipuram',
    'Vellore', 'Ranipet', 'Chengalpattu', 'Tiruppur', 'Nagapattinam',
    'Mayiladuthurai', 'Ariyalur', 'Perambalur', 'Kalakeri', 'Sivaganga'
  ],
  'uttar pradesh': [
    'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut',
    'Allahabad', 'Bareilly', 'Aligarh', 'Gorakhpur', 'Noida', 'Greater Noida'
  ],
  'delhi': [
    'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi',
    'Central Delhi', 'New Delhi'
  ],
  'bihar': [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga',
    'Madhubani', 'East Champaran', 'West Champaran', 'Munger', 'Rohtas'
  ],
  'west bengal': [
    'Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Darjeeling',
    'Jalpaiguri', 'Cooch Behar', 'Alipurduar', 'Burdwan', 'Birbhum', 'Purulia'
  ],
  'punjab': [
    'Punjab', 'Amritsar', 'Ludhiana', 'Jullundur', 'Patiala',
    'Hoshiarpur', 'Ropar', 'Sangrur', 'Nawanshahr'
  ],
};

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    state: '',
    district: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [googleProcessing, setGoogleProcessing] = useState(false);
  const { register, googleLogin, isLoading } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();



  // Get districts for selected state
  const normalizeStateName = (state) => {
    return state.toLowerCase().trim();
  };

  const districts = form.state ? (DISTRICTS[normalizeStateName(form.state)] || []) : [];

  // Password strength calculation
  const passwordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = passwordStrength(form.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-indigo-400', 'bg-emerald-500'];

  // Validate individual field
  const validateField = (field, value) => {
    const errors = {};

    switch (field) {
      case 'name':
        if (!value || value.trim().length < 2) {
          errors.name = 'Name must be at least 2 characters';
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value || !emailRegex.test(value)) {
          errors.email = 'Valid email address required';
        }
        break;

      case 'password':
        if (!value || value.length < 8) {
          errors.password = 'Password must be at least 8 characters';
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(value)) {
          errors.password = 'Password must contain uppercase, lowercase, and number';
        }
        break;

      case 'confirmPassword':
        if (value !== form.password) {
          errors.confirmPassword = 'Passwords do not match';
        }
        break;

      case 'phone':
        if (value && value.trim() !== '') {
          if (!/^[6-9]\d{9}$/.test(value)) {
            errors.phone = 'Valid 10-digit Indian mobile number required';
          }
        }
        break;

      case 'state':
        if (!value) {
          errors.state = 'State is required';
        }
        break;

      case 'district':
        if (!value) {
          errors.district = 'District is required';
        }
        break;

      default:
        break;
    }

    return errors;
  };

  // Update field with validation
  const set = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [field]: value }));

    // Clear field error when user starts typing
    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });

    // Validate on change for better UX
    const fieldError = validateField(field, value);
    if (Object.keys(fieldError).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...fieldError }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Validate all fields
    const validationErrors = {};
    Object.keys(form).forEach((field) => {
      const fieldError = validateField(field, form[field]);
      if (Object.keys(fieldError).length > 0) {
        validationErrors[field] = fieldError[field];
      }
    });

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError('Please fix the errors below');
      return;
    }

    try {
      const { user } = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || null,
        state: normalizeStateName(form.state),
        district: normalizeStateName(form.district),
      });

      toast.success('Account created! Welcome to Jan Shakti Portal.');
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error details:', err);

      // Parse error response
      let errorMessage = 'Registration failed. Please try again.';
      const backendErrors = {};

      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        err.response.data.errors.forEach((e) => {
          const field = e.field || 'general';
          backendErrors[field] = e.message;
        });
        errorMessage = err.response.data.message || 'Validation failed. Please check your input.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setFieldErrors(backendErrors);
      setError(errorMessage);
    }
  };

  const hasFieldError = (field) => !!fieldErrors[field];

  return (
    <div className="min-h-screen relative overflow-hidden transition-colors duration-300 bg-cover bg-center bg-no-repeat flex flex-col justify-between" style={{ backgroundImage: "url('/login-bg.png')" }}>
      
      {/* Background Tint Overlay */}
      <div className="absolute inset-0 bg-[#f0f4f9]/45 dark:bg-[#070913]/65 backdrop-blur-[2px] pointer-events-none z-0" />

      {/* Liquid morphing blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-indigo-500/15 to-purple-500/15 blur-[100px] pointer-events-none animate-liquid-blob z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[65%] h-[65%] rounded-full bg-gradient-to-br from-blue-500/15 to-teal-500/15 blur-[110px] pointer-events-none animate-liquid-blob-reverse z-0" />

      <div className="relative z-10 w-full flex flex-col min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center flex-grow px-4 py-12">
          <div className="w-full max-w-lg relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, cubicBezier: [0.16, 1, 0.3, 1] }}
              className="bg-white/40 dark:bg-slate-950/45 backdrop-blur-xl border border-white/45 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] p-8 rounded-[28px] relative overflow-hidden transition-all duration-300 hover:border-white/60 dark:hover:border-white/20 animate-fade-in"
            >
              {/* Google processing loader overlay */}
              {googleProcessing && (
                <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md rounded-[28px] z-50 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">Authenticating with Google...</span>
                </div>
              )}
              {/* Header */}
              <div className="text-center mb-8 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg border border-white/20">
                  <span className="text-2xl font-bold text-white font-display">JS</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                  {t('auth.register.title')}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t('auth.register.subtitle')}
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs mb-5"
                >
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1 font-semibold whitespace-pre-wrap">{error}</div>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 relative z-10" noValidate>
                {/* Full Name */}
                <div>
                  <label className="label">{t('auth.register.name')}</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={form.name}
                      onChange={set('name')}
                      className={`input pl-11 ${hasFieldError('name') ? 'input-error' : ''}`}
                      placeholder="Ravi Kumar"
                    />
                  </div>
                  {fieldErrors.name && (
                    <p className="text-red-500 text-xs mt-1 font-semibold">{fieldErrors.name}</p>
                  )}
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('auth.register.email')}</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={set('email')}
                        className={`input pl-11 ${hasFieldError('email') ? 'input-error' : ''}`}
                        placeholder="you@example.com"
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-red-500 text-xs mt-1 font-semibold">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">{t('auth.register.phone')}</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={set('phone')}
                        className={`input pl-11 ${hasFieldError('phone') ? 'input-error' : ''}`}
                        placeholder="9XXXXXXXXX"
                      />
                    </div>
                    {fieldErrors.phone && (
                      <p className="text-red-500 text-xs mt-1 font-semibold">{fieldErrors.phone}</p>
                    )}
                  </div>
                </div>

                {/* State & District */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('auth.register.state')}</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <select
                        required
                        value={form.state}
                        onChange={set('state')}
                        className={`input pl-11 appearance-none ${hasFieldError('state') ? 'input-error' : ''}`}
                      >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map((s) => (
                          <option key={s} value={s.toLowerCase()}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    {fieldErrors.state && (
                      <p className="text-red-500 text-xs mt-1 font-semibold">{fieldErrors.state}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">{t('auth.register.district')}</label>
                    <select
                      required
                      value={form.district}
                      onChange={set('district')}
                      className={`input ${hasFieldError('district') ? 'input-error' : ''}`}
                      disabled={!form.state}
                    >
                      <option value="">Select District</option>
                      {districts.length > 0 ? (
                        districts.map((d) => (
                          <option key={d} value={d.toLowerCase()}>
                            {d}
                          </option>
                        ))
                      ) : (
                        <option value="">No districts available</option>
                      )}
                    </select>
                    {fieldErrors.district && (
                      <p className="text-red-500 text-xs mt-1 font-semibold">{fieldErrors.district}</p>
                    )}
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="label">{t('auth.register.password')}</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={form.password}
                      onChange={set('password')}
                      className={`input pl-11 pr-10 ${hasFieldError('password') ? 'input-error' : ''}`}
                      placeholder="Min. 8 chars"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-red-500 text-xs mt-1 font-semibold">{fieldErrors.password}</p>
                  )}
                  {form.password && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/60 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${strengthColor[strength]}`}
                          style={{ width: `${(strength / 4) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-bold">{strengthLabel[strength]}</span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="label">{t('auth.register.confirm')}</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      required
                      value={form.confirmPassword}
                      onChange={set('confirmPassword')}
                      className={`input pl-11 pr-10 ${hasFieldError('confirmPassword') ? 'input-error' : ''}`}
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {form.confirmPassword &&
                      form.confirmPassword === form.password &&
                      !fieldErrors.confirmPassword && (
                        <CheckCircle size={15} className="absolute right-11 top-1/2 -translate-y-1/2 text-green-500" />
                      )}
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1 font-semibold">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                {/* Terms */}
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  By registering, you agree to the{' '}
                  <a href="#" className="text-brand hover:underline font-bold">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-brand hover:underline font-bold">
                    Privacy Policy
                  </a>
                  .
                </p>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || Object.keys(fieldErrors).length > 0}
                  className="btn-primary w-full py-3.5 disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    t('auth.register.submit')
                  )}
                </button>
              </form>

              {/* GSI Divider & Button */}
              <div className="relative my-5 relative z-10">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/50 dark:border-slate-800/50" />
                </div>
                <div className="relative flex justify-center text-xs font-bold uppercase tracking-wider">
                  <span className="bg-[#f0f4f9]/80 dark:bg-[#070913]/80 px-3 text-slate-400 dark:text-slate-500 rounded-md backdrop-blur-sm">Or continue with</span>
                </div>
              </div>

              <div className="w-full relative z-10 flex justify-center">
                <a
                  href="/accounts/google/login/"
                  className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-3 bg-white/40 dark:bg-slate-950/45 border border-white/45 dark:border-white/10 hover:border-white/60 dark:hover:border-white/20 text-slate-800 dark:text-slate-100 font-bold hover:bg-white/50 dark:hover:bg-slate-900/50 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.1)] transition-all duration-300 backdrop-blur-md"
                  style={{ borderRadius: '14px' }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continue with Google</span>
                </a>
              </div>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6 relative z-10 font-semibold">
                {t('auth.register.haveAccount')}{' '}
                <Link to="/login" className="text-brand font-bold hover:underline">
                  {t('auth.register.signin')}
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
