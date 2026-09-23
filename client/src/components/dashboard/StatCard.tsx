import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: number | string | null | undefined;
  icon?: ReactNode;
  accentColor?: string;
  sub?: string;
}

export function StatCard({ label, value, icon, accentColor, sub }: StatCardProps) {
  const hasValue = value !== null && value !== undefined;

  return (
    <div className="stat-card">
      <div className="stat-card__label" style={accentColor ? { color: accentColor } : undefined}>
        {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
        {label}
      </div>
      <div className={`stat-card__value ${!hasValue ? 'stat-card__value--empty' : ''}`}>
        {hasValue ? value : '—'}
      </div>
      {sub && <div className="stat-card__sub">{sub}</div>}
    </div>
  );
}
