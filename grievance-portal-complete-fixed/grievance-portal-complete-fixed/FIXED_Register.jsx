import { useState } from 'react';
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
  const { register, isLoading } = useAuthStore();
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
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-green-500'];

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
        // Map validation errors by field
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-66px)] px-4 py-12">
        <div className="w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-8"
          >
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-gov flex items-center justify-center mx-auto mb-4 shadow-gov">
                <span className="text-2xl font-bold text-white font-display">JS</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
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
                className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm mb-5"
              >
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <div className="flex-1 whitespace-pre-wrap">{error}</div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Full Name */}
              <div>
                <label className="label">{t('auth.register.name')}</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={form.name}
                    onChange={set('name')}
                    className={`input pl-10 ${hasFieldError('name') ? 'input-error' : ''}`}
                    placeholder="Ravi Kumar"
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                )}
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('auth.register.email')}</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={set('email')}
                      className={`input pl-10 ${hasFieldError('email') ? 'input-error' : ''}`}
                      placeholder="you@example.com"
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="label">{t('auth.register.phone')}</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={set('phone')}
                      className={`input pl-10 ${hasFieldError('phone') ? 'input-error' : ''}`}
                      placeholder="9XXXXXXXXX"
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>
                  )}
                </div>
              </div>

              {/* State & District */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('auth.register.state')}</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      required
                      value={form.state}
                      onChange={set('state')}
                      className={`input pl-10 appearance-none ${hasFieldError('state') ? 'input-error' : ''}`}
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
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.state}</p>
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
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.district}</p>
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="label">{t('auth.register.password')}</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={form.password}
                    onChange={set('password')}
                    className={`input pl-10 pr-10 ${hasFieldError('password') ? 'input-error' : ''}`}
                    placeholder="Min. 8 chars"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
                )}
                {form.password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${strengthColor[strength]}`}
                        style={{ width: `${(strength / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{strengthLabel[strength]}</span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="label">{t('auth.register.confirm')}</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    className={`input pl-10 pr-10 ${hasFieldError('confirmPassword') ? 'input-error' : ''}`}
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {form.confirmPassword &&
                    form.confirmPassword === form.password &&
                    !fieldErrors.confirmPassword && (
                      <CheckCircle size={16} className="absolute right-10 top-1/2 -translate-y-1/2 text-green-500" />
                    )}
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {/* Terms */}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                By registering, you agree to the{' '}
                <a href="#" className="text-brand-600 dark:text-brand-400 hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-brand-600 dark:text-brand-400 hover:underline">
                  Privacy Policy
                </a>
                .
              </p>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || Object.keys(fieldErrors).length > 0}
                className="btn-primary w-full py-3 disabled:opacity-50"
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

            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
              {t('auth.register.haveAccount')}{' '}
              <Link to="/login" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
                {t('auth.register.signin')}
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
