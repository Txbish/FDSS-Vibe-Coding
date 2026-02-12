/**
 * Core simulation engine.
 *
 * Pure-function architecture: simulate() takes SimulationInput, returns SimulationOutput.
 * All stochastic elements use DeterministicRNG for bit-exact reproducibility.
 */
import Decimal from 'decimal.js';
import type {
  DailySnapshot,
  Recurrence,
  SimulationInput,
  SimulationOutput,
} from '@future-wallet/shared-types';
import { DeterministicRNG } from './rng.js';
import {
  createInitialState,
  derivePetState,
  deriveVibeState,
  stateToSnapshot,
  type SimulationState,
} from './state.js';
import { topologicalSort, type DAGNode } from './dag.js';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(startDate: Date, dayOffset: number): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split('T')[0];
}

function isRecurrenceDay(day: number, recurrence: Recurrence, startDay: number): boolean {
  const elapsed = day - startDay;
  if (elapsed < 0) return false;

  switch (recurrence) {
    case 'daily':
      return true;
    case 'weekly':
      return elapsed % 7 === 0;
    case 'biweekly':
      return elapsed % 14 === 0;
    case 'monthly':
      return elapsed % 30 === 0;
    case 'yearly':
      return elapsed % 365 === 0;
    case 'once':
      return elapsed === 0;
  }
}

// ─── Day Step Components ────────────────────────────────────────────────────────

function processIncome(state: SimulationState, day: number): Decimal {
  let totalIncome = new Decimal(0);
  for (const stream of state.incomeStreams) {
    if (stream.endDay !== undefined && day > stream.endDay) continue;
    if (isRecurrenceDay(day, stream.recurrence, stream.startDay)) {
      const amount = new Decimal(stream.amount);
      state.balance = state.balance.plus(amount);
      totalIncome = totalIncome.plus(amount);
    }
  }
  return totalIncome;
}

function processExpenses(state: SimulationState, day: number): Decimal {
  let totalExpenses = new Decimal(0);
  for (const expense of state.expenses) {
    if (expense.endDay !== undefined && day > expense.endDay) continue;
    if (isRecurrenceDay(day, expense.recurrence, expense.startDay)) {
      const amount = new Decimal(expense.amount);
      state.balance = state.balance.minus(amount);
      totalExpenses = totalExpenses.plus(amount);
    }
  }
  return totalExpenses;
}

function processLiabilities(state: SimulationState): void {
  for (const liability of state.liabilities) {
    if (liability.principal <= 0) continue;
    // Daily interest accrual
    const dailyRate = liability.interestRate / 365;
    liability.principal = new Decimal(liability.principal)
      .times(1 + dailyRate)
      .toNumber();
    // Minimum payment deduction
    const payment = Math.min(liability.minimumPayment / 30, liability.principal);
    state.balance = state.balance.minus(new Decimal(payment));
    liability.principal -= payment;
  }
}

function processAssetValuation(state: SimulationState, rng: DeterministicRNG): void {
  for (const asset of state.assets) {
    if (asset.volatility > 0) {
      // Daily price movement based on volatility
      const change = rng.gaussian(0, asset.volatility / Math.sqrt(365));
      asset.value = Math.max(0, asset.value * (1 + change));
    }
    if (asset.yieldRate > 0 && !asset.locked) {
      // Daily yield
      const dailyYield = asset.yieldRate / 365;
      asset.value *= 1 + dailyYield;
    }
    // Unlock check
    if (asset.locked && asset.lockUntilDay !== undefined && state.day >= asset.lockUntilDay) {
      asset.locked = false;
    }
  }
}

function processAutoLiquidation(state: SimulationState): void {
  if (state.balance.gte(0)) return;

  // Sort liquid assets by liquidation penalty (sell cheapest-to-liquidate first)
  const liquidatable = state.assets
    .filter((a) => a.type === 'liquid' && !a.locked && a.value > 0)
    .sort((a, b) => a.liquidationPenalty - b.liquidationPenalty);

  for (const asset of liquidatable) {
    if (state.balance.gte(0)) break;
    const proceeds = new Decimal(asset.value).times(1 - asset.liquidationPenalty);
    state.balance = state.balance.plus(proceeds);
    state.totalRealizedGains = state.totalRealizedGains.plus(proceeds);
    asset.value = 0;
  }
}

function updateCreditScore(state: SimulationState): void {
  const totalDebt = state.liabilities.reduce((s, l) => s + l.principal, 0);
  const balance = state.balance.toNumber();

  // Simple credit score model per spec: f(Debt Ratio, Punctuality, Restructuring)
  const debtRatio = balance > 0 ? totalDebt / balance : totalDebt > 0 ? 2 : 0;
  const punctualityBonus = state.consecutiveDeficitDays === 0 ? 1 : -1;

  // Gradual evolution: small daily adjustment
  const adjustment = (-debtRatio * 0.5 + punctualityBonus * 0.3) * 0.1;
  state.creditScore = Math.max(300, Math.min(850, state.creditScore + adjustment));
}

