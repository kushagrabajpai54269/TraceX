import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { investigationsApi } from '../../services/api';
import type { Investigation } from '../../types';

interface RenameModalProps {
  investigation: Investigation | null;
  onClose: () => void;
  onSuccess: (inv: Investigation) => void;
}

export function RenameModal({ investigation, onClose, onSuccess }: RenameModalProps) {
  const [title, setTitle] = useState(investigation?.title ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync title when investigation changes
  if (investigation && title === '' && investigation.title) {
    setTitle(investigation.title);
  }

  async function handleSave() {
    setError('');
    if (!title.trim() || title.trim().length < 2) {
      setError('Title must be at least 2 characters.');
      return;
    }
    if (!investigation) return;
    setSaving(true);
    try {
      const updated = await investigationsApi.update(investigation._id, { title: title.trim() });
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={!!investigation}
      onClose={onClose}
      title="Rename Investigation"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving} id="btn-save-rename">
            Save
          </Button>
        </>
      }
    >
      <Input
        label="New title"
        required
        value={title}
        error={error}
        onChange={(e) => { setTitle(e.target.value); setError(''); }}
        autoFocus
        id="rename-title"
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
      />
    </Modal>
  );
}
