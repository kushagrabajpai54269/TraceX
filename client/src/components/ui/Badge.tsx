import type { ReactNode } from 'react';

type BadgeVariant =
  | 'default' | 'success' | 'warning' | 'danger'
  | 'info' | 'accent' | 'cyan';

interface BadgeProps {
  variant?: BadgeVariant;
  noDot?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', noDot = false, children, className = '' }: BadgeProps) {
  const classes = [
    'badge',
    `badge--${variant}`,
    noDot ? 'badge--no-dot' : '',
    className,
  ].filter(Boolean).join(' ');

  return <span className={classes}>{children}</span>;
}

/** Convenience mapping: investigation status → badge variant */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    active:   'warning',
    done:     'success',
    archived: 'default',
    open:     'info',
  };
  const variant = map[status.toLowerCase()] ?? 'default';
  return <Badge variant={variant}>{capitalize(status)}</Badge>;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
