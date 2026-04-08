import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, isSameDay } from 'date-fns';
import { motion } from "framer-motion";
import { Badge } from '@/components/ui/badge';
import { useTasks } from '@/hooks/useTasks';
import { Task } from '@/types';

const CalendarView = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const effectiveProjectId = selectedProject === 'all' ? undefined : selectedProject;
  const { tasks } = useTasks(effectiveProjectId);

  useEffect(() => {
    if (!userProfile) return;

    const q = query(
      collection(db, 'logs'),
      where('userId', '==', userProfile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(logsData);
    });

    return () => unsubscribe();
  }, [userProfile]);

  useEffect(() => {
    if (!selectedDate) return;

    // Filter Logs
    let fLogs = logs.filter(log => 
      isSameDay(new Date(log.date), selectedDate)
    );
    
    if (selectedProject !== 'all') {
      fLogs = fLogs.filter(log => log.projectId === selectedProject);
    }
    setFilteredLogs(fLogs);

    // Filter Tasks
    let fTasks = tasks.filter(task => 
      isSameDay(new Date(task.deadline), selectedDate)
    );
    // useTasks handles project filtering if passed, but current logic in useTasks might rely on exact match? 
    // Yes, useTasks filters if ID is passed.
    // So 'tasks' array is already filtered by project if selectedProject != 'all'.
    
    setFilteredTasks(fTasks);

  }, [selectedDate, logs, tasks, selectedProject]);

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'blocked': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <CalendarIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <header className="bg-gray-800/50 border-b border-cyan-400/20 shadow-lg shadow-cyan-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  RESEARCH CALENDAR
                </h1>
                <p className="text-sm text-gray-400">VIEW YOUR RESEARCH TIMELINE</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {userProfile?.researchProjects && userProfile.researchProjects.length > 0 && (
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-[200px] bg-gray-800 border-gray-600">
                    <SelectValue placeholder="Filter by project" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Projects</SelectItem>
                    {userProfile.researchProjects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.researchTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 border border-cyan-400/20 rounded-lg p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md"
                modifiers={{
                  hasLogs: logs.map(log => new Date(log.date)),
                  hasTasks: tasks.map(task => new Date(task.deadline))
                }}
                modifiersStyles={{
                  hasLogs: {
                    border: '2px solid #22d3ee', // Cyan for logs
                    borderRadius: '4px'
                  },
                  hasTasks: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    textDecorationColor: '#a855f7' // Purple for tasks
                  }
                }}
              />
              <div className="mt-4 flex gap-4 text-xs justify-center">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 border-2 border-cyan-400 rounded"></div>
                  <span className="text-gray-400">Log Entry</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-purple-400 font-bold underline decoration-purple-500">12</span>
                  <span className="text-gray-400">Task Due</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 border border-cyan-400/20 rounded-lg p-6">
              <h2 className="text-xl font-bold text-cyan-400 mb-4">
                EVENTS FOR {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : '...'}
              </h2>
              
              <div className="space-y-6">
                {/* TASKS SECTION */}
                <div>
                  <h3 className="text-sm font-semibold text-purple-400 mb-3 border-b border-purple-500/20 pb-2">
                    TASKS DUE ({filteredTasks.length})
                  </h3>
                  {filteredTasks.length > 0 ? (
                    <div className="space-y-3">
                       {filteredTasks.map(task => (
                         <div key={task.id} className="border border-purple-500/30 bg-purple-900/10 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(task.status)}
                              <div>
                                <p className="text-gray-200 font-medium text-sm">{task.title}</p>
                                <p className="text-xs text-gray-500">
                                  Priority: <span className={task.priority === 'high' || task.priority === 'critical' ? 'text-red-400' : 'text-gray-400'}>{task.priority}</span>
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="border-purple-500/50 text-purple-400 text-xs">
                              {task.completionPercentage}%
                            </Badge>
                         </div>
                       ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No tasks due on this date.</p>
                  )}
                </div>

                {/* LOGS SECTION */}
                <div>
                  <h3 className="text-sm font-semibold text-cyan-400 mb-3 border-b border-cyan-500/20 pb-2">
                    LOG ENTRIES ({filteredLogs.length})
                  </h3>
                  {filteredLogs.length > 0 ? (
                    <div className="space-y-4">
                      {filteredLogs.map(log => {
                        const project = userProfile?.researchProjects?.find(p => p.id === log.projectId);
                        return (
                        <div key={log.id} className="border border-gray-700 rounded-lg p-4 hover:bg-gray-700/30 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                log.taskStatus === 'done' ? 'bg-green-900/50 text-green-400' :
                                log.taskStatus === 'inprogress' ? 'bg-yellow-900/50 text-yellow-400' :
                                'bg-gray-700 text-gray-300'
                              }`}>
                                {log.taskStatus === 'done' ? 'COMPLETED' : 
                                log.taskStatus === 'inprogress' ? 'IN PROGRESS' : 'TO DO'}
                              </span>
                              {project && (
                                <Badge className="bg-cyan-900/50 text-cyan-400 border-cyan-500/50">
                                  📁 {project.researchTitle}
                                </Badge>
                              )}
                            </div>
                            {log.moodRating && (
                              <div className="text-sm text-cyan-400">
                                MOOD: {log.moodRating}/5
                              </div>
                            )}
                          </div>
                          <p className="text-gray-300 text-sm mb-2">{log.tasksCompleted}</p>
                          {log.problems && (
                            <p className="text-gray-400 text-xs">ISSUES: {log.problems}</p>
                          )}
                        </div>
                      )})}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No logs found for this date.</p>
                  )}
                </div>
              
              </div>
            </div>
          </div>
        </div>
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

export default CalendarView;