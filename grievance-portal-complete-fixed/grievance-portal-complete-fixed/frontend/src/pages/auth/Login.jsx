import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import Navbar from '../../components/Navbar';
import { useTranslation } from '../../utils/i18n';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [googleProcessing, setGoogleProcessing] = useState(false);
  const { login, googleLogin, isLoading } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const REDIRECT_MAP = {
    citizen: '/dashboard',
    ps_officer: '/ps-dashboard',
    acb_officer: '/acb-dashboard',
    municipal_officer: '/municipal-dashboard',
    super_admin: '/admin',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { user } = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(REDIRECT_MAP[user.role] || '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };




  return (
    <div className="min-h-screen relative overflow-hidden transition-colors duration-300 bg-cover bg-center bg-no-repeat flex flex-col justify-between" style={{ backgroundImage: "url('/login-bg.png')" }}>
      
      {/* Background Tint Overlay */}
      <div className="absolute inset-0 bg-[#f0f4f9]/45 dark:bg-[#070913]/65 backdrop-blur-[2px] pointer-events-none z-0" />

      {/* Morphing Liquid Gradients */}
      <div className="absolute top-[-15%] left-[-15%] w-[65%] h-[65%] rounded-full bg-gradient-to-br from-indigo-500/15 to-purple-500/15 blur-[100px] pointer-events-none animate-liquid-blob z-0" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-blue-500/15 to-teal-500/15 blur-[110px] pointer-events-none animate-liquid-blob-reverse z-0" />

      <div className="relative z-10 w-full flex flex-col min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center flex-grow px-4 py-12">
          <div className="w-full max-w-md relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 24, scale: 0.98 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              transition={{ duration: 0.4, cubicBezier: [0.16, 1, 0.3, 1] }}
              className="bg-white/40 dark:bg-slate-950/45 backdrop-blur-xl border border-white/45 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] p-8 rounded-[28px] relative overflow-hidden transition-all duration-300 hover:border-white/60 dark:hover:border-white/20"
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
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display tracking-tight">{t('auth.login.title')}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('auth.login.subtitle')}</p>
              </div>


              {/* Error */}
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs mb-5"
                >
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span className="font-semibold">{error}</span>
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                <div>
                  <label className="label">{t('auth.login.email')}</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="input pl-11" placeholder="you@example.com" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label mb-0">{t('auth.login.password')}</label>
                    <a href="#" className="text-xs text-brand hover:underline font-bold">{t('auth.login.forgot')}</a>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={showPass ? 'text' : 'password'} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="input pl-11 pr-10" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="btn-primary w-full py-3.5 mt-2">
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : t('auth.login.submit')}
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

              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6 relative z-10 font-medium">
                {t('auth.login.noAccount')}{' '}
                <Link to="/register" className="text-brand font-bold hover:underline">{t('auth.login.createAccount')}</Link>
              </p>
            </motion.div>

            <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-5 font-semibold">
              Protected by end-to-end encryption • Government of India
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

