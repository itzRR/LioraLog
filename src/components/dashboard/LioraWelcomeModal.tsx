import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { Terminal, Sparkles } from 'lucide-react';

const LioraWelcomeModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-800 border border-cyan-400/30 rounded-2xl shadow-2xl p-5 sm:p-6 text-white"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-4 mb-6">
                <img
                    src="/liora.webp"
                    alt="Liora"
                    className="w-20 h-20 rounded-full border-4 border-pink-500 shadow-lg object-cover"
                    style={{ boxShadow: '0 0 10px #0ff' }}
                />
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-cyan-300">
                    Welcome to lioralog!
                </h2>
                <p className="text-sm text-gray-300 text-center">Hi! I'm <span className="text-pink-400 font-semibold">Liora</span> 🌸 Your research assistant and motivator. Let's get started together!</p>
                </div>


            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Hi! I'm <span className="text-pink-400 font-semibold">Liora</span>. I'm here to help you track your progress, stay motivated, and guide you through your academic journey. Let's achieve greatness together!
            </p>

            <button
              onClick={onClose}
              className="mt-4 w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-2 rounded-xl font-semibold transition-all"
            >
              Let’s go!
            </button>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default LioraWelcomeModal;
