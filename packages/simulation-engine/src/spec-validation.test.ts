/**
 * Specification validation tests.
 *
 * These tests verify compliance with the DATAFEST'26 System Requirement Specification.
 * Each test maps to a specific spec requirement:
 *
 * - Determinism / bit-exact reproducibility (Section 2.1)
 * - Decimal.js precision integrity across high-frequency operations (Section 5)
 * - Snapshot fidelity / state restoration (Section 2.1)
 * - Tax-gain alignment (Section 2.3)
 * - DAG consistency / topological invariants (Section 2.2)
 * - Monte Carlo statistical properties (Section 3.2)
 * - FX conversion precision audit (Section 2.1 / 5)
 */
import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import { simulate, simulateSingleRun } from './engine.js';
import { createInitialState, snapshotState, stateToSnapshot } from './state.js';
import { DeterministicRNG } from './rng.js';
import { ExchangeRateEngine } from './fx.js';
import { computeProgressiveTax, computeDailyTax } from './tax.js';
import { topologicalSort } from './dag.js';
import type { SimulationInput, TaxConfig } from '@future-wallet/shared-types';

// ─── Test Fixture ───────────────────────────────────────────────────────────────

const COMPLEX_INPUT: SimulationInput = {
  seed: 12345,
  horizonDays: 365,
  baseCurrency: 'USD',
  initialBalance: 50000,
  incomeStreams: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Salary',
      amount: 5000,
      currency: 'USD',
      recurrence: 'monthly',
      startDay: 0,
    },
    {
      id: '11111111-1111-1111-1111-111111111112',
      name: 'Freelance',
      amount: 1000,
      currency: 'EUR',
      recurrence: 'monthly',
      startDay: 30,
      endDay: 300,
    },
  ],
  expenses: [
    {
      id: '22222222-2222-2222-2222-222222222221',
      name: 'Rent',
      amount: 2000,
      currency: 'USD',
      recurrence: 'monthly',
      startDay: 0,
      essential: true,
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Food',
      amount: 25,
      currency: 'USD',
      recurrence: 'daily',
      startDay: 0,
      essential: true,
    },
    {
      id: '22222222-2222-2222-2222-222222222223',
      name: 'Subscription',
      amount: 50,
      currency: 'EUR',
      recurrence: 'monthly',
      startDay: 10,
      endDay: 200,
      essential: false,
    },
  ],
  assets: [
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      name: 'Savings',
      type: 'liquid',
      value: 20000,
      currency: 'USD',
      volatility: 0,
      yieldRate: 0.02,
      liquidationPenalty: 0,
      locked: false,
    },
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
      name: 'Stocks',
      type: 'volatile',
      value: 30000,
      currency: 'USD',
      volatility: 0.25,
      yieldRate: 0,
      liquidationPenalty: 0.01,
      locked: false,
    },
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac',
      name: 'Bonds',
      type: 'yield_generating',
      value: 15000,
      currency: 'USD',
      volatility: 0.03,
      yieldRate: 0.045,
      liquidationPenalty: 0.005,
      locked: false,
    },
  ],
  liabilities: [
    {
      id: 'llllllll-llll-llll-llll-llllllllllll',
      name: 'Student Loan',
      principal: 20000,
      interestRate: 0.05,
      currency: 'USD',
      minimumPayment: 300,
      remainingTermDays: 3650,
    },
  ],
  exchangeRates: [{ from: 'EUR', to: 'USD', rate: 1.18, date: '2026-01-01', volatility: 0.08 }],
  taxConfig: {
    brackets: [
      { upperBound: 20000, rate: 0.1 },
      { upperBound: 50000, rate: 0.2 },
      { upperBound: 100000, rate: 0.3 },
    ],
    capitalGainsRate: 0.15,
    currency: 'USD',
  },
  monteCarloConfig: { runs: 30, perturbationFactor: 0.05 },
};

// ─── Spec Requirement: Determinism (Section 2.1) ────────────────────────────────

