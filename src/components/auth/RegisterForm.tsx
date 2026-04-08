import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { KeyRound, User, Mail } from 'lucide-react';

const RegisterForm = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        displayName: formData.displayName,
        role: 'student' as const,
        researchProjects: []
      };
      
      await register(formData.email, formData.password, userData);
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md border border-purple-400/20 bg-gray-800/50 backdrop-blur-sm shadow-lg shadow-purple-500/10">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            RESEARCHER REGISTRATION
          </CardTitle>
          <CardDescription className="text-gray-400">
            Create your researcher account
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">RESEARCHER EMAIL</Label>
              <Input
                id="email"
                type="email"
                placeholder="researcher@institution.edu"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-gray-300">RESEARCHER NAME</Label>
              <Input
                id="displayName"
                placeholder="Your full name"
                value={formData.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                required
                className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">PASSWORD</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  required
                  className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">CONFIRM PASSWORD</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  required
                  className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-2"
              disabled={loading}
            >
              {loading ? 'CREATING ACCOUNT...' : 'REGISTER'}
            </Button>
          </form>

          <div className="text-center text-sm mt-6">
            <span className="text-gray-400">ALREADY HAVE AN ACCOUNT? </span>
            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium">
              LOGIN HERE
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterForm;