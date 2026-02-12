import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({
  message = 'Running simulation...',
  className,
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className || ''}`}>
      <Loader2 className="w-8 h-8 text-rust animate-spin mb-4" />
      <p className="text-sm font-medium text-ink-muted">{message}</p>
      <p className="text-xs text-ink-muted/60 mt-1">
        This may take a few seconds for Monte Carlo simulations
      </p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border p-4 bg-surface">
      <div className="h-3 w-24 bg-border rounded animate-shimmer mb-3" />
      <div className="h-7 w-32 bg-border rounded animate-shimmer" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="rounded-xl border border-border p-6 bg-surface">
      <div className="h-4 w-40 bg-border rounded animate-shimmer mb-4" />
      <div className="h-[300px] bg-border/30 rounded-lg animate-shimmer" />
    </div>
  );
}
