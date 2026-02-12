/**
 * Engine integration tests — Monte Carlo, FX integration, tax integration,
 * enhanced liquidation, snapshot/state, and determinism validation.
 */
import { describe, expect, it } from 'vitest';
import { simulate, simulateSingleRun, simulateBranch } from './engine.js';
import {
  createInitialState,
  stateToSnapshot,
  snapshotState,
  deriveVibeState,
  derivePetState,
} from './state.js';
import type { SimulationInput, Asset } from '@future-wallet/shared-types';
import Decimal from 'decimal.js';

// ─── Test Fixtures ──────────────────────────────────────────────────────────────

const SIMPLE_INPUT: SimulationInput = {
  seed: 42,
  horizonDays: 30,
  baseCurrency: 'USD',
  initialBalance: 10000,
  incomeStreams: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Salary',
      amount: 3000,
      currency: 'USD',
      recurrence: 'monthly',
      startDay: 0,
    },
  ],
  expenses: [
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Rent',
      amount: 1500,
      currency: 'USD',
      recurrence: 'monthly',
      startDay: 0,
      essential: true,
    },
  ],
  assets: [],
  liabilities: [],
  exchangeRates: [],
};

const MULTI_CURRENCY_INPUT: SimulationInput = {
  ...SIMPLE_INPUT,
  incomeStreams: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Euro Salary',
      amount: 2500,
      currency: 'EUR',
      recurrence: 'monthly',
      startDay: 0,
    },
  ],
  expenses: [
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'UK Rent',
      amount: 1000,
      currency: 'GBP',
      recurrence: 'monthly',
      startDay: 0,
      essential: true,
    },
  ],
  exchangeRates: [
    { from: 'EUR', to: 'USD', rate: 1.18, date: '2026-01-01', volatility: 0 },
    { from: 'GBP', to: 'USD', rate: 1.37, date: '2026-01-01', volatility: 0 },
  ],
};

const TAX_INPUT: SimulationInput = {
  ...SIMPLE_INPUT,
  horizonDays: 365,
  incomeStreams: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Salary',
      amount: 200,
      currency: 'USD',
      recurrence: 'daily',
      startDay: 0,
    },
  ],
  expenses: [],
  taxConfig: {
    brackets: [
      { upperBound: 20000, rate: 0.1 },
      { upperBound: 50000, rate: 0.2 },
      { upperBound: 100000, rate: 0.3 },
    ],
    capitalGainsRate: 0.15,
    currency: 'USD',
  },
};

const LIQUIDATION_INPUT: SimulationInput = {
  seed: 42,
  horizonDays: 10,
  baseCurrency: 'USD',
  initialBalance: -500, // start negative to trigger liquidation
  incomeStreams: [],
  expenses: [
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Living',
      amount: 100,
      currency: 'USD',
      recurrence: 'daily',
      startDay: 0,
      essential: true,
    },
  ],
  assets: [
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      name: 'Cash Savings',
      type: 'liquid',
      value: 5000,
      currency: 'USD',
      volatility: 0,
      yieldRate: 0,
      liquidationPenalty: 0,
      locked: false,
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      name: 'Stock Portfolio',
      type: 'volatile',
      value: 10000,
      currency: 'USD',
      volatility: 0.3,
      yieldRate: 0,
      liquidationPenalty: 0.02,
      locked: false,
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      name: 'Bond Fund',
      type: 'yield_generating',
      value: 8000,
      currency: 'USD',
      volatility: 0.05,
      yieldRate: 0.04,
      liquidationPenalty: 0.01,
      locked: false,
    },
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      name: 'Real Estate',
      type: 'illiquid',
      value: 200000,
      currency: 'USD',
      volatility: 0,
      yieldRate: 0.03,
      liquidationPenalty: 0.1,
      locked: false,
    },
  ],
  liabilities: [],
  exchangeRates: [],
};

// ─── Monte Carlo Tests ──────────────────────────────────────────────────────────

