import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAlerts } from '@/hooks/useAlerts';
import { getRiskBadgeColor } from '@/lib/riskDetection';
import { AlertCircle, X, Check, TrendingDown, Calendar, Frown, Activity, ChevronLeft, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AlertCenter = () => {
  const navigate = useNavigate();
  const { alerts, loading, unreadCount, markAsRead, dismiss } = useAlerts();

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'low_progress': return <TrendingDown className="w-5 h-5" />;
      case 'deadline_risk': return <Calendar className="w-5 h-5" />;
      case 'mood_alert': return <Frown className="w-5 h-5" />;
      case 'engagement_drop': return <Activity className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getAlertTitle = (type: string) => {
    switch (type) {
      case 'low_progress': return 'Low Progress Detected';
      case 'deadline_risk': return 'Deadline Risk';
      case 'mood_alert': return 'Mood Alert';
      case 'engagement_drop': return 'Engagement Drop';
      default: return 'Alert';
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading alerts...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <header className="bg-gray-800/50 border-b border-orange-400/20 shadow-lg shadow-orange-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-orange-600 to-red-600 rounded-full">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                  ALERT CENTER
                </h1>
                <p className="text-sm text-gray-400">RISK ALERTS & NOTIFICATIONS</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="border-gray-600 hover:bg-gray-700/50 hover:border-orange-400 text-gray-300"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                BACK TO DASHBOARD
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          Alert Center
        </h2>
        <p className="text-gray-400">
          {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
        </p>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <Card className="bg-gray-800/50 border-green-500/30">
          <CardContent className="py-12 text-center">
            <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-400 mb-2">No Active Alerts</h3>
            <p className="text-gray-400">You're on track! Keep up the excellent work.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <Card
              key={alert.id}
              className={`bg-gray-800/50 border transition-all ${
                !alert.isRead ? 'border-cyan-400/40 shadow-lg shadow-cyan-500/10' : 'border-gray-700'
              }`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${getRiskBadgeColor(alert.severity)}`}>
                        {getAlertIcon(alert.type)}
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">
                          {getAlertTitle(alert.type)}
                        </CardTitle>
                        <Badge className={`${getRiskBadgeColor(alert.severity)} mt-1`}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!alert.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(alert.id)}
                        className="text-cyan-400 hover:text-cyan-300"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismiss(alert.id)}
                      className="text-red-400 hover:text-red-300"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Alert Message */}
                <Alert className="bg-gray-700/30 border-gray-600">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-gray-300">
                    {alert.message}
                  </AlertDescription>
                </Alert>

                {/* Suggestions */}
                {alert.suggestions && alert.suggestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-cyan-400 mb-2">💡 Suggestions:</h4>
                    <ul className="space-y-1">
                      {alert.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-400 flex items-start">
                          <span className="mr-2">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Timestamp */}
                <p className="text-xs text-gray-500">
                  {new Date(alert.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </div>
      </main>
    </div>
  );
};

export default AlertCenter;
