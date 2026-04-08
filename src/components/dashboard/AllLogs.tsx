import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Trash2, Edit, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AllLogs = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Default to first project
  useEffect(() => {
    if (userProfile?.researchProjects?.length > 0 && !selectedProjectId) {
      setSelectedProjectId(userProfile.researchProjects[0].id);
    }
  }, [userProfile, selectedProjectId]);

  useEffect(() => {
    if (!userProfile) return;

    const q = query(
      collection(db, 'logs'),
      where('userId', '==', userProfile.uid),
      orderBy('createdAt', 'desc')
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
  }, [userProfile]);

  // Filter logs when logs or selectedProjectId changes
  useEffect(() => {
    if (selectedProjectId) {
      setFilteredLogs(logs.filter(log => log.projectId === selectedProjectId));
    } else {
      setFilteredLogs([]);
    }
  }, [logs, selectedProjectId]);

  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm('Are you sure you want to delete this log?')) return;

    setDeletingId(logId);
    try {
      await deleteDoc(doc(db, 'logs', logId));
    } catch (error) {
      console.error('Error deleting log:', error);
      alert('Failed to delete log');
    } finally {
      setDeletingId(null);
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
                  PROJECT LOGS
                </h1>
                <p className="text-sm text-gray-400">VIEW AND MANAGE LOGS</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <div className="w-[200px]">
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
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="border-gray-600 hover:bg-gray-700/50 hover:border-cyan-400 text-gray-300"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                BACK
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">LOADING YOUR LOGS...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">NO LOG ENTRIES FOUND FOR THIS PROJECT</p>
            <p className="text-sm text-gray-500">Create your first log entry to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="cursor-pointer bg-gray-800/50 border border-cyan-400/20 rounded-lg p-6 hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-white">
                      {log.date
                        ? format(
                            log.date?.toDate
                              ? log.date.toDate()
                              : new Date(log.date),
                            'MMMM d, yyyy'
                          )
                        : 'Unknown date'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.taskStatus === 'done' ? 'bg-green-900/50 text-green-400' :
                      log.taskStatus === 'inprogress' ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {log.taskStatus?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/edit-log/${log.id}`);
                      }}
                      className="text-yellow-400 hover:text-yellow-300"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLog(log.id);
                      }}
                      className="text-red-400 hover:text-red-300"
                      disabled={deletingId === log.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {expandedId === log.id && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <h3 className="text-sm text-gray-400">Tasks Completed</h3>
                      <p className="text-gray-300">{log.tasksCompleted || '—'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm text-gray-400">Mood Rating</h3>
                      <p className="text-gray-300">{log.moodRating ? `${log.moodRating}/5` : 'Not rated'}</p>
                    </div>
                    {log.feedback && (
                      <div>
                        <h3 className="text-sm text-gray-400">Feedback</h3>
                        <p className="text-gray-300">{log.feedback}</p>
                      </div>
                    )}
                    {log.problems && (
                      <div>
                        <h3 className="text-sm text-gray-400">Problems</h3>
                        <p className="text-gray-300">{log.problems}</p>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm text-gray-400">Created At</h3>
                      <p className="text-gray-300">
                        {log.createdAt
                          ? format(
                              log.createdAt?.toDate?.() || new Date(log.createdAt),
                              'PPPpp'
                            )
                          : 'Unknown'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
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

export default AllLogs;
