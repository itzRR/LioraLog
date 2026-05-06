// Core Types for AI-Powered Research Progress Tracker

export interface ResearchProject {
  id: string;
  researchTitle: string;
  fieldDomain: string;
  supervisors: string[];
  startDate: string;
  endDate: string;
  abstract: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'student' | 'supervisor' | 'admin';
  researchProjects: ResearchProject[];
  photoURL?: string;
  createdAt: string;
  // Supervisor specific fields
  department?: string;
  specialization?: string;
  // Student specific fields
  studentCode?: string;
  supervisorIds?: string[];
}

export interface LogEntry {
  id: string;
  date: string;
  tasksCompleted: string;
  feedback: string;
  problems: string;
  taskStatus: 'todo' | 'inprogress' | 'done';
  moodRating?: number;
  actualHoursSpent?: number | null;
  userId: string;
  projectId?: string; // Optional: link to specific research project
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  size?: 'small' | 'medium' | 'large' | 'very_large';
  difficulty?: 'easy' | 'normal' | 'hard';
  estimatedHours?: number | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  deadline: string;
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  userId: string;
  type: 'low_progress' | 'deadline_risk' | 'mood_alert' | 'engagement_drop';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestions: string[];
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

export interface SupervisorStudent {
  id: string;
  supervisorId: string;
  studentId: string;
  assignedAt: string;
  isActive: boolean;
}

export interface Report {
  id: string;
  userId: string;
  type: 'weekly' | 'monthly' | 'custom';
  generatedAt: string;
  dateRange: { start: string; end: string };
  data: ReportData;
  pdfUrl?: string;
}

export interface ReportData {
  totalLogs: number;
  completedTasks: number;
  avgMood: number;
  progressScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  insights: string[];
  charts?: any;
}

export interface AIInsight {
  type: 'prediction' | 'correlation' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  data?: any;
}

export interface ProgressPrediction {
  expectedCompletionDate: string;
  confidenceLevel: number;
  currentVelocity: number;
  predictedVelocity: number;
  remainingWork: number;
  totalWork?: number;
  completedWork?: number;
  progressPercentage?: number;
  weeksNeeded?: number;
  daysNeeded?: number;
  delayWeeks?: number;
  status?: 'Completed' | 'On Track' | 'At Risk' | 'Behind' | 'Unknown';
  riskLevel?: 'Low' | 'Medium' | 'High';
}

export interface MoodProductivityData {
  correlation: number;
  optimalMoodRange: [number, number];
  insights: string[];
  dataPoints: Array<{ mood: number; productivity: number; date: string }>;
}

export interface RiskAnalysis {
  overallRisk: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    type: string;
    severity: number;
    description: string;
  }>;
  recommendations: string[];
}
