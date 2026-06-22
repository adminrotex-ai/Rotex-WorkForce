import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = '500px' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full animate-scale-in max-h-[90vh] overflow-y-auto"
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
