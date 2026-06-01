import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Paperclip, Clock, User, ExternalLink } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import StatusBadge, { CategoryBadge, SeverityBadge } from '../../components/StatusBadge';
import api from '../../utils/api';
import { formatDateTime, STATUS_LABELS, AUTHORITY_TYPE_INFO } from '../../utils/constants';

export default function ComplaintDetail() {
  const { id } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => api.get(`/complaints/${id}`).then(r => r.data.data),
  });

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="card p-10 text-center">
        <div className="text-4xl mb-3">❌</div>
        <h3 className="font-bold text-slate-900 dark:text-white mb-2">Complaint Not Found</h3>
        <Link to="/dashboard" className="btn-primary mt-4">← Back to Dashboard</Link>
      </div>
    </DashboardLayout>
  );

  const c = data;
  const authorityInfo = AUTHORITY_TYPE_INFO[c.routing?.authorityType];

  return (
    <DashboardLayout>
      {/* Back */}
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="max-w-3xl space-y-5">
        {/* Header Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
          <div className="bg-gradient-to-r from-brand-900 to-brand-700 px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-mono text-sm text-brand-200 mb-1">{c.complaintId}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={c.category} />
                  <SeverityBadge severity={c.severity} />
                  <span className="text-white/70 text-sm capitalize">{c.subcategory?.replace(/_/g, ' ')}</span>
                </div>
              </div>
              <StatusBadge status={c.status} />
            </div>
          </div>

          <div className="p-5 grid sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Filed On</div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-white">
                <Calendar size={13} className="text-slate-400" /> {formatDateTime(c.createdAt)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Location</div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-white capitalize">
                <MapPin size={13} className="text-slate-400" /> {c.location?.district}, {c.location?.state}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Routed To</div>
              <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                {authorityInfo?.icon} {authorityInfo?.label || 'Authority'}
              </div>
            </div>
          </div>

          {/* Status info bar */}
          <div className={`mx-5 mb-5 p-3 rounded-lg text-sm flex items-start gap-2
            ${c.status === 'closed' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
              c.status === 'pending' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
              'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'}`}>
            <span className="text-base mt-0.5">ℹ️</span>
            <div>
              <div className="font-semibold">{STATUS_LABELS[c.status]?.label}</div>
              <div className="opacity-80 text-xs mt-0.5">{STATUS_LABELS[c.status]?.description}</div>
            </div>
          </div>
        </motion.div>

        {/* Description */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5">
          <h3 className="font-bold text-slate-900 dark:text-white mb-3 font-display">Complaint Description</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{c.description}</p>
          {c.location?.address && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Incident Address</span>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{c.location.address}</p>
            </div>
          )}
        </motion.div>

        {/* Attachments */}
        {c.attachments && c.attachments.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
            <h3 className="font-bold text-slate-900 dark:text-white mb-3 font-display flex items-center gap-2">
              <Paperclip size={16} /> Attachments ({c.attachments.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {c.attachments.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noreferrer"
                  className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:border-brand-400 transition-colors">
                  {a.type?.startsWith('image') ? (
                    <img src={a.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-3">
                      <Paperclip size={20} className="mx-auto mb-1 text-slate-400" />
                      <div className="text-xs text-slate-500 truncate">{a.originalName}</div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ExternalLink size={18} className="text-white" />
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Timeline */}
        {c.statusHistory && c.statusHistory.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5">
            <h3 className="font-bold text-slate-900 dark:text-white mb-5 font-display">Activity Timeline</h3>
            <div>
              {[...c.statusHistory].reverse().map((entry, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${entry.status === 'closed' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-brand-100 dark:bg-brand-900/30'}`}>
                      <Clock size={13} className={entry.status === 'closed' ? 'text-green-600' : 'text-brand-600'} />
                    </div>
                    {i < c.statusHistory.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mt-1.5" />}
                  </div>
                  <div className={`pb-5 flex-1 ${i === c.statusHistory.length - 1 ? '' : ''}`}>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <StatusBadge status={entry.status} size="sm" />
                      <span className="text-xs text-slate-400">{formatDateTime(entry.timestamp)}</span>
                    </div>
                    {entry.remarks && <p className="text-sm text-slate-600 dark:text-slate-400">{entry.remarks}</p>}
                    {entry.updatedBy && entry.updatedBy !== 'system' && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><User size={10} /> {entry.updatedBy}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Proof uploads from authority */}
        {c.proofUploads && c.proofUploads.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-5">
            <h3 className="font-bold text-slate-900 dark:text-white mb-3 font-display">Authority Proof Documents</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {c.proofUploads.map((p, i) => (
                <a key={i} href={p.url} target="_blank" rel="noreferrer" className="group rounded-xl border border-slate-200 dark:border-slate-700 aspect-square bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:border-green-400 transition-colors">
                  {p.type?.startsWith('image') ? (
                    <img src={p.url} alt="" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Paperclip size={20} className="text-slate-400" />
                  )}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
