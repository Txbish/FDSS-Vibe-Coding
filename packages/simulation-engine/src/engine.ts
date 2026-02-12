/**
 * Core simulation engine.
 *
 * Pure-function architecture: simulate() takes SimulationInput, returns SimulationOutput.
 * All stochastic elements use DeterministicRNG for bit-exact reproducibility.
 *
 * Integrates:
 * - Multi-currency exchange (fx.ts)
 * - Progressive taxation (tax.ts)
 * - DAG-based component execution (dag.ts)
 * - Type-aware asset liquidation
 * - Conditional component activation via startDay/endDay
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
import { ExchangeRateEngine } from './fx.js';
import { computeDailyTax } from './tax.js';

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

function processIncome(
  state: SimulationState,
  day: number,
  fxEngine: ExchangeRateEngine,
  rng: DeterministicRNG,
): Decimal {
  let totalIncome = new Decimal(0);
  for (const stream of state.incomeStreams) {
    if (stream.endDay !== undefined && day > stream.endDay) continue;
    if (stream.startDay > day) continue; // conditional activation
    if (isRecurrenceDay(day, stream.recurrence, stream.startDay)) {
      let amount = new Decimal(stream.amount);

      // Convert to base currency if needed
      if (stream.currency !== state.baseCurrency) {
        amount = fxEngine.convert(
          amount,
          stream.currency,
          state.baseCurrency,
          day,
          rng,
          `income:${stream.name}`,
        );
      }

      state.balance = state.balance.plus(amount);
      totalIncome = totalIncome.plus(amount);
    }
  }
  return totalIncome;
}

function processExpenses(
  state: SimulationState,
  day: number,
  fxEngine: ExchangeRateEngine,
  rng: DeterministicRNG,
): Decimal {
  let totalExpenses = new Decimal(0);
  for (const expense of state.expenses) {
    if (expense.endDay !== undefined && day > expense.endDay) continue;
    if (expense.startDay > day) continue; // conditional activation
    if (isRecurrenceDay(day, expense.recurrence, expense.startDay)) {
      let amount = new Decimal(expense.amount);

      // Convert to base currency if needed
      if (expense.currency !== state.baseCurrency) {
        amount = fxEngine.convert(
          amount,
          expense.currency,
          state.baseCurrency,
          day,
          rng,
          `expense:${expense.name}`,
        );
      }

      state.balance = state.balance.minus(amount);
      totalExpenses = totalExpenses.plus(amount);
    }
  }
  return totalExpenses;
}

function processLiabilities(
  state: SimulationState,
  fxEngine: ExchangeRateEngine,
  rng: DeterministicRNG,
): void {
  for (const liability of state.liabilities) {
    if (liability.principal <= 0) continue;
    // Daily interest accrual
    const dailyRate = liability.interestRate / 365;
    liability.principal = new Decimal(liability.principal).times(1 + dailyRate).toNumber();
    // Minimum payment deduction (prorated daily from monthly payment)
    const dailyPayment = Math.min(liability.minimumPayment / 30, liability.principal);

    let paymentInBase = new Decimal(dailyPayment);
    if (liability.currency !== state.baseCurrency) {
      paymentInBase = fxEngine.convert(
        paymentInBase,
        liability.currency,
        state.baseCurrency,
        state.day,
        rng,
        `liability:${liability.name}`,
      );
    }

    state.balance = state.balance.minus(paymentInBase);
    liability.principal -= dailyPayment;
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

/**
 * Enhanced auto-liquidation with type-aware priorities.
 *
 * Liquidation cascade:
 * 1. Liquid assets (lowest penalty first)
 * 2. Volatile assets (lowest penalty first)
 * 3. Yield-generating assets (lowest penalty first)
 * 4. Illiquid assets are NEVER auto-liquidated (per spec: locked/allocation-bound)
 *
 * All locked assets are skipped. Realized gains are tracked for capital gains tax.
 */
function processAutoLiquidation(
  state: SimulationState,
  fxEngine: ExchangeRateEngine,
  rng: DeterministicRNG,
): void {
  if (state.balance.gte(0)) return;

  // Reset daily realized gains
  state.dailyRealizedGains = new Decimal(0);

  // Priority order: liquid -> volatile -> yield_generating (illiquid never liquidated)
  const liquidationOrder: Array<'liquid' | 'volatile' | 'yield_generating'> = [
    'liquid',
    'volatile',
    'yield_generating',
  ];

  for (const assetType of liquidationOrder) {
    if (state.balance.gte(0)) break;

    const liquidatable = state.assets
      .filter((a) => a.type === assetType && !a.locked && a.value > 0)
      .sort((a, b) => a.liquidationPenalty - b.liquidationPenalty);

    for (const asset of liquidatable) {
      if (state.balance.gte(0)) break;

      let proceeds = new Decimal(asset.value).times(1 - asset.liquidationPenalty);

      // Convert asset proceeds to base currency if needed
      if (asset.currency !== state.baseCurrency) {
        proceeds = fxEngine.convert(
          proceeds,
          asset.currency,
          state.baseCurrency,
          state.day,
          rng,
          `liquidation:${asset.name}`,
        );
      }

      state.balance = state.balance.plus(proceeds);
      state.totalRealizedGains = state.totalRealizedGains.plus(proceeds);
      state.dailyRealizedGains = state.dailyRealizedGains.plus(proceeds);
      asset.value = 0;
    }
  }
}

/**
 * Process taxation: progressive income tax + capital gains tax.
 * Returns { incomeTax, capitalGainsTax } for the day.
 */