function updateBehavioralMetrics(state: SimulationState): void {
  if (state.balance.lt(0)) {
    state.consecutiveDeficitDays++;
    if (state.consecutiveDeficitDays === 1) {
      state.shockCount++;
    }
    if (state.collapseDay === null && state.consecutiveDeficitDays > 30) {
      state.collapseDay = state.day;
    }
  } else {
    if (state.consecutiveDeficitDays > 0) {
      state.recoveryDays++;
    }
    state.consecutiveDeficitDays = 0;
  }
}

// ─── Single Day Step ────────────────────────────────────────────────────────────

/**
 * Resolves the component DAG and executes one day of simulation.
 */
function runDay(state: SimulationState, rng: DeterministicRNG, dateStr: string): DailySnapshot {
  // Define component execution order via DAG
  const components: DAGNode[] = [
    { id: 'income', dependsOn: [] },
    { id: 'expenses', dependsOn: ['income'] },
    { id: 'liabilities', dependsOn: ['expenses'] },
    { id: 'asset_valuation', dependsOn: [] },
    { id: 'auto_liquidation', dependsOn: ['expenses', 'liabilities'] },
    { id: 'credit_score', dependsOn: ['liabilities', 'auto_liquidation'] },
    { id: 'behavioral', dependsOn: ['credit_score'] },
  ];

  const order = topologicalSort(components);

  let totalIncome = new Decimal(0);
  let totalExpenses = new Decimal(0);

  for (const componentId of order) {
    switch (componentId) {
      case 'income':
        totalIncome = processIncome(state, state.day);
        break;
      case 'expenses':
        totalExpenses = processExpenses(state, state.day);
        break;
      case 'liabilities':
        processLiabilities(state);
        break;
      case 'asset_valuation':
        processAssetValuation(state, rng);
        break;
      case 'auto_liquidation':
        processAutoLiquidation(state);
        break;
      case 'credit_score':
        updateCreditScore(state);
        break;
      case 'behavioral':
        updateBehavioralMetrics(state);
        break;
    }
  }

  const snapshot = stateToSnapshot(state, dateStr);
  snapshot.totalIncome = totalIncome.toNumber();
  snapshot.totalExpenses = totalExpenses.toNumber();
  snapshot.netCashFlow = totalIncome.minus(totalExpenses).toNumber();

  return snapshot;
}

// ─── Main Simulation Entry Point ────────────────────────────────────────────────

/**
 * Runs the full simulation over the specified horizon.
 *
 * Guarantees: Given identical inputs and seed, produces bit-exact identical output.
 */
export function simulate(input: SimulationInput): SimulationOutput {
  const rng = new DeterministicRNG(input.seed);
  const startDate = new Date('2026-01-01');

  const state = createInitialState({
    baseCurrency: input.baseCurrency,
    initialBalance: input.initialBalance,
    assets: input.assets,
    liabilities: input.liabilities,
    incomeStreams: input.incomeStreams,
    expenses: input.expenses,
    exchangeRates: input.exchangeRates,
  });

  const snapshots: DailySnapshot[] = [];

  for (let day = 0; day < input.horizonDays; day++) {
    state.day = day;
    const dateStr = formatDate(startDate, day);
    const snapshot = runDay(state, rng, dateStr);
    snapshots.push(snapshot);
  }

  // Compute final statistics
  const balances = snapshots.map((s) => s.balance);
  const finalBalance = balances[balances.length - 1] ?? 0;
  const sortedBalances = [...balances].sort((a, b) => a - b);
  const p5Index = Math.floor(sortedBalances.length * 0.05);
  const p95Index = Math.floor(sortedBalances.length * 0.95);

  const collapseDays = snapshots.filter((s) => s.balance < 0);
  const collapseProbability = collapseDays.length / snapshots.length;

  const vibeState = deriveVibeState(state);
  const petState = derivePetState(vibeState);

  const lastSnapshot = snapshots[snapshots.length - 1];

  return {
    seed: input.seed,
    horizonDays: input.horizonDays,
    baseCurrency: input.baseCurrency,
    computedAt: new Date().toISOString(),

    snapshots,

    finalBalance: {
      expected: finalBalance,
      p5: sortedBalances[p5Index] ?? finalBalance,
      p95: sortedBalances[p95Index] ?? finalBalance,
    },

    collapseProbability,
    collapseDay: state.collapseDay,

    vibeState,
    petState,

    finalCreditScore: state.creditScore,
    shockResilienceIndex: lastSnapshot?.shockResilienceIndex ?? 50,

    finalNAV: lastSnapshot?.assetNAV ?? 0,
    finalLiquidityRatio: lastSnapshot?.liquidityRatio ?? 0,
  };
}

/**
 * Runs a branching simulation: baseline from start, then a divergent branch
 * from a specific day with modified parameters.
 */
export function simulateBranch(
  baseInput: SimulationInput,
  branchAtDay: number,
  modifiedInput: Partial<SimulationInput>,
): { baseline: SimulationOutput; branch: SimulationOutput } {
  const baseline = simulate(baseInput);

  // Create branch input: merge modifications
  const branchInput: SimulationInput = {
    ...baseInput,
    ...modifiedInput,
    // Offset the branch: only simulate remaining days
    horizonDays: baseInput.horizonDays - branchAtDay,
    // Use initial balance from the baseline at branch point
    initialBalance: baseline.snapshots[branchAtDay]?.balance ?? baseInput.initialBalance,
  };

  const branch = simulate(branchInput);

  return { baseline, branch };
}
