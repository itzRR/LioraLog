import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';
import { toast } from '@/hooks/use-toast';

// Types
export interface ResearchProject {
  id: string;
  researchTitle: string;
  fieldDomain: string;
  supervisors: string[];
  startDate: string;
  endDate: string;
  abstract: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'student' | 'supervisor' | 'admin';
  researchProjects: ResearchProject[];
  photoURL?: string;
  createdAt: string;
  // Supervisor specific fields
  department?: string;
  specialization?: string;
  // Student specific fields
  studentCode?: string;
  supervisorIds?: string[];
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: Partial<UserProfile>) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  addResearchProject: (project: Omit<ResearchProject, 'id' | 'createdAt'>) => Promise<void>;
  updateResearchProject: (projectId: string, data: Partial<ResearchProject>) => Promise<void>;
  assignSupervisor: (supervisorCode: string) => Promise<void>;
  getStudentsBySupervisor: () => Promise<UserProfile[]>;
}

// Context
const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (user: User) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Neural Link Established', description: 'Welcome back to the network!' });
    } catch (error: any) {
      toast({ title: 'Access Denied', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    userData: Partial<UserProfile>
  ) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      const newUserProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: userData.displayName || '',
        role: userData.role || 'student', // Support all roles
        researchProjects: (userData.researchProjects || []).map((project, index) => ({
          ...project,
          id: `project_${Date.now()}_${index}`,
          createdAt: new Date().toISOString()
        })) as ResearchProject[],
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
        // Supervisor fields
        department: userData.department,
        specialization: userData.specialization,
        // Student fields
        studentCode: userData.role === 'student' ? `STU${Date.now().toString().slice(-6)}` : undefined,
        supervisorIds: []
      };

      await setDoc(doc(db, 'users', user.uid), newUserProfile);
      toast({ title: 'Neural Link Created', description: 'Welcome to the research network!' });
    } catch (error: any) {
      toast({ title: 'Connection Failed', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { user } = await signInWithPopup(auth, googleProvider);

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        const newUserProfile: UserProfile = {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || '',
          role: 'student',
          researchProjects: [],
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', user.uid), newUserProfile);
      }

      toast({ title: 'Neural Sync Complete', description: 'Google neural link established!' });
    } catch (error: any) {
      toast({ title: 'Sync Failed', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      toast({ title: 'Neural Link Severed', description: 'Successfully disconnected from network' });
    } catch (error: any) {
      toast({ title: 'Disconnection Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: 'Recovery Initiated', description: 'Neural recovery code sent!' });
    } catch (error: any) {
      toast({ title: 'Recovery Failed', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;

    try {
      const updatedProfile = { ...userProfile, ...data };
      await setDoc(doc(db, 'users', currentUser.uid), updatedProfile, { merge: true });
      setUserProfile(updatedProfile as UserProfile);
      toast({ title: 'Profile Updated', description: 'Neural profile synchronized!' });
    } catch (error: any) {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const addResearchProject = async (
    project: Omit<ResearchProject, 'id' | 'createdAt'>
  ) => {
    if (!currentUser || !userProfile) return;

    try {
      const newProject: ResearchProject = {
        ...project,
        id: `project_${Date.now()}`,
        createdAt: new Date().toISOString()
      };

      const updatedProjects = [...userProfile.researchProjects, newProject];
      await updateUserProfile({ researchProjects: updatedProjects });
      toast({ title: 'New Protocol Added', description: 'Research project added to your profile!' });
    } catch (error: any) {
      toast({ title: 'Protocol Failed', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const updateResearchProject = async (
    projectId: string,
    data: Partial<ResearchProject>
  ) => {
    if (!currentUser || !userProfile) return;

    try {
      const updatedProjects = userProfile.researchProjects.map((project) =>
        project.id === projectId ? { ...project, ...data } : project
      );
      await updateUserProfile({ researchProjects: updatedProjects });
      toast({ title: 'Protocol Updated', description: 'Research project synchronized!' });
    } catch (error: any) {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const assignSupervisor = async (supervisorCode: string) => {
    if (!currentUser || !userProfile || userProfile.role !== 'student') return;

    try {
      // Find supervisor by email or custom code
      const supervisorsRef = collection(db, 'users');
      const q = query(supervisorsRef, where('role', '==', 'supervisor'));
      const snapshot = await getDocs(q);
      
      const supervisor = snapshot.docs.find(doc => 
        doc.data().email === supervisorCode || doc.data().studentCode === supervisorCode
      );

      if (!supervisor) {
        toast({ title: 'Not Found', description: 'Supervisor not found with that code', variant: 'destructive' });
        return;
      }

      const supervisorId = supervisor.id;
      const currentSupervisors = userProfile.supervisorIds || [];
      
      if (currentSupervisors.includes(supervisorId)) {
        toast({ title: 'Already Linked', description: 'This supervisor is already assigned' });
        return;
      }

      await updateUserProfile({ 
        supervisorIds: [...currentSupervisors, supervisorId] 
      });

      // Create supervisor-student relationship
      await addDoc(collection(db, 'supervisor_students'), {
        supervisorId,
        studentId: currentUser.uid,
        assignedAt: new Date().toISOString(),
        isActive: true
      });

      toast({ title: 'Supervisor Linked', description: 'Successfully connected with supervisor!' });
    } catch (error: any) {
      toast({ title: 'Link Failed', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const getStudentsBySupervisor = async (): Promise<UserProfile[]> => {
    if (!currentUser || !userProfile) return [];
    
    // Allow both supervisors and admins to view students
    if (userProfile.role !== 'supervisor' && userProfile.role !== 'admin') return [];

    try {
      let studentIds: string[] = [];

      if (userProfile.role === 'admin') {
        // Admins can see ALL students
        const usersRef = collection(db, 'users');
        const studentsQuery = query(usersRef, where('role', '==', 'student'));
        const studentsSnapshot = await getDocs(studentsQuery);
        studentIds = studentsSnapshot.docs.map(doc => doc.id);
      } else {
        // Supervisors see only their assigned students
        const relationshipsRef = collection(db, 'supervisor_students');
        const q = query(
          relationshipsRef,
          where('supervisorId', '==', currentUser.uid),
          where('isActive', '==', true)
        );
        const snapshot = await getDocs(q);
        studentIds = snapshot.docs.map(doc => doc.data().studentId);
      }

      if (studentIds.length === 0) return [];

      // Fetch student profiles
      const students: UserProfile[] = [];
      for (const studentId of studentIds) {
        const studentDoc = await getDoc(doc(db, 'users', studentId));
        if (studentDoc.exists()) {
          students.push(studentDoc.data() as UserProfile);
        }
      }

      return students;
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  };

  // Handle Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Final context value
  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    resetPassword,
    updateUserProfile,
    addResearchProject,
    updateResearchProject,
    assignSupervisor,
    getStudentsBySupervisor
  };

  return (
    <AuthContext.Provider value={value}>
      {children} {/* ✅ Always rendered */}
    </AuthContext.Provider>
  );
};
