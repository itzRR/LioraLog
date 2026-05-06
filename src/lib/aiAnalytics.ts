import { LogEntry, Task, Alert, ProgressPrediction, MoodProductivityData, RiskAnalysis, AIInsight } from '@/types';
import { subDays, differenceInDays, parseISO, isAfter } from 'date-fns';

/**
 * AI Analytics Engine for Research Progress Tracker
 * Implements statistical analysis and pattern recognition for predictions
 */

// ============================================
// PROGRESS PREDICTION ALGORITHM
// ============================================

/**
 * Predicts project completion using weighted task progress plus recent log velocity.
 * Task completion percentages provide the current position; logs estimate pace.
 */
export function predictProgress(
  logs: LogEntry[],
  tasks: Task[],
  projectEndDate: string
): ProgressPrediction {
  const weightedTasks = tasks.map(task => {
    const weight = getTaskWeight(task);
    const completion = task.status === 'completed'
      ? 100
      : Math.max(0, Math.min(100, task.completionPercentage || 0));

    return {
      task,
      weight,
      completed: weight * (completion / 100),
      remaining: weight * (1 - completion / 100)
    };
  });

  const totalWork = weightedTasks.reduce((sum, item) => sum + item.weight, 0);
  const completedWork = weightedTasks.reduce((sum, item) => sum + item.completed, 0);
  const remainingWork = weightedTasks.reduce((sum, item) => sum + item.remaining, 0);
  const progressPercentage = totalWork > 0 ? (completedWork / totalWork) * 100 : 0;

  if (tasks.length === 0) {
    return {
      expectedCompletionDate: projectEndDate || new Date().toISOString(),
      confidenceLevel: 0,
      currentVelocity: 0,
      predictedVelocity: 0,
      remainingWork: 0,
      totalWork: 0,
      completedWork: 0,
      progressPercentage: 0,
      weeksNeeded: 0,
      daysNeeded: 0,
      delayWeeks: 0,
      status: 'Unknown',
      riskLevel: 'Low'
    };
  }

  if (remainingWork <= 0) {
    return {
      expectedCompletionDate: new Date().toISOString(),
      confidenceLevel: Math.min(100, 65 + logs.length * 3),
      currentVelocity: 0,
      predictedVelocity: 0,
      remainingWork: 0,
      totalWork: round(totalWork),
      completedWork: round(completedWork),
      progressPercentage: 100,
      weeksNeeded: 0,
      daysNeeded: 0,
      delayWeeks: 0,
      status: 'Completed',
      riskLevel: 'Low'
    };
  }

  const weeklyVelocities = calculateWeeklyWorkVelocities(logs);
  const averageVelocity = weeklyVelocities.length > 0
    ? weeklyVelocities.reduce((sum, velocity) => sum + velocity, 0) / weeklyVelocities.length
    : 0;
  const recentVelocities = weeklyVelocities.slice(-3);
  const currentVelocity = recentVelocities.length > 0
    ? recentVelocities.reduce((sum, velocity) => sum + velocity, 0) / recentVelocities.length
    : averageVelocity;

  const rawPredictedVelocity = currentVelocity > 0 && averageVelocity > 0
    ? (currentVelocity * 0.65) + (averageVelocity * 0.35)
    : Math.max(currentVelocity, averageVelocity);

  const blockedWork = weightedTasks
    .filter(({ task }) => task.status === 'blocked')
    .reduce((sum, item) => sum + item.remaining, 0);
  const blockedRatio = remainingWork > 0 ? blockedWork / remainingWork : 0;
  const overdueWork = weightedTasks
    .filter(({ task }) => task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed')
    .reduce((sum, item) => sum + item.remaining, 0);
  const overdueRatio = remainingWork > 0 ? overdueWork / remainingWork : 0;

  const riskMultiplier = 1 + (blockedRatio * 0.45) + (overdueRatio * 0.35);
  const predictedVelocity = rawPredictedVelocity > 0 ? rawPredictedVelocity / riskMultiplier : 0;

  const weeksNeeded = predictedVelocity > 0 ? remainingWork / predictedVelocity : 52;
  const expectedCompletion = new Date();
  expectedCompletion.setDate(expectedCompletion.getDate() + Math.ceil(weeksNeeded * 7));

  const deadline = projectEndDate ? new Date(projectEndDate) : null;
  const weeksUntilDeadline = deadline
    ? (deadline.getTime() - new Date().getTime()) / (1000 * 3600 * 24 * 7)
    : 0;
  const delayWeeks = deadline ? weeksNeeded - weeksUntilDeadline : 0;
  const status = getPredictionStatus(remainingWork, weeksNeeded, weeksUntilDeadline, Boolean(deadline));
  const riskLevel = getPredictionRisk(status, blockedRatio, overdueRatio);
  const confidence = calculatePredictionConfidence(logs.length, tasks.length, weeklyVelocities, progressPercentage);

  return {
    expectedCompletionDate: expectedCompletion.toISOString(),
    confidenceLevel: Math.round(confidence),
    currentVelocity: round(currentVelocity),
    predictedVelocity: round(predictedVelocity),
    remainingWork: round(remainingWork),
    totalWork: round(totalWork),
    completedWork: round(completedWork),
    progressPercentage: round(progressPercentage),
    weeksNeeded: round(weeksNeeded),
    daysNeeded: Math.ceil(weeksNeeded * 7),
    delayWeeks: round(delayWeeks),
    status,
    riskLevel
  };
}

// ============================================
// MOOD-PRODUCTIVITY CORRELATION
// ============================================

/**
 * Analyzes correlation between mood ratings and productivity
 */
export function analyzeMoodProductivity(logs: LogEntry[]): MoodProductivityData {
  const validLogs = logs.filter(log => log.moodRating && log.moodRating > 0);

  if (validLogs.length < 5) {
    return {
      correlation: 0,
      optimalMoodRange: [3, 5],
      insights: ['Not enough data to analyze mood-productivity correlation. Log at least 5 entries with mood ratings.'],
      dataPoints: []
    };
  }

  // Calculate productivity score for each log
  const dataPoints = validLogs.map(log => {
    const productivityScore = calculateProductivityScore(log);
    return {
      mood: log.moodRating!,
      productivity: productivityScore,
      date: log.date
    };
  });

  // Calculate Pearson correlation coefficient
  const correlation = calculateCorrelation(
    dataPoints.map(d => d.mood),
    dataPoints.map(d => d.productivity)
  );

  // Find optimal mood range
  const moodGroups = groupByMoodRange(dataPoints);
  const optimalRange = findOptimalMoodRange(moodGroups);

  // Generate insights
  const insights = generateMoodInsights(correlation, optimalRange, moodGroups);

  return {
    correlation: Math.round(correlation * 100) / 100,
    optimalMoodRange: optimalRange,
    insights,
    dataPoints
  };
}

// ============================================
// RISK DETECTION SYSTEM
// ============================================

/**
 * Multi-factor risk analysis for student progress
 */
export function analyzeRisk(
  logs: LogEntry[],
  tasks: Task[],
  userId: string
): RiskAnalysis {
  const factors: Array<{ type: string; severity: number; description: string }> = [];
  let totalRisk = 0;

  // Factor 1: Low Progress Detection (>20% weight)
  const progressRisk = detectLowProgress(logs);
  if (progressRisk.severity > 0) {
    factors.push(progressRisk);
    totalRisk += progressRisk.severity * 0.25;
  }

  // Factor 2: Deadline Risk (>30% weight)
  const deadlineRisk = detectDeadlineRisk(tasks);
  if (deadlineRisk.severity > 0) {
    factors.push(deadlineRisk);
    totalRisk += deadlineRisk.severity * 0.30;
  }

  // Factor 3: Mood Alert (>20% weight)
  const moodRisk = detectMoodIssues(logs);
  if (moodRisk.severity > 0) {
    factors.push(moodRisk);
    totalRisk += moodRisk.severity * 0.20;
  }

  // Factor 4: Engagement Drop (>25% weight)
  const engagementRisk = detectEngagementDrop(logs);
  if (engagementRisk.severity > 0) {
    factors.push(engagementRisk);
    totalRisk += engagementRisk.severity * 0.25;
  }

  // Determine risk level
  const riskLevel = totalRisk > 70 ? 'critical' : totalRisk > 50 ? 'high' : totalRisk > 30 ? 'medium' : 'low';

  // Generate recommendations
  const recommendations = generateRiskRecommendations(factors);

  return {
    overallRisk: Math.round(totalRisk),
    riskLevel,
    factors,
    recommendations
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function groupLogsByWeek(logs: LogEntry[]): LogEntry[][] {
  const sorted = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const weeks: LogEntry[][] = [];
  let currentWeek: LogEntry[] = [];
  let weekStart: Date | null = null;

  sorted.forEach(log => {
    const logDate = new Date(log.date);
    if (!weekStart || differenceInDays(logDate, weekStart) >= 7) {
      if (currentWeek.length > 0) weeks.push(currentWeek);
      currentWeek = [log];
      weekStart = logDate;
    } else {
      currentWeek.push(log);
    }
  });

  if (currentWeek.length > 0) weeks.push(currentWeek);
  return weeks;
}

function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squareDiffs = numbers.map(n => Math.pow(n - avg, 2));
  return squareDiffs.reduce((a, b) => a + b, 0) / numbers.length;
}

function calculateWeeklyWorkVelocities(logs: LogEntry[]): number[] {
  const weeks = groupLogsByWeek(logs);

  return weeks.map(week => week.reduce((sum, log) => {
    const loggedHours = typeof log.actualHoursSpent === 'number' && log.actualHoursSpent > 0
      ? log.actualHoursSpent
      : null;
    const baseWork = loggedHours ? loggedHours / 4 : 1;
    const statusWork = log.taskStatus === 'done' ? 1 : log.taskStatus === 'inprogress' ? 0.65 : 0.2;
    const detailBoost = Math.min(0.25, (log.tasksCompleted?.trim().length || 0) / 400);
    const problemPenalty = log.problems?.trim() ? 0.9 : 1;

    return sum + (baseWork * (statusWork + detailBoost) * problemPenalty);
  }, 0));
}

function getTaskWeight(task: Task): number {
  const estimatedWork = typeof task.estimatedHours === 'number' && task.estimatedHours > 0
    ? task.estimatedHours / 4
    : null;
  const sizeWork = {
    small: 0.5,
    medium: 1,
    large: 2,
    very_large: 3.5
  }[task.size || 'medium'];
  const difficultyMultiplier = {
    easy: 0.85,
    normal: 1,
    hard: 1.35
  }[task.difficulty || 'normal'];
  const priorityMultiplier = {
    low: 0.9,
    medium: 1,
    high: 1.15,
    critical: 1.3
  }[task.priority] || 1;

  const descriptionBoost = task.description?.trim().length
    ? Math.min(0.2, task.description.trim().length / 700)
    : 0;

  return ((estimatedWork || sizeWork) * difficultyMultiplier * priorityMultiplier) + descriptionBoost;
}

function calculatePredictionConfidence(
  logCount: number,
  taskCount: number,
  velocities: number[],
  progressPercentage: number
): number {
  const dataScore = Math.min(45, logCount * 4) + Math.min(25, taskCount * 3);
  const progressScore = Math.min(15, progressPercentage / 4);

  if (velocities.length < 2) {
    return Math.max(10, Math.min(55, dataScore + progressScore));
  }

  const avgVelocity = velocities.reduce((sum, velocity) => sum + velocity, 0) / velocities.length;
  const variance = calculateVariance(velocities);
  const consistencyPenalty = avgVelocity > 0 ? Math.min(35, (variance / avgVelocity) * 18) : 30;

  return Math.max(10, Math.min(95, dataScore + progressScore + 15 - consistencyPenalty));
}

function getPredictionStatus(
  remainingWork: number,
  weeksNeeded: number,
  weeksUntilDeadline: number,
  hasDeadline: boolean
): ProgressPrediction['status'] {
  if (remainingWork <= 0) return 'Completed';
  if (!hasDeadline) return 'Unknown';
  if (weeksNeeded > weeksUntilDeadline) return 'Behind';
  if (weeksNeeded > weeksUntilDeadline * 0.9) return 'At Risk';
  return 'On Track';
}

function getPredictionRisk(
  status: ProgressPrediction['status'],
  blockedRatio: number,
  overdueRatio: number
): ProgressPrediction['riskLevel'] {
  if (status === 'Behind' || blockedRatio > 0.35 || overdueRatio > 0.25) return 'High';
  if (status === 'At Risk' || blockedRatio > 0 || overdueRatio > 0) return 'Medium';
  return 'Low';
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function calculateProductivityScore(log: LogEntry): number {
  let score = 0;
  
  // Task completion status
  if (log.taskStatus === 'done') score += 10;
  else if (log.taskStatus === 'inprogress') score += 5;
  else score += 2;

  // Length of tasks completed (more detailed = more productive)
  score += Math.min(5, log.tasksCompleted.length / 50);

  // Feedback presence
  if (log.feedback && log.feedback.length > 10) score += 3;

  return score;
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = (n * sumXY) - (sumX * sumY);
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

function groupByMoodRange(dataPoints: Array<{ mood: number; productivity: number }>): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  groups.set('1-2', []);
  groups.set('3', []);
  groups.set('4-5', []);

  dataPoints.forEach(point => {
    if (point.mood <= 2) groups.get('1-2')!.push(point.productivity);
    else if (point.mood === 3) groups.get('3')!.push(point.productivity);
    else groups.get('4-5')!.push(point.productivity);
  });

  return groups;
}

function findOptimalMoodRange(groups: Map<string, number[]>): [number, number] {
  const averages = new Map<string, number>();
  
  groups.forEach((values, range) => {
    if (values.length > 0) {
      averages.set(range, values.reduce((a, b) => a + b, 0) / values.length);
    }
  });

  let maxAvg = 0;
  let optimalRange: [number, number] = [3, 5];

  if ((averages.get('4-5') || 0) > maxAvg) {
    maxAvg = averages.get('4-5')!;
    optimalRange = [4, 5];
  }
  if ((averages.get('3') || 0) > maxAvg) {
    optimalRange = [3, 3];
  }

  return optimalRange;
}

function generateMoodInsights(correlation: number, optimalRange: [number, number], groups: Map<string, number[]>): string[] {
  const insights: string[] = [];

  if (Math.abs(correlation) > 0.5) {
    insights.push(`${correlation > 0 ? 'Strong positive' : 'Strong negative'} correlation detected between mood and productivity (${Math.abs(correlation).toFixed(2)}).`);
  } else if (Math.abs(correlation) > 0.3) {
    insights.push(`Moderate correlation found between mood and productivity (${correlation.toFixed(2)}).`);
  } else {
    insights.push('Weak correlation between mood and productivity. Other factors may be more important.');
  }

  insights.push(`Your productivity is highest when mood is in range ${optimalRange[0]}-${optimalRange[1]}.`);

  return insights;
}

function detectLowProgress(logs: LogEntry[]): { type: string; severity: number; description: string } {
  const twoWeeksAgo = subDays(new Date(), 14);
  const recentLogs = logs.filter(log => new Date(log.date) >= twoWeeksAgo);

  if (recentLogs.length < 2) {
    return {
      type: 'low_progress',
      severity: 80,
      description: `Only ${recentLogs.length} log entries in the last 2 weeks. Regular logging is critical for progress tracking.`
    };
  }

  if (recentLogs.length < 4) {
    return {
      type: 'low_progress',
      severity: 50,
      description: `${recentLogs.length} log entries in the last 2 weeks. Consider logging more frequently.`
    };
  }

  return { type: 'low_progress', severity: 0, description: '' };
}

function detectDeadlineRisk(tasks: Task[]): { type: string; severity: number; description: string } {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const urgentTasks = tasks.filter(task => {
    if (task.status === 'completed') return false;
    const deadline = new Date(task.deadline);
    return deadline <= sevenDaysFromNow && task.completionPercentage < 50;
  });

  if (urgentTasks.length > 0) {
    const criticalCount = urgentTasks.filter(t => t.priority === 'critical' || t.priority === 'high').length;
    return {
      type: 'deadline_risk',
      severity: criticalCount > 0 ? 90 : 60,
      description: `${urgentTasks.length} task(s) due within 7 days with less than 50% completion.`
    };
  }

  return { type: 'deadline_risk', severity: 0, description: '' };
}

function detectMoodIssues(logs: LogEntry[]): { type: string; severity: number; description: string } {
  const twoWeeksAgo = subDays(new Date(), 14);
  const recentLogs = logs.filter(log => new Date(log.date) >= twoWeeksAgo && log.moodRating);

  if (recentLogs.length < 3) {
    return { type: 'mood_alert', severity: 0, description: '' };
  }

  const avgMood = recentLogs.reduce((sum, log) => sum + (log.moodRating || 0), 0) / recentLogs.length;

  if (avgMood < 2.5) {
    return {
      type: 'mood_alert',
      severity: 70,
      description: `Average mood rating is ${avgMood.toFixed(1)}/5 over the last 2 weeks. Consider seeking support.`
    };
  }

  if (avgMood < 3) {
    return {
      type: 'mood_alert',
      severity: 40,
      description: `Average mood rating is ${avgMood.toFixed(1)}/5. Taking breaks and self-care is important.`
    };
  }

  return { type: 'mood_alert', severity: 0, description: '' };
}

function detectEngagementDrop(logs: LogEntry[]): { type: string; severity: number; description: string } {
  if (logs.length < 10) {
    return { type: 'engagement_drop', severity: 0, description: '' };
  }

  const twoWeeksAgo = subDays(new Date(), 14);
  const fourWeeksAgo = subDays(new Date(), 28);

  const recentLogs = logs.filter(log => new Date(log.date) >= twoWeeksAgo);
  const previousLogs = logs.filter(log => {
    const date = new Date(log.date);
    return date >= fourWeeksAgo && date < twoWeeksAgo;
  });

  if (previousLogs.length === 0) {
    return { type: 'engagement_drop', severity: 0, description: '' };
  }

  const dropPercentage = ((previousLogs.length - recentLogs.length) / previousLogs.length) * 100;

  if (dropPercentage >= 50) {
    return {
      type: 'engagement_drop',
      severity: 75,
      description: `${Math.round(dropPercentage)}% decrease in logging activity compared to previous 2 weeks.`
    };
  }

  return { type: 'engagement_drop', severity: 0, description: '' };
}

function generateRiskRecommendations(factors: Array<{ type: string; severity: number; description: string }>): string[] {
  const recommendations: string[] = [];

  factors.forEach(factor => {
    switch (factor.type) {
      case 'low_progress':
        recommendations.push('📝 Set a goal to log progress at least 3 times per week');
        recommendations.push('⏰ Use calendar reminders to maintain consistent logging');
        break;
      case 'deadline_risk':
        recommendations.push('🎯 Prioritize tasks with approaching deadlines');
        recommendations.push('📅 Break down large tasks into smaller, manageable chunks');
        recommendations.push('👥 Consider discussing deadline extensions with your supervisor if needed');
        break;
      case 'mood_alert':
        recommendations.push('🧘 Take regular breaks and practice self-care');
        recommendations.push('💬 Reach out to your supervisor or support network');
        recommendations.push('🌟 Celebrate small wins to maintain motivation');
        break;
      case 'engagement_drop':
        recommendations.push('🔄 Review your research goals and adjust if necessary');
        recommendations.push('📊 Use the dashboard regularly to track your progress');
        recommendations.push('🎯 Set specific, achievable weekly goals');
        break;
    }
  });

  return [...new Set(recommendations)]; // Remove duplicates
}

// ============================================
// GENERATE AI INSIGHTS
// ============================================

export function generateAIInsights(
  logs: LogEntry[],
  tasks: Task[],
  projectEndDate: string
): AIInsight[] {
  const insights: AIInsight[] = [];

  // Progress prediction insight
  const prediction = predictProgress(logs, tasks, projectEndDate);
  if (prediction.confidenceLevel > 30) {
    insights.push({
      type: 'prediction',
      title: 'Project Completion Forecast',
      description: `Based on your current velocity of ${prediction.currentVelocity} tasks/week, you're predicted to complete your project by ${new Date(prediction.expectedCompletionDate).toLocaleDateString()}.`,
      confidence: prediction.confidenceLevel,
      data: prediction
    });
  }

  // Mood correlation insight
  const moodData = analyzeMoodProductivity(logs);
  if (moodData.dataPoints.length >= 5) {
    insights.push({
      type: 'correlation',
      title: 'Mood-Productivity Connection',
      description: moodData.insights[0],
      confidence: Math.abs(moodData.correlation) * 100,
      data: moodData
    });
  }

  // Risk insights
  const risk = analyzeRisk(logs, tasks, '');
  if (risk.overallRisk > 30 && risk.recommendations.length > 0) {
    insights.push({
      type: 'recommendation',
      title: `${risk.riskLevel.toUpperCase()} Risk Detected`,
      description: risk.recommendations[0],
      confidence: 85,
      data: risk
    });
  }

  return insights;
}
