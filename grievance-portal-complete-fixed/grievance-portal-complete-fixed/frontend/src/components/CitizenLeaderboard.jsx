import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Award, Shield, Users, Star, Loader2 } from 'lucide-react';
import api from '../utils/api';

const BADGE_STYLES = {
  'First Reporter': { color: 'from-blue-500 to-indigo-500 text-white', icon: '📝', desc: 'Filed first valid complaint.' },
  'Community Helper': { color: 'from-teal-500 to-emerald-500 text-white', icon: '🤝', desc: 'Resolved issues or filed 3 reports.' },
  'Top Contributor': { color: 'from-amber-500 to-orange-500 text-white', icon: '🏆', desc: 'Reputation >= 150 or filed 5 reports.' },
  'City Guardian': { color: 'from-red-500 to-rose-600 text-white animate-pulse', icon: '🛡️', desc: 'High reputation >= 300 or filed 10 reports.' },
};

export default function CitizenLeaderboard() {
  const { data: leaderboard = [], isLoading, refetch } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.get('/reputation/leaderboard').then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const getRankMedal = (rank) => {
    switch (rank) {
      case 1:
        return {
          emoji: '🥇',
          bg: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-amber-950',
          shadow: '0 8px 20px rgba(245, 158, 11, 0.4)',
          label: 'City Champion'
        };
      case 2:
        return {
          emoji: '🥈',
          bg: 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900',
          shadow: '0 8px 20px rgba(148, 163, 184, 0.4)',
          label: 'Elite Sentinel'
        };
      case 3:
        return {
          emoji: '🥉',
          bg: 'bg-gradient-to-br from-amber-600 to-orange-700 text-orange-100',
          shadow: '0 8px 20px rgba(194, 65, 12, 0.4)',
          label: 'Civic Guardian'
        };
      default:
        return null;
    }
  };

  const maskName = (name) => {
    if (!name) return 'Anonymous Citizen';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return parts[0];
  };

  if (isLoading) {
    return (
      <div className="card p-12 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="text-indigo-500 animate-spin" />
        <span className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
          Fetching City Leaderboard...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Intro Header */}
      <div className="p-5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left relative overflow-hidden" style={{ borderRadius: '24px' }}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
          <Award size={22} className="animate-pulse" />
        </div>
        <div>
          <h4 className="font-extrabold text-indigo-700 dark:text-indigo-400 text-sm uppercase tracking-wider font-display">
            🏆 Guntur City Honor Roll
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
            Top ranked citizens who contribute coordinates, report safety hazards, and collaborate in keeping Guntur city clean and safe.
          </p>
        </div>
      </div>

      {/* Leaderboard Table Container */}
      <div className="flex flex-col gap-3">
        {leaderboard.map((citizen, index) => {
          const rank = index + 1;
          const medal = getRankMedal(rank);
          const isTopThree = rank <= 3;

          return (
            <motion.div
              key={citizen.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-3xl border flex items-center gap-4 transition-all hover:scale-[1.01] bg-white/70 dark:bg-[#121828]/60 ${
                isTopThree
                  ? 'border-indigo-500/20 shadow-md'
                  : 'border-slate-100 dark:border-slate-800/40'
              }`}
              style={{
                borderRadius: '22px',
                boxShadow: isTopThree ? 'var(--clay-shadow-sm)' : 'none'
              }}
            >
              {/* Rank Badge */}
              <div className="flex-shrink-0 w-11 h-11 flex items-center justify-center relative">
                {medal ? (
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold ${medal.bg} shadow-md`}
                    style={{ boxShadow: medal.shadow }}
                    title={medal.label}
                  >
                    {medal.emoji}
                  </div>
                ) : (
                  <span className="font-mono text-sm font-black text-slate-400 w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center border border-slate-100 dark:border-slate-800/50">
                    {rank}
                  </span>
                )}
              </div>

              {/* Citizen Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 font-display truncate">
                    {maskName(citizen.name)}
                  </span>
                  {rank === 1 && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border border-yellow-200/50 animate-bounce">
                      👑 Champion
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                  <span className="flex items-center gap-0.5"><Users size={11} /> {citizen.complaintsCount} reports filed</span>
                </div>
              </div>

              {/* Badges Collection */}
              <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                {citizen.badges && citizen.badges.length > 0 ? (
                  citizen.badges.map((badgeName) => {
                    const badge = BADGE_STYLES[badgeName] || { color: 'bg-slate-100 text-slate-500', icon: '🎖️', desc: 'Reputation Badge' };
                    return (
                      <div
                        key={badgeName}
                        className={`w-7 h-7 rounded-xl bg-gradient-to-br ${badge.color} flex items-center justify-center text-xs shadow-sm cursor-help hover:scale-110 active:scale-90 transition-all`}
                        title={`${badgeName}: ${badge.desc}`}
                      >
                        {badge.icon}
                      </div>
                    );
                  })
                ) : (
                  <span className="text-[10px] text-slate-400 italic font-medium">No badges yet</span>
                )}
              </div>

              {/* Reputation Points (XP) */}
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-display flex items-center gap-0.5">
                  <Star size={13} className="fill-indigo-500/20 stroke-indigo-500" />
                  {citizen.reputationPoints}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mt-0.5">
                  XP Points
                </span>
              </div>

            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