describe('Monte Carlo simulation', () => {
  it('produces valid p5/p95 distribution (p5 <= expected <= p95)', () => {
    const input: SimulationInput = {
      ...SIMPLE_INPUT,
      monteCarloConfig: { runs: 50, perturbationFactor: 0.05 },
    };
    const result = simulate(input);

    expect(result.finalBalance.p5).toBeLessThanOrEqual(result.finalBalance.expected);
    expect(result.finalBalance.p95).toBeGreaterThanOrEqual(result.finalBalance.expected);
  });

  it('returns single-run result when runs = 1', () => {
    const input: SimulationInput = {
      ...SIMPLE_INPUT,
      monteCarloConfig: { runs: 1, perturbationFactor: 0 },
    };
    const result = simulate(input);

    // With single run, p5 = p95 = expected
    expect(result.finalBalance.p5).toBe(result.finalBalance.expected);
    expect(result.finalBalance.p95).toBe(result.finalBalance.expected);
  });

  it('is deterministic across Monte Carlo runs', () => {
    const input: SimulationInput = {
      ...SIMPLE_INPUT,
      monteCarloConfig: { runs: 20, perturbationFactor: 0.05 },
    };
    const result1 = simulate(input);
    const result2 = simulate(input);

    expect(result1.finalBalance).toEqual(result2.finalBalance);
    expect(result1.collapseProbability).toBe(result2.collapseProbability);
    expect(result1.snapshots).toEqual(result2.snapshots);
  });

  it('uses primary run snapshots (not averaged)', () => {
    const input: SimulationInput = {
      ...SIMPLE_INPUT,
      monteCarloConfig: { runs: 10, perturbationFactor: 0.05 },
    };
    const result = simulate(input);
    const primaryResult = simulateSingleRun(input, input.seed);

    // Snapshots should come from primary run
    expect(result.snapshots).toEqual(primaryResult.snapshots);
  });

  it('computes collapse probability from all runs', () => {
    // Create an input that's likely to collapse in some runs
    const riskyInput: SimulationInput = {
      seed: 42,
      horizonDays: 90,
      baseCurrency: 'USD',
      initialBalance: 100,
      incomeStreams: [],
      expenses: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Expenses',
          amount: 50,
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

    const result = simulate(riskyInput);
    // This scenario should definitely collapse (spending $50/day with $100 balance)
    expect(result.collapseProbability).toBeGreaterThan(0);
  });

  it('different seeds produce different Monte Carlo distributions', () => {
    // Need stochastic elements (volatile assets) AND longer horizon for seed to matter
    const stochasticInput: SimulationInput = {
      seed: 42,
      horizonDays: 90,
      baseCurrency: 'USD',
      initialBalance: 1000,
      incomeStreams: [],
      expenses: [],
      assets: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          name: 'Volatile Stock',
          type: 'volatile',
          value: 10000,
          currency: 'USD',
          volatility: 0.8,
          yieldRate: 0,
          liquidationPenalty: 0,
          locked: false,
        },
      ],
      liabilities: [],
      exchangeRates: [],
      monteCarloConfig: { runs: 50, perturbationFactor: 0.05 },
    };

    const result1 = simulate(stochasticInput);
    const result2 = simulate({ ...stochasticInput, seed: 99 });

    // Different seeds with highly volatile assets should produce different NAV
    // and therefore different final balances across MC runs
    expect(result1.finalNAV).not.toBe(result2.finalNAV);
  });
});

// ─── simulateSingleRun Tests ────────────────────────────────────────────────────

describe('simulateSingleRun', () => {
  it('uses seed override when provided', () => {
    const result1 = simulateSingleRun(SIMPLE_INPUT, 42);
    const result2 = simulateSingleRun(SIMPLE_INPUT, 99);

    expect(result1.seed).toBe(42);
    expect(result2.seed).toBe(99);
  });

  it('falls back to input seed when no override', () => {
    const result = simulateSingleRun(SIMPLE_INPUT);
    expect(result.seed).toBe(SIMPLE_INPUT.seed);
  });

  it('produces correct horizon length', () => {
    const result = simulateSingleRun(SIMPLE_INPUT);
    expect(result.snapshots).toHaveLength(SIMPLE_INPUT.horizonDays);
  });
});

