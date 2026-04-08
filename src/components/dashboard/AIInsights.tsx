import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LogEntry, Task, AIInsight } from '@/types';
import { generateAIInsights } from '@/lib/aiAnalytics';
import { Sparkles, TrendingUp, Brain, Lightbulb, Calendar } from 'lucide-react';

interface AIInsightsProps {
  logs: LogEntry[];
  tasks: Task[];
  projectEndDate: string;
}

const AIInsights: React.FC<AIInsightsProps> = ({ logs, tasks, projectEndDate }) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (logs.length > 0) {
      const aiInsights = generateAIInsights(logs, tasks, projectEndDate);
      setInsights(aiInsights);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [logs, tasks, projectEndDate]);

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'prediction': return <TrendingUp className="w-5 h-5" />;
      case 'correlation': return <Brain className="w-5 h-5" />;
      case 'recommendation': return <Lightbulb className="w-5 h-5" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-green-400';
    if (confidence >= 50) return 'text-yellow-400';
    return 'text-orange-400';
  };

  if (loading) {
    return <div className="text-gray-400">Analyzing your data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-gradient-to-br from-purple-600/20 to-cyan-600/20 border border-purple-500/30">
          <Sparkles className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            AI Insights
          </h2>
          <p className="text-gray-400">Powered by advanced analytics</p>
        </div>
      </div>

      {/* Insights */}
      {insights.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">Not Enough Data</h3>
            <p className="text-gray-500">
              Log more entries to unlock AI-powered insights and predictions!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <Card
              key={index}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-purple-500/20 shadow-lg shadow-purple-900/10"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      insight.type === 'prediction' ? 'bg-cyan-900/30 border border-cyan-500/30' :
                      insight.type === 'correlation' ? 'bg-purple-900/30 border border-purple-500/30' :
                      'bg-yellow-900/30 border border-yellow-500/30'
                    }`}>
                      {getInsightIcon(insight.type)}
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg mb-1">
                        {insight.title}
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        {insight.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getConfidenceColor(insight.confidence)}`}>
                      {Math.round(insight.confidence)}% confidence
                    </div>
                    <Progress 
                      value={insight.confidence} 
                      className="w-24 h-2 mt-1"
                    />
                  </div>
                </div>
              </CardHeader>

              {/* Additional Data Visualization */}
              {insight.type === 'prediction' && insight.data && (
                <CardContent className="border-t border-gray-700/50">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-cyan-400">
                        {insight.data.currentVelocity}
                      </div>
                      <div className="text-xs text-gray-500">Tasks/Week</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-400">
                        {insight.data.remainingWork}
                      </div>
                      <div className="text-xs text-gray-500">Tasks Remaining</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-400">
                        {new Date(insight.data.expectedCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-xs text-gray-500">Expected Completion</div>
                    </div>
                  </div>
                </CardContent>
              )}

              {insight.type === 'correlation' && insight.data && (
                <CardContent className="border-t border-gray-700/50">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Correlation Strength:</span>
                      <Badge className={`${
                        Math.abs(insight.data.correlation) > 0.5 ? 'bg-green-900/50 text-green-300' :
                        Math.abs(insight.data.correlation) > 0.3 ? 'bg-yellow-900/50 text-yellow-300' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {(insight.data.correlation * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Optimal Mood Range:</span>
                      <span className="text-cyan-400 font-medium">
                        {insight.data.optimalMoodRange[0]} - {insight.data.optimalMoodRange[1]} / 5
                      </span>
                    </div>
                  </div>
                </CardContent>
              )}

              {insight.type === 'recommendation' && insight.data && (
                <CardContent className="border-t border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Risk Level:</span>
                    <Badge className={`${
                      insight.data.riskLevel === 'critical' ? 'bg-red-900/50 text-red-300' :
                      insight.data.riskLevel === 'high' ? 'bg-orange-900/50 text-orange-300' :
                      insight.data.riskLevel === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-blue-900/50 text-blue-300'
                    }`}>
                      {insight.data.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-gray-800/30 border-gray-700/50">
        <CardContent className="py-4">
          <p className="text-xs text-gray-500 text-center">
            💡 AI insights are generated using statistical analysis and pattern recognition from your research logs
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIInsights;
