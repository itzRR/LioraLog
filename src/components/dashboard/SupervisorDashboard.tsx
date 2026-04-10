import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, TrendingUp, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { UserProfile } from '@/contexts/AuthContext';

interface StudentData {
  profile: UserProfile;
  logsCount: number;
  tasksCount: number;
  completedTasks: number;
  alertsCount: number;
  lastActivity: string;
}

const SupervisorDashboard = () => {
  const navigate = useNavigate();
  const { userProfile, getStudentsBySupervisor } = useAuth();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const studentProfiles = await getStudentsBySupervisor();
      
      // Fetch additional data for each student
      const studentsData = await Promise.all(
        studentProfiles.map(async (student) => {
          // Get logs count
          const logsQuery = query(collection(db, 'logs'), where('userId', '==', student.uid));
          const logsSnapshot = await getDocs(logsQuery);
          
          // Get tasks count
          const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', student.uid));
          const tasksSnapshot = await getDocs(tasksQuery);
          const tasks = tasksSnapshot.docs.map(doc => doc.data());
          const completedTasks = tasks.filter(t => t.status === 'completed').length;
          
          // Get alerts count
          const alertsQuery = query(
            collection(db, 'alerts'), 
            where('userId', '==', student.uid),
            where('isDismissed', '==', false)
          );
          const alertsSnapshot = await getDocs(alertsQuery);
          
          // Get last activity
          const logs = logsSnapshot.docs.map(doc => doc.data());
          const lastActivity = logs.length > 0 
            ? logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
            : student.createdAt;

          return {
            profile: student,
            logsCount: logsSnapshot.size,
            tasksCount: tasksSnapshot.size,
            completedTasks,
            alertsCount: alertsSnapshot.size,
            lastActivity
          };
        })
      );

      setStudents(studentsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading students:', error);
      setLoading(false);
    }
  };

  if (!userProfile || (userProfile.role !== 'supervisor' && userProfile.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-200 flex items-center justify-center">
        <Card className="bg-gray-800/50 border-red-500/30">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-400 mb-2">Access Denied</h3>
            <p className="text-gray-400">Only supervisors and admins can access this page.</p>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <header className="bg-gray-800/50 border-b border-cyan-400/20 shadow-lg shadow-cyan-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  {userProfile.role === 'admin' ? 'ADMIN' : 'SUPERVISOR'} DASHBOARD
                </h1>
                <p className="text-sm text-gray-400">STUDENT PROGRESS OVERVIEW</p>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800/50 border-cyan-400/20">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-cyan-400">{students.length}</div>
              <p className="text-sm text-gray-400">Total Students</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-green-500/30">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-400">
                {students.reduce((sum, s) => sum + s.completedTasks, 0)}
              </div>
              <p className="text-sm text-gray-400">Completed Tasks</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-orange-500/30">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-400">
                {students.reduce((sum, s) => sum + s.alertsCount, 0)}
              </div>
              <p className="text-sm text-gray-400">Active Alerts</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-purple-500/30">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-400">
                {students.reduce((sum, s) => sum + s.logsCount, 0)}
              </div>
              <p className="text-sm text-gray-400">Total Log Entries</p>
            </CardContent>
          </Card>
        </div>

        {/* Students List */}
        <Card className="bg-gray-800/50 border-cyan-400/20">
          <CardHeader>
            <CardTitle className="text-cyan-400">Students</CardTitle>
            <CardDescription className="text-gray-400">
              {userProfile.role === 'admin' ? 'All students in the system' : 'Students assigned to you'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Loading students...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">No Students</h3>
                <p className="text-gray-500">
                  {userProfile.role === 'admin' 
                    ? 'No students have registered yet.' 
                    : 'No students have been assigned to you yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {students.map((student) => (
                  <div
                    key={student.profile.uid}
                    className="border border-gray-700 rounded-lg p-4 hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-white text-lg mb-1">
                          {student.profile.displayName}
                        </h3>
                        <p className="text-sm text-gray-400 mb-2">{student.profile.email}</p>
                        {student.profile.studentCode && (
                          <Badge className="bg-cyan-900/50 text-cyan-300">
                            ID: {student.profile.studentCode}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Last Activity</p>
                        <p className="text-sm text-cyan-400">
                          {new Date(student.lastActivity).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Student Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-700/20 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-purple-400" />
                          <p className="text-xs text-gray-400">Logs</p>
                        </div>
                        <p className="text-xl font-bold text-purple-400">{student.logsCount}</p>
                      </div>
                      <div className="bg-gray-700/20 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-blue-400" />
                          <p className="text-xs text-gray-400">Tasks</p>
                        </div>
                        <p className="text-xl font-bold text-blue-400">{student.tasksCount}</p>
                      </div>
                      <div className="bg-gray-700/20 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <p className="text-xs text-gray-400">Completed</p>
                        </div>
                        <p className="text-xl font-bold text-green-400">{student.completedTasks}</p>
                      </div>
                      <div className="bg-gray-700/20 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-orange-400" />
                          <p className="text-xs text-gray-400">Alerts</p>
                        </div>
                        <p className="text-xl font-bold text-orange-400">{student.alertsCount}</p>
                      </div>
                    </div>

                    {/* Research Projects */}
                    {student.profile.researchProjects && student.profile.researchProjects.length > 0 && (
                      <div className="border-t border-gray-700 pt-3">
                        <p className="text-xs text-gray-500 mb-2">Research Projects:</p>
                        <div className="flex flex-wrap gap-2">
                          {student.profile.researchProjects.map((project) => (
                            <Badge key={project.id} className="bg-blue-900/50 text-blue-300">
                              {project.researchTitle}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SupervisorDashboard;

// Supervisor Data View UI