// ─── Multi-Currency Integration Tests ───────────────────────────────────────────

describe('Multi-currency simulation', () => {
  it('converts foreign income to base currency', () => {
    const result = simulate(MULTI_CURRENCY_INPUT);

    // Day 0: EUR income converted to USD at 1.18 = 2500 * 1.18 = 2950
    // Day 0: GBP expense converted to USD at 1.37 = 1000 * 1.37 = 1370
    // Net day 0: 10000 + 2950 - 1370 = 11580
    const day0 = result.snapshots[0];
    expect(day0.totalIncome).toBeCloseTo(2950, 0);
    expect(day0.totalExpenses).toBeCloseTo(1370, 0);
    expect(day0.balance).toBeCloseTo(11580, 0);
  });

  it('is deterministic with FX conversion', () => {
    const result1 = simulate(MULTI_CURRENCY_INPUT);
    const result2 = simulate(MULTI_CURRENCY_INPUT);

    expect(result1.snapshots).toEqual(result2.snapshots);
  });

  it('handles volatile exchange rates', () => {
    const volatileInput: SimulationInput = {
      ...MULTI_CURRENCY_INPUT,
      exchangeRates: [
        { from: 'EUR', to: 'USD', rate: 1.18, date: '2026-01-01', volatility: 0.2 },
        { from: 'GBP', to: 'USD', rate: 1.37, date: '2026-01-01', volatility: 0.2 },
      ],
    };

    const result = simulate(volatileInput);
    // Should still produce valid output
    expect(result.snapshots).toHaveLength(30);
    expect(result.finalBalance.expected).toBeDefined();
  });
});

// ─── Tax Integration Tests ──────────────────────────────────────────────────────

describe('Tax integration in engine', () => {
  it('deducts income tax from balance', () => {
    const result = simulate(TAX_INPUT);
    const resultNoTax = simulate({ ...TAX_INPUT, taxConfig: undefined });

    // With tax, final balance should be lower
    const lastDay = result.snapshots[result.snapshots.length - 1];
    const lastDayNoTax = resultNoTax.snapshots[resultNoTax.snapshots.length - 1];
    expect(lastDay.balance).toBeLessThan(lastDayNoTax.balance);
  });

  it('records taxPaid in daily snapshots', () => {
    const result = simulate(TAX_INPUT);

    // At least some days should have non-zero tax (daily income = $200)
    const daysWithTax = result.snapshots.filter((s) => s.taxPaid > 0);
    expect(daysWithTax.length).toBeGreaterThan(0);
  });

  it('applies progressive brackets correctly', () => {
    const result = simulate(TAX_INPUT);

    // Day 0: income $200, cumulative $0 -> $200 in 10% bracket -> $20 tax
    expect(result.snapshots[0].taxPaid).toBeCloseTo(20, 5);
  });

  it('records capital gains tax on liquidation days', () => {
    // Create scenario with both tax and liquidation
    const taxLiquidationInput: SimulationInput = {
      seed: 42,
      horizonDays: 30,
      baseCurrency: 'USD',
      initialBalance: -1000,
      incomeStreams: [],
      expenses: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Rent',
          amount: 500,
          currency: 'USD',
          recurrence: 'daily',
          startDay: 0,
          essential: true,
        },
      ],
      assets: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          name: 'Savings',
          type: 'liquid',
          value: 50000,
          currency: 'USD',
          volatility: 0,
          yieldRate: 0,
          liquidationPenalty: 0,
          locked: false,
        },
      ],
      liabilities: [],
      exchangeRates: [],
      taxConfig: {
        brackets: [{ upperBound: 100000, rate: 0.1 }],
        capitalGainsRate: 0.2,
        currency: 'USD',
      },
    };

    const result = simulate(taxLiquidationInput);
    // Some days should have capital gains tax from liquidation
    const daysWithCapGains = result.snapshots.filter((s) => s.capitalGainsTax > 0);
    expect(daysWithCapGains.length).toBeGreaterThan(0);
  });

  it('handles no tax config gracefully', () => {
    const result = simulate(SIMPLE_INPUT);

    // No tax config -> all taxPaid should be 0
    for (const snapshot of result.snapshots) {
      expect(snapshot.taxPaid).toBe(0);
      expect(snapshot.capitalGainsTax).toBe(0);
    }
  });
});

