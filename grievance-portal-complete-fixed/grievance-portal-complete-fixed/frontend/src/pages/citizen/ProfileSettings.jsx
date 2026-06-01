import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Lock, Bell, Shield, CheckCircle, Eye, EyeOff, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/DashboardLayout';
import useAuthStore from '../../store/authStore';
import api from '../../utils/api';
import { ROLE_LABELS, INDIAN_STATES } from '../../utils/constants';

const Section = ({ title, icon: Icon, children }) => (
  <div className="card p-6">
    <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100 dark:border-slate-700">
      <Icon size={18} className="text-blue-600 dark:text-blue-400" />
      <h3 className="font-bold text-slate-900 dark:text-white font-display">{title}</h3>
    </div>
    {children}
  </div>
);

export default function ProfileSettings() {
  const { user, updateUser } = useAuthStore();
  const qc = useQueryClient();

  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    state: user?.state || '',
    district: user?.district || '',
  });

  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [notifications, setNotifications] = useState({
    emailOnSubmit: true,
    emailOnUpdate: true,
    smsOnUpdate: true,
    escalationAlert: true,
  });

  const profileMutation = useMutation({
    mutationFn: (data) => api.put('/auth/profile', data),
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      updateUser({ name: profile.name, phone: profile.phone, state: profile.state, district: profile.district });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data) => api.put('/auth/change-password', data),
    onSuccess: () => {
      toast.success('Password changed successfully!');
      setPasswords({ current: '', newPass: '', confirm: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to change password.'),
  });

  const handleProfileSave = (e) => {
    e.preventDefault();
    profileMutation.mutate({ name: profile.name, phone: profile.phone, state: profile.state, district: profile.district });
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    
    // Password complexity check (matching registration)
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    if (!passRegex.test(passwords.newPass)) {
      toast.error('Password must contain uppercase, lowercase, and a number.');
      return;
    }

    if (passwords.newPass.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    passwordMutation.mutate({ currentPassword: passwords.current, newPassword: passwords.newPass });
  };

  const togglePass = (field) => setShowPasswords(p => ({ ...p, [field]: !p[field] }));

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Account Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage your profile, security, and notification preferences</p>
      </div>

      <div className="max-w-2xl space-y-5">

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Section title="Profile Information" icon={User}>
            {/* Avatar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center shadow-gov">
                  <span className="text-2xl font-bold text-white font-display">{user?.name?.charAt(0)}</span>
                </div>
                <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm">
                  <Camera size={11} className="text-slate-500 dark:text-slate-400" />
                </button>
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">{user?.name}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</div>
                <div className="mt-1">
                  <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                    {ROLE_LABELS[user?.role]}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input type="text" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                    className="input" placeholder="Your full name" required />
                </div>
                <div>
                  <label className="label">Mobile Number</label>
                  <input type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                    className="input" placeholder="9XXXXXXXXX" pattern="[6-9][0-9]{9}" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">State</label>
                  <select value={profile.state} onChange={e => setProfile(p => ({ ...p, state: e.target.value }))} className="input">
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">District</label>
                  <input type="text" value={profile.district} onChange={e => setProfile(p => ({ ...p, district: e.target.value }))}
                    className="input" placeholder="Your district" />
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={profileMutation.isPending} className="btn-primary">
                  {profileMutation.isPending
                    ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span>
                    : <><CheckCircle size={15} /> Save Changes</>}
                </button>
              </div>
            </form>
          </Section>
        </motion.div>

        {/* Password */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Section title="Change Password" icon={Lock}>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {[
                { label: 'Current Password', key: 'current', value: passwords.current, passKey: 'current' },
                { label: 'New Password', key: 'newPass', value: passwords.newPass, passKey: 'new' },
                { label: 'Confirm New Password', key: 'confirm', value: passwords.confirm, passKey: 'confirm' },
              ].map(({ label, key, value, passKey }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <div className="relative">
                    <input
                      type={showPasswords[passKey] ? 'text' : 'password'}
                      value={value}
                      onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))}
                      className="input pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button type="button" onClick={() => togglePass(passKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      {showPasswords[passKey] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                Password must be at least 8 characters with uppercase, lowercase, and a number.
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={passwordMutation.isPending} className="btn-primary">
                  {passwordMutation.isPending
                    ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating...</span>
                    : <><Lock size={15} /> Update Password</>}
                </button>
              </div>
            </form>
          </Section>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Section title="Notification Preferences" icon={Bell}>
            <div className="space-y-3">
              {[
                { key: 'emailOnSubmit', label: 'Email on complaint submission', desc: 'Receive confirmation email when you file a complaint' },
                { key: 'emailOnUpdate', label: 'Email on status updates', desc: 'Get notified by email when your complaint status changes' },
                { key: 'smsOnUpdate', label: 'SMS on status updates', desc: 'Receive SMS alerts when complaint status changes' },
                { key: 'escalationAlert', label: 'Escalation notifications', desc: 'Get alerted when a complaint is escalated to a higher authority' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-start gap-3 p-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <label className="relative inline-flex items-center cursor-pointer mt-0.5">
                    <input type="checkbox" checked={notifications[key]} onChange={e => setNotifications(p => ({ ...p, [key]: e.target.checked }))} className="sr-only peer" />
                    <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => toast.success('Notification preferences saved!')} className="btn-primary">
                <Bell size={15} /> Save Preferences
              </button>
            </div>
          </Section>
        </motion.div>

        {/* Security Info */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Section title="Security & Privacy" icon={Shield}>
            <div className="space-y-3">
              {[
                { label: 'Account Status', value: '✅ Active & Verified', color: 'text-green-600 dark:text-green-400' },
                { label: 'Data Encryption', value: 'AES-256-GCM encrypted at rest', color: 'text-slate-700 dark:text-slate-300' },
                { label: 'Complaint Privacy', value: 'Complaints only visible to you and assigned authority', color: 'text-slate-700 dark:text-slate-300' },
                { label: 'Anonymous Option', value: 'Available for sensitive complaints', color: 'text-slate-700 dark:text-slate-300' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
                  <span className={`text-sm font-medium ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </Section>
        </motion.div>

      </div>
    </DashboardLayout>
  );
}
