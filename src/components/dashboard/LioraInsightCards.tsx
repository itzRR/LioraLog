import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LogEntry, Task } from '@/types';
import { predictProgress, analyzeMoodProductivity } from '@/lib/aiAnalytics';

interface LioraInsightCardsProps {
  logs: LogEntry[];
  tasks: Task[];
  projectEndDate: string;
}

interface InsightCard {
  emoji: string;
  title: string;
  message: string;
  color: string;    // gradient for the left accent border
  bgColor: string;  // card background
}

const LioraInsightCards: React.FC<LioraInsightCardsProps> = ({ logs, tasks, projectEndDate }) => {
  const insights = useMemo(() => {
    const cards: InsightCard[] = [];

    if (tasks.length === 0 && logs.length === 0) return cards;

    const prediction = predictProgress(logs, tasks, projectEndDate);

    // 1. Estimation Bias Insight
    if (prediction.estimationBias && prediction.estimationBias !== 1.0) {
      const biasPercent = Math.round(Math.abs(prediction.estimationBias - 1) * 100);
      if (biasPercent >= 10) {
        if (prediction.estimationBias > 1) {
          cards.push({
            emoji: '⏱️',
            title: 'Time Estimation Pattern',
            message: `You tend to underestimate tasks by ~${biasPercent}%. Try adding a little padding to your estimates — it'll make your deadlines more realistic!`,
            color: 'from-orange-500 to-amber-500',
            bgColor: 'bg-orange-950/30 border-orange-500/20'
          });
        } else {
          cards.push({
            emoji: '✨',
            title: 'Great Estimator!',
            message: `You overestimate by ~${biasPercent}%, meaning you often finish faster than expected. Your predictions may be conservative — keep it up!`,
            color: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-950/30 border-blue-500/20'
          });
        }
      }
    }

    // 2. Velocity Trend Insight
    if (prediction.velocityTrend === 'accelerating') {
      cards.push({
        emoji: '🔥',
        title: 'Speed Increasing!',
        message: `Your completion speed has been accelerating over the last few weeks. You're getting faster — great momentum!`,
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-950/30 border-green-500/20'
      });
    } else if (prediction.velocityTrend === 'decelerating') {
      cards.push({
        emoji: '🐢',
        title: 'Speed Slowing Down',
        message: `Your pace has been decreasing recently. Consider breaking tasks into smaller chunks or taking a short break to recharge.`,
        color: 'from-red-500 to-pink-500',
        bgColor: 'bg-red-950/30 border-red-500/20'
      });
    }

    // 3. Stagnation Detection — tasks stuck "in progress" for 14+ days
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
    const stagnantTasks = tasks.filter(task => {
      if (task.status !== 'in_progress') return false;
      const updated = new Date(task.updatedAt);
      return updated < twoWeeksAgo && task.completionPercentage < 80;
    });
    if (stagnantTasks.length > 0) {
      cards.push({
        emoji: '⚠️',
        title: `${stagnantTasks.length} Stagnant Task${stagnantTasks.length > 1 ? 's' : ''}`,
        message: `${stagnantTasks.map(t => `"${t.title}"`).slice(0, 2).join(', ')}${stagnantTasks.length > 2 ? ` and ${stagnantTasks.length - 2} more` : ''} ha${stagnantTasks.length === 1 ? 's' : 've'} been "In Progress" for 14+ days without much movement. Are you blocked?`,
        color: 'from-yellow-500 to-orange-500',
        bgColor: 'bg-yellow-950/30 border-yellow-500/20'
      });
    }

    // 4. Dependency Risk — tasks depending on blocked/overdue work
    const taskMap = new Map<string, Task>();
    for (const t of tasks) taskMap.set(t.id, t);
    const atRiskDeps = tasks.filter(task => {
      if (!task.dependsOn || task.dependsOn.length === 0 || task.status === 'completed') return false;
      return task.dependsOn.some(depId => {
        const dep = taskMap.get(depId);
        if (!dep) return false;
        return dep.status === 'blocked' ||
          (dep.deadline && new Date(dep.deadline) < now && dep.status !== 'completed');
      });
    });
    if (atRiskDeps.length > 0) {
      cards.push({
        emoji: '🔗',
        title: 'Dependency Alert',
        message: `${atRiskDeps.length} task${atRiskDeps.length > 1 ? 's are' : ' is'} waiting on blocked or overdue dependencies. Resolve the blocking task first to unblock your pipeline.`,
        color: 'from-purple-500 to-violet-500',
        bgColor: 'bg-purple-950/30 border-purple-500/20'
      });
    }

    // 5. Mood-Productivity Insight
    const moodData = analyzeMoodProductivity(logs);
    if (moodData.dataPoints.length >= 5 && Math.abs(moodData.correlation) > 0.3) {
      const [low, high] = moodData.optimalMoodRange;
      cards.push({
        emoji: '🧠',
        title: 'Mood & Productivity Link',
        message: `Your productivity peaks when your mood is ${low}–${high}/5. Prioritize self-care and breaks to stay in your optimal zone!`,
        color: 'from-cyan-500 to-teal-500',
        bgColor: 'bg-cyan-950/30 border-cyan-500/20'
      });
    }

    // 6. Low logging frequency
    const twoWeeksAgoDate = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
    const recentLogCount = logs.filter(l => new Date(l.createdAt) >= twoWeeksAgoDate).length;
    if (logs.length > 0 && recentLogCount < 3) {
      cards.push({
        emoji: '📝',
        title: 'Log More Often',
        message: `Only ${recentLogCount} log${recentLogCount !== 1 ? 's' : ''} in the last 2 weeks. More data = better predictions. Try logging at least 3x per week!`,
        color: 'from-indigo-500 to-blue-500',
        bgColor: 'bg-indigo-950/30 border-indigo-500/20'
      });
    }

    return cards;
  }, [logs, tasks, projectEndDate]);

  if (insights.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="mb-8 relative z-10"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
        <p className="text-[10px] font-bold text-purple-400 tracking-[0.2em] uppercase">LIORA'S INSIGHTS</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + idx * 0.08, duration: 0.4 }}
            className={`relative ${card.bgColor} border rounded-xl p-4 overflow-hidden hover:scale-[1.02] transition-transform duration-300`}
          >
            {/* Accent gradient bar on left */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${card.color} rounded-l-xl`} />
            <div className="pl-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{card.emoji}</span>
                <h4 className="text-sm font-bold text-white">{card.title}</h4>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{card.message}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default LioraInsightCards;
