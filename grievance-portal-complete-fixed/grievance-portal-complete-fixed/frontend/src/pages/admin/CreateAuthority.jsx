import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Shield, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { INDIAN_STATES } from '../../utils/constants';

const AUTHORITY_TYPES = [
  { value: 'ps', role: 'ps_officer', label: 'Police Station (PS)', icon: '🚔', desc: 'Handles crime complaints in assigned jurisdiction' },
  { value: 'acb', role: 'acb_officer', label: 'Anti-Corruption Bureau (ACB)', icon: '⚖️', desc: 'Handles corruption and bribery complaints' },
  { value: 'municipal', role: 'municipal_officer', label: 'Municipal Authority', icon: '🏛️', desc: 'Handles civic issues and public works complaints' },
];

const DISTRICTS_MAP = {
  'andhra pradesh': ['Guntur', 'Krishna', 'Visakhapatnam', 'East Godavari', 'West Godavari', 'Kurnool', 'Kadapa', 'Chittoor', 'Nellore', 'Srikakulam'],
  telangana: ['Hyderabad', 'Warangal', 'Khammam', 'Karimnagar', 'Nizamabad', 'Rangareddy', 'Medak'],
  maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane'],
  karnataka: ['Bengaluru', 'Mysuru', 'Hubli', 'Mangaluru', 'Belagavi'],
  'tamil nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli'],
  'uttar pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Prayagraj', 'Meerut'],
  delhi: ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'],
};

export default function CreateAuthority() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    authorityType: '',
    role: '',
    state: '',
    district: '',
    badgeNumber: '',
    department: '',
  });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors(err => ({ ...err, [field]: '' }));
  };

  const selectType = (type) => {
    setForm(f => ({ ...f, authorityType: type.value, role: type.role }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    
    // Password complexity check
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    if (!form.password || form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    } else if (!passRegex.test(form.password)) {
      errs.password = 'Password must contain uppercase, lowercase, and a number';
    }

    if (!form.authorityType) errs.authorityType = 'Authority type is required';
    if (!form.state) errs.state = 'State is required';
    if (!form.district) errs.district = 'District is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const mutation = useMutation({
    mutationFn: (data) => api.post('/admin/authorities', data),
    onSuccess: () => {
      toast.success('Authority account created successfully!');
      qc.invalidateQueries(['adminUsers']);
      navigate('/admin/users');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create authority account.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone,
      role: form.role,
      authorityType: form.authorityType,
      jurisdiction: { state: form.state.toLowerCase(), district: form.district.toLowerCase() },
      badgeNumber: form.badgeNumber,
      department: form.department,
    });
  };

  const districts = DISTRICTS_MAP[form.state.toLowerCase()] || [];

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        {/* Back */}
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Users
        </Link>

        <div className="page-header">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} className="text-blue-600 dark:text-blue-400" />
            <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">Admin Action</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Create Authority Account</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Add a new PS, ACB, or Municipal officer account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Authority Type */}
          <div>
            <label className="label">Authority Type <span className="text-red-500">*</span></label>
            <div className="grid gap-3">
              {AUTHORITY_TYPES.map((type) => (
                <button key={type.value} type="button" onClick={() => selectType(type)}
                  className={`p-4 rounded-xl border-2 text-left transition-all duration-150 
                    ${form.authorityType === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">{type.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{type.desc}</div>
                    </div>
                    {form.authorityType === type.value && <CheckCircle size={18} className="text-blue-500 flex-shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
            {errors.authorityType && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle size={12} />{errors.authorityType}</p>}
          </div>

          {/* Basic Info */}
          <div className="card p-5 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Officer Details</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={set('name')} className={`input ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`} placeholder="Officer Full Name" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="label">Badge / ID Number</label>
                <input type="text" value={form.badgeNumber} onChange={set('badgeNumber')} className="input" placeholder="AP/PS/12345" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Official Email <span className="text-red-500">*</span></label>
                <input type="email" value={form.email} onChange={set('email')} className={`input ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`} placeholder="officer@ap.gov.in" />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="label">Mobile Number</label>
                <input type="tel" value={form.phone} onChange={set('phone')} className="input" placeholder="9XXXXXXXXX" />
              </div>
            </div>

            <div>
              <label className="label">Department / Station Name</label>
              <input type="text" value={form.department} onChange={set('department')} className="input" placeholder="e.g., Guntur Central Police Station" />
            </div>

            <div>
              <label className="label">Login Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')} className={`input pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`} placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>
          </div>

          {/* Jurisdiction */}
          <div className="card p-5 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Jurisdiction Assignment</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Complaints from this jurisdiction will be automatically routed to this officer.</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">State <span className="text-red-500">*</span></label>
                <select value={form.state} onChange={(e) => { set('state')(e); setForm(f => ({ ...f, district: '' })); }}
                  className={`input ${errors.state ? 'border-red-400 focus:ring-red-400' : ''}`}>
                  <option value="">Select State</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
                </select>
                {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
              </div>
              <div>
                <label className="label">District <span className="text-red-500">*</span></label>
                <select value={form.district} onChange={set('district')} disabled={!form.state}
                  className={`input ${errors.district ? 'border-red-400 focus:ring-red-400' : ''}`}>
                  <option value="">Select District</option>
                  {districts.length > 0
                    ? districts.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)
                    : <option value="other">Other</option>}
                </select>
                {errors.district && <p className="text-xs text-red-500 mt-1">{errors.district}</p>}
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400 flex gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Important</div>
              <div className="text-xs mt-0.5 opacity-80">Share the credentials securely with the officer. They should change the password on first login. Complaints from the assigned jurisdiction will automatically route to this account.</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Link to="/admin/users" className="btn-secondary flex-1 justify-center">Cancel</Link>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
              {mutation.isPending
                ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</span>
                : <><Shield size={15} /> Create Authority Account</>}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
