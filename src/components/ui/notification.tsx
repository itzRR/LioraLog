import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationProps {
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  onClose: () => void;
}

const notificationConfig = {
  success: {
    icon: CheckCircle2,
    bgGradient: 'from-emerald-900/90 via-green-900/90 to-emerald-900/90',
    borderColor: 'border-emerald-400/50',
    iconColor: 'text-emerald-400',
    glowColor: 'shadow-emerald-500/20'
  },
  error: {
    icon: XCircle,
    bgGradient: 'from-red-900/90 via-rose-900/90 to-red-900/90',
    borderColor: 'border-red-400/50',
    iconColor: 'text-red-400',
    glowColor: 'shadow-red-500/20'
  },
  warning: {
    icon: AlertCircle,
    bgGradient: 'from-amber-900/90 via-yellow-900/90 to-amber-900/90',
    borderColor: 'border-amber-400/50',
    iconColor: 'text-amber-400',
    glowColor: 'shadow-amber-500/20'
  },
  info: {
    icon: Info,
    bgGradient: 'from-blue-900/90 via-cyan-900/90 to-blue-900/90',
    borderColor: 'border-cyan-400/50',
    iconColor: 'text-cyan-400',
    glowColor: 'shadow-cyan-500/20'
  }
};

export const Notification: React.FC<NotificationProps> = ({ 
  type, 
  title, 
  message, 
  duration = 4000, 
  onClose 
}) => {
  const config = notificationConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={`
        relative bg-gradient-to-r ${config.bgGradient} 
        border ${config.borderColor} rounded-xl 
        shadow-2xl ${config.glowColor} backdrop-blur-md
        p-4 w-full max-w-md
        overflow-hidden
      `}
    >
      {/* Animated border shine */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" />
      
      {/* Content */}
      <div className="relative flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${config.iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-sm mb-1">{title}</h3>
          <p className="text-gray-300 text-xs leading-relaxed">{message}</p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${config.iconColor} origin-left`}
        style={{ width: '100%' }}
      />
    </motion.div>
  );
};

// Notification Container Component
interface NotificationContainerProps {
  notifications: Array<{
    id: string;
    type: NotificationType;
    title: string;
    message: string;
  }>;
  onRemove: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({ 
  notifications, 
  onRemove 
}) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <Notification
              type={notification.type}
              title={notification.title}
              message={notification.message}
              onClose={() => onRemove(notification.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
