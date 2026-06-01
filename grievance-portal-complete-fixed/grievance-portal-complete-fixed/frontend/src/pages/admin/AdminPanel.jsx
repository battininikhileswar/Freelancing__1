import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Users, Shield, FileText, BarChart3, Settings, Plus, ToggleLeft, ToggleRight, RefreshCw, Search, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/DashboardLayout';
import StatusBadge, { CategoryBadge } from '../../components/StatusBadge';
import CivicHeatmap from '../../components/CivicHeatmap';
import api from '../../utils/api';
import { formatDate, ROLE_LABELS, AUTHORITY_TYPE_INFO } from '../../utils/constants';

const PIE_COLORS = ['#2563eb', '#7c3aed', '#0d9488'];

// ===== OVERVIEW =====
function Overview() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminAnalytics'],
    queryFn: () => api.get('/admin/analytics').then(r => r.data.data),
  });

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  const categoryData = data ? [
    { name: 'Crime', value: data.byCategory?.crime || 0, color: '#dc2626' },
    { name: 'Corruption', value: data.byCategory?.corruption || 0, color: '#7c3aed' },
    { name: 'Civic', value: data.byCategory?.civic_issue || 0, color: '#0d9488' },
  ] : [];

  const statusData = data ? Object.entries(data.byStatus || {}).map(([k, v]) => ({ name: k.replace('_', ' '), value: v })) : [];
  const monthData = data?.byMonth || [];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Complaints', value: data?.total || 0, color: 'bg-brand-600', icon: '📋' },
          { label: 'Pending', value: data?.byStatus?.pending || 0, color: 'bg-amber-500', icon: '⏳' },
          { label: 'Resolved', value: data?.byStatus?.closed || 0, color: 'bg-green-600', icon: '✅' },
          { label: 'Escalated', value: data?.escalated || 0, color: 'bg-red-500', icon: '⚡' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="stat-card">
            <div className={`w-11 h-11 rounded-xl ${s.color} flex items-center justify-center text-lg flex-shrink-0`}>{s.icon}</div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Category pie */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 font-display">By Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {categoryData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {categoryData.map(c => (
              <div key={c.name} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                {c.name}
              </div>
            ))}
          </div>
        </div>

        {/* Status bar */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 font-display">By Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly trend */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 font-display">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Live Civic Heatmap */}
      <div className="mb-6">
        <CivicHeatmap />
      </div>

      {/* State distribution */}
      {data?.byState && (
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 font-display">By State</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={Object.entries(data.byState).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,value])=>({name,value}))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ===== USERS =====
function UsersPanel() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['adminUsers', roleFilter],
    queryFn: () => api.get(`/admin/users${roleFilter ? `?role=${roleFilter}` : ''}`).then(r => r.data.data.users),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => api.put(`/admin/users/${id}/toggle`),
    onSuccess: () => { toast.success('User status updated.'); qc.invalidateQueries(['adminUsers']); }
  });

  const users = (data || []).filter(u => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 text-sm" placeholder="Search users..." />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input w-auto text-sm">
          <option value="">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Link to="/admin/create-authority" className="btn-primary text-sm">
          <Plus size={15} /> Add Authority
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                {['Name', 'Email', 'Role', 'State/District', 'Status', 'Joined', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>)}
                  </tr>
                ))
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-400">{user.name?.charAt(0)}</div>
                      <span className="font-medium text-slate-900 dark:text-white">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{user.email}</td>
                  <td className="px-4 py-3"><span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">{ROLE_LABELS[user.role]}</span></td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 capitalize text-xs">{user.district}, {user.state}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${user.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {user.isActive ? '● Active' : '● Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleMutation.mutate(user.id)}
                      className={`flex items-center gap-1 text-xs font-medium transition-colors ${user.isActive ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}>
                      {user.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== ALL COMPLAINTS =====
function ComplaintsPanel() {
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminComplaints', statusFilter, categoryFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      return api.get(`/admin/complaints?${params}`).then(r => r.data.data.complaints);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto text-sm">
          <option value="">All Statuses</option>
          {['pending','under_review','investigating','action_taken','closed','rejected'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input w-auto text-sm">
          <option value="">All Categories</option>
          {['crime','corruption','civic_issue'].map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
        </select>
        <button onClick={() => refetch()} className="btn-secondary text-sm"><RefreshCw size={14} /> Refresh</button>
        <div className="ml-auto text-xs text-slate-500 dark:text-slate-400">{data?.length || 0} complaints</div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                {['ID', 'Category', 'Description', 'Location', 'Authority', 'Status', 'Filed'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">{[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>)}</tr>
              )) : (data || []).map(c => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3"><span className="font-mono text-xs text-brand-600 dark:text-brand-400">{c.complaintId}</span></td>
                  <td className="px-4 py-3"><CategoryBadge category={c.category} /></td>
                  <td className="px-4 py-3 max-w-xs"><p className="truncate text-slate-700 dark:text-slate-300 text-xs">{c.description}</p></td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 capitalize">{c.location?.district}, {c.location?.state}</td>
                  <td className="px-4 py-3 text-xs">
                    {c.routing?.authorityType && (
                      <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {AUTHORITY_TYPE_INFO[c.routing.authorityType]?.short || c.routing.authorityType}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} size="sm" /></td>
                  <td className="px-4 py-3 text-xs text-slate-400">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== ADMIN PANEL MAIN =====
const NAV_TABS = [
  { to: '/admin', label: 'Overview', icon: BarChart3, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/complaints', label: 'Complaints', icon: FileText },
];

export default function AdminPanel() {
  const location = useLocation();

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">🔐 Admin Panel</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage users, authorities, and monitor all complaints</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200 dark:border-slate-700">
        {NAV_TABS.map(tab => (
          <Link key={tab.to} to={tab.to}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${(tab.end ? location.pathname === tab.to : location.pathname.startsWith(tab.to))
                ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <tab.icon size={15} /> {tab.label}
          </Link>
        ))}
      </div>

      <Routes>
        <Route index element={<Overview />} />
        <Route path="dashboard" element={<Overview />} />
        <Route path="users" element={<UsersPanel />} />
        <Route path="complaints" element={<ComplaintsPanel />} />
        <Route path="analytics" element={<Overview />} />
        <Route path="settings" element={<div className="card p-8 text-center text-slate-400">Settings panel coming soon</div>} />
      </Routes>
    </DashboardLayout>
  );
}