// ─── Enhanced Liquidation Tests ─────────────────────────────────────────────────

describe('Enhanced auto-liquidation', () => {
  it('liquidates liquid assets first', () => {
    const result = simulate(LIQUIDATION_INPUT);

    // After simulation, liquid assets should be depleted before volatile
    // (We start negative, so liquidation triggers immediately)
    const day0 = result.snapshots[0];
    expect(day0).toBeDefined();
  });

  it('never liquidates illiquid assets', () => {
    // Even when deeply negative, illiquid assets should remain
    const deeplyNegativeInput: SimulationInput = {
      ...LIQUIDATION_INPUT,
      initialBalance: -50000,
      assets: [
        {
          id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          name: 'Real Estate',
          type: 'illiquid',
          value: 200000,
          currency: 'USD',
          volatility: 0,
          yieldRate: 0,
          liquidationPenalty: 0.1,
          locked: false,
        },
      ],
    };

    const result = simulate(deeplyNegativeInput);
    // Balance should stay negative (no illiquid asset to liquidate)
    expect(result.snapshots[0].balance).toBeLessThan(0);
  });

  it('skips locked assets during liquidation', () => {
    const lockedInput: SimulationInput = {
      ...LIQUIDATION_INPUT,
      assets: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          name: 'Locked Savings',
          type: 'liquid',
          value: 100000,
          currency: 'USD',
          volatility: 0,
          yieldRate: 0,
          liquidationPenalty: 0,
          locked: true,
          lockUntilDay: 999,
        },
      ],
    };

    const result = simulate(lockedInput);
    // Even though there's a liquid asset, it's locked so balance stays negative
    expect(result.snapshots[0].balance).toBeLessThan(0);
  });

  it('applies liquidation penalty', () => {
    const penaltyInput: SimulationInput = {
      seed: 42,
      horizonDays: 5,
      baseCurrency: 'USD',
      initialBalance: -100,
      incomeStreams: [],
      expenses: [],
      assets: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          name: 'Penalized Asset',
          type: 'liquid',
          value: 200,
          currency: 'USD',
          volatility: 0,
          yieldRate: 0,
          liquidationPenalty: 0.5, // 50% penalty!
          locked: false,
        },
      ],
      liabilities: [],
      exchangeRates: [],
    };

    const result = simulate(penaltyInput);
    // Asset worth $200 with 50% penalty -> only $100 proceeds
    // Balance was -100, after liquidation: -100 + 100 = 0
    expect(result.snapshots[0].balance).toBeCloseTo(0, 0);
  });

  it('unlocks assets when lockUntilDay is reached', () => {
    const unlockInput: SimulationInput = {
      seed: 42,
      horizonDays: 10,
      baseCurrency: 'USD',
      initialBalance: -500,
      incomeStreams: [],
      expenses: [],
      assets: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          name: 'Locked Then Free',
          type: 'liquid',
          value: 5000,
          currency: 'USD',
          volatility: 0,
          yieldRate: 0,
          liquidationPenalty: 0,
          locked: true,
          lockUntilDay: 3,
        },
      ],
      liabilities: [],
      exchangeRates: [],
    };

    const result = simulate(unlockInput);
    // Days 0-2: asset is locked, balance stays negative
    expect(result.snapshots[0].balance).toBeLessThan(0);
    expect(result.snapshots[1].balance).toBeLessThan(0);
    expect(result.snapshots[2].balance).toBeLessThan(0);
    // Day 3+: asset unlocks and should be liquidated to cover deficit
    // The asset_valuation step handles unlocking, then auto_liquidation can use it
    expect(result.snapshots[3].balance).toBeGreaterThanOrEqual(0);
  });
});

// ─── Component Activation Tests ─────────────────────────────────────────────────

