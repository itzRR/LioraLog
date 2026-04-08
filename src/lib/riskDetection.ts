import { LogEntry, Task, Alert, RiskAnalysis } from '@/types';
import { analyzeRisk } from './aiAnalytics';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Risk Detection and Alert Management System
 */

export async function checkAndCreateAlerts(userId: string, logs: LogEntry[], tasks: Task[]): Promise<Alert[]> {
  const riskAnalysis = analyzeRisk(logs, tasks, userId);
  const alerts: Alert[] = [];

  // Create alerts for each risk factor
  for (const factor of riskAnalysis.factors) {
    const alert: Omit<Alert, 'id'> = {
      userId,
      type: factor.type as Alert['type'],
      severity: getSeverityFromScore(factor.severity),
      message: factor.description,
      suggestions: riskAnalysis.recommendations.filter((_, i) => i < 3), // Top 3 suggestions
      isRead: false,
      isDismissed: false,
      createdAt: new Date().toISOString()
    };

    // Check if similar alert already exists
    const existingAlert = await findExistingAlert(userId, alert.type);
    
    if (!existingAlert) {
      // Create new alert
      const docRef = await addDoc(collection(db, 'alerts'), alert);
      alerts.push({ ...alert, id: docRef.id });
    } else if (!existingAlert.isDismissed) {
      // Update existing alert
      await updateDoc(doc(db, 'alerts', existingAlert.id), {
        severity: alert.severity,
        message: alert.message,
        suggestions: alert.suggestions
      });
      alerts.push(existingAlert);
    }
  }

  return alerts;
}

export async function getUserAlerts(userId: string): Promise<Alert[]> {
  const alertsQuery = query(
    collection(db, 'alerts'),
    where('userId', '==', userId),
    where('isDismissed', '==', false)
  );

  const snapshot = await getDocs(alertsQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
}

export async function markAlertAsRead(alertId: string): Promise<void> {
  await updateDoc(doc(db, 'alerts', alertId), { isRead: true });
}

export async function dismissAlert(alertId: string): Promise<void> {
  await updateDoc(doc(db, 'alerts', alertId), { isDismissed: true });
}

async function findExistingAlert(userId: string, type: Alert['type']): Promise<Alert | null> {
  const alertsQuery = query(
    collection(db, 'alerts'),
    where('userId', '==', userId),
    where('type', '==', type),
    where('isDismissed', '==', false)
  );

  const snapshot = await getDocs(alertsQuery);
  if (snapshot.empty) return null;
  
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Alert;
}

function getSeverityFromScore(score: number): Alert['severity'] {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

export function getRiskColor(severity: Alert['severity']): string {
  switch (severity) {
    case 'critical': return 'text-red-500';
    case 'high': return 'text-orange-500';
    case 'medium': return 'text-yellow-500';
    case 'low': return 'text-blue-500';
    default: return 'text-gray-500';
  }
}

export function getRiskBadgeColor(severity: Alert['severity']): string {
  switch (severity) {
    case 'critical': return 'bg-red-900/50 text-red-300 border-red-500';
    case 'high': return 'bg-orange-900/50 text-orange-300 border-orange-500';
    case 'medium': return 'bg-yellow-900/50 text-yellow-300 border-yellow-500';
    case 'low': return 'bg-blue-900/50 text-blue-300 border-blue-500';
    default: return 'bg-gray-900/50 text-gray-300 border-gray-500';
  }
}
