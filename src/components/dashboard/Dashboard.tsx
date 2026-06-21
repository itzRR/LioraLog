import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Terminal, Plus, Calendar, TrendingUp, FileText, LogOut, Edit, X, ListTodo, Bell, Users, Volume2, VolumeX } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ResearchProject } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/dashboard/LoadingScreen';
import LioraWelcomeModal from '@/components/dashboard/LioraWelcomeModal';
import LioraGreetingToast from '@/components/dashboard/LioraGreetingToast';
import { motion } from "framer-motion";
import { useAlerts } from '@/hooks/useAlerts';
import { Badge } from '@/components/ui/badge';
import { checkAndCreateAlerts } from '@/lib/riskDetection';
import { useTasks } from '@/hooks/useTasks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { predictProgress } from '@/lib/aiAnalytics';
import NewLog from './NewLog';
import EditLog from './EditLog';
import CalendarView from './CalendarView';
import TaskManager from './TaskManager';
import { LioraChatButton } from './LioraChat';
import SystemGuideModal from './SystemGuideModal';




interface LogEntry {
  id: string;
  date: string;
  tasksCompleted: string;
  feedback: string;
  problems: string;
  taskStatus: 'todo' | 'inprogress' | 'done';
  moodRating?: number;
  actualHoursSpent?: number | null;
  userId: string;
  createdAt: string;
}

const Dashboard = () => {
  const { userProfile, logout, updateUserProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({
    totalLogs: 0,
    weeklyLogs: 0,
    completedTasks: 0,
    avgMood: 0
  });
  const { unreadCount, refreshAlerts } = useAlerts();
  const { tasks } = useTasks(); // Get all tasks for alert generation
  
  const [editingProject, setEditingProject] = useState<ResearchProject | null>(null);
  const [selectedPredictionProjectId, setSelectedPredictionProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile?.researchProjects?.length > 0 && !selectedPredictionProjectId) {
      setSelectedPredictionProjectId(userProfile.researchProjects[0].id);
    }
  }, [userProfile, selectedPredictionProjectId]);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    researchTitle: '',
    fieldDomain: '',
    startDate: '',
    endDate: '',
    abstract: ''
  });
  const [projectToDelete, setProjectToDelete] = useState<ResearchProject | null>(null);
  const navigate = useNavigate();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingMessage, setGreetingMessage] = useState('');
  const [isMuted, setIsMuted] = useState(() => {
    // Load mute state from localStorage
    const saved = localStorage.getItem('lioraMuted');
    return saved === 'true';
  });
  
  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    localStorage.setItem('lioraMuted', String(newMutedState));
    
    // Cancel any ongoing speech when muting
    if (newMutedState) {
      speechSynthesis.cancel();
    }
  };
  const speakWithPreferredVoice = (text: string) => {
  // Check if muted - don't speak if muted
  if (isMuted) return;
  
  // Cancel any ongoing speech to prevent duplicates
  speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = 1.6;
  utterance.rate = 1.1;

  const preferredVoices = [
    'Google 日本語',
    'Google UK English Female',
    'Microsoft Aria Online',
    'Samantha',
    'Microsoft Zira'
  ];

  const trySpeak = () => {
    const voices = speechSynthesis.getVoices();
    const selected = voices.find(v =>
      preferredVoices.some(name => v.name.includes(name))
    );
    if (selected) utterance.voice = selected;
    speechSynthesis.speak(utterance);
  };

  if (speechSynthesis.getVoices().length === 0) {
    speechSynthesis.addEventListener('voiceschanged', trySpeak, { once: true });
  } else {
    trySpeak();
  }
};

  // Voice control - depends on isMuted
  const hasSpokenRef = React.useRef(false);
  const speechTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
  if (!userProfile || hasSpokenRef.current) return;

  // Clear any existing timeout
  if (speechTimeoutRef.current) {
    clearTimeout(speechTimeoutRef.current);
  }

  // Use setTimeout to prevent React strict mode double execution
  speechTimeoutRef.current = setTimeout(() => {
    if (hasSpokenRef.current) return; // Double check

    const isFirstVisit = localStorage.getItem(`firstVisit_${userProfile.uid}`) !== 'false';

    if (isFirstVisit) {
      const welcomeMessage = `Hi! I'm Liora, your personal assistant. I'm here to guide you on your research journey. Let's get started together!`;

      speakWithPreferredVoice(welcomeMessage);
      setShowWelcomeModal(true);
      localStorage.setItem(`firstVisit_${userProfile.uid}`, 'false');
      hasSpokenRef.current = true;
    } else {
      const greeting = getLioraGreeting();
      speakWithPreferredVoice(greeting);
      setGreetingMessage(greeting);
      setShowGreeting(true);
      hasSpokenRef.current = true;
    }
  }, 100); // Small delay to prevent double execution

  // Cleanup function
  return () => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    // Cancel any ongoing speech when component unmounts
    speechSynthesis.cancel();
  };
}, [userProfile]);



