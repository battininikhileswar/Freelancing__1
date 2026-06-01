import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckCircle, Clock, AlertTriangle, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '../../components/Navbar';
import StatusBadge, { CategoryBadge } from '../../components/StatusBadge';
import api from '../../utils/api';
import { formatDateTime, STATUS_LABELS, AUTHORITY_TYPE_INFO } from '../../utils/constants';

const TimelineItem = ({ entry, isLast }) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${entry.status === 'closed' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-brand-100 dark:bg-brand-900/30'}`}>
        {entry.status === 'closed' ? <CheckCircle size={15} className="text-green-600 dark:text-green-400" /> : <Clock size={15} className="text-brand-600 dark:text-brand-400" />}
      </div>
      {!isLast && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mt-2" />}
    </div>
    <div className="pb-6 flex-1 min-w-0">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <StatusBadge status={entry.status} size="sm" />
        <span className="text-xs text-slate-400">{formatDateTime(entry.timestamp)}</span>
      </div>
      {entry.remarks && <p className="text-sm text-slate-600 dark:text-slate-400">{entry.remarks}</p>}
      {entry.updatedBy && entry.updatedBy !== 'system' && (
        <p className="text-xs text-slate-400 mt-1">by {entry.updatedBy}</p>
      )}
    </div>
  </div>
);

export default function TrackComplaint() {
  const { complaintId: paramId } = useParams();
  const [inputId, setInputId] = useState(paramId || '');
  const [searchId, setSearchId] = useState(paramId || '');
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['track', searchId],
    queryFn: () => api.get(`/complaints/track/${searchId}`).then(r => r.data.data),
    enabled: !!searchId,
    retry: false,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (!inputId.trim()) return;
    setSearchId(inputId.trim().toUpperCase());
    navigate(`/track/${inputId.trim().toUpperCase()}`, { replace: true });
  };

  const authorityInfo = data ? AUTHORITY_TYPE_INFO[data.authorityType] : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-gov mx-auto mb-4 shadow-gov">
            <Search size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-display">Track Your Complaint</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Enter your Complaint ID to check the current status</p>
        </motion.div>

        {/* Search Box */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <form onSubmit={handleSearch} className="flex gap-2 mb-8">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={inputId}
                onChange={e => setInputId(e.target.value.toUpperCase())}
                className="input pl-10 font-mono text-sm"
                placeholder="PS-AP-20240115-A3X9K2"
              />
            </div>
            <button type="submit" className="btn-primary px-6">Track</button>
          </form>
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <div className="card p-8 text-center">
            <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">Searching for complaint...</p>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-8 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">Complaint Not Found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">No complaint found with ID <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{searchId}</span>. Please verify the ID.</p>
          </motion.div>
        )}

        {/* Result */}
        <AnimatePresence>
          {data && !isLoading && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Summary card */}
              <div className="card overflow-hidden">
                <div className="bg-gradient-to-r from-brand-700 to-brand-600 px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-sm font-bold text-brand-200 mb-1">{data.complaintId}</div>
                      <div className="text-white font-bold text-lg font-display capitalize">{data.category?.replace('_', ' ')}</div>
                      <div className="text-brand-200 text-sm capitalize mt-0.5">{data.subcategory?.replace(/_/g, ' ')}</div>
                    </div>
                    <StatusBadge status={data.status} />
                  </div>
                </div>

                <div className="p-5 grid sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Location</div>
                    <div className="flex items-center gap-1 text-sm font-medium text-slate-900 dark:text-white capitalize">
                      <MapPin size={13} className="text-slate-400" />
                      {data.location?.district}, {data.location?.state}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Filed On</div>
                    <div className="flex items-center gap-1 text-sm font-medium text-slate-900 dark:text-white">
                      <Calendar size={13} className="text-slate-400" />
                      {formatDateTime(data.createdAt)}
                    </div>
                  </div>
                  {authorityInfo && (
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Routed To</div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1">
                        <span>{authorityInfo.icon}</span> {authorityInfo.label}
                      </div>
                    </div>
                  )}
                </div>

                {/* Current status highlight */}
                <div className={`mx-5 mb-5 p-3 rounded-lg border text-sm
                  ${data.status === 'closed' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' :
                    data.status === 'pending' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400' :
                    'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'}`}>
                  <div className="font-semibold">{STATUS_LABELS[data.status]?.label}</div>
                  <div className="text-xs mt-0.5 opacity-80">{STATUS_LABELS[data.status]?.description}</div>
                </div>
              </div>

              {/* Timeline */}
              {data.statusHistory && data.statusHistory.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-5 font-display">Activity Timeline</h3>
                  <div>
                    {[...data.statusHistory].reverse().map((entry, i) => (
                      <TimelineItem key={i} entry={entry} isLast={i === data.statusHistory.length - 1} />
                    ))}
                  </div>
                </div>
              )}

              {/* Remarks */}
              {data.remarks && data.remarks.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4 font-display">Remarks from Authority</h3>
                  <div className="space-y-3">
                    {data.remarks.map((r, i) => (
                      <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300">
                        <p>"{r.text}"</p>
                        <div className="text-xs text-slate-400 mt-1.5">— {r.by} • {formatDateTime(r.timestamp)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center">
                <button onClick={() => refetch()} className="btn-secondary text-sm">
                  🔄 Refresh Status
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info box */}
        {!searchId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card p-6 text-center">
            <div className="text-4xl mb-3">🔐</div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">Complaint ID Format</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">Your Complaint ID was sent to your email when you submitted the complaint. It looks like:</p>
            <code className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-brand-600 dark:text-brand-400">PS-AP-20240115-A3X9K2</code>
            <div className="mt-4 flex justify-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <span>PS = Police Station</span>
              <span>•</span>
              <span>ACB = Anti-Corruption</span>
              <span>•</span>
              <span>MUN = Municipal</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
