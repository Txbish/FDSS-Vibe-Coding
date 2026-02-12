import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { InfoTip } from './InfoTip';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  icon?: ReactNode;
  tooltip?: string;
  className?: string;
}

const variantStyles = {
  default: 'border-border',
  success: 'border-success/30 bg-success/5',
  warning: 'border-warning/30 bg-warning/5',
  danger: 'border-danger/30 bg-danger/5',
} as const;

const variantValueStyles = {
  default: 'text-ink',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

export function MetricCard({
  label,
  value,
  subtitle,
  variant = 'default',
  icon,
  tooltip,
  className,
}: MetricCardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border p-4 bg-surface transition-all hover:shadow-sm',
        variantStyles[variant],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-ink-muted">{icon}</span>}
          <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
            {label}
          </span>
          {tooltip && <InfoTip content={tooltip} />}
        </div>
      </div>
      <p className={clsx('text-2xl font-bold tabular-nums', variantValueStyles[variant])}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-ink-muted mt-1">{subtitle}</p>}
    </div>
  );
}
