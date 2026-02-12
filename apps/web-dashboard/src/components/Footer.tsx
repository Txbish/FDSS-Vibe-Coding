import { BarChart3 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-alt/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-ink-muted">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm font-medium">Future Wallet FDSS Engine</span>
          </div>
          <p className="text-xs text-ink-muted text-center sm:text-right">
            DATAFEST 2026 - Deterministic Financial Simulation System. All simulations are
            reproducible via seed-based RNG.
          </p>
        </div>
      </div>
    </footer>
  );
}
