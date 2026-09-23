import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { investigationsApi } from '../../services/api';
import type { Investigation } from '../../types';

interface NewInvestigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the newly persisted investigation on success */
  onSuccess: (inv: Investigation) => void;
}

const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

interface FormState { title: string; targetAddress: string; }
interface FormErrors { title?: string; targetAddress?: string; }

export function NewInvestigationModal({ isOpen, onClose, onSuccess }: NewInvestigationModalProps) {
  const [form, setForm]         = useState<FormState>({ title: '', targetAddress: '' });
  const [errors, setErrors]     = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.title.trim() || form.title.trim().length < 2)
      e.title = 'Title must be at least 2 characters.';
    if (form.title.trim().length > 120)
      e.title = 'Title must be 120 characters or fewer.';
    if (!form.targetAddress.trim())
      e.targetAddress = 'Wallet address is required.';
    else if (!ETH_ADDRESS_RE.test(form.targetAddress.trim()))
      e.targetAddress = 'Enter a valid Ethereum address (0x followed by 40 hex characters).';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    setApiError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const inv = await investigationsApi.create({
        title:         form.title.trim(),
        targetAddress: form.targetAddress.trim(),
      });
      onSuccess(inv);
      handleClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to create investigation.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setForm({ title: '', targetAddress: '' });
    setErrors({});
    setApiError('');
    setSubmitting(false);
    onClose();
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
    setApiError('');
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Investigation"
      subtitle="Start tracing a wallet address on Ethereum mainnet."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting} id="btn-create-investigation">
            Create Investigation
          </Button>
        </>
      }
    >
      <Input
        label="Investigation title"
        required
        placeholder="e.g. Suspicious exchange withdrawal"
        value={form.title}
        error={errors.title}
        onChange={(e) => handleChange('title', e.target.value)}
        autoFocus
        id="inv-title"
      />

      <Input
        label="Target wallet address"
        required
        placeholder="0x…"
        value={form.targetAddress}
        error={errors.targetAddress}
        onChange={(e) => handleChange('targetAddress', e.target.value)}
        helper="Ethereum mainnet address"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
        id="inv-address"
      />

      {/* API-level error (from backend) */}
      {apiError && (
        <div
          style={{
            display: 'flex', gap: 8, padding: '10px 12px',
            background: 'var(--danger-muted)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--r-sm)',
          }}
        >
          <AlertCircle size={14} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--danger)', lineHeight: 1.6 }}>{apiError}</span>
        </div>
      )}

      <div
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '10px 12px', background: 'var(--surface-2)',
          border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
        }}
      >
        <AlertCircle size={14} style={{ color: 'var(--text-muted)', marginTop: 1, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          TraceX retrieves real on-chain data. Labels and indicators are investigative aids,
          not conclusions of criminal activity.
        </span>
      </div>
    </Modal>
  );
}
