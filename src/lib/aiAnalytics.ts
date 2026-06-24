import { LogEntry, Task, Alert, ProgressPrediction, MoodProductivityData, RiskAnalysis, AIInsight } from '@/types';
import { subDays, differenceInDays, parseISO, isAfter } from 'date-fns';

/**
 * AI Analytics Engine for Research Progress Tracker
 * Implements statistical analysis and pattern recognition for predictions
 */

// ============================================
// PROGRESS PREDICTION ALGORITHM (v2)
// ============================================
// Uses EWMA velocity, Monte Carlo simulation,
// estimation bias detection, and Bayesian confidence.
// ============================================

/**
 * Exponential Weighted Moving Average.
 * Recent values have exponentially more influence than old ones.
 * α (alpha) controls decay: higher = more weight on recent data.
 */
function ewma(values: number[], alpha: number = 0.4): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = alpha * values[i] + (1 - alpha) * result;
  }
  return result;
}

/**
 * Detect estimation bias by comparing actual hours spent (from logs)
 * against task estimated hours. Returns a multiplier:
 *   > 1.0 = user underestimates (takes longer than planned)
 *   < 1.0 = user overestimates (finishes faster than planned)
 *   = 1.0 = no data or accurate estimates
 */
function detectEstimationBias(logs: LogEntry[], tasks: Task[]): number {
  const tasksWithEstimates = tasks.filter(
    t => t.estimatedHours && t.estimatedHours > 0 && t.status === 'completed'
  );
  if (tasksWithEstimates.length < 2) return 1.0;

  const ratios: number[] = [];
  for (const task of tasksWithEstimates) {
    const taskLogs = logs.filter(
      l => l.actualHoursSpent && l.actualHoursSpent > 0
    );
    if (taskLogs.length === 0) continue;

    const avgHoursPerLog = taskLogs.reduce((sum, l) => sum + (l.actualHoursSpent || 0), 0) / taskLogs.length;
    if (task.estimatedHours! > 0) {
      const ratio = Math.min(3.0, Math.max(0.3, avgHoursPerLog / (task.estimatedHours! / tasksWithEstimates.length)));
      ratios.push(ratio);
    }
  }

  if (ratios.length === 0) return 1.0;

  ratios.sort((a, b) => a - b);
  const mid = Math.floor(ratios.length / 2);
  return ratios.length % 2 === 0
    ? (ratios[mid - 1] + ratios[mid]) / 2
    : ratios[mid];
}

/**
 * Calculate completion velocity: how fast task completion percentages change per week.
 */
function calculateCompletionVelocity(tasks: Task[]): number {
  const inProgressTasks = tasks.filter(
    t => t.status === 'in_progress' && t.completionPercentage > 0
  );
  if (inProgressTasks.length === 0) return 0;

  const now = new Date();
  let totalDeltaPerWeek = 0;
  let count = 0;

  for (const task of inProgressTasks) {
    const created = new Date(task.createdAt);
    const weeksElapsed = Math.max(0.5, (now.getTime() - created.getTime()) / (1000 * 3600 * 24 * 7));
    const deltaPerWeek = task.completionPercentage / weeksElapsed;
    totalDeltaPerWeek += deltaPerWeek;
    count++;
  }

  return count > 0 ? totalDeltaPerWeek / count : 0;
}

/**
 * Detect velocity trend from weekly velocities.
 */
function detectVelocityTrend(velocities: number[]): 'accelerating' | 'stable' | 'decelerating' {
  if (velocities.length < 3) return 'stable';

  const mid = Math.floor(velocities.length / 2);
  const olderHalf = velocities.slice(0, mid);
  const recentHalf = velocities.slice(mid);

  const olderAvg = olderHalf.reduce((s, v) => s + v, 0) / olderHalf.length;
  const recentAvg = recentHalf.reduce((s, v) => s + v, 0) / recentHalf.length;

  if (olderAvg === 0 && recentAvg === 0) return 'stable';
  const changeRatio = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : (recentAvg > 0 ? 1 : 0);

  if (changeRatio > 0.15) return 'accelerating';
  if (changeRatio < -0.15) return 'decelerating';
  return 'stable';
}

