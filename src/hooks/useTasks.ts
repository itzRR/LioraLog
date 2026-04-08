import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Task } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';

export function useTasks(projectId?: string) {
  const { userProfile } = useAuth();
  const { success, error } = useNotification();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) {
      setLoading(false);
      return;
    }

    const tasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', userProfile.uid),
      orderBy('deadline', 'asc')
    );

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        let taskList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Task[];

        if (projectId) {
          taskList = taskList.filter(task => task.projectId === projectId);
        }

        setTasks(taskList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching tasks:', err);
        error('Failed to Load Tasks', 'An error occurred while fetching your tasks. Please try again.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userProfile, projectId]);

  const createTask = async (taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!userProfile) return;

    try {
      const newTask = {
        ...taskData,
        userId: userProfile.uid, // Automatically add userId
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'tasks'), newTask);
      success('Task Created', 'Your new task has been added successfully!');
    } catch (err: any) {
      console.error('Error creating task:', err);
      error('Failed to Create Task', err.message || 'An error occurred while creating the task');
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      success('Task Updated', 'Task changes have been saved!');
    } catch (err: any) {
      console.error('Error updating task:', err);
      error('Failed to Update Task', err.message || 'An error occurred while updating the task');
    }
  };

  const deleteTask = async (taskId: string) => {
    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      success('Task Deleted', 'The task has been removed successfully');
    } catch (err: any) {
      console.error('Error deleting task:', err);
      error('Failed to Delete Task', err.message || 'An error occurred while deleting the task');
    }
  };

  const getOverdueTasks = () => {
    const now = new Date();
    return tasks.filter(task => {
      if (task.status === 'completed') return false;
      return new Date(task.deadline) < now;
    });
  };

  const getUpcomingTasks = (days: number = 7) => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return tasks.filter(task => {
      if (task.status === 'completed') return false;
      const deadline = new Date(task.deadline);
      return deadline >= now && deadline <= futureDate;
    });
  };

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(task => task.status === status);
  };

  const getTasksByPriority = (priority: Task['priority']) => {
    return tasks.filter(task => task.priority === priority && task.status !== 'completed');
  };

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    getOverdueTasks,
    getUpcomingTasks,
    getTasksByStatus,
    getTasksByPriority
  };
}
