import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTasks } from '@/hooks/useTasks';
import { Task } from '@/types';
import { Plus, Edit, Trash2, Calendar, AlertCircle, CheckCircle2, Clock, ChevronLeft, ListTodo } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface TaskManagerProps {
  projectId?: string;
}

const TaskManager: React.FC<TaskManagerProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [selectedProject, setSelectedProject] = React.useState<string>(projectId || '');

  React.useEffect(() => {
    if (!projectId && userProfile?.researchProjects?.length > 0 && !selectedProject) {
      setSelectedProject(userProfile.researchProjects[0].id);
    }
  }, [projectId, userProfile, selectedProject]);

  const effectiveProjectId = selectedProject || undefined;
  const { tasks, loading, createTask, updateTask, deleteTask, getOverdueTasks, getUpcomingTasks } = useTasks(effectiveProjectId);
  // Get current project details for validation
  const currentProject = userProfile?.researchProjects?.find(p => p.id === (selectedProject || projectId));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    size: 'medium' as NonNullable<Task['size']>,
    difficulty: 'normal' as NonNullable<Task['difficulty']>,
    estimatedHours: '',
    status: 'not_started' as Task['status'],
    deadline: '',
    completionPercentage: 0,
    projectId: projectId || ''
  });

  const handleOpenDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description,
        priority: task.priority,
        size: task.size || 'medium',
        difficulty: task.difficulty || 'normal',
        estimatedHours: task.estimatedHours?.toString() || '',
        status: task.status,
        deadline: new Date(task.deadline).toISOString().split('T')[0],
        completionPercentage: task.completionPercentage,
        projectId: task.projectId
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        size: 'medium',
        difficulty: 'normal',
        estimatedHours: '',
        status: 'not_started',
        deadline: '',
        completionPercentage: 0,
        projectId: selectedProject || projectId || ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Date Validation
    if (currentProject) {
      if (currentProject.startDate && formData.deadline < currentProject.startDate) {
        alert(`Task deadline cannot be before project start date (${currentProject.startDate})`);
        return;
      }
      if (currentProject.endDate && formData.deadline > currentProject.endDate) {
        alert(`Task deadline cannot be after project end date (${currentProject.endDate})`);
        return;
      }
    }
    
    const parsedEstimatedHours = Number(formData.estimatedHours);
    const estimatedHours = formData.estimatedHours.trim() === '' || Number.isNaN(parsedEstimatedHours)
      ? null
      : Math.max(0, parsedEstimatedHours);
    const taskPayload = {
      ...formData,
      estimatedHours,
      deadline: new Date(formData.deadline).toISOString(),
      projectId: selectedProject || projectId || ''
    };

    if (editingTask) {
      await updateTask(editingTask.id, {
        ...taskPayload
      });
    } else {
      await createTask({
        ...taskPayload
      });
    }
    
    setIsDialogOpen(false);
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-900/50 text-red-300 border-red-500';
      case 'high': return 'bg-orange-900/50 text-orange-300 border-orange-500';
      case 'medium': return 'bg-yellow-900/50 text-yellow-300 border-yellow-500';
      case 'low': return 'bg-blue-900/50 text-blue-300 border-blue-500';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'blocked': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Calendar className="w-4 h-4 text-gray-400" />;
    }
  };

  const overdueTasks = getOverdueTasks();
  const upcomingTasks = getUpcomingTasks();

  if (loading) {
    return <div className="text-gray-400">Loading tasks...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <header className="bg-gray-800/50 border-b border-purple-400/20 shadow-lg shadow-purple-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full">
                <ListTodo className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
                  TASK MANAGER
                </h1>
                <p className="text-sm text-gray-400">ORGANIZE & TRACK YOUR RESEARCH TASKS</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {!projectId && userProfile?.researchProjects && userProfile.researchProjects.length > 0 && (
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-[200px] bg-gray-800 border-gray-600">
                    <SelectValue placeholder="Filter by project" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">

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
                className="border-gray-600 hover:bg-gray-700/50 hover:border-purple-400 text-gray-300"
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
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800/50 border-red-500/30">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-400">{overdueTasks.length}</div>
            <p className="text-sm text-gray-400">Overdue Tasks</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800/50 border-yellow-500/30">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-400">{upcomingTasks.length}</div>
            <p className="text-sm text-gray-400">Due This Week</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800/50 border-green-500/30">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-400">
              {tasks.filter(t => t.status === 'completed').length}
            </div>
            <p className="text-sm text-gray-400">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <Card className="bg-gray-800/50 border-cyan-400/20">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-cyan-400">Task Management</CardTitle>
              <CardDescription className="text-gray-400">Track and manage your research tasks</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-cyan-600 to-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No tasks yet. Create your first task!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className="border border-gray-700 rounded-lg p-4 hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(task.status)}
                        <h3 className="font-medium text-white">{task.title}</h3>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority.toUpperCase()}
                        </Badge>
                        <Badge className="bg-gray-700/60 text-gray-300 border-gray-600">
                          {(task.size || 'medium').replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge className="bg-gray-700/60 text-gray-300 border-gray-600">
                          {(task.difficulty || 'normal').toUpperCase()}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-400 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {format(new Date(task.deadline), 'MMM dd, yyyy')}
                        </span>
                        <span>Status: {task.status.replace('_', ' ')}</span>
                        {task.estimatedHours ? <span>Est: {task.estimatedHours}h</span> : null}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(task)}
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTask(task.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Progress</span>
                      <span>{task.completionPercentage}%</span>
                    </div>
                    <Progress value={task.completionPercentage} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-gray-800 border-cyan-400/20 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingTask ? 'Update task details' : 'Add a new task to your project'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-gray-300">Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
                className="bg-gray-700/50 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="bg-gray-700/50 border-gray-600 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Priority</Label>
                <Select value={formData.priority} onValueChange={(value: Task['priority']) => setFormData({...formData, priority: value})}>
                  <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Status</Label>
                <Select value={formData.status} onValueChange={(value: Task['status']) => setFormData({...formData, status: value})}>
                  <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-300">Task Size</Label>
                <Select value={formData.size} onValueChange={(value: NonNullable<Task['size']>) => setFormData({...formData, size: value})}>
                  <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="very_large">Very Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(value: NonNullable<Task['difficulty']>) => setFormData({...formData, difficulty: value})}>
                  <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Est. Hours</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.25"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({...formData, estimatedHours: e.target.value})}
                  placeholder="Optional"
                  className="bg-gray-700/50 border-gray-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Deadline</Label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                  min={currentProject?.startDate}
                  max={currentProject?.endDate}
                  required
                  className="bg-gray-700/50 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Completion %</Label>
                  <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.completionPercentage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setFormData({
                      ...formData, 
                      completionPercentage: Math.min(100, Math.max(0, isNaN(val) ? 0 : val))
                    });
                  }}
                  className="bg-gray-700/50 border-gray-600 text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-gray-600">
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-cyan-600 to-blue-600">
                {editingTask ? 'Update' : 'Create'} Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
        </div>
      </main>
    </div>
  );
};

export default TaskManager;
