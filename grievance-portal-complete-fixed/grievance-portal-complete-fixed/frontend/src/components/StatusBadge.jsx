import { STATUS_LABELS } from '../utils/constants';

const DOT_COLORS = {
  pending: 'bg-amber-400',
  under_review: 'bg-blue-400',
  investigating: 'bg-purple-400',
  action_taken: 'bg-orange-400',
  closed: 'bg-green-400',
  rejected: 'bg-red-400',
};

const BADGE_STYLES = {
  pending:      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  investigating:'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  action_taken: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  closed:       'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected:     'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function StatusBadge({ status, showDot = true, size = 'md' }) {
  const info = STATUS_LABELS[status] || { label: status };
  const badgeStyle = BADGE_STYLES[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  const dotColor = DOT_COLORS[status] || 'bg-slate-400';

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClass} rounded-full font-semibold uppercase tracking-wide ${badgeStyle}`}>
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${status === 'pending' ? 'animate-pulse' : ''}`} />
      )}
      {info.label}
    </span>
  );
}

export function CategoryBadge({ category }) {
  const styles = {
    crime:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    corruption:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    civic_issue: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  };
  const icons = { crime: '🚨', corruption: '⚖️', civic_issue: '🏙️' };
  const labels = { crime: 'Crime', corruption: 'Corruption', civic_issue: 'Civic Issue' };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[category] || 'bg-slate-100 text-slate-600'}`}>
      <span>{icons[category]}</span>
      {labels[category] || category}
    </span>
  );
}

export function SeverityBadge({ severity }) {
  const styles = {
    Low:       'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200/30',
    Medium:    'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400 border border-sky-200/30',
    High:      'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/30',
    Emergency: 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200/30 animate-pulse',
  };
  
  const icons = { Low: '🟢', Medium: '🔵', High: '🟠', Emergency: '🚨' };
  const cleanSeverity = severity || 'Medium';

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${styles[cleanSeverity] || 'bg-slate-100 text-slate-600'}`} style={{ boxShadow: 'var(--clay-shadow-sm)' }}>
      <span>{icons[cleanSeverity]}</span>
      <span>{cleanSeverity} Severity</span>
    </span>
  );
}