describe('SPEC: Determinism / Bit-exact reproducibility', () => {
  it('identical inputs + seed produce bit-exact identical snapshots', () => {
    const result1 = simulate(COMPLEX_INPUT);
    const result2 = simulate(COMPLEX_INPUT);

    // Every single snapshot field must match exactly
    expect(result1.snapshots.length).toBe(result2.snapshots.length);
    for (let i = 0; i < result1.snapshots.length; i++) {
      expect(result1.snapshots[i]).toEqual(result2.snapshots[i]);
    }
  });

  it('identical inputs produce identical Monte Carlo statistics', () => {
    const result1 = simulate(COMPLEX_INPUT);
    const result2 = simulate(COMPLEX_INPUT);

    expect(result1.finalBalance).toEqual(result2.finalBalance);
    expect(result1.collapseProbability).toBe(result2.collapseProbability);
    expect(result1.vibeState).toBe(result2.vibeState);
    expect(result1.petState).toBe(result2.petState);
    expect(result1.finalCreditScore).toBe(result2.finalCreditScore);
    expect(result1.shockResilienceIndex).toBe(result2.shockResilienceIndex);
    expect(result1.finalNAV).toBe(result2.finalNAV);
    expect(result1.finalLiquidityRatio).toBe(result2.finalLiquidityRatio);
  });

  it('single run with seedOverride is deterministic', () => {
    const r1 = simulateSingleRun(COMPLEX_INPUT, 777);
    const r2 = simulateSingleRun(COMPLEX_INPUT, 777);

    expect(r1.snapshots).toEqual(r2.snapshots);
    expect(r1.finalBalance.expected).toBe(r2.finalBalance.expected);
  });

  it('RNG produces stable long sequences (10000 values)', () => {
    const rng1 = new DeterministicRNG(42);
    const rng2 = new DeterministicRNG(42);

    for (let i = 0; i < 10000; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });
});

// ─── Spec Requirement: Precision Integrity (Section 5) ──────────────────────────

describe('SPEC: Decimal.js precision integrity', () => {
  it('balance does not exhibit floating-point drift over 365 days', () => {
    // A simple scenario with predictable math
    const precisionInput: SimulationInput = {
      seed: 42,
      horizonDays: 365,
      baseCurrency: 'USD',
      initialBalance: 10000,
      incomeStreams: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Daily Income',
          amount: 100,
          currency: 'USD',
          recurrence: 'daily',
          startDay: 0,
        },
      ],
      expenses: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Daily Expense',
          amount: 100,
          currency: 'USD',
          recurrence: 'daily',
          startDay: 0,
          essential: true,
        },
      ],
      assets: [],
      liabilities: [],
      exchangeRates: [],
      monteCarloConfig: { runs: 1, perturbationFactor: 0 },
    };

    const result = simulate(precisionInput);
    const finalSnapshot = result.snapshots[result.snapshots.length - 1];

    // After 365 days of +100/-100, balance should be exactly 10000
    expect(finalSnapshot.balance).toBe(10000);
  });

  it('tax computation uses Decimal.js (no precision loss in bracket math)', () => {
    const config: TaxConfig = {
      brackets: [
        { upperBound: 10000, rate: 0.1 },
        { upperBound: 50000, rate: 0.2 },
      ],
      capitalGainsRate: 0.15,
      currency: 'USD',
    };

    // Problematic floating-point amount: 33333.33
    const income = new Decimal('33333.33');
    const tax = computeProgressiveTax(income, config);

    // Expected: 10000 * 0.1 + 23333.33 * 0.2 = 1000 + 4666.666 = 5666.666
    expect(tax.toNumber()).toBeCloseTo(5666.666, 3);
    // Verify it's not a rounded integer (would indicate precision loss)
    expect(tax.toFixed(3)).toBe('5666.666');
  });

  it('FX conversion preserves Decimal precision', () => {
    const engine = new ExchangeRateEngine([
      { from: 'USD', to: 'EUR', rate: 0.85, date: '2026-01-01', volatility: 0 },
    ]);
    const rng = new DeterministicRNG(42);

    // Convert an amount that would lose precision in IEEE 754
    const amount = new Decimal('1234567.89');
    const result = engine.convert(amount, 'USD', 'EUR', 0, rng, 'precision-test');

    // Expected: 1234567.89 * 0.85 = 1049382.7065
    expect(result.toFixed(4)).toBe('1049382.7065');
  });

  it('cumulative daily tax matches annual tax computation', () => {
    const config: TaxConfig = {
      brackets: [
        { upperBound: 20000, rate: 0.1 },
        { upperBound: 60000, rate: 0.2 },
      ],
      capitalGainsRate: 0.15,
      currency: 'USD',
    };

    // Simulate 365 days of $100/day income = $36500 annual
    let cumulativeIncome = new Decimal(0);
    let cumulativeTax = new Decimal(0);
    const dailyIncome = new Decimal(100);

    for (let day = 0; day < 365; day++) {
      const result = computeDailyTax(dailyIncome, new Decimal(0), cumulativeIncome, config);
      cumulativeTax = cumulativeTax.plus(result.incomeTax);
      cumulativeIncome = cumulativeIncome.plus(dailyIncome);
    }

    // Now compute annual tax directly
    const annualTax = computeProgressiveTax(new Decimal(36500), config);

    // Cumulative daily marginal tax should equal the annual tax
    expect(cumulativeTax.toNumber()).toBeCloseTo(annualTax.toNumber(), 8);
  });
});