/**
 * Detect stagnation: tasks marked "in_progress" with no completion growth
 * for 2+ weeks. These are pseudo-blocked.
 */
function detectStagnation(tasks: Task[]): number {
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 3600 * 1000);

  const stagnantTasks = tasks.filter(task => {
    if (task.status !== 'in_progress') return false;
    const updated = new Date(task.updatedAt);
    return updated < twoWeeksAgo && task.completionPercentage < 80;
  });

  return tasks.length > 0 ? stagnantTasks.length / tasks.length : 0;
}

/**
 * Smarter risk multiplier that considers priority of blocked/overdue tasks,
 * detects stagnation as pseudo-blocking, and penalizes dependency chains.
 */
function calculateRiskMultiplier(
  weightedTasks: Array<{ task: Task; weight: number; remaining: number }>,
  remainingWork: number,
  tasks: Task[]
): number {
  if (remainingWork <= 0) return 1;

  const prioritySeverity: Record<string, number> = {
    critical: 2.0,
    high: 1.5,
    medium: 1.0,
    low: 0.6
  };

  let weightedBlockedRatio = 0;
  let weightedOverdueRatio = 0;
  let dependencyRiskRatio = 0;
  const now = new Date();

  // Build a map for quick task lookup by ID
  const taskMap = new Map<string, Task>();
  for (const t of tasks) taskMap.set(t.id, t);

  for (const { task, remaining } of weightedTasks) {
    const severity = prioritySeverity[task.priority] || 1;
    const workRatio = remaining / remainingWork;

    if (task.status === 'blocked') {
      weightedBlockedRatio += workRatio * severity;
    }
    if (task.deadline && new Date(task.deadline) < now && task.status !== 'completed') {
      weightedOverdueRatio += workRatio * severity;
    }

    // Dependency risk: if any dependency is blocked, overdue, or behind
    if (task.dependsOn && task.dependsOn.length > 0) {
      for (const depId of task.dependsOn) {
        const dep = taskMap.get(depId);
        if (!dep) continue;
        const depIsAtRisk =
          dep.status === 'blocked' ||
          (dep.deadline && new Date(dep.deadline) < now && dep.status !== 'completed') ||
          (dep.status === 'in_progress' && dep.completionPercentage < 50);
        if (depIsAtRisk) {
          dependencyRiskRatio += workRatio * severity * 0.5;
        }
      }
    }
  }

  const stagnationRatio = detectStagnation(tasks);

  return 1 + (weightedBlockedRatio * 0.40) + (weightedOverdueRatio * 0.30) + (stagnationRatio * 0.25) + (dependencyRiskRatio * 0.20);
}

/**
 * Lightweight Monte Carlo simulation.
 * Runs N iterations with velocity drawn from observed distribution
 * to produce a range of completion estimates.
 */
function monteCarloSimulation(
  remainingWork: number,
  velocities: number[],
  riskMultiplier: number,
  iterations: number = 200
): { p25Weeks: number; p50Weeks: number; p75Weeks: number } {
  if (velocities.length === 0 || remainingWork <= 0) {
    return { p25Weeks: 0, p50Weeks: 0, p75Weeks: 0 };
  }

  const mean = velocities.reduce((s, v) => s + v, 0) / velocities.length;
  const variance = calculateVariance(velocities);
  const stdDev = Math.sqrt(variance);

  const results: number[] = [];

  let seed = 42;
  const nextRandom = () => {
    seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (seed >>> 0) / 0xFFFFFFFF;
  };

  for (let i = 0; i < iterations; i++) {
    const u1 = Math.max(0.0001, nextRandom());
    const u2 = nextRandom();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    let sampledVelocity = mean + z * stdDev;
    sampledVelocity = Math.max(mean * 0.15, sampledVelocity);

    const riskVariance = 1 + (nextRandom() - 0.5) * 0.3;
    const adjustedVelocity = sampledVelocity / (riskMultiplier * riskVariance);

    const weeks = adjustedVelocity > 0 ? remainingWork / adjustedVelocity : 52;
    results.push(Math.min(52, weeks));
  }

  results.sort((a, b) => a - b);

  return {
    p25Weeks: results[Math.floor(iterations * 0.25)],
    p50Weeks: results[Math.floor(iterations * 0.50)],
    p75Weeks: results[Math.floor(iterations * 0.75)]
  };
}

