import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Search, FileText, Bell, ChevronRight, CheckCircle, Globe, Lock, Zap, Award, Phone, Mail, Activity, MapPin, Cpu, MessageSquare, Mic, Command, Volume2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import CivicHeatmap from '../components/CivicHeatmap';
import { useTranslation } from '../utils/i18n';

const STATS = [
  { value: '2.4L+', label: 'Complaints Resolved', icon: CheckCircle },
  { value: '98%', label: 'Routing Accuracy', icon: Zap },
  { value: '36', label: 'States & UTs Covered', icon: Globe },
  { value: '72hr', label: 'Avg. Response Time', icon: Bell },
];

const STEPS = [
  { step: '01', title: 'Register & Login', desc: 'Create your account with basic details. Anonymous submission also available.', icon: '📝' },
  { step: '02', title: 'File Your Complaint', desc: 'Describe your grievance with location, category, and supporting evidence.', icon: '📤' },
  { step: '03', title: 'Auto-Routing', desc: 'Our smart engine routes your complaint to the correct authority instantly.', icon: '🔀' },
  { step: '04', title: 'Track & Resolve', desc: 'Get real-time updates as authorities take action on your complaint.', icon: '✅' },
];

const FEATURES = [
  { icon: Shield, title: 'Secure & Encrypted', desc: 'End-to-end encryption ensures your data stays private and protected.', color: 'text-blue-600' },
  { icon: Zap, title: 'Smart Routing', desc: 'AI-powered engine routes complaints to the right authority automatically.', color: 'text-amber-600' },
  { icon: Bell, title: 'Real-time Updates', desc: 'WebSocket-powered notifications keep you informed at every stage.', color: 'text-green-600' },
  { icon: Lock, title: 'Anonymous Option', desc: 'Submit complaints anonymously to protect your identity when needed.', color: 'text-purple-600' },
  { icon: Globe, title: 'Multi-language', desc: 'Available in English, Hindi, Telugu, Tamil, and 6 more regional languages.', color: 'text-red-600' },
  { icon: Award, title: 'Escalation System', desc: 'Unresolved complaints automatically escalate to higher authorities.', color: 'text-teal-600' },
];

const FadeIn = ({ children, delay = 0, className = '' }) => (
  <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay, duration: 0.5 }} className={className}>
    {children}
  </motion.div>
);

