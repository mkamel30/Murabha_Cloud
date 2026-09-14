import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  zIndex?: string;
  maxWidth?: string;
}

let activeModalsCount = 0;
const modalStack: (() => void)[] = [];

export function Modal({ isOpen, onClose, title, children, zIndex = 'z-50', maxWidth = 'max-w-lg' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalStack.length > 0) {
        const topOnClose = modalStack[modalStack.length - 1];
        if (topOnClose === onClose) {
          onClose();
        }
      }
    };

    if (isOpen) {
      modalStack.push(onClose);
      activeModalsCount++;
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      if (isOpen) {
        const index = modalStack.lastIndexOf(onClose);
        if (index !== -1) modalStack.splice(index, 1);
        activeModalsCount = Math.max(0, activeModalsCount - 1);
        document.removeEventListener('keydown', handleEscape);
        if (activeModalsCount === 0) {
          document.body.style.overflow = 'unset';
        }
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center`} role="presentation">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div
        ref={modalRef}
        className={`relative bg-white rounded-xl shadow-2xl w-full ${maxWidth} mx-4 max-h-[90vh] overflow-hidden animate-scale-in`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        <div className="smart-card-header px-6 py-4 flex items-center justify-between">
          <h2 id="modal-title" className="text-xl font-bold text-[#0A2472]">{title}</h2>
          <button
            onClick={onClose}
            className="smart-btn-icon text-gray-400 hover:text-gray-600"
            aria-label={typeof window !== 'undefined' ? 'إغلاق' : 'Close'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
}