/**
 * Bayesian-inspired confidence calculation.
 */
function calculateBayesianConfidence(
  logCount: number,
  taskCount: number,
  velocities: number[],
  progressPercentage: number
): number {
  const PRIOR = 12;
  const dataEvidence = Math.min(30, 15 * (1 - Math.exp(-logCount / 8)) + 10 * (1 - Math.exp(-taskCount / 5)));
  const progressEvidence = Math.min(15, progressPercentage / 5);

  let consistencyEvidence = 0;
  if (velocities.length >= 2) {
    const mean = velocities.reduce((s, v) => s + v, 0) / velocities.length;
    const cv = mean > 0 ? Math.sqrt(calculateVariance(velocities)) / mean : 2;
    consistencyEvidence = Math.max(-15, 20 - cv * 20);
  }

  const weeksOfData = Math.min(15, velocities.length * 3);
  const total = PRIOR + dataEvidence + progressEvidence + consistencyEvidence + weeksOfData;
  return Math.max(5, Math.min(95, total));
}

/**
 * Predicts project completion using EWMA velocity, Monte Carlo simulation,
 * estimation bias detection, and Bayesian confidence.
 *
 * Returns both point estimates and optimistic/pessimistic ranges.
 */
export function predictProgress(
  logs: LogEntry[],
  tasks: Task[],
  projectEndDate: string,
  velocityMultiplier: number = 1.0
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

  const emptyResult: ProgressPrediction = {
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
    riskLevel: 'Low',
    velocityTrend: 'stable',
    estimationBias: 1.0,
    completionVelocity: 0
  };

  if (tasks.length === 0) return emptyResult;

  if (remainingWork <= 0) {
    return {
      ...emptyResult,
      expectedCompletionDate: new Date().toISOString(),
      confidenceLevel: Math.min(100, 65 + logs.length * 3),
      totalWork: round(totalWork),
      completedWork: round(completedWork),
      progressPercentage: 100,
      status: 'Completed',
      riskLevel: 'Low'
    };
  }

  // --- VELOCITY CALCULATION (EWMA) ---
  const weeklyVelocities = calculateWeeklyWorkVelocities(logs);
  const ewmaVelocity = ewma(weeklyVelocities, 0.4);
  const averageVelocity = weeklyVelocities.length > 0
    ? weeklyVelocities.reduce((sum, v) => sum + v, 0) / weeklyVelocities.length
    : 0;

  const currentVelocity = ewmaVelocity > 0 ? ewmaVelocity : averageVelocity;

  // --- ESTIMATION BIAS ---
  const estimationBias = detectEstimationBias(logs, tasks);

  // --- COMPLETION VELOCITY ---
  const completionVel = calculateCompletionVelocity(tasks);

  // --- VELOCITY TREND ---
  const velocityTrend = detectVelocityTrend(weeklyVelocities);

  // --- BLENDED VELOCITY ---
  let blendedVelocity: number;
  if (completionVel > 0 && currentVelocity > 0) {
    const completionAsWork = (completionVel / 100) * totalWork;
    blendedVelocity = currentVelocity * 0.70 + completionAsWork * 0.30;
  } else {
    blendedVelocity = Math.max(currentVelocity, averageVelocity);
  }

  // Apply What-If velocity multiplier (default 1.0 = no change)
  blendedVelocity *= Math.max(0.1, velocityMultiplier);

  // Apply estimation bias
  const biasAdjustedWork = remainingWork * Math.max(0.7, Math.min(1.5, estimationBias));

  // --- RISK MULTIPLIER ---
  const riskMultiplier = calculateRiskMultiplier(weightedTasks, remainingWork, tasks);
  const predictedVelocity = blendedVelocity > 0 ? blendedVelocity / riskMultiplier : 0;

  // --- POINT ESTIMATE ---
  const weeksNeeded = predictedVelocity > 0 ? biasAdjustedWork / predictedVelocity : 52;
  const expectedCompletion = new Date();
  expectedCompletion.setDate(expectedCompletion.getDate() + Math.ceil(weeksNeeded * 7));

  // --- MONTE CARLO SIMULATION ---
  const monteCarlo = monteCarloSimulation(biasAdjustedWork, weeklyVelocities, riskMultiplier);
  const optimisticDate = new Date();
  optimisticDate.setDate(optimisticDate.getDate() + Math.ceil(monteCarlo.p25Weeks * 7));
  const pessimisticDate = new Date();
  pessimisticDate.setDate(pessimisticDate.getDate() + Math.ceil(monteCarlo.p75Weeks * 7));

  // --- DEADLINE ANALYSIS ---
  const deadline = projectEndDate ? new Date(projectEndDate) : null;
  const weeksUntilDeadline = deadline
    ? (deadline.getTime() - new Date().getTime()) / (1000 * 3600 * 24 * 7)
    : 0;
  const delayWeeks = deadline ? weeksNeeded - weeksUntilDeadline : 0;
  const status = getPredictionStatus(remainingWork, weeksNeeded, weeksUntilDeadline, Boolean(deadline));
  const riskLevel = getPredictionRisk(status, riskMultiplier);

  // --- BAYESIAN CONFIDENCE ---
  const confidence = calculateBayesianConfidence(logs.length, tasks.length, weeklyVelocities, progressPercentage);

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
    riskLevel,
    optimisticDate: optimisticDate.toISOString(),
    pessimisticDate: pessimisticDate.toISOString(),
    optimisticWeeks: round(monteCarlo.p25Weeks),
    pessimisticWeeks: round(monteCarlo.p75Weeks),
    estimationBias: round(estimationBias),
    completionVelocity: round(completionVel),
    velocityTrend
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

  const dataPoints = validLogs.map(log => {
    const productivityScore = calculateProductivityScore(log);
    return {
      mood: log.moodRating!,
      productivity: productivityScore,
      date: log.date
    };
  });

  const correlation = calculateCorrelation(
    dataPoints.map(d => d.mood),
    dataPoints.map(d => d.productivity)
  );

  const moodGroups = groupByMoodRange(dataPoints);
  const optimalRange = findOptimalMoodRange(moodGroups);
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

  const riskLevel = totalRisk > 70 ? 'critical' : totalRisk > 50 ? 'high' : totalRisk > 30 ? 'medium' : 'low';
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

  // Smart default: compute median actualHoursSpent from user's own data
  const hoursValues = logs
    .map(l => l.actualHoursSpent)
    .filter((h): h is number => typeof h === 'number' && h > 0)
    .sort((a, b) => a - b);
  const medianHours = hoursValues.length > 0
    ? hoursValues[Math.floor(hoursValues.length / 2)]
    : 4; // Fallback to 4 if no data

  return weeks.map(week => week.reduce((sum, log) => {
    const loggedHours = typeof log.actualHoursSpent === 'number' && log.actualHoursSpent > 0
      ? log.actualHoursSpent
      : null;
    const baseWork = loggedHours ? loggedHours / medianHours : 1;
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
  riskMultiplier: number
): ProgressPrediction['riskLevel'] {
  if (status === 'Behind' || riskMultiplier > 1.5) return 'High';
  if (status === 'At Risk' || riskMultiplier > 1.15) return 'Medium';
  return 'Low';
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function calculateProductivityScore(log: LogEntry): number {
  let score = 0;
  
  if (log.taskStatus === 'done') score += 10;
  else if (log.taskStatus === 'inprogress') score += 5;
  else score += 2;

  score += Math.min(5, log.tasksCompleted.length / 50);

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

  return [...new Set(recommendations)];
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
    const dateRange = prediction.optimisticDate && prediction.pessimisticDate
      ? ` (range: ${new Date(prediction.optimisticDate).toLocaleDateString()} – ${new Date(prediction.pessimisticDate).toLocaleDateString()})`
      : '';
    const trendEmoji = prediction.velocityTrend === 'accelerating' ? '📈' : prediction.velocityTrend === 'decelerating' ? '📉' : '📊';
    insights.push({
      type: 'prediction',
      title: 'Project Completion Forecast',
      description: `${trendEmoji} At ${prediction.currentVelocity} work units/week (${prediction.velocityTrend}), expected completion by ${new Date(prediction.expectedCompletionDate).toLocaleDateString()}${dateRange}.`,
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
