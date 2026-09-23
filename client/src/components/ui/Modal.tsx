import { X } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';
import { Button } from './Button';

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: ModalSize;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ isOpen, onClose, title, subtitle, size = 'md', children, footer }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`modal ${size !== 'md' ? `modal--${size}` : ''}`}>
        <div className="modal__header">
          <div>
            <div id="modal-title" className="modal__title">{title}</div>
            {subtitle && <div className="modal__subtitle">{subtitle}</div>}
          </div>
          <Button
            variant="ghost"
            iconOnly
            size="sm"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={16} />
          </Button>
        </div>

        <div className="modal__body">{children}</div>

        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
