import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusCircle, FileText, Clock, CheckCircle, AlertTriangle, TrendingUp, Search } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import ComplaintCard from '../../components/ComplaintCard';
import StatusBadge from '../../components/StatusBadge';
import CivicHeatmap from '../../components/CivicHeatmap';
import useAuthStore from '../../store/authStore';
import api from '../../utils/api';
import { formatDate } from '../../utils/constants';
import { useTranslation } from '../../utils/i18n';

const StatCard = ({ icon: Icon, label, value, color, delay }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="stat-card">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  </motion.div>
);

export default function CitizenDashboard() {
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const { data: complaintsData, isLoading } = useQuery({
    queryKey: ['myComplaints'],
    queryFn: () => api.get('/complaints/my').then(r => r.data.data),
  });

  const complaints = complaintsData?.complaints || [];
  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    active: complaints.filter(c => ['under_review', 'investigating', 'action_taken'].includes(c.status)).length,
    closed: complaints.filter(c => c.status === 'closed').length,
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            {t('dashboard.welcome')}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('complaint.submit.subtitle')}
          </p>
        </div>
        <Link to="/submit-complaint" className="btn-primary">
          <PlusCircle size={16} /> {t('nav.file')}
        </Link>
      </div>

      {/* Emergency fast link banner */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 p-4 rounded-3xl bg-red-500/10 dark:bg-red-950/20 border border-red-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-left relative overflow-hidden"
        style={{ borderRadius: '24px', boxShadow: 'inset 0 0 15px rgba(239, 68, 68, 0.15)' }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/20 animate-pulse">
            <span className="text-xl">🚨</span>
          </div>
          <div>
            <h4 className="font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider text-xs font-display">
              High-Risk Hazard / Emergency Reporting
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 leading-relaxed">
              Facing immediate threats like fire, flooding, accidents, or electrical hazards? Dispatch a maximum-priority alert to public safety teams instantly.
            </p>
          </div>
        </div>
        <Link to="/emergency" className="btn-primary py-2.5 px-6 text-xs bg-gradient-to-r from-red-600 to-rose-600 border-0 flex-shrink-0 font-extrabold uppercase tracking-wider hover:scale-[1.03] active:scale-95 transition-all shadow-md shadow-red-500/20 animate-bounce" style={{ boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)' }}>
          🚨 Dispatch Alert
        </Link>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FileText} label={t('dashboard.total')} value={stats.total} color="bg-brand-600" delay={0} />
        <StatCard icon={Clock} label={t('dashboard.pending')} value={stats.pending} color="bg-amber-500" delay={0.05} />
        <StatCard icon={TrendingUp} label={t('dashboard.active')} value={stats.active} color="bg-purple-600" delay={0.1} />
        <StatCard icon={CheckCircle} label={t('dashboard.closed')} value={stats.closed} color="bg-green-600" delay={0.15} />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="card p-5 bg-gradient-to-br from-brand-700 to-brand-600 text-white border-0">
          <PlusCircle size={28} className="mb-3 opacity-90" />
          <h3 className="font-bold text-lg mb-1 font-display">{t('complaint.submit.title')}</h3>
          <p className="text-brand-100 text-sm mb-4 leading-relaxed">Submit a new grievance about civic issues, corruption or public crimes.</p>
          <Link to="/submit-complaint" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-brand-700 font-semibold text-sm hover:bg-brand-50 transition-colors">
            Get Started →
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="card p-5">
          <Search size={28} className="mb-3 text-slate-400" />
          <h3 className="font-bold text-lg mb-1 font-display text-slate-900 dark:text-white">Track by ID</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 leading-relaxed">Check complaint status using your Complaint ID.</p>
          <Link to="/track" className="btn-outline text-sm">
            Track Complaint →
          </Link>
        </motion.div>
      </div>

      {/* Live Civic Heatmap */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.25 }}
        className="mb-8"
      >
        <CivicHeatmap />
      </motion.div>

      {/* Recent complaints */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
            My Complaints
            {complaints.length > 0 && <span className="ml-2 text-sm font-normal text-slate-400">({complaints.length})</span>}
          </h2>
          {complaints.length > 5 && (
            <Link to="/dashboard?all=true" className="text-sm text-brand-600 dark:text-brand-400 hover:underline">View all</Link>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="flex gap-3">
                  <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mt-3" />
                <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded mt-2" />
              </div>
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="card p-12 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No complaints yet</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
              Have a grievance? File your first complaint and we'll route it to the right authority.
            </p>
            <Link to="/submit-complaint" className="btn-primary">File First Complaint</Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {complaints.slice(0, 5).map((c, i) => (
              <ComplaintCard key={c.id} complaint={c} index={i} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