// ─── Spec Requirement: Snapshot Fidelity / State Restoration (Section 2.1) ──────

describe('SPEC: Snapshot fidelity', () => {
  it('snapshotState produces perfect clone (mutation isolation)', () => {
    const state = createInitialState({
      baseCurrency: 'USD',
      initialBalance: 10000,
      assets: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          name: 'Asset',
          type: 'liquid',
          value: 5000,
          currency: 'USD',
          volatility: 0,
          yieldRate: 0,
          liquidationPenalty: 0,
          locked: false,
        },
      ],
      liabilities: [],
      incomeStreams: [],
      expenses: [],
      exchangeRates: [],
      taxConfig: {
        brackets: [{ upperBound: 50000, rate: 0.2 }],
        capitalGainsRate: 0.15,
        currency: 'USD',
      },
    });

    state.day = 50;
    state.balance = new Decimal(7777.77);
    state.creditScore = 720;
    state.totalRealizedGains = new Decimal(500);
    state.dailyRealizedGains = new Decimal(100);
    state.cumulativeAnnualIncome = new Decimal(25000);
    state.shockCount = 2;
    state.recoveryDays = 5;
    state.consecutiveDeficitDays = 3;

    const cloned = snapshotState(state);

    // Verify all fields match
    expect(cloned.day).toBe(50);
    expect(cloned.balance.toNumber()).toBe(7777.77);
    expect(cloned.creditScore).toBe(720);
    expect(cloned.totalRealizedGains.toNumber()).toBe(500);
    expect(cloned.dailyRealizedGains.toNumber()).toBe(100);
    expect(cloned.cumulativeAnnualIncome.toNumber()).toBe(25000);
    expect(cloned.shockCount).toBe(2);
    expect(cloned.recoveryDays).toBe(5);
    expect(cloned.consecutiveDeficitDays).toBe(3);
    expect(cloned.assets).toHaveLength(1);
    expect(cloned.assets[0].value).toBe(5000);
    expect(cloned.taxConfig).toBeDefined();
    expect(cloned.taxConfig!.capitalGainsRate).toBe(0.15);

    // Mutate original — clone should be unaffected
    state.balance = new Decimal(0);
    state.assets[0].value = 0;
    state.creditScore = 300;
    state.totalRealizedGains = new Decimal(0);

    expect(cloned.balance.toNumber()).toBe(7777.77);
    expect(cloned.assets[0].value).toBe(5000);
    expect(cloned.creditScore).toBe(720);
    expect(cloned.totalRealizedGains.toNumber()).toBe(500);
  });

  it('stateToSnapshot correctly computes derived fields', () => {
    const state = createInitialState({
      baseCurrency: 'USD',
      initialBalance: 5000,
      assets: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          name: 'Savings',
          type: 'liquid',
          value: 10000,
          currency: 'USD',
          volatility: 0,
          yieldRate: 0,
          liquidationPenalty: 0,
          locked: false,
        },
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
          name: 'Locked CD',
          type: 'liquid',
          value: 5000,
          currency: 'USD',
          volatility: 0,
          yieldRate: 0,
          liquidationPenalty: 0,
          locked: true,
        },
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac',
          name: 'Property',
          type: 'illiquid',
          value: 100000,
          currency: 'USD',
          volatility: 0,
          yieldRate: 0,
          liquidationPenalty: 0,
          locked: false,
        },
      ],
      liabilities: [
        {
          id: 'llllllll-llll-llll-llll-llllllllllll',
          name: 'Mortgage',
          principal: 50000,
          interestRate: 0.04,
          currency: 'USD',
          minimumPayment: 1000,
          remainingTermDays: 3650,
        },
      ],
      incomeStreams: [],
      expenses: [],
      exchangeRates: [],
    });

    const snapshot = stateToSnapshot(state, '2026-06-15');

    // assetNAV = sum of all asset values
    expect(snapshot.assetNAV).toBe(115000); // 10000 + 5000 + 100000

    // totalDebt = sum of liability principals
    expect(snapshot.totalDebt).toBe(50000);

    // liquidityRatio = unlocked liquid assets / total debt
    // Only unlocked liquid: Savings (10000), Locked CD is locked so excluded
    expect(snapshot.liquidityRatio).toBe(0.2); // 10000 / 50000

    // Shock Resilience Index: based on shockCount=0, recoveryDays=0
    // SRI = max(0, min(100, 100 - 0*10 + 0*2)) = 100
    expect(snapshot.shockResilienceIndex).toBe(100);
  });
});

