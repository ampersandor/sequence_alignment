import { useEffect } from 'react';

interface ToastProps {
  isVisible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning';
  onClose: () => void;
  duration?: number;
}

export function Toast({ isVisible, message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return { icon: '✅', bgColor: 'bg-green-600', borderColor: 'border-green-500' };
      case 'error':
        return { icon: '❌', bgColor: 'bg-red-600', borderColor: 'border-red-500' };
      case 'warning':
        return { icon: '⚠️', bgColor: 'bg-yellow-600', borderColor: 'border-yellow-500' };
      default:
        return { icon: 'ℹ️', bgColor: 'bg-blue-600', borderColor: 'border-blue-500' };
    }
  };

  const { icon, bgColor, borderColor } = getIconAndColor();

  return (
    <div
      className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-700 ease-in-out ${
        isVisible
          ? 'opacity-100 scale-100 translate-y-0'
          : 'opacity-0 scale-90 translate-y-8 pointer-events-none'
      }`}
    >
      <div className={`${bgColor} ${borderColor} border rounded-lg shadow-lg p-4 max-w-sm w-full`}>
        <div className="flex items-center">
          <span className="text-xl mr-3">{icon}</span>
          <p className="text-white text-sm font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
} 