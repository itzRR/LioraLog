import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Terminal, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { motion } from "framer-motion";

const NewLog = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    tasksCompleted: '',
    feedback: '',
    problems: '',
    taskStatus: 'todo',
    moodRating: 3,
    actualHoursSpent: '',
    projectId: userProfile?.researchProjects?.[0]?.id || '' // Default to first project
  });

  const selectedProject = userProfile?.researchProjects?.find(p => p.id === formData.projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    // Date Validation
    if (selectedProject) {
      if (selectedProject.startDate && formData.date < selectedProject.startDate) {
        alert(`Log date cannot be before project start date (${selectedProject.startDate})`);
        return;
      }
      if (selectedProject.endDate && formData.date > selectedProject.endDate) {
        alert(`Log date cannot be after project end date (${selectedProject.endDate})`);
        return;
      }
    }

    setLoading(true);
    try {
      const parsedActualHours = Number(formData.actualHoursSpent);
      await addDoc(collection(db, 'logs'), {
        userId: userProfile.uid,
        ...formData,
        actualHoursSpent: formData.actualHoursSpent.trim() === '' || Number.isNaN(parsedActualHours)
          ? null
          : Math.max(0, parsedActualHours),
        createdAt: serverTimestamp()
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Error adding log:', error);
      alert(`Failed to create log: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <header className="bg-gray-800/50 border-b border-cyan-400/20 shadow-lg shadow-cyan-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full">
                <Terminal className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  NEW RESEARCH LOG
                </h1>
                <p className="text-sm text-gray-400">DOCUMENT YOUR PROGRESS</p>
              </div>
            </div>
            
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
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-gray-800/50 border border-cyan-400/20">
            <CardHeader>
              <CardTitle className="text-cyan-400">LOG DETAILS</CardTitle>
              <CardDescription className="text-gray-400">
                Record your research activities and progress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">DATE</Label>
                <Input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  min={selectedProject?.startDate}
                  max={selectedProject?.endDate}
                  className="bg-gray-700/50 border-gray-600 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectId">RESEARCH PROJECT</Label>
                {userProfile?.researchProjects && userProfile.researchProjects.length > 0 ? (
                  <Select
                    value={formData.projectId}
                    onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                  >
                    <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {userProfile.researchProjects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.researchTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-red-400 italic">⚠️ No projects available. Create a project on the dashboard first.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="taskStatus">STATUS</Label>
                <Select
                  value={formData.taskStatus}
                  onValueChange={(value) => setFormData({ ...formData, taskStatus: value as any })}
                >
                  <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="inprogress">In Progress</SelectItem>
                    <SelectItem value="done">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="moodRating">MOOD RATING (1-5)</Label>
                <Select
                  value={formData.moodRating.toString()}
                  onValueChange={(value) => setFormData({ ...formData, moodRating: parseInt(value) })}
                >
                  <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue placeholder="Select mood rating" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {[1, 2, 3, 4, 5].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="actualHoursSpent">HOURS SPENT</Label>
                <Input
                  type="number"
                  id="actualHoursSpent"
                  name="actualHoursSpent"
                  min="0"
                  step="0.25"
                  value={formData.actualHoursSpent}
                  onChange={handleChange}
                  className="bg-gray-700/50 border-gray-600 text-white"
                  placeholder="Optional, e.g. 1.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tasksCompleted">TASKS COMPLETED</Label>
                <Textarea
                  id="tasksCompleted"
                  name="tasksCompleted"
                  value={formData.tasksCompleted}
                  onChange={handleChange}
                  className="bg-gray-700/50 border-gray-600 text-white min-h-[100px]"
                  placeholder="Describe what you accomplished today..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">FEEDBACK/NOTES</Label>
                <Textarea
                  id="feedback"
                  name="feedback"
                  value={formData.feedback}
                  onChange={handleChange}
                  className="bg-gray-700/50 border-gray-600 text-white min-h-[100px]"
                  placeholder="Any reflections or feedback on your progress..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="problems">PROBLEMS/CHALLENGES</Label>
                <Textarea
                  id="problems"
                  name="problems"
                  value={formData.problems}
                  onChange={handleChange}
                  className="bg-gray-700/50 border-gray-600 text-white min-h-[100px]"
                  placeholder="Any issues you encountered..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="border-gray-600 hover:bg-gray-700/50"
            >
              CANCEL
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
              disabled={loading}
            >
              {loading ? 'SAVING...' : 'SAVE LOG ENTRY'}
            </Button>
          </div>
        </form>
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

export default NewLog;
