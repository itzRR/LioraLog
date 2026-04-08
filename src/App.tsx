import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/dashboard/ErrorBoundary';
import EditLog from './components/dashboard/EditLog';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './components/dashboard/Dashboard';
import NewLog from './components/dashboard/NewLog';
import AllLogs from './components/dashboard/AllLogs';
import CalendarView from './components/dashboard/CalendarView';
import ProgressReport from './components/dashboard/ProgressReport';
import Resources from './components/dashboard/Resources';
import TaskManager from './components/dashboard/TaskManager';
import AlertCenter from './components/dashboard/AlertCenter';
import SupervisorDashboard from './components/dashboard/SupervisorDashboard';

const queryClient = new QueryClient();

function App() {
  const { loading } = useAuth(); // 🔄 Get auth loading status

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-pink-300">
        <img
          src="/liora.webp"
          alt="Liora"
          className="w-20 h-20 rounded-full animate-pulse mb-4"
        />
        <p className="text-lg font-medium animate-pulse">
          Liora is syncing with your neural link...
        </p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Routes>
          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Auth pages */}
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />

          {/* Dashboard and sub-pages */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/new-log"
            element={
              <ProtectedRoute>
                <NewLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/all-logs"
            element={
              <ProtectedRoute>
                <AllLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress-report"
            element={
              <ProtectedRoute>
                <ProgressReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources"
            element={
              <ProtectedRoute>
                <Resources />
              </ProtectedRoute>
            }
          />
          <Route
          path="/edit-log/:id"
          element={
            <ProtectedRoute>
              <EditLog />
            </ProtectedRoute>
          }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <TaskManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <AlertCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervisor"
            element={
              <ProtectedRoute>
                <SupervisorDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
