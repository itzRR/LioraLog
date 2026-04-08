import jsPDF from 'jspdf';
import { LogEntry, Task, Report, ReportData, RiskAnalysis } from '@/types';
import { format, subDays } from 'date-fns';
import { analyzeRisk, analyzeMoodProductivity, predictProgress } from './aiAnalytics';

/**
 * Automated Report Generation System
 */

export async function generateWeeklyReport(
  userId: string,
  displayName: string,
  logs: LogEntry[],
  tasks: Task[],
  projectEndDate: string
): Promise<Report> {
  const endDate = new Date();
  const startDate = subDays(endDate, 7);

  const weeklyLogs = logs.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= startDate && logDate <= endDate;
  });

  const reportData = generateReportData(weeklyLogs, tasks, projectEndDate, userId);

  return {
    id: `report_${Date.now()}`,
    userId,
    type: 'weekly',
    generatedAt: new Date().toISOString(),
    dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
    data: reportData
  };
}

export async function generateMonthlyReport(
  userId: string,
  displayName: string,
  logs: LogEntry[],
  tasks: Task[],
  projectEndDate: string
): Promise<Report> {
  const endDate = new Date();
  const startDate = subDays(endDate, 30);

  const monthlyLogs = logs.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= startDate && logDate <= endDate;
  });

  const reportData = generateReportData(monthlyLogs, tasks, projectEndDate, userId);

  return {
    id: `report_${Date.now()}`,
    userId,
    type: 'monthly',
    generatedAt: new Date().toISOString(),
    dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
    data: reportData
  };
}

function generateReportData(
  logs: LogEntry[],
  tasks: Task[],
  projectEndDate: string,
  userId: string
): ReportData {
  const totalLogs = logs.length;
  const completedTasks = logs.filter(log => log.taskStatus === 'done').length;
  
  const moodRatings = logs.filter(log => log.moodRating).map(log => log.moodRating!);
  const avgMood = moodRatings.length > 0 
    ? moodRatings.reduce((a, b) => a + b, 0) / moodRatings.length 
    : 0;

  const riskAnalysis = analyzeRisk(logs, tasks, userId);
  const moodAnalysis = analyzeMoodProductivity(logs);
  const prediction = predictProgress(logs, tasks, projectEndDate);

  const insights: string[] = [];
  
  if (totalLogs > 0) {
    insights.push(`✅ Logged ${totalLogs} entries this period`);
  }
  
  if (completedTasks > 0) {
    insights.push(`🎯 Completed ${completedTasks} tasks`);
  }
  
  if (avgMood > 0) {
    insights.push(`😊 Average mood: ${avgMood.toFixed(1)}/5`);
  }

  if (prediction.confidenceLevel > 50) {
    insights.push(`📊 Progress velocity: ${prediction.currentVelocity} tasks/week`);
  }

  if (riskAnalysis.overallRisk > 30) {
    insights.push(`⚠️ Risk level: ${riskAnalysis.riskLevel.toUpperCase()}`);
  }

  // Calculate progress score (0-100)
  const progressScore = calculateProgressScore(logs, tasks, riskAnalysis);

  return {
    totalLogs,
    completedTasks,
    avgMood: Math.round(avgMood * 10) / 10,
    progressScore,
    riskLevel: riskAnalysis.riskLevel,
    insights
  };
}

function calculateProgressScore(logs: LogEntry[], tasks: Task[], risk: RiskAnalysis): number {
  let score = 50; // Base score

  // Logging frequency (+20 points max)
  const logsPerWeek = logs.length;
  score += Math.min(20, logsPerWeek * 3);

  // Task completion (+30 points max)
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length || 1;
  score += (completedCount / totalCount) * 30;

  // Risk penalty (-40 points max)
  score -= (risk.overallRisk / 100) * 40;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function exportReportToPDF(
  report: Report,
  userName: string,
  projectTitle: string
): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(14, 165, 233); // Cyan
  doc.text('Research Progress Report', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(userName, pageWidth / 2, 30, { align: 'center' });
  doc.text(projectTitle, pageWidth / 2, 37, { align: 'center' });
  
  // Date Range
  doc.setFontSize(10);
  const startDate = format(new Date(report.dateRange.start), 'MMM dd, yyyy');
  const endDate = format(new Date(report.dateRange.end), 'MMM dd, yyyy');
  doc.text(`${startDate} - ${endDate}`, pageWidth / 2, 44, { align: 'center' });
  
  // Divider
  doc.setDrawColor(14, 165, 233);
  doc.line(20, 50, pageWidth - 20, 50);
  
  // Metrics
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Key Metrics', 20, 60);
  
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  let yPos = 70;
  
  doc.text(`Total Log Entries: ${report.data.totalLogs}`, 25, yPos);
  yPos += 8;
  doc.text(`Completed Tasks: ${report.data.completedTasks}`, 25, yPos);
  yPos += 8;
  doc.text(`Average Mood: ${report.data.avgMood}/5`, 25, yPos);
  yPos += 8;
  doc.text(`Progress Score: ${report.data.progressScore}/100`, 25, yPos);
  yPos += 8;
  
  // Risk Level with color
  const riskColors: Record<string, [number, number, number]> = {
    low: [59, 130, 246],
    medium: [234, 179, 8],
    high: [249, 115, 22],
    critical: [239, 68, 68]
  };
  
  const color = riskColors[report.data.riskLevel] || [100, 100, 100];
  doc.setTextColor(...color);
  doc.text(`Risk Level: ${report.data.riskLevel.toUpperCase()}`, 25, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 15;
  
  // Insights
  doc.setFontSize(14);
  doc.text('Insights & Highlights', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  report.data.insights.forEach(insight => {
    const lines = doc.splitTextToSize(insight, pageWidth - 50);
    lines.forEach((line: string) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`• ${line}`, 25, yPos);
      yPos += 6;
    });
  });
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated by LioraLog AI Research Tracker on ${format(new Date(), 'PPP')}`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );
  
  return doc.output('blob');
}

export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function generateSupervisorSummary(
  studentName: string,
  logs: LogEntry[],
  tasks: Task[],
  projectEndDate: string
): string {
  const weeklyLogs = logs.filter(log => {
    const logDate = new Date(log.date);
    const weekAgo = subDays(new Date(), 7);
    return logDate >= weekAgo;
  });

  const risk = analyzeRisk(logs, tasks, '');
  const prediction = predictProgress(logs, tasks, projectEndDate);

  let summary = `📋 **${studentName}'s Weekly Summary**\n\n`;
  summary += `**Activity:** ${weeklyLogs.length} log entries this week\n`;
  summary += `**Progress:** ${prediction.currentVelocity} tasks/week velocity\n`;
  summary += `**Risk:** ${risk.riskLevel.toUpperCase()}\n\n`;

  if (risk.factors.length > 0) {
    summary += `**Attention Needed:**\n`;
    risk.factors.forEach(factor => {
      summary += `- ${factor.description}\n`;
    });
  }

  summary += `\n**Recommended Actions:**\n`;
  risk.recommendations.slice(0, 3).forEach(rec => {
    summary += `${rec}\n`;
  });

  return summary;
}
