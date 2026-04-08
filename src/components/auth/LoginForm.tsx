import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { Terminal, Key, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
  const { login, loginWithGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Google login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      alert('Please enter your email address first');
      return;
    }
    
    setResetLoading(true);
    try {
      await resetPassword(email);
      alert('Password reset link sent to your email');
    } catch (error) {
      console.error('Password reset error:', error);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md border border-cyan-400/20 bg-gray-800/50 backdrop-blur-sm shadow-lg shadow-cyan-500/10">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full">
              <Terminal className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            ACCESS THE SYSTEM
          </CardTitle>
          <CardDescription className="text-gray-400">
            Research Progress Tracking Network
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">USER ID</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">ACCESS CODE</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2"
              disabled={loading}
            >
              {loading ? 'AUTHENTICATING...' : 'LOGIN'}
            </Button>
          </form>

          <div className="text-center">
            <Button
              variant="link"
              onClick={handlePasswordReset}
              disabled={resetLoading}
              className="text-sm text-cyan-400 hover:text-cyan-300"
            >
              {resetLoading ? 'SENDING...' : 'FORGOT ACCESS CODE?'}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full bg-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-800 px-2 text-gray-400">OR CONTINUE WITH</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full border-gray-600 hover:bg-gray-700/50 hover:border-cyan-400 text-gray-300"
          >
            <Mail className="w-4 h-4 mr-2 text-cyan-400" />
            GOOGLE AUTH
          </Button>

          <div className="text-center text-sm">
            <span className="text-gray-400">NEW USER? </span>
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium">
              REQUEST ACCESS
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;