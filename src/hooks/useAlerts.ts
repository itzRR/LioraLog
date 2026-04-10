import { useState, useEffect } from 'react';
import { Alert } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAlerts, markAlertAsRead, dismissAlert } from '@/lib/riskDetection';
import { toast } from './use-toast';

export function useAlerts() {
  const { userProfile } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAlerts = async () => {
    if (!userProfile) {
      setLoading(false);
      return;
    }

    try {
      const userAlerts = await getUserAlerts(userProfile.uid);
      setAlerts(userAlerts);
      setUnreadCount(userAlerts.filter(a => !a.isRead).length);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Refresh alerts every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userProfile]);

  const markAsRead = async (alertId: string) => {
    try {
      await markAlertAsRead(alertId);
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, isRead: true } : alert
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('Error marking alert as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to update alert',
        variant: 'destructive'
      });
    }
  };

  const dismiss = async (alertId: string) => {
    try {
      await dismissAlert(alertId);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      toast({
        title: 'Alert Dismissed',
        description: 'The alert has been removed'
      });
    } catch (error: any) {
      console.error('Error dismissing alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to dismiss alert',
        variant: 'destructive'
      });
    }
  };

  const getCriticalAlerts = () => {
    return alerts.filter(a => a.severity === 'critical');
  };

  const getHighAlerts = () => {
    return alerts.filter(a => a.severity === 'high');
  };

  return {
    alerts,
    loading,
    unreadCount,
    markAsRead,
    dismiss,
    getCriticalAlerts,
    getHighAlerts,
    refreshAlerts: fetchAlerts
  };
}

// Handles alert generation and management
