import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { chatWithLiora, type ChatMessage } from '@/lib/geminiClient';
import { useNotification } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { parseMarkdown } from '@/lib/markdownParser';
import { predictProgress } from '@/lib/aiAnalytics';
import { LogEntry, Task } from '@/types';


interface LioraChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LioraChat: React.FC<LioraChatProps> = ({ isOpen, onClose }) => {
  const { error } = useNotification();
  const { userProfile } = useAuth();
  
  // Dynamic greeting with user's name
  const getGreeting = () => {
    const name = userProfile?.displayName || 'there';
    return `Hi ${name}! 👋 I'm Liora, your AI research assistant. I can see your projects, tasks, and logs, so feel free to ask me anything about your research progress!`;
  };
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: getGreeting(),
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getUserContext = async () => {
    if (!userProfile?.uid) return '';

    try {
      // Build project lookup map (id -> name)
      const projects = userProfile.researchProjects || [];
      const projectMap: Record<string, string> = {};
      projects.forEach(p => { projectMap[p.id] = p.researchTitle; });

      const projectDetails = projects.map(p => 
        `- "${p.researchTitle}" (${p.fieldDomain || 'No domain'}, ${p.isActive ? 'Active' : 'Inactive'}, ${p.startDate} to ${p.endDate})`
      ).join('\n');

      // Fetch ALL logs and tasks to compute accurate predictions
      const logsQuery = query(
        collection(db, 'logs'),
        where('userId', '==', userProfile.uid),
        orderBy('date', 'desc')
      );
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('userId', '==', userProfile.uid)
      );

      const [logsSnapshot, tasksSnapshot] = await Promise.all([getDocs(logsQuery), getDocs(tasksQuery)]);
      
      const allLogs = logsSnapshot.docs.map(doc => doc.data() as LogEntry);
      const allTasks = tasksSnapshot.docs.map(doc => doc.data() as Task);

      // Get recent logs (last 5) for text context
      const recentLogs = allLogs.slice(0, 5).map(data => {
        const hours = data.actualHoursSpent ? `, ${data.actualHoursSpent}h spent` : '';
        const project = data.projectId ? ` [Project: ${projectMap[data.projectId] || 'Unknown'}]` : '';
        return `${data.date}${project}: ${data.tasksCompleted}${hours}`;
      }).join('\n');

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const currentDateReadable = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      // Get active tasks (not completed), limit 10 for text context
      const activeTasks = allTasks.filter(t => t.status !== 'completed').slice(0, 10).map(data => {
        const projectName = data.projectId ? projectMap[data.projectId] || 'Unknown Project' : 'No Project';
        const effort = [
          data.size ? `size: ${data.size}` : null,
          data.difficulty ? `difficulty: ${data.difficulty}` : null,
          data.estimatedHours ? `est: ${data.estimatedHours}h` : null
        ].filter(Boolean).join(', ');

        // Pre-compute deadline status so the AI doesn't have to guess
        let deadlineStatus = '';
        if (data.deadline) {
          const deadlineEnd = new Date(data.deadline + 'T23:59:59');
          const diffMs = deadlineEnd.getTime() - now.getTime();
          const diffHours = Math.round(diffMs / (1000 * 60 * 60));
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

          if (diffMs < 0) {
            const overdueDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
            deadlineStatus = `OVERDUE by ${overdueDays} day(s)`;
          } else if (diffHours <= 24) {
            deadlineStatus = `⚠️ URGENT: only ~${diffHours} hour(s) remaining!`;
          } else if (diffDays <= 2) {
            deadlineStatus = `due tomorrow (~${diffHours} hours left)`;
          } else {
            deadlineStatus = `due in ${diffDays} days`;
          }
        }
        return `${data.title} [Project: ${projectName}] (${data.status}, deadline: ${data.deadline} — ${deadlineStatus}${effort ? `, ${effort}` : ''})`;
      }).join('\n');

      // Calculate AI Predictions for each active project
      const systemPredictions = projects.filter(p => p.isActive).map(project => {
        // Check if project is overdue
        let isProjectOverdue = false;
        if (project.endDate) {
          const endDate = new Date(project.endDate + 'T23:59:59');
          if (endDate.getTime() < now.getTime()) {
            isProjectOverdue = true;
          }
        }

        if (isProjectOverdue) {
          return `- ${project.researchTitle}:
    Status: 🚨 PROJECT OVERDUE
    Original Deadline: ${project.endDate}
    Note: The project deadline has already passed. Please advise the user to review their overdue tasks and update their project timeline.`;
        }

        const projectLogs = allLogs.filter(log => log.projectId === project.id || !log.projectId); // Include general logs
        const projectTasks = allTasks.filter(task => task.projectId === project.id);
        const prediction = predictProgress(projectLogs, projectTasks, project.endDate);
        
        const predictedDateStr = prediction.predictedVelocity > 0 
          ? new Date(prediction.expectedCompletionDate).toLocaleDateString()
          : 'Unknown (0 velocity - need more progress to predict)';

        return `- ${project.researchTitle}:
    Status: ${prediction.status} (Risk: ${prediction.riskLevel})
    Predicted Completion: ${predictedDateStr}
    Velocity: ${prediction.currentVelocity} tasks/week
    Progress: ${prediction.progressPercentage}% (${prediction.completedWork} / ${prediction.totalWork} work units)
    Confidence Level: ${prediction.confidenceLevel}%
    ${prediction.delayWeeks ? `Delay: ${prediction.delayWeeks} weeks behind schedule` : 'On track or ahead of schedule'}`;
      }).join('\n\n');

      return `
IMPORTANT: Today's date is ${currentDateReadable} (${todayStr}). You MUST use this date when discussing deadlines. Do NOT guess or assume a different date.

RESEARCHER'S CONTEXT:
Name: ${userProfile.displayName || 'User'}

Research Projects:
${projectDetails || 'No projects yet'}

SYSTEM PREDICTIONS (Use this to answer questions about progress, delays, and expected completion):
${systemPredictions || 'No active predictions'}

Recent Activity (last 5 logs):
${recentLogs || 'No recent logs'}

Active Tasks (deadline status is pre-calculated relative to today ${todayStr}):
${activeTasks || 'No active tasks'}
`;
    } catch (err) {
      console.error('Error fetching user context:', err);
      return '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get user context
      const context = await getUserContext();
      
      // Add context to the message for AI
      const messageWithContext = context ? `${context}\n\nUser Question: ${input}` : input;
      
      const reply = await chatWithLiora(messageWithContext, messages);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      error('Liora Unavailable', 'Unable to reach Liora right now. Please try again.');
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-cyan-400/30 rounded-2xl shadow-2xl shadow-cyan-500/20 w-full max-w-2xl h-[600px] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 border-b border-cyan-400/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                  Chat with Liora
                </h3>
                <p className="text-xs text-gray-400">Your AI Research Assistant</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-700/50"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyan-600 scrollbar-track-gray-800">
            {messages.map((msg) => (
              <motion.div
                key={msg.timestamp}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                      : 'bg-gray-800/50 border border-gray-700 text-gray-200'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-cyan-400">Liora</span>
                    </div>
                  )}
                  <div 
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                  />
                  <p className="text-xs opacity-60 mt-2">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-gray-800/50 border border-gray-700 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                    <span className="text-sm text-gray-400">Liora is thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-cyan-400/20 p-4 bg-gray-900/50">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Liora anything about your research..."
                disabled={isLoading}
                className="flex-1 bg-gray-800/50 border-gray-700 focus:border-cyan-400 text-white placeholder:text-gray-500"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
            </p>
          </div>
        </motion.div>
      </motion.div>
  );
};

// Floating Chat Button Component
export const LioraChatButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
        className="fixed bottom-6 right-6 z-[9998]"
      >
        <Button
          onClick={() => {
            console.log('Chat button clicked!');
            setIsOpen(true);
          }}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 pointer-events-auto relative z-10"
        >
          <MessageCircle className="w-7 h-7 text-white" />
        </Button>
        
        {/* Pulse animation - won't block clicks */}
        <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping pointer-events-none" />
      </motion.div>

      <LioraChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