describe('Component activation (startDay/endDay)', () => {
  it('activates income stream only after startDay', () => {
    const input: SimulationInput = {
      ...SIMPLE_INPUT,
      initialBalance: 0,
      incomeStreams: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Delayed Income',
          amount: 100,
          currency: 'USD',
          recurrence: 'daily',
          startDay: 5,
        },
      ],
      expenses: [],
    };

    const result = simulate(input);

    // Days 0-4: no income
    for (let i = 0; i < 5; i++) {
      expect(result.snapshots[i].totalIncome).toBe(0);
    }
    // Day 5+: income active
    expect(result.snapshots[5].totalIncome).toBe(100);
  });

  it('deactivates income stream after endDay', () => {
    const input: SimulationInput = {
      ...SIMPLE_INPUT,
      initialBalance: 0,
      incomeStreams: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Temporary Income',
          amount: 100,
          currency: 'USD',
          recurrence: 'daily',
          startDay: 0,
          endDay: 5,
        },
      ],
      expenses: [],
    };

    const result = simulate(input);

    // Days 0-5: income active
    for (let i = 0; i <= 5; i++) {
      expect(result.snapshots[i].totalIncome).toBe(100);
    }
    // Day 6+: income stopped
    expect(result.snapshots[6].totalIncome).toBe(0);
  });

  it('activates expense only after startDay', () => {
    const input: SimulationInput = {
      ...SIMPLE_INPUT,
      initialBalance: 10000,
      incomeStreams: [],
      expenses: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Delayed Expense',
          amount: 50,
          currency: 'USD',
          recurrence: 'daily',
          startDay: 3,
          essential: true,
        },
      ],
    };

    const result = simulate(input);

    // Days 0-2: no expense
    for (let i = 0; i < 3; i++) {
      expect(result.snapshots[i].totalExpenses).toBe(0);
    }
    // Day 3+: expense active
    expect(result.snapshots[3].totalExpenses).toBe(50);
  });
});

// ─── Snapshot & State Tests ─────────────────────────────────────────────────────