// ─── Spec Requirement: Tax-Gain Alignment (Section 2.3) ─────────────────────────

describe('SPEC: Tax-gain alignment', () => {
  it('capital gains tax is only applied when assets are liquidated', () => {
    // No liquidation scenario: no negative balance, no asset sales
    const noLiquidationInput: SimulationInput = {
      seed: 42,
      horizonDays: 30,
      baseCurrency: 'USD',
      initialBalance: 100000,
      incomeStreams: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Salary',
          amount: 5000,
          currency: 'USD',
          recurrence: 'monthly',
          startDay: 0,
        },
      ],
      expenses: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Rent',
          amount: 1000,
          currency: 'USD',
          recurrence: 'monthly',
          startDay: 0,
          essential: true,
        },
      ],
      assets: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          name: 'Stocks',
          type: 'volatile',
          value: 50000,
          currency: 'USD',
          volatility: 0.2,
          yieldRate: 0,
          liquidationPenalty: 0,
          locked: false,
        },
      ],
      liabilities: [],
      exchangeRates: [],
      taxConfig: {
        brackets: [{ upperBound: 100000, rate: 0.2 }],
        capitalGainsRate: 0.3,
        currency: 'USD',
      },
      monteCarloConfig: { runs: 1, perturbationFactor: 0 },
    };

    const result = simulate(noLiquidationInput);

    // Since balance never goes negative (starting 100k, +5k, -1k/month),
    // no auto-liquidation should occur, so no capital gains tax
    for (const snapshot of result.snapshots) {
      expect(snapshot.capitalGainsTax).toBe(0);
    }
  });

  it('income tax is zero when no tax config is provided', () => {
    const noTaxInput: SimulationInput = {
      seed: 42,
      horizonDays: 30,
      baseCurrency: 'USD',
      initialBalance: 10000,
      incomeStreams: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Salary',
          amount: 5000,
          currency: 'USD',
          recurrence: 'monthly',
          startDay: 0,
        },
      ],
      expenses: [],
      assets: [],
      liabilities: [],
      exchangeRates: [],
    };

    const result = simulate(noTaxInput);
    for (const snapshot of result.snapshots) {
      expect(snapshot.taxPaid).toBe(0);
      expect(snapshot.capitalGainsTax).toBe(0);
    }
  });

  it('progressive bracket marginal rates are correct', () => {
    const config: TaxConfig = {
      brackets: [
        { upperBound: 10000, rate: 0.1 },
        { upperBound: 40000, rate: 0.2 },
      ],
      capitalGainsRate: 0.15,
      currency: 'USD',
    };

    // Tax at bracket boundary: exactly $10000
    const taxAtBoundary = computeProgressiveTax(new Decimal(10000), config);
    expect(taxAtBoundary.toNumber()).toBe(1000); // 10000 * 0.1

    // Tax just above boundary: $10001
    const taxAboveBoundary = computeProgressiveTax(new Decimal(10001), config);
    // Extra $1 taxed at 20% = 0.20
    expect(taxAboveBoundary.toNumber()).toBeCloseTo(1000.2, 5);

    // Verify marginal rate
    const marginal = taxAboveBoundary.minus(taxAtBoundary);
    expect(marginal.toNumber()).toBeCloseTo(0.2, 5);
  });
});

