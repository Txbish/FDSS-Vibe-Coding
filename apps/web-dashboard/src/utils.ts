/**
 * Simple UUID v4 fallback (no external dependency).
 * Uses crypto.randomUUID where available, falls back to Math.random.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Format a number as currency */
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format a number as currency with decimals */
export function formatCurrencyPrecise(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Format a decimal as a percentage */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Format a number with commas */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Clamp a value */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Get a color for a value on a green-yellow-red scale */
export function getHealthColor(
  value: number,
  thresholds: { good: number; warn: number; reverse?: boolean },
): string {
  const { good, warn, reverse } = thresholds;
  if (reverse) {
    if (value <= good) return 'text-success';
    if (value <= warn) return 'text-warning';
    return 'text-danger';
  }
  if (value >= good) return 'text-success';
  if (value >= warn) return 'text-warning';
  return 'text-danger';
}

/** Get variant for collapse probability */
export function getCollapseVariant(prob: number): 'success' | 'warning' | 'danger' {
  if (prob < 0.1) return 'success';
  if (prob < 0.4) return 'warning';
  return 'danger';
}

/** Get variant for credit score */
export function getCreditVariant(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 700) return 'success';
  if (score >= 550) return 'warning';
  return 'danger';
}

/** Readable vibe state label */
export function vibeLabel(state: string): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}
