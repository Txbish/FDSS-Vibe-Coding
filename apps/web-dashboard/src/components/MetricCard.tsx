interface MetricCardProps {
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const VARIANT_COLORS = {
  default: 'var(--ink)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
};

export function MetricCard({ label, value, variant = 'default' }: MetricCardProps) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      <div className="card-value" style={{ color: VARIANT_COLORS[variant] }}>
        {value}
      </div>
    </div>
  );
}
