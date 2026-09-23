import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface AddressDisplayProps {
  address: string;
  /** Characters to show at start and end. Default 6. */
  chars?: number;
  showCopy?: boolean;
  className?: string;
}

export function AddressDisplay({
  address,
  chars = 6,
  showCopy = true,
  className = '',
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const truncated =
    address.length > chars * 2 + 2
      ? `${address.slice(0, chars)}…${address.slice(-chars)}`
      : address;

  function handleCopy() {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <span
      className={`flex items-center gap-2 ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      title={address}
    >
      <span className="text-mono">{truncated}</span>
      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy address"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: copied ? 'var(--success)' : 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            padding: 2,
            borderRadius: 4,
            transition: 'color 0.15s ease',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      )}
    </span>
  );
}
