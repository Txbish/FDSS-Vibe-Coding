/**
 * Simulation state — the mutable internal state that evolves day by day.
 * This is the "working memory" of the engine, distinct from the output snapshots.
 */
import Decimal from 'decimal.js';
import type {
  Asset,
  CurrencyCode,
  DailySnapshot,
  Expense,
  ExchangeRate,
  IncomeStream,
  Liability,
  PetState,
  TaxConfig,
  VibeState,
} from '@future-wallet/shared-types';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

/** Deep clone via JSON serialization — safe for plain data objects */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export interface SimulationState {
  day: number;
  balance: Decimal;
  baseCurrency: CurrencyCode;
  assets: Asset[];
  liabilities: Liability[];
  incomeStreams: IncomeStream[];
  expenses: Expense[];
  exchangeRates: ExchangeRate[];
  taxConfig: TaxConfig | undefined;
  creditScore: number;
  totalRealizedGains: Decimal;
  /** Running total of realized gains for the current day (reset each day) */
  dailyRealizedGains: Decimal;
  /** Cumulative annual income for progressive tax bracket placement */
  cumulativeAnnualIncome: Decimal;
  shockCount: number;
  recoveryDays: number;
  consecutiveDeficitDays: number;
  collapseDay: number | null;
}

/**
 * Creates the initial simulation state from inputs.
 */
export function createInitialState(params: {
  baseCurrency: CurrencyCode;
  initialBalance: number;
  assets: Asset[];
  liabilities: Liability[];
  incomeStreams: IncomeStream[];
  expenses: Expense[];
  exchangeRates: ExchangeRate[];
  taxConfig?: TaxConfig;
}): SimulationState {
  return {
    day: 0,
    balance: new Decimal(params.initialBalance),
    baseCurrency: params.baseCurrency,
    assets: deepClone(params.assets),
    liabilities: deepClone(params.liabilities),
    incomeStreams: deepClone(params.incomeStreams),
    expenses: deepClone(params.expenses),
    exchangeRates: deepClone(params.exchangeRates),
    taxConfig: params.taxConfig ? deepClone(params.taxConfig) : undefined,
    creditScore: 650, // starting credit score
    totalRealizedGains: new Decimal(0),
    dailyRealizedGains: new Decimal(0),
    cumulativeAnnualIncome: new Decimal(0),
    shockCount: 0,
    recoveryDays: 0,
    consecutiveDeficitDays: 0,
    collapseDay: null,
  };
}

/**
 * Converts the mutable internal state to an immutable DailySnapshot for output.
 */
export function stateToSnapshot(state: SimulationState, dateStr: string): DailySnapshot {
  const totalDebt = state.liabilities.reduce((sum, l) => sum + l.principal, 0);
  const assetNAV = state.assets.reduce((sum, a) => sum + a.value, 0);
  const liquidAssets = state.assets
    .filter((a) => a.type === 'liquid' && !a.locked)
    .reduce((sum, a) => sum + a.value, 0);
  const liquidityRatio = totalDebt > 0 ? liquidAssets / totalDebt : liquidAssets > 0 ? Infinity : 0;

  // Shock Resilience Index: 0-100, based on balance stability
  const sri = Math.max(0, Math.min(100, 100 - state.shockCount * 10 + state.recoveryDays * 2));

  return {
    day: state.day,
    date: dateStr,
    balance: state.balance.toNumber(),
    totalIncome: 0, // filled per-day during step
    totalExpenses: 0, // filled per-day during step
    netCashFlow: 0,
    assetNAV,
    totalDebt,
    creditScore: state.creditScore,
    liquidityRatio: liquidityRatio === Infinity ? 999 : liquidityRatio,
    shockResilienceIndex: sri,
    taxPaid: 0, // filled per-day during step
    capitalGainsTax: 0, // filled per-day during step
  };
}

/**
 * Derives the qualitative Vibe state from the simulation state.
 */
export function deriveVibeState(state: SimulationState): VibeState {
  const balance = state.balance.toNumber();
  if (balance < 0 && state.consecutiveDeficitDays > 30) return 'collapsed';
  if (balance < 0) return 'critical';
  if (state.consecutiveDeficitDays > 7) return 'strained';
  if (state.creditScore > 700 && balance > 0) return 'thriving';
  return 'stable';
}

/**
 * Derives the Pet state from the Vibe state.
 */
export function derivePetState(vibe: VibeState): PetState {
  const mapping: Record<VibeState, PetState> = {
    thriving: 'happy',
    stable: 'content',
    strained: 'anxious',
    critical: 'distressed',
    collapsed: 'fainted',
  };
  return mapping[vibe];
}

/**
 * Deep-clones the simulation state for branching / snapshotting.
 */
export function snapshotState(state: SimulationState): SimulationState {
  return {
    ...deepClone({
      ...state,
      balance: undefined,
      totalRealizedGains: undefined,
      dailyRealizedGains: undefined,
      cumulativeAnnualIncome: undefined,
    } as unknown as SimulationState),
    balance: new Decimal(state.balance.toString()),
    totalRealizedGains: new Decimal(state.totalRealizedGains.toString()),
    dailyRealizedGains: new Decimal(state.dailyRealizedGains.toString()),
    cumulativeAnnualIncome: new Decimal(state.cumulativeAnnualIncome.toString()),
  };
}