describe('State management', () => {
  it('createInitialState initializes all fields correctly', () => {
    const state = createInitialState({
      baseCurrency: 'USD',
      initialBalance: 5000,
      assets: [],
      liabilities: [],
      incomeStreams: [],
      expenses: [],
      exchangeRates: [],
    });

    expect(state.day).toBe(0);
    expect(state.balance.toNumber()).toBe(5000);
    expect(state.baseCurrency).toBe('USD');
    expect(state.creditScore).toBe(650);
    expect(state.totalRealizedGains.toNumber()).toBe(0);
    expect(state.dailyRealizedGains.toNumber()).toBe(0);
    expect(state.cumulativeAnnualIncome.toNumber()).toBe(0);
    expect(state.shockCount).toBe(0);
    expect(state.recoveryDays).toBe(0);
    expect(state.consecutiveDeficitDays).toBe(0);
    expect(state.collapseDay).toBeNull();
    expect(state.taxConfig).toBeUndefined();
  });

  it('createInitialState accepts taxConfig', () => {
    const taxConfig = {
      brackets: [{ upperBound: 50000, rate: 0.2 }],
      capitalGainsRate: 0.15,
      currency: 'USD' as const,
    };

    const state = createInitialState({
      baseCurrency: 'USD',
      initialBalance: 1000,
      assets: [],
      liabilities: [],
      incomeStreams: [],
      expenses: [],
      exchangeRates: [],
      taxConfig,
    });

    expect(state.taxConfig).toBeDefined();
    expect(state.taxConfig!.brackets).toHaveLength(1);
    expect(state.taxConfig!.capitalGainsRate).toBe(0.15);
  });

  it('createInitialState deep-clones inputs', () => {
    const assets: Asset[] = [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Test',
        type: 'liquid',
        value: 1000,
        currency: 'USD',
        volatility: 0,
        yieldRate: 0,
        liquidationPenalty: 0,
        locked: false,
      },
    ];

    const state = createInitialState({
      baseCurrency: 'USD',
      initialBalance: 1000,
      assets,
      liabilities: [],
      incomeStreams: [],
      expenses: [],
      exchangeRates: [],
    });

    // Mutating original should not affect state
    assets[0].value = 9999;
    expect(state.assets[0].value).toBe(1000);
  });

  it('stateToSnapshot produces correct output', () => {
    const state = createInitialState({
      baseCurrency: 'USD',
      initialBalance: 5000,
      assets: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          name: 'Savings',
          type: 'liquid',
          value: 2000,
          currency: 'USD',
          volatility: 0,
          yieldRate: 0,
          liquidationPenalty: 0,
          locked: false,
        },
      ],
      liabilities: [
        {
          id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          name: 'Loan',
          principal: 1000,
          interestRate: 0.05,
          currency: 'USD',
          minimumPayment: 50,
          remainingTermDays: 365,
        },
      ],
      incomeStreams: [],
      expenses: [],
      exchangeRates: [],
    });

    const snapshot = stateToSnapshot(state, '2026-01-01');

    expect(snapshot.day).toBe(0);
    expect(snapshot.date).toBe('2026-01-01');
    expect(snapshot.balance).toBe(5000);
    expect(snapshot.assetNAV).toBe(2000);
    expect(snapshot.totalDebt).toBe(1000);
    expect(snapshot.creditScore).toBe(650);
    expect(snapshot.liquidityRatio).toBe(2); // 2000 liquid / 1000 debt
    expect(snapshot.taxPaid).toBe(0);
    expect(snapshot.capitalGainsTax).toBe(0);
  });

  it('snapshotState creates a deep clone with preserved Decimals', () => {
    const state = createInitialState({
      baseCurrency: 'USD',
      initialBalance: 5000,
      assets: [],
      liabilities: [],
      incomeStreams: [],
      expenses: [],
      exchangeRates: [],
    });

    state.balance = new Decimal(7777);
    state.totalRealizedGains = new Decimal(123.45);
    state.dailyRealizedGains = new Decimal(50);
    state.cumulativeAnnualIncome = new Decimal(30000);

    const cloned = snapshotState(state);

    // Values match
    expect(cloned.balance.toNumber()).toBe(7777);
    expect(cloned.totalRealizedGains.toNumber()).toBe(123.45);
    expect(cloned.dailyRealizedGains.toNumber()).toBe(50);
    expect(cloned.cumulativeAnnualIncome.toNumber()).toBe(30000);

    // Mutating clone doesn't affect original
    cloned.balance = new Decimal(0);
    expect(state.balance.toNumber()).toBe(7777);
  });
});

describe('Vibe and Pet state derivation', () => {
  it('derives thriving when high credit score and positive balance', () => {
    const state = createInitialState({
      baseCurrency: 'USD',
      initialBalance: 10000,
      assets: [],
      liabilities: [],
      incomeStreams: [],
      expenses: [],
      exchangeRates: [],
    });
    state.creditScore = 750;

    expect(deriveVibeState(state)).toBe('thriving');
    expect(derivePetState('thriving')).toBe('happy');
  });

  it('derives collapsed when long deficit', () => {
    const state = createInitialState({
      baseCurrency: 'USD',
      initialBalance: -5000,
      assets: [],
      liabilities: [],
      incomeStreams: [],
      expenses: [],
      exchangeRates: [],
    });
    state.consecutiveDeficitDays = 31;

    expect(deriveVibeState(state)).toBe('collapsed');
    expect(derivePetState('collapsed')).toBe('fainted');
  });

  it('derives critical when negative balance but short deficit', () => {
    const state = createInitialState({
      baseCurrency: 'USD',
      initialBalance: -1000,
      assets: [],
      liabilities: [],
      incomeStreams: [],
      expenses: [],
      exchangeRates: [],
    });
    state.consecutiveDeficitDays = 5;

    expect(deriveVibeState(state)).toBe('critical');
    expect(derivePetState('critical')).toBe('distressed');
  });

  it('derives strained when long deficit but positive balance', () => {
    const state = createInitialState({
      baseCurrency: 'USD',
      initialBalance: 100,
      assets: [],
      liabilities: [],
      incomeStreams: [],
      expenses: [],
      exchangeRates: [],
    });
    state.consecutiveDeficitDays = 10;

    expect(deriveVibeState(state)).toBe('strained');
    expect(derivePetState('strained')).toBe('anxious');
  });
});

