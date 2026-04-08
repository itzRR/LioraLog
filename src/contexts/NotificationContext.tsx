import React, { createContext, useContext, useState, useCallback } from 'react';
import { NotificationContainer, NotificationType } from '@/components/ui/notification';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
}

interface NotificationContextType {
  notify: (type: NotificationType, title: string, message: string) => void;
  success: (title: string, message: string) => void;
  error: (title: string, message: string) => void;
  warning: (title: string, message: string) => void;
  info: (title: string, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const notify = useCallback((type: NotificationType, title: string, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications(prev => [...prev, { id, type, title, message }]);
  }, []);

  const success = useCallback((title: string, message: string) => {
    notify('success', title, message);
  }, [notify]);

  const error = useCallback((title: string, message: string) => {
    notify('error', title, message);
  }, [notify]);

  const warning = useCallback((title: string, message: string) => {
    notify('warning', title, message);
  }, [notify]);

  const info = useCallback((title: string, message: string) => {
    notify('info', title, message);
  }, [notify]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify, success, error, warning, info }}>
      {children}
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
