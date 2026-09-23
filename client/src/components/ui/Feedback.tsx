import type { ReactNode } from 'react';
import { AlertCircle, FolderOpen, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';

/* ============================================================
   Spinner
   ============================================================ */
interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; }

export function Spinner({ size = 'md' }: SpinnerProps) {
  return (
    <div
      className={`spinner ${size === 'sm' ? 'spinner--sm' : size === 'lg' ? 'spinner--lg' : ''}`}
      role="status"
      aria-label="Loading"
    />
  );
}

/* ============================================================
   Loading State
   ============================================================ */
export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="feedback-state">
      <div className="feedback-state__icon feedback-state__icon--loading">
        <Loader2 size={24} style={{ animation: 'spin 0.7s linear infinite' }} />
      </div>
      <span className="feedback-state__title">{message}</span>
    </div>
  );
}

/* ============================================================
   Empty State
   ============================================================ */
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="feedback-state">
      <div className="feedback-state__icon feedback-state__icon--empty">
        {icon ?? <FolderOpen size={22} />}
      </div>
      <span className="feedback-state__title">{title}</span>
      {description && <p className="feedback-state__desc">{description}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

/* ============================================================
   Error State
   ============================================================ */
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="feedback-state">
      <div className="feedback-state__icon feedback-state__icon--error">
        <AlertCircle size={22} />
      </div>
      <span className="feedback-state__title">{title}</span>
      <p className="feedback-state__desc">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} style={{ marginTop: 8 }}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ============================================================
   Success State
   ============================================================ */
export function SuccessState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="feedback-state">
      <div className="feedback-state__icon feedback-state__icon--success">
        <CheckCircle2 size={22} />
      </div>
      <span className="feedback-state__title">{title}</span>
      {description && <p className="feedback-state__desc">{description}</p>}
    </div>
  );
}