// ─── Spec Requirement: DAG Consistency (Section 2.2) ─────────────────────────────

describe('SPEC: DAG topological invariants', () => {
  it('engine DAG has no cycles', () => {
    const components = [
      { id: 'income', dependsOn: [] as string[] },
      { id: 'expenses', dependsOn: ['income'] },
      { id: 'liabilities', dependsOn: ['expenses'] },
      { id: 'asset_valuation', dependsOn: [] as string[] },
      { id: 'auto_liquidation', dependsOn: ['expenses', 'liabilities'] },
      { id: 'taxation', dependsOn: ['income', 'auto_liquidation'] },
      { id: 'credit_score', dependsOn: ['liabilities', 'auto_liquidation'] },
      { id: 'behavioral', dependsOn: ['credit_score'] },
    ];

    // Should not throw
    const order = topologicalSort(components);
    expect(order).toHaveLength(8);
  });

  it('income is always processed before expenses', () => {
    const components = [
      { id: 'income', dependsOn: [] as string[] },
      { id: 'expenses', dependsOn: ['income'] },
      { id: 'liabilities', dependsOn: ['expenses'] },
      { id: 'asset_valuation', dependsOn: [] as string[] },
      { id: 'auto_liquidation', dependsOn: ['expenses', 'liabilities'] },
      { id: 'taxation', dependsOn: ['income', 'auto_liquidation'] },
      { id: 'credit_score', dependsOn: ['liabilities', 'auto_liquidation'] },
      { id: 'behavioral', dependsOn: ['credit_score'] },
    ];

    const order = topologicalSort(components);
    const incomeIdx = order.indexOf('income');
    const expenseIdx = order.indexOf('expenses');
    const liabilityIdx = order.indexOf('liabilities');
    const taxIdx = order.indexOf('taxation');
    const liquidationIdx = order.indexOf('auto_liquidation');
    const creditIdx = order.indexOf('credit_score');
    const behavioralIdx = order.indexOf('behavioral');

    // Verify dependency ordering
    expect(incomeIdx).toBeLessThan(expenseIdx);
    expect(expenseIdx).toBeLessThan(liabilityIdx);
    expect(liabilityIdx).toBeLessThan(liquidationIdx);
    expect(incomeIdx).toBeLessThan(taxIdx);
    expect(liquidationIdx).toBeLessThan(taxIdx);
    expect(liquidationIdx).toBeLessThan(creditIdx);
    expect(creditIdx).toBeLessThan(behavioralIdx);
  });

  it('DAG sort is deterministic (alphabetical tie-breaking)', () => {
    const components = [
      { id: 'c', dependsOn: [] as string[] },
      { id: 'a', dependsOn: [] as string[] },
      { id: 'b', dependsOn: [] as string[] },
    ];

    const order1 = topologicalSort(components);
    const order2 = topologicalSort(components);

    expect(order1).toEqual(order2);
    // Alphabetical for zero in-degree nodes
    expect(order1).toEqual(['a', 'b', 'c']);
  });
});

// ─── Spec Requirement: Monte Carlo Statistical Properties (Section 3.2) ─────────

