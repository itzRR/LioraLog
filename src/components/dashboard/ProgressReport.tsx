import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, TrendingUp, BarChart2 } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useTasks } from '@/hooks/useTasks';
import { predictProgress } from '@/lib/aiAnalytics';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AI_QUOTES_GOOD = [
  "Estimate uses task priority, completion percentage, blocked or overdue work, recent logs, and data consistency.",
  "I'm an AI, not a wizard 🧙‍♂️... but I'm crunching the numbers!",
  "Predicting the future using your past logs... no crystal ball required 🔮",
  "Analyzing your workflow velocity... you're doing great! ✨",
  "Doing the math so you don't have to! 🧮",
  "Your progress is looking solid. Keep it up! 🚀"
];

const AI_QUOTES_BAD = [
  "Calculating expected completion... based on your *ahem* 'progress' 📉",
  "Analyzing your procrastination levels... Emotional damage! 💔",
  "Trying to find your productivity... ERROR 404: Not Found 🤖",
  "Doing the math so you don't have to... though the math doesn't look good for you right now! 🧮",
  "Wait, you actually expect to finish on time with this velocity? Hilarious. 😂",
  "If scrolling social media was a task, you'd be done by now. 📱",
  "I'm processing your logs... wait, what logs? 🕵️‍♂️"
];

const TypewriterQuote = ({ isDoingPoorly }: { isDoingPoorly: boolean }) => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const quotes = isDoingPoorly ? AI_QUOTES_BAD : AI_QUOTES_GOOD;

  // Reset text if doing poorly status changes
  useEffect(() => {
    setQuoteIndex(0);
    setDisplayedText("");
    setIsDeleting(false);
  }, [isDoingPoorly]);

  useEffect(() => {
    const currentQuote = quotes[quoteIndex % quotes.length];
    if (!currentQuote) return;
    
    let timer: NodeJS.Timeout;

    if (isDeleting) {
      if (displayedText.length === 0) {
        setIsDeleting(false);
        setQuoteIndex((prev) => (prev + 1) % quotes.length);
      } else {
        timer = setTimeout(() => {
          setDisplayedText(currentQuote.substring(0, displayedText.length - 1));
        }, 20);
      }
    } else {
      if (displayedText.length === currentQuote.length) {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 5000);
      } else {
        timer = setTimeout(() => {
          setDisplayedText(currentQuote.substring(0, displayedText.length + 1));
        }, 40);
      }
    }

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, quoteIndex, quotes]);

  return (
    <span className="min-h-[32px] inline-block">
      {displayedText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
        className="inline-block w-[2px] h-3 bg-purple-400 ml-1 align-middle"
      />
    </span>
  );
};

