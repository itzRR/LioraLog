// src/components/LoadingScreen.tsx
import React from 'react';
import { Terminal } from 'lucide-react';

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="text-center">
      <Terminal className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-pulse" />
      <p className="text-gray-400">CONNECTING TO NEURAL NETWORK...</p>
    </div>
  </div>
);

export default LoadingScreen;