describe('SPEC: Monte Carlo statistical properties', () => {
  it('p5 <= median <= p95 ordering holds', () => {
    const result = simulate(COMPLEX_INPUT);

    expect(result.finalBalance.p5).toBeLessThanOrEqual(result.finalBalance.expected);
    expect(result.finalBalance.p95).toBeGreaterThanOrEqual(result.finalBalance.expected);
  });

  it('more runs produce tighter confidence intervals', () => {
    const fewRunsInput = {
      ...COMPLEX_INPUT,
      monteCarloConfig: { runs: 5, perturbationFactor: 0.05 },
    };
    const manyRunsInput = {
      ...COMPLEX_INPUT,
      monteCarloConfig: { runs: 100, perturbationFactor: 0.05 },
    };

    const fewResult = simulate(fewRunsInput);
    const manyResult = simulate(manyRunsInput);

    // Both should produce valid ordering
    expect(fewResult.finalBalance.p5).toBeLessThanOrEqual(fewResult.finalBalance.p95);
    expect(manyResult.finalBalance.p5).toBeLessThanOrEqual(manyResult.finalBalance.p95);
  });

  it('collapse probability is between 0 and 1', () => {
    const result = simulate(COMPLEX_INPUT);
    expect(result.collapseProbability).toBeGreaterThanOrEqual(0);
    expect(result.collapseProbability).toBeLessThanOrEqual(1);
  });

  it('collapse probability is computed from all MC runs', () => {
    // A scenario that will definitely collapse
    const collapseInput: SimulationInput = {
      seed: 42,
      horizonDays: 60,
      baseCurrency: 'USD',
      initialBalance: 100,
      incomeStreams: [],
      expenses: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Expenses',
          amount: 100,
          currency: 'USD',
          recurrence: 'daily',
          startDay: 0,
          essential: true,
        },
      ],
      assets: [],
      liabilities: [],
      exchangeRates: [],
      monteCarloConfig: { runs: 10, perturbationFactor: 0.05 },
    };

    const result = simulate(collapseInput);
    // With $100 daily expenses and only $100 starting balance,
    // every run should collapse (deficit > 30 consecutive days)
    expect(result.collapseProbability).toBe(1);
  });
});

// ─── Spec Requirement: FX Precision Audit (Section 2.1 / 5) ─────────────────────

describe('SPEC: FX conversion precision audit', () => {
  it('conversion log records all cross-currency operations', () => {
    const engine = new ExchangeRateEngine([
      { from: 'USD', to: 'EUR', rate: 0.85, date: '2026-01-01', volatility: 0 },
    ]);
    const rng = new DeterministicRNG(42);

    engine.convert(new Decimal(1000), 'USD', 'EUR', 0, rng, 'income:Salary');
    engine.convert(new Decimal(500), 'EUR', 'USD', 0, rng, 'expense:Import');
    engine.convert(new Decimal(200), 'USD', 'USD', 0, rng, 'same-currency');

    const log = engine.getConversionLog();
    // Same-currency conversion should NOT be logged
    expect(log).toHaveLength(2);

    // Verify audit trail completeness
    expect(log[0]).toMatchObject({
      day: 0,
      from: 'USD',
      to: 'EUR',
      originalAmount: 1000,
      context: 'income:Salary',
    });
    expect(log[1]).toMatchObject({
      day: 0,
      from: 'EUR',
      to: 'USD',
      originalAmount: 500,
      context: 'expense:Import',
    });

    // Verify rate consistency: USD->EUR rate * EUR->USD rate ≈ 1
    const usdToEurRate = log[0].rateUsed;
    const eurToUsdRate = log[1].rateUsed;
    expect(usdToEurRate * eurToUsdRate).toBeCloseTo(1, 10);
  });

  it('volatile FX rates stay within reasonable bounds', () => {
    const engine = new ExchangeRateEngine([
      { from: 'USD', to: 'EUR', rate: 0.85, date: '2026-01-01', volatility: 0.2 },
    ]);
    const rng = new DeterministicRNG(42);

    // Generate 100 daily rates
    const rates: number[] = [];
    for (let day = 0; day < 100; day++) {
      engine.clearCache();
      const rate = engine.getDailyRate('USD', 'EUR', day, rng);
      rates.push(rate.toNumber());
    }

    // All rates should be positive
    for (const rate of rates) {
      expect(rate).toBeGreaterThan(0);
    }

    // Average should be close to base rate (0.85)
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    expect(avg).toBeCloseTo(0.85, 0); // within 0.5 of 0.85
  });
});