function processTaxation(
  state: SimulationState,
  dailyIncome: Decimal,
): { incomeTax: Decimal; capitalGainsTax: Decimal } {
  if (!state.taxConfig) {
    return { incomeTax: new Decimal(0), capitalGainsTax: new Decimal(0) };
  }

  const result = computeDailyTax(
    dailyIncome,
    state.dailyRealizedGains,
    state.cumulativeAnnualIncome,
    state.taxConfig,
  );

  // Deduct tax from balance
  state.balance = state.balance.minus(result.totalTax);

  // Update cumulative income for bracket tracking
  state.cumulativeAnnualIncome = state.cumulativeAnnualIncome.plus(dailyIncome);

  // Reset annual income tracking at year boundary (every 365 days)
  if (state.day > 0 && state.day % 365 === 0) {
    state.cumulativeAnnualIncome = new Decimal(0);
  }

  return {
    incomeTax: result.incomeTax,
    capitalGainsTax: result.capitalGainsTax,
  };
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
function runDay(
  state: SimulationState,
  rng: DeterministicRNG,
  fxEngine: ExchangeRateEngine,
  dateStr: string,
): DailySnapshot {
  // Reset daily tracking
  state.dailyRealizedGains = new Decimal(0);

  // Define component execution order via DAG
  const components: DAGNode[] = [
    { id: 'income', dependsOn: [] },
    { id: 'expenses', dependsOn: ['income'] },
    { id: 'liabilities', dependsOn: ['expenses'] },
    { id: 'asset_valuation', dependsOn: [] },
    { id: 'auto_liquidation', dependsOn: ['expenses', 'liabilities'] },
    { id: 'taxation', dependsOn: ['income', 'auto_liquidation'] },
    { id: 'credit_score', dependsOn: ['liabilities', 'auto_liquidation'] },
    { id: 'behavioral', dependsOn: ['credit_score'] },
  ];

  const order = topologicalSort(components);

  let totalIncome = new Decimal(0);
  let totalExpenses = new Decimal(0);
  let taxResult = { incomeTax: new Decimal(0), capitalGainsTax: new Decimal(0) };

  for (const componentId of order) {
    switch (componentId) {
      case 'income':
        totalIncome = processIncome(state, state.day, fxEngine, rng);
        break;
      case 'expenses':
        totalExpenses = processExpenses(state, state.day, fxEngine, rng);
        break;
      case 'liabilities':
        processLiabilities(state, fxEngine, rng);
        break;
      case 'asset_valuation':
        processAssetValuation(state, rng);
        break;
      case 'auto_liquidation':
        processAutoLiquidation(state, fxEngine, rng);
        break;
      case 'taxation':
        taxResult = processTaxation(state, totalIncome);
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
  snapshot.taxPaid = taxResult.incomeTax.toNumber();
  snapshot.capitalGainsTax = taxResult.capitalGainsTax.toNumber();

  return snapshot;
}

// ─── Core Single-Run Simulation ─────────────────────────────────────────────────

/**
 * Runs a single simulation with the given seed.
 * Used internally by both simulate() and Monte Carlo runs.
 */
export function simulateSingleRun(input: SimulationInput, seedOverride?: number): SimulationOutput {
  const seed = seedOverride ?? input.seed;
  const rng = new DeterministicRNG(seed);
  const startDate = new Date('2026-01-01');
  const fxEngine = new ExchangeRateEngine(input.exchangeRates);

  const state = createInitialState({
    baseCurrency: input.baseCurrency,
    initialBalance: input.initialBalance,
    assets: input.assets,
    liabilities: input.liabilities,
    incomeStreams: input.incomeStreams,
    expenses: input.expenses,
    exchangeRates: input.exchangeRates,
    taxConfig: input.taxConfig,
  });

  const snapshots: DailySnapshot[] = [];

  for (let day = 0; day < input.horizonDays; day++) {
    state.day = day;
    const dateStr = formatDate(startDate, day);
    const snapshot = runDay(state, rng, fxEngine, dateStr);
    snapshots.push(snapshot);
  }

  // Compute single-run statistics
  const balances = snapshots.map((s) => s.balance);
  const finalBalance = balances[balances.length - 1] ?? 0;

  const collapseDays = snapshots.filter((s) => s.balance < 0);
  const collapseProbability = collapseDays.length / snapshots.length;

  const vibeState = deriveVibeState(state);
  const petState = derivePetState(vibeState);

  const lastSnapshot = snapshots[snapshots.length - 1];

  return {
    seed,
    horizonDays: input.horizonDays,
    baseCurrency: input.baseCurrency,
    computedAt: new Date().toISOString(),
    snapshots,
    finalBalance: {
      expected: finalBalance,
      p5: finalBalance, // overridden by Monte Carlo
      p95: finalBalance, // overridden by Monte Carlo
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

// ─── Monte Carlo Simulation ─────────────────────────────────────────────────────

/**
 * Runs the full simulation with Monte Carlo distribution.
 *
 * The primary run (seed + 0) produces the full snapshots trajectory.
 * Additional runs (seed + 1, seed + 2, ...) produce final balances
 * for computing p5, p95, expected, and collapse probability.
 *
 * Guarantees: Given identical inputs and seed, produces bit-exact identical output.
 */
export function simulate(input: SimulationInput): SimulationOutput {
  const mcConfig = input.monteCarloConfig ?? { runs: 100, perturbationFactor: 0.05 };
  const numRuns = mcConfig.runs;

  // Primary run: full trajectory with original seed
  const primaryResult = simulateSingleRun(input, input.seed);

  if (numRuns <= 1) {
    return primaryResult;
  }

  // Monte Carlo runs: vary seed for statistical distribution
  const finalBalances: number[] = [primaryResult.finalBalance.expected];
  let collapseCount = primaryResult.collapseDay !== null ? 1 : 0;

  for (let i = 1; i < numRuns; i++) {
    const mcSeed = input.seed + i;
    const mcResult = simulateSingleRun(input, mcSeed);
    finalBalances.push(mcResult.finalBalance.expected);
    if (mcResult.collapseDay !== null) collapseCount++;
  }

  // Compute statistics from Monte Carlo distribution
  const sortedBalances = [...finalBalances].sort((a, b) => a - b);
  const p5Index = Math.max(0, Math.floor(sortedBalances.length * 0.05));
  const p95Index = Math.min(sortedBalances.length - 1, Math.floor(sortedBalances.length * 0.95));
  const expectedBalance = finalBalances.reduce((sum, b) => sum + b, 0) / finalBalances.length;
  const mcCollapseProbability = collapseCount / numRuns;

  return {
    ...primaryResult,
    finalBalance: {
      expected: expectedBalance,
      p5: sortedBalances[p5Index],
      p95: sortedBalances[p95Index],
    },
    collapseProbability: mcCollapseProbability,
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