// In Dashboard.tsx, modify the useEffect hook to properly handle loading states
useEffect(() => {
  if (!userProfile) {
    setLoading(false);
    return;
  }

  /* Fetch ALL logs for this user to calculate stats correctly and show recent ones */
  const logsQuery = query(
    collection(db, 'logs'),
    where('userId', '==', userProfile.uid)
  );

  const unsubscribe = onSnapshot(
    logsQuery,
    (snapshot) => {
      try {
        const allLogs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LogEntry[];
        
        // Sort by createdAt desc (newest first)
        allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Set recent logs to top 5
        setRecentLogs(allLogs.slice(0, 5));

        // Use ALL logs for stats calculation
        const weekAgo = subDays(new Date(), 7).toISOString();
        const weeklyLogs = allLogs.filter(log => log.createdAt >= weekAgo);
        const completedTasks = allLogs.filter(log => log.taskStatus === 'done').length;
        const moodRatings = allLogs.filter(log => log.moodRating).map(log => log.moodRating!);
        const avgMood = moodRatings.length > 0 ? 
          moodRatings.reduce((a, b) => a + b, 0) / moodRatings.length : 0;

        setStats({
          totalLogs: allLogs.length,
          weeklyLogs: weeklyLogs.length,
          completedTasks,
          avgMood: Math.round(avgMood * 10) / 10
        });
      } catch (error) {
        console.error("Error processing logs:", error);
      } finally {
        setLoading(false);
      }
    },
    (error) => {
      console.error("Error fetching logs:", error);
      setLoading(false);
    }
  );

  return () => {
    unsubscribe();
    setLoading(false);
  };
}, [userProfile]);

// Auto-generate alerts when logs and tasks are available
useEffect(() => {
  if (!userProfile || !recentLogs.length || loading) return;

  const generateAlerts = async () => {
    try {
      await checkAndCreateAlerts(userProfile.uid, recentLogs, tasks);
      refreshAlerts(); // Refresh the alerts display
    } catch (error) {
      console.error('Error generating alerts:', error);
    }
  };

  // Generate alerts on mount and every 30 minutes
  generateAlerts();
  const interval = setInterval(generateAlerts, 30 * 60 * 1000);
  
  return () => clearInterval(interval);
}, [userProfile, recentLogs, tasks, loading]);

  const handleAddProject = async () => {
    if (!newProjectData.researchTitle.trim() || !userProfile) return;

    try {
      const newProject: ResearchProject = {
        id: `proj_${Date.now()}`,
        researchTitle: newProjectData.researchTitle,
        fieldDomain: newProjectData.fieldDomain,
        supervisors: [],
        startDate: newProjectData.startDate,
        endDate: newProjectData.endDate,
        abstract: newProjectData.abstract,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      const updatedProjects = [...(userProfile.researchProjects || []), newProject];
      await updateUserProfile({ researchProjects: updatedProjects });
      
      setNewProjectData({
        researchTitle: '',
        fieldDomain: '',
        startDate: '',
        endDate: '',
        abstract: ''
      });
      setIsAddingProject(false);
    } catch (error) {
      console.error('Error adding project:', error);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !userProfile) return;

    try {
      const updatedProjects = userProfile.researchProjects.map(project =>
  project.id === editingProject.id
    ? { ...editingProject, createdAt: project.createdAt } // ✅ ensure it's preserved
    : project
);
      await updateUserProfile({ researchProjects: updatedProjects });
      setEditingProject(null);
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleRemoveProject = async (projectId: string) => {
    if (!userProfile) return;
    const project = userProfile.researchProjects.find(p => p.id === projectId);
    if (project) {
      setProjectToDelete(project);
    }
  };

  const confirmDeleteProject = async () => {
    if (!userProfile || !projectToDelete) return;

    try {
      const updatedProjects = userProfile.researchProjects.filter(p => p.id !== projectToDelete.id);
      await updateUserProfile({ researchProjects: updatedProjects });
      if (editingProject?.id === projectToDelete.id) {
        setEditingProject(null);
      }
      setProjectToDelete(null);
    } catch (error) {
      console.error('Error removing project:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'SYSTEM ONLINE // MORNING';
    if (hour < 17) return 'SYSTEM ONLINE // AFTERNOON';
    return 'SYSTEM ONLINE // EVENING';
  };

  const getLioraGreeting = () => {
  const greetings = [
    "Liora here! Let’s do something amazing today ",
    "Need a little motivation? Let’s get started!",
    "Hey researcher! Your brilliance is showing.",
    "Just checking in! Ready to log some progress?",
    "Welcome back, stardust dreamer ",
    "You showed up — that's already a win.",
    "Let’s turn small steps into something great today.",
    "Another chapter begins. Let’s make it count.",
    "Even stardust needs structure. Let’s build it together.",
    "Progress isn’t always loud. You’re still moving.",
    "Your ideas are more powerful than you think.",
    "The quiet work you do matters more than you know.",
    "I’m here with you. Let’s log something meaningful.",
    "You’ve come so far already. Let’s keep going.",
    "Clarity comes when we begin. Let’s begin now.",
    "You’re not behind. You’re exactly where you need to be.",
    "Today is another chance to grow your brilliance.",
    "Even five minutes of focus can spark a breakthrough.",
    "Your future self is already thankful for today.",
    "Let’s make progress feel light and lovely.",
    "Creativity thrives in calm. Let’s create calmly.",
    "I’m proud of the effort you’re making.",
    "This space is yours. Let’s make it meaningful.",
    "Another log, another layer of your legacy.",
    "Your mind is powerful. Let’s put it to work."
  ];
  const index = Math.floor(Math.random() * greetings.length);
  return greetings[index];
};


const handleNewLog = () => {
  navigate('/new-log');
};

const handleViewCalendar = () => {
  navigate('/calendar');
};

const handleViewReport = () => {
  navigate('/progress-report');
};

const handleViewResources = () => {
  navigate('/resources');
};

const handleViewTasks = () => {
  navigate('/tasks');
};

const handleViewAlerts = () => {
  navigate('/alerts');
};



if (loading || !userProfile) {
  return <LoadingScreen />;
}




  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200 relative overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* Ambient Glowing Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] rounded-full bg-cyan-900/10 blur-[150px] pointer-events-none mix-blend-screen" />
      <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] rounded-full bg-blue-900/10 blur-[100px] pointer-events-none mix-blend-screen" />
      {/* Sleek Floating Header */}
      <header className="relative z-10 bg-white/[0.02] border-b border-white/[0.05] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-purple-600/20 rounded-xl border border-white/10 group-hover:border-cyan-400/50 transition-colors duration-500">
                <Terminal className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 group-hover:text-purple-400 transition-colors duration-500" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-500 transition-all duration-500">
                  LIORA LOG
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium tracking-widest">INTELLIGENT PROGRESS</p>
              </div>
            </div>
            
            {showWelcomeModal && (
              <LioraWelcomeModal open={showWelcomeModal} onClose={() => setShowWelcomeModal(false)} />
            )}

            {showGreeting && (
              <LioraGreetingToast
                message={greetingMessage}
                onClose={() => setShowGreeting(false)}
              />
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full sm:w-auto gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 p-[1px]">
                  <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                    <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                      {userProfile?.displayName?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white tracking-wide truncate max-w-[150px] sm:max-w-none">{userProfile?.displayName}</p>
                  <p className="text-[10px] text-cyan-500 font-medium uppercase tracking-wider">{userProfile?.role}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <SystemGuideModal />
                
                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-full p-1 backdrop-blur-md">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMute}
                    className="h-8 w-8 rounded-full p-0 text-gray-400 hover:text-cyan-400 hover:bg-white/10 transition-colors"
                    title={isMuted ? "Unmute Liora" : "Mute Liora"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await logout();
                      navigate('/login');
                    }}
                    className="h-8 px-3 rounded-full text-gray-400 hover:text-pink-400 hover:bg-white/10 transition-colors text-xs font-bold tracking-wider"
                  >
                    LOGOUT
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Hero Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 sm:mb-20 mt-8 relative z-10"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="flex items-center gap-2 mb-4"
              >
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <p className="text-cyan-400 text-xs font-bold tracking-[0.2em] uppercase">
                  {getGreeting()}
                </p>
              </motion.div>
              <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
                Welcome back,<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-500 to-purple-600 pb-2 inline-block">
                  {userProfile?.displayName?.split(' ')[0]}
                </span>
              </h2>
              
              {userProfile?.researchProjects && userProfile.researchProjects.length > 0 ? (
                <p className="text-gray-400 text-lg sm:text-xl font-light leading-relaxed">
                  You are currently leading <span className="text-white font-medium">{userProfile.researchProjects.length}</span> active research {userProfile.researchProjects.length === 1 ? 'project' : 'projects'}. Keep pushing the boundaries. 🚀
                </p>
              ) : (
                <div className="inline-flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 px-4 py-3 rounded-2xl backdrop-blur-md">
                  <span>⚠️</span>
                  <p className="text-sm font-medium">No active research projects found. Create one to begin your journey.</p>
                </div>
              )}
            </div>

            <div className="flex flex-col items-start md:items-end gap-4">
              {/* Supervisor/Admin Action */}
              {(userProfile?.role === 'supervisor' || userProfile?.role === 'admin') && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={() => navigate('/supervisor')}
                    className="h-12 px-6 rounded-full bg-white text-black hover:bg-gray-200 font-bold tracking-wide shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all duration-300"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    {userProfile.role === 'admin' ? 'VIEW ALL STUDENTS' : 'MY STUDENTS'}
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Research Projects Section */}
        <Card className="bg-gray-800/50 border border-cyan-400/20 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-cyan-400">
              <Terminal className="w-5 h-5" />
              <span>RESEARCH PROJECTS</span>
            </CardTitle>
            <CardDescription className="text-gray-400">
              MANAGE YOUR RESEARCH PROTOCOLS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New Project */}
            {/* Add New Project */}
            {!isAddingProject ? (
              <Button
                onClick={() => setIsAddingProject(true)}
                className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 mb-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                NEW PROJECT
              </Button>
            ) : (
              <div className="border border-cyan-400/30 rounded-lg p-4 mb-4 bg-gray-800/40 animate-in fade-in slide-in-from-top-2 duration-200">
                <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  NEW RESEARCH PROJECT
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">PROJECT TITLE <span className="text-red-400">*</span></Label>
                      <Input
                        value={newProjectData.researchTitle}
                        onChange={(e) => setNewProjectData({ ...newProjectData, researchTitle: e.target.value })}
                        placeholder="Enter project title"
                        className="bg-gray-700/50 border-gray-600 text-white focus:border-cyan-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">FIELD/DOMAIN</Label>
                      <Input
                        value={newProjectData.fieldDomain}
                        onChange={(e) => setNewProjectData({ ...newProjectData, fieldDomain: e.target.value })}
                        placeholder="e.g., Computer Science, Biology"
                        className="bg-gray-700/50 border-gray-600 text-white focus:border-cyan-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">START DATE <span className="text-red-400">*</span></Label>
                      <Input
                        type="date"
                        value={newProjectData.startDate}
                        onChange={(e) => setNewProjectData({ ...newProjectData, startDate: e.target.value })}
                        className="bg-gray-700/50 border-gray-600 text-white focus:border-cyan-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">END DATE <span className="text-red-400">*</span></Label>
                      <Input
                        type="date"
                        value={newProjectData.endDate}
                        onChange={(e) => setNewProjectData({ ...newProjectData, endDate: e.target.value })}
                        className="bg-gray-700/50 border-gray-600 text-white focus:border-cyan-400"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-300">ABSTRACT/DESCRIPTION <span className="text-gray-500 text-xs">(Optional)</span></Label>
                    <Input
                      value={newProjectData.abstract}
                      onChange={(e) => setNewProjectData({ ...newProjectData, abstract: e.target.value })}
                      placeholder="Brief description of your research"
                      className="bg-gray-700/50 border-gray-600 text-white focus:border-cyan-400"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddingProject(false)}
                      className="border-gray-600 hover:bg-gray-700/50 text-gray-300"
                    >
                      CANCEL
                    </Button>
                    <Button
                      onClick={handleAddProject}
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                      disabled={!newProjectData.researchTitle.trim() || !newProjectData.startDate || !newProjectData.endDate}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      SAVE PROJECT
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Projects List */}
            {userProfile?.researchProjects?.length > 0 ? (
              <div className="space-y-4">
                {userProfile.researchProjects.map((project) => (
                  <div key={project.id} className="border border-gray-700 rounded-lg p-4 hover:bg-gray-700/30 transition-colors">
                    {editingProject?.id === project.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-gray-300">PROJECT TITLE</Label>
                            <Input
                              value={editingProject.researchTitle}
                              onChange={(e) => setEditingProject({
                                ...editingProject,
                                researchTitle: e.target.value
                              })}
                              className="bg-gray-700/50 border-gray-600 text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-300">FIELD/DOMAIN</Label>
                            <Input
                              value={editingProject.fieldDomain || ''}
                              onChange={(e) => setEditingProject({
                                ...editingProject,
                                fieldDomain: e.target.value
                              })}
                              placeholder="e.g., Computer Science, Biology"
                              className="bg-gray-700/50 border-gray-600 text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-300">START DATE</Label>
                            <Input
                              type="date"
                              value={editingProject.startDate || ''}
                              onChange={(e) => setEditingProject({
                                ...editingProject,
                                startDate: e.target.value
                              })}
                              className="bg-gray-700/50 border-gray-600 text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-300">END DATE</Label>
                            <Input
                              type="date"
                              value={editingProject.endDate || ''}
                              onChange={(e) => setEditingProject({
                                ...editingProject,
                                endDate: e.target.value
                              })}
                              className="bg-gray-700/50 border-gray-600 text-white"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">ABSTRACT/DESCRIPTION</Label>
                          <Input
                            value={editingProject.abstract || ''}
                            onChange={(e) => setEditingProject({
                              ...editingProject,
                              abstract: e.target.value
                            })}
                            placeholder="Brief description of your research"
                            className="bg-gray-700/50 border-gray-600 text-white"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => setEditingProject(null)}
                            className="border-gray-600 hover:bg-gray-700/50"
                          >
                            CANCEL
                          </Button>
                          <Button
                            onClick={handleUpdateProject}
                            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                          >
                            SAVE
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-white text-lg mb-2">{project.researchTitle}</h3>
                          {project.fieldDomain && (
                            <p className="text-sm text-cyan-400 mb-1">📚 {project.fieldDomain}</p>
                          )}
                          {project.abstract && (
                            <p className="text-sm text-gray-400 mb-2">{project.abstract}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>ID: {project.id}</span>
                            {project.startDate && (
                              <span>📅 {new Date(project.startDate).toLocaleDateString()} - {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingProject(project)}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProject(project.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Terminal className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">NO RESEARCH PROJECTS FOUND</p>
                <p className="text-sm text-gray-500">ADD YOUR FIRST RESEARCH PROJECT</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions - Floating Glass */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-12 relative z-10"
        >
          {[
            { icon: Plus, label: 'NEW LOG', color: 'text-cyan-400', action: handleNewLog },
            { icon: ListTodo, label: 'TASKS', color: 'text-blue-400', action: handleViewTasks },
            { icon: Bell, label: 'ALERTS', color: 'text-yellow-400', action: handleViewAlerts, badge: unreadCount },
            { icon: Calendar, label: 'CALENDAR', color: 'text-purple-400', action: handleViewCalendar },
            { icon: TrendingUp, label: 'REPORT', color: 'text-pink-400', action: handleViewReport },
          ].map((item, idx) => (
            <motion.button
              key={idx}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={item.action}
              className="group relative flex flex-col items-center justify-center h-24 sm:h-28 bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-2xl hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 overflow-hidden"
            >
              {/* Subtle hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {item.badge !== undefined && item.badge > 0 && (
                <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                  {item.badge}
                </div>
              )}
              <item.icon className={`w-6 h-6 sm:w-8 sm:h-8 ${item.color} mb-3 group-hover:scale-110 transition-transform duration-500`} />
              <span className="text-[10px] sm:text-xs font-bold text-gray-400 group-hover:text-white tracking-widest transition-colors duration-300">
                {item.label}
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* Stats Grid - Asymmetric Layout */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-12 relative z-10"
        >
          <div className="col-span-2 md:col-span-1 bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col justify-between hover:bg-white/[0.04] transition-colors">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">TOTAL LOGS</p>
            <div>
              <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-blue-600 mb-1">{stats.totalLogs}</div>
              <p className="text-xs text-gray-400">All time entries</p>
            </div>
          </div>
          
          <div className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col justify-between hover:bg-white/[0.04] transition-colors">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">THIS WEEK</p>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-green-400 mb-1">{stats.weeklyLogs}</div>
              <p className="text-xs text-gray-400">Recent entries</p>
            </div>
          </div>
          
          <div className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col justify-between hover:bg-white/[0.04] transition-colors">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">COMPLETED</p>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-purple-400 mb-1">{stats.completedTasks}</div>
              <p className="text-xs text-gray-400">Tasks finished</p>
            </div>
          </div>
          
          <div className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col justify-between hover:bg-white/[0.04] transition-colors">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">AVG MOOD</p>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-orange-400 mb-1">
                {stats.avgMood > 0 ? `${stats.avgMood}/5` : 'N/A'}
              </div>
              <p className="text-xs text-gray-400">Focus rating</p>
            </div>
          </div>
        </motion.div>

        {/* Deadline Prediction Widget */}
        {userProfile?.researchProjects?.length > 0 && (() => {
          const activeProject = userProfile.researchProjects.find(p => p.id === selectedPredictionProjectId) || userProfile.researchProjects[0];
          
          // Filter logs and tasks for the currently selected project
          const projectLogs = recentLogs.filter(log => log.projectId === activeProject.id || !log.projectId) as LogEntry[];
          const projectTasks = tasks.filter(t => t.projectId === activeProject.id);
          
          const prediction = predictProgress(projectLogs, projectTasks, activeProject?.endDate || '');
          const hasData = prediction.confidenceLevel > 0;
          if (!hasData) return null;

          const isDeadlinePassed = activeProject.endDate && new Date(activeProject.endDate) < new Date() && prediction.status !== 'Completed';

          const trendIcon = prediction.velocityTrend === 'accelerating' ? '📈' : prediction.velocityTrend === 'decelerating' ? '📉' : '→';
          const trendColor = prediction.velocityTrend === 'accelerating' ? 'text-green-400' : prediction.velocityTrend === 'decelerating' ? 'text-red-400' : 'text-gray-400';
          
          let statusColor = '';
          let statusBadgeColor = '';
          let displayStatus = '';
          
          if (isDeadlinePassed) {
             statusColor = 'from-red-900/40 to-gray-900/40 border-red-500/50';
             statusBadgeColor = 'bg-red-950 border border-red-500 text-red-400';
             displayStatus = 'DEADLINE PASSED';
          } else {
             statusColor = prediction.status === 'Behind' ? 'from-red-600/20 to-red-900/10 border-red-500/30' : prediction.status === 'At Risk' ? 'from-yellow-600/20 to-yellow-900/10 border-yellow-500/30' : prediction.status === 'On Track' ? 'from-green-600/20 to-green-900/10 border-green-500/30' : 'from-gray-700/20 to-gray-800/10 border-gray-600/30';
             statusBadgeColor = prediction.status === 'Behind' ? 'bg-red-900/50 text-red-300' : prediction.status === 'At Risk' ? 'bg-yellow-900/50 text-yellow-300' : prediction.status === 'On Track' ? 'bg-green-900/50 text-green-300' : 'bg-gray-700/50 text-gray-300';
             displayStatus = prediction.status?.toUpperCase() || 'UNKNOWN';
          }

          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className={`mb-8 bg-gradient-to-r ${statusColor} border rounded-xl p-5 hover:shadow-lg hover:shadow-purple-900/10 transition-all duration-300`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-600/20 border border-purple-500/30 rounded-lg cursor-pointer" onClick={handleViewReport}>
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1 cursor-pointer" onClick={handleViewReport}>
                      <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">DEADLINE PREDICTION</h3>
                      <Badge className={`text-[10px] ${statusBadgeColor}`}>{displayStatus}</Badge>
                      <span className={`text-xs ${trendColor}`}>{trendIcon} {prediction.velocityTrend}</span>
                    </div>
                    {userProfile.researchProjects.length > 1 ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select 
                          value={activeProject.id} 
                          onValueChange={(val) => setSelectedPredictionProjectId(val)}
                        >
                          <SelectTrigger className="h-7 text-xs bg-gray-800/50 border-gray-600/50 w-[200px] text-gray-300">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                            {userProfile.researchProjects.map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">{p.researchTitle}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5 cursor-pointer" onClick={handleViewReport}>{activeProject.researchTitle}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 cursor-pointer" onClick={handleViewReport}>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${isDeadlinePassed ? 'text-red-400' : 'text-white'}`}>{prediction.weeksNeeded ? `${prediction.weeksNeeded}w` : 'N/A'}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Expected</p>
                  </div>
                  {prediction.optimisticDate && prediction.pessimisticDate && (
                    <div className="hidden sm:block text-center">
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-green-400">{new Date(prediction.optimisticDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span className="text-gray-600">–</span>
                        <span className="text-orange-400">{new Date(prediction.pessimisticDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 uppercase">Range</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-lg font-bold text-cyan-400">{prediction.confidenceLevel}%</p>
                    <p className="text-[10px] text-gray-500 uppercase">Confidence</p>
                  </div>
                  <div className="hidden md:block w-24">
                    <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                      <span>Progress</span>
                      <span>{Math.round(prediction.progressPercentage || 0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-1000 rounded-full" style={{ width: `${prediction.progressPercentage || 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              {prediction.status === 'Behind' && prediction.delayWeeks && prediction.delayWeeks > 0 && !isDeadlinePassed && (
                <p className="text-xs text-red-300/70 mt-2 pl-12">⚠️ Projected to finish {prediction.delayWeeks} weeks late. Tap for details →</p>
              )}
              {isDeadlinePassed && (
                <p className="text-xs text-red-400 font-medium mt-2 pl-12">⚠️ Your deadline has already passed and the project is not completed.</p>
              )}
            </motion.div>
          );
        })()}

        <Card className="bg-gray-800/50 border border-cyan-400/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-cyan-400">
              <Calendar className="w-5 h-5" />
              <span>RECENT LOG ENTRIES</span>
            </CardTitle>
            <CardDescription className="text-gray-400">LATEST RESEARCH UPDATES</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs.length > 0 ? (
              <div className="space-y-4">
                {recentLogs.map((log) => (
                  <div key={log.id} className="border border-gray-700 rounded-lg p-4 hover:bg-gray-700/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-white">
                          {format(new Date(log.date), 'MMM dd, yyyy')}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.taskStatus === 'done' ? 'bg-green-900/50 text-green-400' :
                          log.taskStatus === 'inprogress' ? 'bg-yellow-900/50 text-yellow-400' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {log.taskStatus === 'done' ? 'COMPLETED' : 
                           log.taskStatus === 'inprogress' ? 'IN PROGRESS' : 'TO DO'}
                        </span>
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
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">NO LOG ENTRIES DETECTED</p>
                <p className="text-sm text-gray-500">INITIATE FIRST RESEARCH LOG</p>
              </div>
            )}
          </CardContent>
        </Card>
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

      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent className="bg-gray-900 border border-red-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400 flex items-center gap-2">
              <LogOut className="w-5 h-5" />
              Delete Research Project?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete <span className="text-white font-medium">"{projectToDelete?.researchTitle}"</span>?
              <br /><br />
              All associated logs and tasks will lose their project link. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              className="bg-red-900/50 text-red-200 border border-red-900 hover:bg-red-900 hover:text-red-100"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating AI Chat Button */}
      <LioraChatButton />
    </div>
  );
};

export default Dashboard;
