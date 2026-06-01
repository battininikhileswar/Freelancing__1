import { motion } from 'framer-motion';
import { MapPin, Calendar, Paperclip, ChevronRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge, { CategoryBadge, SeverityBadge } from './StatusBadge';
import { formatDate, timeAgo } from '../utils/constants';

export default function ComplaintCard({ complaint, index = 0 }) {
  const { id, complaintId, category, subcategory, description, status, location, attachments, createdAt, isEscalated, severity } = complaint;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/complaints/${id}`} className="block">
        <div className="card-hover p-5 group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Top row */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <CategoryBadge category={category} />
                <StatusBadge status={status} />
                <SeverityBadge severity={severity} />
                {isEscalated && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    ⚡ Escalated
                  </span>
                )}
              </div>

              {/* Complaint ID */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded">
                  {complaintId}
                </span>
                {subcategory && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{subcategory.replace(/_/g, ' ')}</span>
                )}
              </div>

              {/* Description preview */}
              <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 mb-3">
                {description}
              </p>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                {location && (
                  <span className="flex items-center gap-1 capitalize">
                    <MapPin size={12} />
                    {location.district}, {location.state}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDate(createdAt)}
                </span>
                {attachments > 0 && (
                  <span className="flex items-center gap-1">
                    <Paperclip size={12} />
                    {attachments} file{attachments > 1 ? 's' : ''}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {timeAgo(createdAt)}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors flex-shrink-0 mt-1" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
