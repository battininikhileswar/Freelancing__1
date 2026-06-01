import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, RefreshCw, Upload, X, AlertTriangle, CheckCircle, Clock, FileText, User, MapPin, Calendar, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/DashboardLayout';
import StatusBadge, { CategoryBadge } from '../../components/StatusBadge';
import api from '../../utils/api';
import { formatDateTime, STATUS_LABELS, timeAgo } from '../../utils/constants';
import { useTranslation } from '../../utils/i18n';

const STATUS_OPTIONS = ['pending', 'under_review', 'investigating', 'action_taken', 'closed', 'rejected'];

function ComplaintRow({ complaint, onSelect, selected }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(complaint)}
      className={`card p-4 cursor-pointer transition-all duration-150 ${selected?.id === complaint.id ? 'border-brand-400 dark:border-brand-600 shadow-gov' : 'hover:border-slate-300 dark:hover:border-slate-600'}`}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <CategoryBadge category={complaint.category} />
        <StatusBadge status={complaint.status} size="sm" />
        {complaint.isEscalated && (
          <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">⚡ Escalated</span>
        )}
        <span className="font-mono text-xs text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded ml-auto">{complaint.complaintId}</span>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 mb-2">{complaint.description}</p>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1 capitalize"><MapPin size={11} />{complaint.location?.district}, {complaint.location?.state}</span>
        <span className="flex items-center gap-1"><Clock size={11} />{timeAgo(complaint.createdAt)}</span>
        {complaint.isAnonymous ? <span>👤 Anonymous</span> : <span className="flex items-center gap-1"><User size={11} />{complaint.userName}</span>}
        {complaint.attachments?.length > 0 && <span className="flex items-center gap-1"><Paperclip size={11} />{complaint.attachments.length} files</span>}
      </div>
    </motion.div>
  );
}

function UpdateModal({ complaint, onClose, onSuccess }) {
  const [status, setStatus] = useState(complaint.status);
  const [remarks, setRemarks] = useState('');
  const [proofFiles, setProofFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      const fd = new FormData();
      fd.append('status', status);
      fd.append('remarks', remarks);
      proofFiles.forEach(f => fd.append('proofs', f));
      return api.put(`/complaints/${complaint.id}/status`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      toast.success('Status updated successfully!');
      qc.invalidateQueries(['assignedComplaints']);
      setUploading(false);
      onSuccess();
      onClose();
    },
    onError: () => {
      setUploading(false);
      toast.error('Failed to update status.');
    }
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white font-display">Update Complaint Status</h3>
            <div className="font-mono text-xs text-brand-600 dark:text-brand-400 mt-0.5">{complaint.complaintId}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} className="text-slate-500" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Status select */}
          <div>
            <label className="label">New Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-3 py-2 rounded-lg border text-sm text-left capitalize transition-all ${status === s ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/50 font-semibold text-brand-700 dark:text-brand-400' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                  <StatusBadge status={s} showDot={false} size="sm" />
                </button>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="label">Remarks / Action Taken</label>
            <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)}
              className="input resize-none" placeholder="Describe the action taken or reason for status change..." />
          </div>

          {/* Proof upload */}
          <div>
            <label className="label">Attach Proof (Optional)</label>
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 cursor-pointer hover:border-brand-400 dark:hover:border-brand-600 text-sm text-slate-500 dark:text-slate-400 transition-colors">
              <Upload size={15} />
              {proofFiles.length > 0 ? `${proofFiles.length} file(s) selected` : 'Click to upload proof documents'}
              <input type="file" multiple hidden accept="image/*,video/*,application/pdf" onChange={e => setProofFiles(Array.from(e.target.files))} />
            </label>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!status || uploading}
            className="btn-primary flex-1">
            {uploading ? <span className="flex items-center gap-2 justify-center"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating...</span> : '✅ Update Status'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AuthorityDashboard({ authorityType, title, icon, color }) {
  const { t } = useTranslation();
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['assignedComplaints', statusFilter],
    queryFn: () => api.get(`/complaints/authority/assigned${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data.data),
    refetchInterval: 30000,
  });

  const complaints = data?.complaints || [];
  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    active: complaints.filter(c => ['under_review', 'investigating'].includes(c.status)).length,
    escalated: complaints.filter(c => c.isEscalated).length,
    closed: complaints.filter(c => c.status === 'closed').length,
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{icon}</span>
            <span className={`badge text-xs ${color}`}>{authorityType.toUpperCase()}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">{title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Assigned complaints for your jurisdiction</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: FileText, bg: 'bg-brand-600' },
          { label: 'Pending', value: stats.pending, icon: Clock, bg: 'bg-amber-500' },
          { label: 'Active', value: stats.active, icon: CheckCircle, bg: 'bg-purple-600' },
          { label: 'Escalated', value: stats.escalated, icon: AlertTriangle, bg: 'bg-red-500' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={18} className="text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-5">
        <Filter size={16} className="text-slate-400" />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setStatusFilter('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!statusFilter ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-400'}`}>
            All ({stats.total})
          </button>
          {['pending', 'under_review', 'investigating', 'action_taken', 'closed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-400'}`}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Left: List */}
        <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin pr-1">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="flex gap-2 mb-2">
                  <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded mb-1.5" />
                <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            ))
          ) : complaints.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">No Complaints Assigned</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">You're all caught up!</p>
            </div>
          ) : (
            complaints.map(c => <ComplaintRow key={c.id} complaint={c} onSelect={setSelectedComplaint} selected={selectedComplaint} />)
          )}
        </div>

        {/* Right: Detail panel */}
        <div className="hidden lg:block">
          <AnimatePresence mode="wait">
            {selectedComplaint ? (
              <motion.div key={selectedComplaint.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="card p-5 sticky top-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-mono text-xs text-brand-600 dark:text-brand-400 mb-1">{selectedComplaint.complaintId}</div>
                    <CategoryBadge category={selectedComplaint.category} />
                  </div>
                  <StatusBadge status={selectedComplaint.status} />
                </div>

                <div className="space-y-3 mb-5">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Description</div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedComplaint.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Location</div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white capitalize">{selectedComplaint.location?.district}, {selectedComplaint.location?.state}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Filed On</div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{formatDateTime(selectedComplaint.createdAt)}</div>
                    </div>
                  </div>
                  {!selectedComplaint.isAnonymous && selectedComplaint.userName !== 'Anonymous' && (
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Filed By</div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{selectedComplaint.userName}</div>
                    </div>
                  )}
                </div>

                {selectedComplaint.attachments?.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Attachments</div>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedComplaint.attachments.slice(0, 3).map((a, i) => (
                        <a key={i} href={a.url} target="_blank" rel="noreferrer"
                          className="aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:opacity-80 transition-opacity">
                          {a.type?.startsWith('image') ? (
                            <img src={a.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Paperclip size={20} className="text-slate-400" />
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={() => setShowUpdateModal(true)}
                  className="btn-primary w-full">
                  ✏️ Update Status
                </button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="card p-10 text-center border-dashed">
                <FileText size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-400 dark:text-slate-500 text-sm">Select a complaint to view details and take action</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Update Modal */}
      <AnimatePresence>
        {showUpdateModal && selectedComplaint && (
          <UpdateModal complaint={selectedComplaint} onClose={() => setShowUpdateModal(false)} onSuccess={() => setSelectedComplaint(null)} />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