export default function LandingPage() {
  const [trackId, setTrackId] = useState('');
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden text-slate-900 dark:text-white bg-transparent">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/10 dark:bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-brand-400/10 dark:bg-brand-400/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 dark:bg-slate-900/60 border border-white dark:border-white/5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 shadow-sm backdrop-blur-sm mb-8"
              style={{ boxShadow: 'var(--clay-shadow-sm)' }}>
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              {t('landing.hero.badge')}
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6 font-display tracking-tight text-slate-900 dark:text-white">
              <span>{t('landing.hero.titleLine1')}</span>
              <br />
              <span className="text-gradient font-black">{t('landing.hero.titleLine2')}</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed font-semibold">
              {t('landing.hero.subtitle')}
            </motion.p>

            {/* Quick track input */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-3 max-w-xl mx-auto mb-10 bg-white/40 dark:bg-slate-950/45 backdrop-blur-xl border border-white/45 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-4 rounded-[24px] relative z-20">
              <div className="relative flex-1 w-full">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('landing.hero.trackPlaceholder')}
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value)}
                  className="input pl-11 w-full"
                />
              </div>
              <Link to={trackId ? `/track/${trackId}` : '/track'} className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 whitespace-nowrap">
                <Search size={15} /> {t('landing.hero.trackButton')}
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="flex flex-wrap justify-center gap-4">
              <Link to="/register" className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg hover:-translate-y-[1px] active:scale-[0.98] transition-all">
                {t('landing.hero.fileButton')} <ChevronRight size={16} />
              </Link>
              <Link to="/login" className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/40 dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 border border-white/30 dark:border-white/5 font-bold hover:bg-white/60 dark:hover:bg-slate-800/60 hover:-translate-y-[1px] active:scale-[0.98] transition-all backdrop-blur-sm">
                {t('landing.hero.loginButton')}
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="py-12 bg-transparent relative z-10 border-b border-slate-200/20 dark:border-slate-800/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <FadeIn key={stat.label} delay={i * 0.1}>
                <div 
                  className="card p-5 text-center bg-white/40 dark:bg-slate-950/45 backdrop-blur-xl border border-white/45 dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 transition-all"
                  style={{ borderRadius: '20px' }}
                >
                  <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-display mb-1.5">{stat.value}</div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{stat.label}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LIVE TELEMETRY & HEATMAP ===== */}
      <section className="py-20 px-4 sm:px-6 relative overflow-hidden bg-transparent">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-brand-400/5 dark:bg-brand-400/10 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <FadeIn className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider shadow-sm backdrop-blur-sm border border-indigo-500/20 mb-4 animate-pulse">
              <span className="flex h-1.5 w-1.5 rounded-full bg-red-500" />
              Live Telemetry
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white font-display tracking-tight">
              Real-Time Civic <span className="text-gradient">Density & Heatmap</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-semibold leading-relaxed">
              Monitor active citizen grievances, severity distributions, and municipal distress coordinates dynamically mapped to ensure high-priority resource routing.
            </p>
          </FadeIn>

          <div className="grid lg:grid-cols-12 gap-8 items-stretch mt-8">
            {/* Map Display Column */}
            <div className="lg:col-span-7 xl:col-span-8">
              <FadeIn delay={0.1} className="h-full">
                <CivicHeatmap />
              </FadeIn>
            </div>

            {/* About Heat Map Explanation Column */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col justify-between">
              <FadeIn delay={0.2} className="h-full">
                <div className="card h-full p-6 sm:p-8 flex flex-col justify-between bg-white/40 dark:bg-slate-950/45 backdrop-blur-xl border border-white/45 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]" style={{ borderRadius: '28px' }}>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 font-display flex items-center gap-2">
                      <span className="text-lg">📊</span> How the Heatmap Operates
                    </h3>
                    
                    <div className="space-y-6">
                      {/* Pt 1 */}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-white/20">
                          <MapPin size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-950 dark:text-white text-sm">Coordinate Reverse-Geocoding</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                            Whenever a grievance is registered with photo metadata or manual selection, our engines reverse-geocode coordinates to attach to municipal ward boundaries.
                          </p>
                        </div>
                      </div>

                      {/* Pt 2 */}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-white/20">
                          <Activity size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-950 dark:text-white text-sm">Density Clustering Algorithms</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                            The system continuously calculates hot zones by grouping coordinates based on severity level. Emergency issues (pulsing red) trigger local agency alerts instantly.
                          </p>
                        </div>
                      </div>

                      {/* Pt 3 */}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-white/20">
                          <Cpu size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-950 dark:text-white text-sm">Smart Municipal Resource Planning</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                            Local authorities use this live telemetry to identify chronic infrastructure deficits (e.g. repeated sewage issues in specific blocks) and allocate budgets intelligently.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-200/40 dark:border-slate-800/40">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold bg-white/20 dark:bg-slate-900/20 p-3.5 rounded-xl border border-white/10">
                      <span>Telemetry Status:</span>
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        ACTIVE FEED
                      </span>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ===== AI ASSISTANCE SUITE ===== */}
      <section className="py-20 px-4 sm:px-6 relative overflow-hidden bg-transparent border-t border-slate-200/20 dark:border-slate-800/20">
        <div className="max-w-6xl mx-auto relative z-10">
          <FadeIn className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider shadow-sm backdrop-blur-sm border border-indigo-500/20 mb-4">
              🤖 Cognitive Assistance
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white font-display tracking-tight">
              Next-Gen <span className="text-gradient">Intelligent AI Assistance</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-semibold leading-relaxed">
              Equipped with real-time text parsing and continuous speech reasoning to ensure filing a complaint is accessible, lightning-fast, and inclusive.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-8 mt-8">
            {/* Card 1: Chatbot */}
            <FadeIn delay={0.1} className="h-full">
              <div className="card h-full p-6 sm:p-8 flex flex-col justify-between bg-white/40 dark:bg-slate-950/45 backdrop-blur-xl border border-white/45 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]" style={{ borderRadius: '28px' }}>
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                        <MessageSquare size={22} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-950 dark:text-white text-base">Conversational AI Chatbot</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">24/7 Citizen Desk Companion</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-extrabold tracking-wider uppercase border border-indigo-500/20">ONLINE</span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold mb-6">
                    Our AI Chatbot acts as your automated citizen helper. Fully decoupled from speech inputs, it reads text queries, checks your profile details, auto-categorizes issue descriptions, and guides you to resolutions.
                  </p>

                  {/* Core Features */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                      <div>
                        <span className="font-bold text-slate-950 dark:text-white text-xs block">Full Context Awareness</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block font-medium">Remembers issue coordinates, categories, and documents submitted to solve cross-department queries.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                      <div>
                        <span className="font-bold text-slate-950 dark:text-white text-xs block">Dynamic Page Navigation</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block font-medium">Instantly routes you directly to dashboard modules or filing steps through easy conversational cues.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Commands area */}
                <div className="mt-8 pt-6 border-t border-slate-200/40 dark:border-slate-800/40">
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                    <Command size={10} /> Quick Text Commands
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['login', 'register', 'map', 'dashboard'].map(cmd => (
                      <span key={cmd} className="px-3 py-1.5 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold border border-slate-200/30 dark:border-slate-800/30 select-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                        /{cmd}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Card 2: Voice Assist */}
            <FadeIn delay={0.2} className="h-full">
              <div className="card h-full p-6 sm:p-8 flex flex-col justify-between bg-white/40 dark:bg-slate-950/45 backdrop-blur-xl border border-white/45 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]" style={{ borderRadius: '28px' }}>
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-500/20">
                        <Mic size={22} className="animate-pulse" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-950 dark:text-white text-base">Hands-Free AI Voice Assistant</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Adaptive Audio Navigation</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[9px] font-extrabold tracking-wider uppercase border border-brand-500/20">STANDBY</span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold mb-6">
                    The Voice Assistant allows hands-free navigation across the portal. Triggered by clicking the floating microphone widget or using the system shortcut, it dynamically translates speech into actions.
                  </p>

                  {/* Core Features */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5" />
                      <div>
                        <span className="font-bold text-slate-950 dark:text-white text-xs block">Phonetic Accent Recognition</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block font-medium">Fine-tuned to recognize diverse Indian accents and language mixes in English, Hindi, Telugu, and Tamil.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5" />
                      <div>
                        <span className="font-bold text-slate-950 dark:text-white text-xs block">Multi-Turn Intent Safeguards</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block font-medium">Ensures critical submissions (like submitting a grievance) require voice-based safety confirmations to prevent accidental triggers.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hotkeys area */}
                <div className="mt-8 pt-6 border-t border-slate-200/40 dark:border-slate-800/40">
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                    <Volume2 size={10} /> Hotkey Activation Shortcut
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <span className="px-2.5 py-1.5 rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-bold font-mono shadow-sm">Alt</span>
                      <span className="text-xs font-bold text-slate-400 self-center">+</span>
                      <span className="px-2.5 py-1.5 rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-bold font-mono shadow-sm">V</span>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase">Press keys on any page</span>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-20 px-4 sm:px-6 bg-transparent relative z-10 border-b border-slate-200/20 dark:border-slate-800/20">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider shadow-sm backdrop-blur-sm border border-indigo-500/20 mb-4">{t('landing.section.process')}</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white font-display">{t('landing.section.howItWorks')}</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-xl mx-auto font-semibold">{t('landing.section.howItWorksDesc')}</p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <FadeIn key={step.step} delay={i * 0.1}>
                <div className="relative card p-6 h-full bg-white/40 dark:bg-slate-950/45 backdrop-blur-xl border border-white/45 dark:border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.04)]" style={{ borderRadius: '24px' }}>
                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-10 -right-3 w-6 h-0.5 bg-slate-200/50 dark:bg-slate-700/50 z-10" />
                  )}
                  <div className="text-3xl mb-4">{step.icon}</div>
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2 font-mono">{step.step}</div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ROUTING INFO ===== */}
      <section className="py-20 px-4 sm:px-6 bg-transparent relative z-10 border-b border-slate-200/20 dark:border-slate-800/20">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saffron-400/10 text-saffron-600 dark:text-saffron-400 text-xs font-bold uppercase tracking-wider shadow-sm backdrop-blur-sm border border-saffron-500/20 mb-4">Smart Routing Engine</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white font-display">Complaints Reach the Right Authority</h2>
          </FadeIn>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: '🚔', type: 'Crime', auth: 'Police Station (PS)', desc: 'Theft, assault, cybercrime, domestic violence and all criminal matters.', color: 'border-red-200/40 dark:border-red-900/40', header: 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400' },
              { icon: '⚖️', type: 'Corruption', auth: 'Anti-Corruption Bureau', desc: 'Bribery, embezzlement, government misconduct and public funds misuse.', color: 'border-purple-200/40 dark:border-purple-900/40', header: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' },
              { icon: '🏛️', type: 'Civic Issues', auth: 'Municipal Authority', desc: 'Roads, water, sewage, electricity, garbage collection and public works.', color: 'border-teal-200/40 dark:border-teal-900/40', header: 'bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400' },
            ].map((item, i) => (
              <FadeIn key={item.type} delay={i * 0.1}>
                <div className={`rounded-2xl border overflow-hidden bg-white/40 dark:bg-slate-950/45 backdrop-blur-xl shadow-[0_15px_35px_rgba(0,0,0,0.04)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.25)] ${item.color}`} style={{ borderRadius: '24px' }}>
                  <div className={`px-5 py-4 ${item.header} border-b border-white/20`}>
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="font-extrabold text-sm uppercase tracking-wider">{item.type}</div>
                  </div>
                  <div className="px-5 py-5 bg-transparent">
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Routed to</div>
                    <div className="font-bold text-slate-950 dark:text-white text-sm mb-2">{item.auth}</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">{item.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="py-20 px-4 sm:px-6 bg-transparent relative z-10 border-b border-slate-200/20 dark:border-slate-800/20">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white font-display">Built for Transparency & Trust</h2>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.07}>
                <div className="card p-6 h-full bg-white/40 dark:bg-slate-950/45 backdrop-blur-xl border border-white/45 dark:border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.04)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.25)]" style={{ borderRadius: '24px' }}>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center border border-white/10 mb-4">
                    <f.icon size={20} className={`${f.color}`} />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-sm uppercase tracking-wider">{f.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 px-4 sm:px-6 bg-transparent relative z-10">
        <FadeIn className="max-w-3xl mx-auto text-center">
          <div className="card p-10 sm:p-14 bg-white/40 dark:bg-slate-950/45 backdrop-blur-xl border border-white/45 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]" style={{ borderRadius: '32px' }}>
            <h2 className="text-3xl sm:text-4xl font-black mb-4 font-display tracking-tight text-slate-900 dark:text-white">{t('landing.cta.title')}</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-10 text-sm sm:text-base font-semibold max-w-xl mx-auto leading-relaxed">{t('landing.cta.subtitle')}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register" className="px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
                {t('landing.cta.register')}
              </Link>
              <Link to="/track" className="px-8 py-3.5 rounded-xl bg-white/40 dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 border border-white/30 dark:border-white/5 font-bold hover:bg-white/60 dark:hover:bg-slate-800/60 hover:-translate-y-[1px] active:scale-[0.98] transition-all backdrop-blur-sm">
                {t('landing.cta.track')}
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-10 px-4 sm:px-6 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-bold text-white font-display mb-1">Jan Shakti Grievance Portal</div>
              <div className="text-sm">© {new Date().getFullYear()} Government of India. All rights reserved.</div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="tel:1800111000" className="flex items-center gap-1.5 hover:text-white transition-colors"><Phone size={14} /> 1800-111-000</a>
              <a href="mailto:help@grievanceportal.gov.in" className="flex items-center gap-1.5 hover:text-white transition-colors"><Mail size={14} /> Help Desk</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
