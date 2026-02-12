import { clsx } from 'clsx';
import type { VibeState, PetState } from '@future-wallet/shared-types';

interface StatusBadgeProps {
  label: string;
  status: VibeState | PetState;
  tooltip?: string;
}

const STATUS_CONFIG: Record<string, { color: string; emoji: string; description: string }> = {
  // Vibe states
  thriving: {
    color: 'bg-success/15 text-success border-success/30',
    emoji: '🟢',
    description: 'Finances are excellent',
  },
  stable: {
    color: 'bg-terra/15 text-terra border-terra/30',
    emoji: '🔵',
    description: 'Finances are healthy',
  },
  strained: {
    color: 'bg-warning/15 text-warning border-warning/30',
    emoji: '🟡',
    description: 'Finances are under pressure',
  },
  critical: {
    color: 'bg-danger/15 text-danger border-danger/30',
    emoji: '🔴',
    description: 'Finances need urgent attention',
  },
  collapsed: {
    color: 'bg-danger/15 text-danger border-danger/30',
    emoji: '⛔',
    description: 'Financial collapse occurred',
  },
  // Pet states
  happy: {
    color: 'bg-success/15 text-success border-success/30',
    emoji: '😊',
    description: 'Your pet is happy!',
  },
  content: {
    color: 'bg-terra/15 text-terra border-terra/30',
    emoji: '🙂',
    description: 'Your pet is content',
  },
  anxious: {
    color: 'bg-warning/15 text-warning border-warning/30',
    emoji: '😟',
    description: 'Your pet is worried',
  },
  distressed: {
    color: 'bg-danger/15 text-danger border-danger/30',
    emoji: '😰',
    description: 'Your pet is distressed',
  },
  fainted: {
    color: 'bg-danger/15 text-danger border-danger/30',
    emoji: '😵',
    description: 'Your pet fainted',
  },
};

export function StatusBadge({ label, status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.stable;

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium',
        config.color,
      )}
    >
      <span>{config.emoji}</span>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider opacity-70 leading-none">
          {label}
        </span>
        <span className="font-semibold capitalize leading-tight mt-0.5">{status}</span>
      </div>
    </div>
  );
}
