import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface LoggingStreakProps {
  logs: Array<{ createdAt: string }>;
}

const LoggingStreak: React.FC<LoggingStreakProps> = ({ logs }) => {
  const { streak, milestone, milestoneLabel } = useMemo(() => {
    if (logs.length === 0) return { streak: 0, milestone: '', milestoneLabel: '' };

    // Group logs by ISO week (Mon–Sun)
    const getWeekKey = (date: Date): string => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      // Set to Monday of this week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      return d.toISOString().split('T')[0];
    };

    const weekSet = new Set<string>();
    for (const log of logs) {
      weekSet.add(getWeekKey(new Date(log.createdAt)));
    }

    // Check consecutive weeks backwards from this week
    const now = new Date();
    let currentStreak = 0;
    let checkDate = new Date(now);

    while (true) {
      const weekKey = getWeekKey(checkDate);
      if (weekSet.has(weekKey)) {
        currentStreak++;
        // Go back 7 days
        checkDate.setDate(checkDate.getDate() - 7);
      } else {
        break;
      }
    }

    // Milestone logic
    let ms = '';
    let msLabel = '';
    if (currentStreak >= 10) { ms = '💎'; msLabel = 'Diamond'; }
    else if (currentStreak >= 5) { ms = '⭐'; msLabel = 'Star'; }
    else if (currentStreak >= 3) { ms = '🔥'; msLabel = 'Fire'; }

    return { streak: currentStreak, milestone: ms, milestoneLabel: msLabel };
  }, [logs]);

  // Don't show if no streak
  if (streak === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.25, duration: 0.5 }}
      className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col justify-between hover:bg-white/[0.04] transition-colors relative overflow-hidden"
    >
      {/* Subtle glow for milestones */}
      {milestone && (
        <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />
      )}
      
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
        LOG STREAK
      </p>
      <div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-red-500 mb-1">
            {streak}w
          </div>
          {milestone && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
              className="text-2xl"
              title={`${milestoneLabel} milestone!`}
            >
              {milestone}
            </motion.span>
          )}
        </div>
        <p className="text-xs text-gray-400">
          {streak === 1
            ? 'Keep it going!'
            : streak >= 10
              ? 'Legendary consistency!'
              : streak >= 5
                ? 'Amazing dedication!'
                : streak >= 3
                  ? 'Great streak!'
                  : 'Consecutive weeks'}
        </p>
      </div>
    </motion.div>
  );
};

export default LoggingStreak;
