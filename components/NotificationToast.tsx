
import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationProps {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const NotificationToast: React.FC<NotificationProps> = ({ id, type, title, message, duration = 5000, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Match animation duration
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-[#151A25]',
          border: 'border-l-4 border-green-500',
          icon: <CheckCircle className="text-green-500" size={24} />,
          titleColor: 'text-green-400'
        };
      case 'error':
        return {
          bg: 'bg-[#151A25]',
          border: 'border-l-4 border-red-500',
          icon: <AlertOctagon className="text-red-500" size={24} />,
          titleColor: 'text-red-400'
        };
      case 'warning':
        return {
          bg: 'bg-[#151A25]',
          border: 'border-l-4 border-yellow-500',
          icon: <AlertTriangle className="text-yellow-500" size={24} />,
          titleColor: 'text-yellow-400'
        };
      default:
        return {
          bg: 'bg-[#151A25]',
          border: 'border-l-4 border-blue-500',
          icon: <Info className="text-blue-500" size={24} />,
          titleColor: 'text-blue-400'
        };
    }
  };

  const styles = getStyles();

  return (
    <div 
      className={`
        ${styles.bg} ${styles.border} 
        w-80 md:w-96 shadow-2xl rounded-r-lg p-4 mb-3 
        flex items-start gap-3 relative
        transition-all duration-300 transform border-t border-r border-b border-card-border/50
        ${isExiting ? 'animate-fade-out' : 'animate-slide-in'}
      `}
      role="alert"
    >
      <div className="shrink-0 mt-0.5">
        {styles.icon}
      </div>
      <div className="flex-1">
        <h4 className={`font-bold text-sm ${styles.titleColor}`}>{title}</h4>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{message}</p>
      </div>
      <button 
        onClick={handleClose}
        className="text-gray-500 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>

      {/* Progress Bar for timeout visualization */}
      <div className="absolute bottom-0 left-0 h-0.5 bg-gray-700 w-full opacity-30">
        <div 
            className="h-full bg-current opacity-100 transition-all ease-linear"
            style={{ 
                width: '0%', 
                backgroundColor: 'currentColor',
                animation: `progress ${duration}ms linear forwards`
            }} 
        />
        <style>{`
          @keyframes progress {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default NotificationToast;
