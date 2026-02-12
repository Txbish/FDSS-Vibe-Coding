/**
 * Core simulation engine.
 *
 * Pure-function architecture: simulate() takes SimulationInput, returns SimulationOutput.
 * All stochastic elements use DeterministicRNG for bit-exact reproducibility.
 *
 * Implements:
 * - Multi-currency exchange rate conversion
 * - Progressive taxation with capital gains
 * - DAG-ordered component execution
 * - Shock clustering density & recovery slope metrics
 * - Monte Carlo P5/P95 via multi-seed runs
 * - Simulation branching with comparison
 */
import Decimal from 'decimal.js';
import type {
  BranchComparison,
  DailySnapshot,
  ExchangeRate,
  Recurrence,
  SimulationInput,
  SimulationOutput,
  TaxConfig,
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

// ─── Currency Conversion ────────────────────────────────────────────────────────

/**
 * Converts an amount from one currency to another using the exchange rate table.
 * If no rate is found, returns the amount unchanged (same currency or missing rate).
 */
function convertCurrency(
  amount: Decimal,
  from: string,
  to: string,
  exchangeRates: ExchangeRate[],
): Decimal {
  if (from === to) return amount;

  // Direct rate
  const direct = exchangeRates.find((r) => r.from === from && r.to === to);
  if (direct) return amount.times(direct.rate);

  // Inverse rate
  const inverse = exchangeRates.find((r) => r.from === to && r.to === from);
  if (inverse) return amount.div(inverse.rate);

  // No rate found — return as-is (best effort)
  return amount;
}

// ─── Taxation ───────────────────────────────────────────────────────────────────

/**
 * Calculates progressive tax for a given income amount.
 * Applies bracket rates progressively (each bracket only taxes the portion within it).
 */
function calculateProgressiveTax(income: number, taxConfig: TaxConfig): Decimal {
  if (income <= 0) return new Decimal(0);

  let remaining = income;
  let tax = new Decimal(0);
  let previousBound = 0;

  // Sort brackets by upperBound ascending
  const sortedBrackets = [...taxConfig.brackets].sort((a, b) => a.upperBound - b.upperBound);

  for (const bracket of sortedBrackets) {
    const taxableInBracket = Math.min(remaining, bracket.upperBound - previousBound);
    if (taxableInBracket <= 0) break;

    tax = tax.plus(new Decimal(taxableInBracket).times(bracket.rate));
    remaining -= taxableInBracket;
    previousBound = bracket.upperBound;
  }

  // Any remaining income above the highest bracket is taxed at the highest rate
  if (remaining > 0 && sortedBrackets.length > 0) {
    const highestRate = sortedBrackets[sortedBrackets.length - 1].rate;
    tax = tax.plus(new Decimal(remaining).times(highestRate));
  }

  return tax;
}

/**
 * Calculates capital gains tax on realized gains.
 */
function calculateCapitalGainsTax(realizedGains: Decimal, taxConfig: TaxConfig): Decimal {
  if (realizedGains.lte(0)) return new Decimal(0);
  return realizedGains.times(taxConfig.capitalGainsRate);
}

// ─── Day Step Components ────────────────────────────────────────────────────────

function processIncome(state: SimulationState, day: number): Decimal {
  let totalIncome = new Decimal(0);
  for (const stream of state.incomeStreams) {
    if (stream.endDay !== undefined && day > stream.endDay) continue;
    if (isRecurrenceDay(day, stream.recurrence, stream.startDay)) {
      const rawAmount = new Decimal(stream.amount);
      const converted = convertCurrency(
        rawAmount,
        stream.currency,
        state.baseCurrency,
        state.exchangeRates,
      );
      state.balance = state.balance.plus(converted);
      totalIncome = totalIncome.plus(converted);
    }
  }
  return totalIncome;
}

function processExpenses(state: SimulationState, day: number): Decimal {
  let totalExpenses = new Decimal(0);
  for (const expense of state.expenses) {
    if (expense.endDay !== undefined && day > expense.endDay) continue;
    if (isRecurrenceDay(day, expense.recurrence, expense.startDay)) {
      const rawAmount = new Decimal(expense.amount);
      const converted = convertCurrency(
        rawAmount,
        expense.currency,
        state.baseCurrency,
        state.exchangeRates,
      );
      state.balance = state.balance.minus(converted);
      totalExpenses = totalExpenses.plus(converted);
    }
  }
  return totalExpenses;
}

function processLiabilities(state: SimulationState): void {
  for (const liability of state.liabilities) {
    if (liability.principal <= 0) continue;

    // Daily interest accrual using Decimal for precision
    const dailyRate = liability.interestRate / 365;
    const newPrincipal = new Decimal(liability.principal).times(1 + dailyRate);
    liability.principal = newPrincipal.toNumber();

    // Minimum payment deduction (converted to base currency)
    const payment = Math.min(liability.minimumPayment / 30, liability.principal);
    const paymentInBase = convertCurrency(
      new Decimal(payment),
      liability.currency,
      state.baseCurrency,
      state.exchangeRates,
    );
    state.balance = state.balance.minus(paymentInBase);
    liability.principal -= payment;
  }
}

function processAssetValuation(state: SimulationState, rng: DeterministicRNG): void {
  for (const asset of state.assets) {
    if (asset.volatility > 0) {
      const change = rng.gaussian(0, asset.volatility / Math.sqrt(365));
      asset.value = Math.max(0, asset.value * (1 + change));
    }
    if (asset.yieldRate > 0 && !asset.locked) {
      const dailyYield = asset.yieldRate / 365;
      asset.value *= 1 + dailyYield;
    }
    if (asset.locked && asset.lockUntilDay !== undefined && state.day >= asset.lockUntilDay) {
      asset.locked = false;
    }
  }
}

function processAutoLiquidation(state: SimulationState): void {
  if (state.balance.gte(0)) return;

  const liquidatable = state.assets
    .filter((a) => a.type === 'liquid' && !a.locked && a.value > 0)
    .sort((a, b) => a.liquidationPenalty - b.liquidationPenalty);

  for (const asset of liquidatable) {
    if (state.balance.gte(0)) break;
    const assetValueInBase = convertCurrency(
      new Decimal(asset.value),
      asset.currency,
      state.baseCurrency,
      state.exchangeRates,
    );
    const proceeds = assetValueInBase.times(1 - asset.liquidationPenalty);
    state.balance = state.balance.plus(proceeds);
    state.totalRealizedGains = state.totalRealizedGains.plus(proceeds);
    asset.value = 0;
  }
}

function processTaxation(state: SimulationState, dailyIncome: Decimal): Decimal {
  if (!state.taxConfig) return new Decimal(0);

  let totalTax = new Decimal(0);

  // Progressive income tax — annualize daily income for bracket lookup
  if (dailyIncome.gt(0)) {
    const annualizedIncome = dailyIncome.times(365).toNumber();
    const annualTax = calculateProgressiveTax(annualizedIncome, state.taxConfig);
    const dailyTax = annualTax.div(365);
    totalTax = totalTax.plus(dailyTax);
  }

  // Capital gains tax — applied on realized gains
  if (state.totalRealizedGains.gt(0)) {
    const cgTax = calculateCapitalGainsTax(state.totalRealizedGains, state.taxConfig);
    const dailyCGTax = cgTax.div(365);
    totalTax = totalTax.plus(dailyCGTax);
  }

  state.balance = state.balance.minus(totalTax);
  state.totalTaxPaid = state.totalTaxPaid.plus(totalTax);

  return totalTax;
}

function updateCreditScore(state: SimulationState): void {
  const totalDebt = state.liabilities.reduce((s, l) => s + l.principal, 0);
  const balance = state.balance.toNumber();

  const debtRatio = balance > 0 ? totalDebt / balance : totalDebt > 0 ? 2 : 0;
  const punctualityBonus = state.consecutiveDeficitDays === 0 ? 1 : -1;

  const adjustment = (-debtRatio * 0.5 + punctualityBonus * 0.3) * 0.1;
  state.creditScore = Math.max(300, Math.min(850, state.creditScore + adjustment));
}

function updateBehavioralMetrics(state: SimulationState): void {
  state.balanceHistory.push(state.balance.toNumber());

  if (state.balance.lt(0)) {
    state.consecutiveDeficitDays++;
    if (state.consecutiveDeficitDays === 1) {
      state.shockCount++;
      state.shockDays.push(state.day);
    }
    if (state.collapseDay === null && state.consecutiveDeficitDays > 30) {
      state.collapseDay = state.day;
    }
    state.lastDeficitExitDay = null;
    state.lastDeficitExitBalance = null;
  } else {
    if (state.consecutiveDeficitDays > 0) {
      state.recoveryDays++;
      state.lastDeficitExitDay = state.day;
      state.lastDeficitExitBalance = state.balance.toNumber();
    }
    state.consecutiveDeficitDays = 0;

    if (state.lastDeficitExitDay !== null && state.lastDeficitExitBalance !== null) {
      const daysSinceExit = state.day - state.lastDeficitExitDay;
      if (daysSinceExit > 0) {
        const balanceDelta = state.balance.toNumber() - state.lastDeficitExitBalance;
        state.currentRecoverySlope = balanceDelta / daysSinceExit;
      }
    }
  }
}

// ─── Single Day Step ────────────────────────────────────────────────────────────

/**
 * Resolves the component DAG and executes one day of simulation.
 */
function runDay(state: SimulationState, rng: DeterministicRNG, dateStr: string): DailySnapshot {
  const components: DAGNode[] = [
    { id: 'income', dependsOn: [] },
    { id: 'expenses', dependsOn: ['income'] },
    { id: 'liabilities', dependsOn: ['expenses'] },
    { id: 'asset_valuation', dependsOn: [] },
    { id: 'auto_liquidation', dependsOn: ['expenses', 'liabilities'] },
    { id: 'taxation', dependsOn: ['income', 'auto_liquidation'] },
    { id: 'credit_score', dependsOn: ['liabilities', 'auto_liquidation', 'taxation'] },
    { id: 'behavioral', dependsOn: ['credit_score'] },
  ];

  const order = topologicalSort(components);

  let totalIncome = new Decimal(0);
  let totalExpenses = new Decimal(0);
  let taxPaid = new Decimal(0);

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
      case 'taxation':
        taxPaid = processTaxation(state, totalIncome);
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
  snapshot.netCashFlow = totalIncome.minus(totalExpenses).minus(taxPaid).toNumber();
  snapshot.taxPaid = taxPaid.toNumber();

  return snapshot;
}

// ─── Single Simulation Run ──────────────────────────────────────────────────────

/**
 * Runs a single simulation with a specific seed.
 */
function simulateSingleRun(input: SimulationInput, seed: number): SimulationOutput {
  const rng = new DeterministicRNG(seed);
  const startDate = new Date('2026-01-01');

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
    const snapshot = runDay(state, rng, dateStr);
    snapshots.push(snapshot);
  }

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
    seed,
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

    totalTaxPaid: state.totalTaxPaid.toNumber(),
    monteCarloRuns: 1,
  };
}

// ─── Main Simulation Entry Point ────────────────────────────────────────────────

/**
 * Runs the full simulation. If monteCarloRuns > 1, runs multiple seeds
 * and computes statistical P5/P95 from the distribution of final balances.
 *
 * Guarantees: Given identical inputs and seed, produces bit-exact identical output.
 */
export function simulate(input: SimulationInput): SimulationOutput {
  const mcRuns = input.monteCarloRuns ?? 1;

  if (mcRuns <= 1) {
    return simulateSingleRun(input, input.seed);
  }

  // Monte Carlo: run multiple seeds, use primary seed's trajectory,
  // compute P5/P95 from distribution of final balances across runs
  const primaryResult = simulateSingleRun(input, input.seed);
  const finalBalances: number[] = [primaryResult.finalBalance.expected];
  let totalCollapseCount = primaryResult.collapseProbability > 0 ? 1 : 0;

  for (let i = 1; i < mcRuns; i++) {
    const mcSeed = input.seed + i * 7919; // deterministic prime offset
    const mcResult = simulateSingleRun(input, mcSeed);
    finalBalances.push(mcResult.finalBalance.expected);
    if (mcResult.collapseProbability > 0) totalCollapseCount++;
  }

  const sorted = [...finalBalances].sort((a, b) => a - b);
  const p5Idx = Math.floor(sorted.length * 0.05);
  const p95Idx = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
  const avgFinalBalance = finalBalances.reduce((sum, b) => sum + b, 0) / finalBalances.length;

  return {
    ...primaryResult,
    finalBalance: {
      expected: avgFinalBalance,
      p5: sorted[p5Idx] ?? avgFinalBalance,
      p95: sorted[p95Idx] ?? avgFinalBalance,
    },
    collapseProbability: totalCollapseCount / mcRuns,
    monteCarloRuns: mcRuns,
  };
}

// ─── Branch Comparison ──────────────────────────────────────────────────────────

function computeBranchComparison(
  baseline: SimulationOutput,
  branch: SimulationOutput,
): BranchComparison {
  const balanceDelta = branch.finalBalance.expected - baseline.finalBalance.expected;
  const collapseProbDelta = branch.collapseProbability - baseline.collapseProbability;
  const creditScoreDelta = branch.finalCreditScore - baseline.finalCreditScore;
  const navDelta = branch.finalNAV - baseline.finalNAV;

  const vibeOrder = ['collapsed', 'critical', 'strained', 'stable', 'thriving'];
  const vibeImproved = vibeOrder.indexOf(branch.vibeState) > vibeOrder.indexOf(baseline.vibeState);

  const parts: string[] = [];
  if (balanceDelta > 0) parts.push(`Balance +$${balanceDelta.toFixed(0)}`);
  else if (balanceDelta < 0) parts.push(`Balance -$${Math.abs(balanceDelta).toFixed(0)}`);
  if (collapseProbDelta < 0) parts.push(`Collapse risk ${(collapseProbDelta * 100).toFixed(1)}%`);
  else if (collapseProbDelta > 0)
    parts.push(`Collapse risk +${(collapseProbDelta * 100).toFixed(1)}%`);
  if (vibeImproved) parts.push('Vibe improved');

  return {
    balanceDelta,
    collapseProbDelta,
    creditScoreDelta,
    navDelta,
    vibeImproved,
    summary: parts.length > 0 ? parts.join(' | ') : 'No significant change',
  };
}

/**
 * Runs a branching simulation: baseline from start, then a divergent branch
 * from a specific day with modified parameters. Includes comparison metrics.
 */
export function simulateBranch(
  baseInput: SimulationInput,
  branchAtDay: number,
  modifiedInput: Partial<SimulationInput>,
): { baseline: SimulationOutput; branch: SimulationOutput; comparison: BranchComparison } {
  const baseline = simulate(baseInput);

  const branchInput: SimulationInput = {
    ...baseInput,
    ...modifiedInput,
    horizonDays: baseInput.horizonDays - branchAtDay,
    initialBalance: baseline.snapshots[branchAtDay]?.balance ?? baseInput.initialBalance,
  };

  const branch = simulate(branchInput);
  const comparison = computeBranchComparison(baseline, branch);

  return { baseline, branch, comparison };
}
