interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge ${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
