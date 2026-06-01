import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import api from '../../utils/api';
import { formatDateTime } from '../../utils/constants';

const ESCALATION_COLORS = { 1: '#f59e0b', 2: '#f97316', 3: '#dc2626' };
const ESCALATION_LABELS = { 1: 'Level 1 — District', 2: 'Level 2 — State', 3: 'Level 3 — National' };

export default function EscalationsPage() {
  const { data: complaints, isLoading } = useQuery({
    queryKey: ['escalatedComplaints'],
    queryFn: () => api.get('/admin/complaints?escalated=true').then(r =>
      r.data.data.complaints.filter(c => c.isEscalated)
    ),
  });

  const escalated = complaints || [];

  const byLevel = [1, 2, 3].map(level => ({
    name: ESCALATION_LABELS[level],
    value: escalated.filter(c => c.escalationLevel === level).length,
    fill: ESCALATION_COLORS[level],
  }));

  const byCategory = ['crime', 'corruption', 'civic_issue'].map(cat => ({
    name: cat.replace('_', ' '),
    escalated: escalated.filter(c => c.category === cat).length,
  }));

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={20} className="text-red-500" />
          <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">Admin View</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Escalations Monitor</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Complaints that have been auto-escalated due to inaction</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Escalated', value: escalated.length, icon: AlertTriangle, color: 'bg-red-500' },
          { label: 'Level 1', value: byLevel[0].value, icon: Clock, color: 'bg-amber-500' },
          { label: 'Level 2', value: byLevel[1].value, icon: TrendingUp, color: 'bg-orange-500' },
          { label: 'Level 3 (Critical)', value: byLevel[2].value, icon: AlertTriangle, color: 'bg-red-700' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={18} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 font-display">By Escalation Level</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byLevel} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, value }) => value > 0 ? `${value}` : ''}>
                {byLevel.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {byLevel.map(l => (
              <div key={l.name} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.fill }} />
                {l.name.split('—')[0].trim()} ({l.value})
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 font-display">By Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="escalated" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Escalated complaints table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white font-display">Escalated Complaints</h3>
          <span className="text-xs text-slate-400">{escalated.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                {['Complaint ID', 'Category', 'Level', 'Status', 'Location', 'Due Date', 'Days Overdue'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : escalated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <CheckCircle size={28} className="mx-auto mb-2 text-green-400" />
                    <p className="font-medium text-slate-700 dark:text-slate-300">No escalated complaints</p>
                    <p className="text-xs mt-1">All complaints are being handled within the deadline</p>
                  </td>
                </tr>
              ) : (
                escalated.map(c => {
                  const due = c.escalationDue ? new Date(c.escalationDue) : null;
                  const daysOverdue = due ? Math.ceil((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                  return (
                    <tr key={c.id} className="hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">{c.complaintId}</span>
                      </td>
                      <td className="px-4 py-3 capitalize text-xs text-slate-600 dark:text-slate-400">{c.category?.replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        <span className={`badge text-xs`} style={{ background: `${ESCALATION_COLORS[c.escalationLevel]}20`, color: ESCALATION_COLORS[c.escalationLevel] }}>
                          Level {c.escalationLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} size="sm" /></td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 capitalize">{c.location?.district}, {c.location?.state}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{due ? formatDateTime(due.toISOString()) : '—'}</td>
                      <td className="px-4 py-3">
                        {daysOverdue > 0 ? (
                          <span className="text-xs font-bold text-red-600 dark:text-red-400">{daysOverdue}d overdue</span>
                        ) : (
                          <span className="text-xs text-green-600 dark:text-green-400">Within deadline</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