const ProgressReport = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Default to first project on load
  useEffect(() => {
    if (userProfile?.researchProjects?.length > 0 && !selectedProjectId) {
      setSelectedProjectId(userProfile.researchProjects[0].id);
    }
  }, [userProfile, selectedProjectId]);

  const { tasks } = useTasks(selectedProjectId || undefined);
  const [logs, setLogs] = useState([]);
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile || !selectedProjectId) return;

    let q = query(
      collection(db, 'logs'),
      where('userId', '==', userProfile.uid),
      where('projectId', '==', selectedProjectId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(logsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile, selectedProjectId]);

  const getWeeklyData = () => {
    const now = new Date();
    const days = [];
    const dayNames = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
      dayNames.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    }

    const counts = days.map(day => 
      logs.filter(log => log.date === day).length
    );

    return {
      labels: dayNames,
      datasets: [{
        label: 'Log Entries',
        data: counts,
        backgroundColor: 'rgba(34, 211, 238, 0.5)',
        borderColor: 'rgb(34, 211, 238)',
        borderWidth: 1
      }]
    };
  };

  const getMonthlyData = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const weekNumbers = [];
    const counts = Array(Math.ceil(daysInMonth / 7)).fill(0);

    for (let i = 0; i < daysInMonth; i++) {
      const day = new Date(monthStart);
      day.setDate(day.getDate() + i);
      const weekNumber = Math.floor(i / 7);
      const dayStr = day.toISOString().split('T')[0];
      counts[weekNumber] += logs.filter(log => log.date === dayStr).length;
      if (i % 7 === 0) {
        weekNumbers.push(`Week ${weekNumber + 1}`);
      }
    }

    return {
      labels: weekNumbers,
      datasets: [{
        label: 'Log Entries',
        data: counts,
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
        borderColor: 'rgb(139, 92, 246)',
        borderWidth: 1
      }]
    };
  };

  const getTaskStatusData = () => {
    const statusCounts = {
      todo: 0,
      inprogress: 0,
      done: 0
    };

    logs.forEach(log => {
      statusCounts[log.taskStatus]++;
    });

    return {
      labels: ['To Do', 'In Progress', 'Completed'],
      datasets: [{
        label: 'Tasks',
        data: [statusCounts.todo, statusCounts.inprogress, statusCounts.done],
        backgroundColor: [
          'rgba(107, 114, 128, 0.5)',
          'rgba(234, 179, 8, 0.5)',
          'rgba(34, 197, 94, 0.5)'
        ],
        borderColor: [
          'rgb(107, 114, 128)',
          'rgb(234, 179, 8)',
          'rgb(34, 197, 94)'
        ],
        borderWidth: 1
      }]
    };
  };

  const getMoodData = () => {
    const moodCounts = [0, 0, 0, 0, 0];
    const moodLogs = logs.filter(log => log.moodRating);

    moodLogs.forEach(log => {
      moodCounts[log.moodRating - 1]++;
    });

    return {
      labels: ['1', '2', '3', '4', '5'],
      datasets: [{
        label: 'Mood Ratings',
        data: moodCounts,
        backgroundColor: 'rgba(249, 115, 22, 0.5)',
        borderColor: 'rgb(249, 115, 22)',
        borderWidth: 1,
        tension: 0.1
      }]
    };
  };

  const calculatePrediction = () => {
    if (!selectedProjectId || !userProfile) {
      return { weeks: 0, days: 0, progress: 0, riskLevel: 'Low', status: 'Unknown', delay: 0, confidence: 0, expectedDate: '' };
    }

    const currentProject = userProfile.researchProjects.find(p => p.id === selectedProjectId);
    const prediction = predictProgress(logs, tasks, currentProject?.endDate || '');

    return {
      weeks: prediction.weeksNeeded || 0,
      days: prediction.daysNeeded || 0,
      progress: prediction.progressPercentage || 0,
      riskLevel: prediction.riskLevel || 'Low',
      status: prediction.status || 'Unknown',
      delay: prediction.delayWeeks || 0,
      confidence: prediction.confidenceLevel,
      currentVelocity: prediction.currentVelocity,
      predictedVelocity: prediction.predictedVelocity,
      expectedDate: prediction.expectedCompletionDate,
      deadline: currentProject?.endDate
    };
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <header className="bg-gray-800/50 border-b border-cyan-400/20 shadow-lg shadow-cyan-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  PROGRESS REPORT
                </h1>
                <p className="text-sm text-gray-400">ANALYZE YOUR RESEARCH PROGRESS</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="border-gray-600 hover:bg-gray-700/50 hover:border-cyan-400 text-gray-300"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                BACK TO DASHBOARD
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">LOADING PROGRESS DATA...</p>
          </div>
        ) : logs.length === 0 && tasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">NO ACTIVITY FOUND</p>
            <p className="text-sm text-gray-500">Create a log entry or task to see progress reports</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-xl font-bold text-cyan-400">RESEARCH ACTIVITY</h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                {/* Project Selector */}
                <div className="w-full sm:w-[250px]">
                  <Select 
                    value={selectedProjectId} 
                    onValueChange={setSelectedProjectId}
                    disabled={!userProfile?.researchProjects || userProfile.researchProjects.length === 0}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-200">
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                      {userProfile?.researchProjects?.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.researchTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant={timeRange === 'week' ? 'default' : 'outline'}
                    onClick={() => setTimeRange('week')}
                    className={timeRange === 'week' ? 'bg-cyan-600 hover:bg-cyan-700' : 'border-gray-600 hover:bg-gray-700/50'}
                  >
                    WEEKLY
                  </Button>
                  <Button
                    variant={timeRange === 'month' ? 'default' : 'outline'}
                    onClick={() => setTimeRange('month')}
                    className={timeRange === 'month' ? 'bg-cyan-600 hover:bg-cyan-700' : 'border-gray-600 hover:bg-gray-700/50'}
                  >
                    MONTHLY
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-cyan-400/20 rounded-lg p-6">
              <Bar 
                data={timeRange === 'week' ? getWeeklyData() : getMonthlyData()} 
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        color: '#9ca3af'
                      }
                    },
                  },
                  scales: {
                    x: {
                      grid: {
                        color: 'rgba(55, 65, 81, 0.5)'
                      },
                      ticks: {
                        color: '#9ca3af'
                      }
                    },
                    y: {
                      grid: {
                        color: 'rgba(55, 65, 81, 0.5)'
                      },
                      ticks: {
                        color: '#9ca3af'
                      },
                      beginAtZero: true
                    }
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-800/50 border border-cyan-400/20 rounded-lg p-6">
                <h3 className="text-lg font-bold text-cyan-400 mb-4">TASK STATUS DISTRIBUTION</h3>
                <Bar 
                  data={getTaskStatusData()} 
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          color: '#9ca3af'
                        }
                      },
                    },
                    scales: {
                      x: {
                        grid: {
                          color: 'rgba(55, 65, 81, 0.5)'
                        },
                        ticks: {
                          color: '#9ca3af'
                        }
                      },
                      y: {
                        grid: {
                          color: 'rgba(55, 65, 81, 0.5)'
                        },
                        ticks: {
                          color: '#9ca3af'
                        },
                        beginAtZero: true
                      }
                    }
                  }}
                />
              </div>

              <div className="bg-gray-800/50 border border-cyan-400/20 rounded-lg p-6">
                <h3 className="text-lg font-bold text-cyan-400 mb-4">MOOD TREND</h3>
                <Line 
                  data={getMoodData()} 
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          color: '#9ca3af'
                        }
                      },
                    },
                    scales: {
                      x: {
                        grid: {
                          color: 'rgba(55, 65, 81, 0.5)'
                        },
                        ticks: {
                          color: '#9ca3af'
                        }
                      },
                      y: {
                        grid: {
                          color: 'rgba(55, 65, 81, 0.5)'
                        },
                        ticks: {
                          color: '#9ca3af'
                        },
                        beginAtZero: true
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="bg-gray-800/50 border border-cyan-400/20 rounded-lg p-6">
              <h3 className="text-lg font-bold text-cyan-400 mb-4">SUMMARY STATISTICS</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-400">TOTAL LOGS</p>
                  <p className="text-2xl font-bold text-cyan-400">{logs.length}</p>
                </div>
                <div className="bg-gray-700/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-400">COMPLETED TASKS</p>
                  <p className="text-2xl font-bold text-green-400">
                    {logs.filter(log => log.taskStatus === 'done').length}
                  </p>
                </div>
                <div className="bg-gray-700/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-400">AVG. MOOD</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {logs.filter(log => log.moodRating).length > 0
                      ? (logs.reduce((sum, log) => sum + (log.moodRating || 0), 0) / 
                         logs.filter(log => log.moodRating).length).toFixed(1)
                      : 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-700/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-400">LAST LOG</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {logs.length > 0 
                      ? new Date(logs[0].date).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Prediction Card */}
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-purple-500/20 rounded-lg p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp className="w-24 h-24 text-purple-500" />
              </div>
              <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-purple-400" />
                LIORA'S PREDICTION
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div>
                  <div className="mb-4">
                    <p className="text-gray-400 text-sm mb-1">ESTIMATED COMPLETION</p>
                    <p className="text-3xl font-bold text-white">
                      {calculatePrediction().weeks} <span className="text-lg text-gray-500 font-normal">WEEKS</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      About {calculatePrediction().days} days, target {calculatePrediction().expectedDate ? new Date(calculatePrediction().expectedDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Current Progress</span>
                      <span className="text-cyan-400">{Math.round(calculatePrediction().progress)}%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
                        style={{ width: `${calculatePrediction().progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-400">STATUS</span>
                      <span className={`text-xs font-bold ${
                        calculatePrediction().status === 'Behind' ? 'text-red-400' :
                        calculatePrediction().status === 'At Risk' ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {calculatePrediction().status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {calculatePrediction().status === 'Behind' 
                        ? `Projected to finish ${calculatePrediction().delay} weeks LATE based on deadline.`
                        : calculatePrediction().delay < 0 
                          ? `On track to finish ${Math.abs(calculatePrediction().delay)} weeks EARLY!`
                          : `On track to meet deadline.`}
                    </p>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-400">CONFIDENCE</span>
                      <span className="text-xs font-bold text-cyan-400">{calculatePrediction().confidence}%</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Current pace: {calculatePrediction().currentVelocity} work units/week. Adjusted pace: {calculatePrediction().predictedVelocity} work units/week.
                    </p>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-gray-500 italic bg-purple-900/10 p-2 rounded border border-purple-500/10 min-h-[48px]">
                    <span className="font-bold text-purple-400 mt-1">AI</span>
                    <p className="flex-1">
                      <TypewriterQuote 
                        isDoingPoorly={
                          calculatePrediction().status === 'Behind' || 
                          calculatePrediction().status === 'At Risk' || 
                          (calculatePrediction().currentVelocity === 0 && calculatePrediction().status !== 'Completed')
                        } 
                      />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <motion.footer
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.5, duration: 0.5 }}
  className="fixed bottom-0 left-0 right-0 p-4 pb-20 md:pb-12 pr-20 md:pr-4 text-center z-50 bg-transparent"
>
  <motion.a
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    href="https://r2-vision.firebaseapp.com/"
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 group"
  >
    <span className="text-white font-medium drop-shadow-sm">Developed by</span>
    <span className="relative overflow-hidden">
      <motion.span
        className="block font-medium text-[#2980B9] font-bold"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          backgroundSize: '200% 200%',
        }}
      >
        R.R Bandara
      </motion.span>
      <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-purple-400 to-cyan-400 transition-all duration-300 group-hover:w-full" />
    </span>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-arrow-up-right text-purple-400 transition-transform group-hover:rotate-45 duration-300"
    >
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  </motion.a>
</motion.footer>
    </div>
  );
};

export default ProgressReport;
