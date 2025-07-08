interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning';
}

export function Modal({ isOpen, onClose, title, message, type }: ModalProps) {
  if (!isOpen) return null;

  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return { icon: '✅', color: '#10b981' };
      case 'error':
        return { icon: '❌', color: '#ef4444' };
      case 'warning':
        return { icon: '⚠️', color: '#f59e0b' };
      default:
        return { icon: 'ℹ️', color: '#3b82f6' };
    }
  };

  const { icon, color } = getIconAndColor();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">{icon}</span>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded transition-colors hover:opacity-80"
            style={{ backgroundColor: color, color: 'white' }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
} 