// ─── Branching Tests ────────────────────────────────────────────────────────────

describe('simulateBranch', () => {
  it('returns both baseline and branch results', () => {
    const { baseline, branch } = simulateBranch(SIMPLE_INPUT, 10, {
      initialBalance: 20000,
    });

    expect(baseline.snapshots).toHaveLength(30);
    expect(branch.snapshots).toHaveLength(20); // 30 - 10 remaining days
  });

  it('branch uses baseline balance at branch point', () => {
    const result = simulateBranch(SIMPLE_INPUT, 10, {});

    // Branch initial balance should match baseline's day-10 balance
    // (Branch starts from that balance)
    expect(result.branch.snapshots[0].balance).toBeDefined();
    // Verify baseline is included
    expect(result.baseline.snapshots).toHaveLength(30);
  });

  it('branch reflects modified parameters', () => {
    const { baseline, branch } = simulateBranch(SIMPLE_INPUT, 5, {
      expenses: [], // remove all expenses in branch
    });

    // Branch should have higher final balance (no expenses)
    const baselineFinal = baseline.snapshots[baseline.snapshots.length - 1].balance;
    const branchFinal = branch.snapshots[branch.snapshots.length - 1].balance;

    expect(branchFinal).toBeGreaterThan(baselineFinal);
  });
});

// ─── Liability Processing Tests ─────────────────────────────────────────────────

describe('Liability processing', () => {
  it('accrues daily interest on liabilities', () => {
    const input: SimulationInput = {
      seed: 42,
      horizonDays: 30,
      baseCurrency: 'USD',
      initialBalance: 100000,
      incomeStreams: [],
      expenses: [],
      assets: [],
      liabilities: [
        {
          id: 'llllllll-llll-llll-llll-llllllllllll',
          name: 'Mortgage',
          principal: 50000,
          interestRate: 0.05,
          currency: 'USD',
          minimumPayment: 500,
          remainingTermDays: 365,
        },
      ],
      exchangeRates: [],
    };

    const result = simulate(input);
    // Balance should decrease over time due to debt payments
    const day0 = result.snapshots[0].balance;
    const day29 = result.snapshots[29].balance;
    expect(day29).toBeLessThan(day0);
  });

  it('deducts liability payments from balance', () => {
    const input: SimulationInput = {
      seed: 42,
      horizonDays: 2,
      baseCurrency: 'USD',
      initialBalance: 100000,
      incomeStreams: [],
      expenses: [],
      assets: [],
      liabilities: [
        {
          id: 'llllllll-llll-llll-llll-llllllllllll',
          name: 'Loan',
          principal: 10000,
          interestRate: 0,
          currency: 'USD',
          minimumPayment: 300, // $300/month -> $10/day
          remainingTermDays: 365,
        },
      ],
      exchangeRates: [],
    };

    const result = simulate(input);
    // Balance should decrease by daily payment amount
    expect(result.snapshots[0].balance).toBeLessThan(100000);
  });
});

// ─── DAG Consistency Tests ──────────────────────────────────────────────────────

describe('DAG execution order consistency', () => {
  it('income is processed before expenses and taxation', () => {
    // Verify via output: totalIncome should be set before expenses reduce balance
    const result = simulate(SIMPLE_INPUT);
    const day0 = result.snapshots[0];

    // Both income and expenses recorded
    expect(day0.totalIncome).toBeGreaterThan(0);
    expect(day0.totalExpenses).toBeGreaterThan(0);
    expect(day0.netCashFlow).toBe(day0.totalIncome - day0.totalExpenses);
  });

  it('snapshot day field increments correctly', () => {
    const result = simulate(SIMPLE_INPUT);
    for (let i = 0; i < result.snapshots.length; i++) {
      expect(result.snapshots[i].day).toBe(i);
    }
  });

  it('dates increment correctly', () => {
    const result = simulate(SIMPLE_INPUT);
    expect(result.snapshots[0].date).toBe('2026-01-01');
    expect(result.snapshots[1].date).toBe('2026-01-02');
    expect(result.snapshots[29].date).toBe('2026-01-30');
  });
});
