import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { investigationsApi } from '../../services/api';
import type { Investigation } from '../../types';

interface DeleteConfirmModalProps {
  investigation: Investigation | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

export function DeleteConfirmModal({ investigation, onClose, onDeleted }: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState('');

  async function handleDelete() {
    if (!investigation) return;
    setDeleting(true);
    setError('');
    try {
      await investigationsApi.delete(investigation._id);
      onDeleted(investigation._id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      isOpen={!!investigation}
      onClose={onClose}
      title="Delete Investigation"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting} id="btn-confirm-delete">
            Delete permanently
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 'var(--r-lg)',
              background: 'var(--danger-muted)', border: '1px solid rgba(239,68,68,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
              This will permanently delete:
            </p>
            <p
              style={{
                fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                marginTop: 4, wordBreak: 'break-word',
              }}
            >
              "{investigation?.title}"
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
              This action cannot be undone. The record and all its metadata will be removed from the database.
            </p>
          </div>
        </div>

        {error && (
          <p style={{ fontSize: 12, color: 'var(--danger)', padding: '8px 12px', background: 'var(--danger-muted)', borderRadius: 'var(--r-sm)' }}>
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
