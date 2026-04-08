import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const LioraGreetingToast = ({ message, onClose }: { message: string; onClose: () => void }) => {
  const hasSpokenRef = React.useRef(false);
  
  // Use a ref for onClose to prevent stale closures without re-triggering effect
  const onCloseRef = React.useRef(onClose);
  
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // 1. Start auto-dismiss timer immediately (Priority #1)
    const timeout = setTimeout(() => {
      if (onCloseRef.current) onCloseRef.current();
    }, 6000);

    // 2. Handle Text-to-Speech (Priority #2)
    const handleSpeech = () => {
      // Check if already spoken or muted
      if (hasSpokenRef.current || localStorage.getItem('lioraMuted') === 'true') {
        return;
      }

      // Cancel any existing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.pitch = 1.6;
      utterance.rate = 1.1;

      // Select voice
      const voices = speechSynthesis.getVoices();
      const preferred = ['Google 日本語', 'Samantha', 'Google UK English Female', 'Microsoft Zira', 'Microsoft Aria Online'];
      const voice = voices.find(v => preferred.some(p => v.name.includes(p)));
      if (voice) utterance.voice = voice;

      // Speak
      speechSynthesis.speak(utterance);
      hasSpokenRef.current = true;
    };

    // Initialize speech
    if (speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = handleSpeech;
    } else {
      handleSpeech();
    }
    
    // Cleanup
    return () => {
      clearTimeout(timeout);
      speechSynthesis.cancel(); // Stop speaking if toast is dismissed
    };
  }, []); // Run once on mount




  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.4 }}
      className="fixed bottom-24 right-4 md:bottom-24 md:right-4 bg-gradient-to-br from-gray-900 to-gray-800 border border-pink-400/30 rounded-xl shadow-xl p-4 z-[9999] w-72 md:w-80 max-w-[calc(100vw-6rem)]"
    >
      <div className="flex items-start space-x-3">
        <img
            src="/liora.webp"
            alt="Liora"
            className="w-12 h-12 rounded-full border-2 border-cyan-400 shadow-lg object-cover"
            style={{ boxShadow: '0 0 10px #0ff' }}
        />

        <div className="flex-1">
            <p className="text-sm font-semibold text-cyan-300">Liora says:</p>
            <p className="text-sm text-gray-200 mt-1">{message}</p>
        </div>
        </div>

    </motion.div>
  );
};

export default LioraGreetingToast;
