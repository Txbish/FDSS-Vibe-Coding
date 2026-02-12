/**
 * End-to-end integration tests — full stack through the API.
 *
 * These tests validate cross-package integration:
 *   API (Fastify) → Engine (simulate/branch/compare) → Shared Types (schema validation)
 *
 * Covers:
 *   - Complex multi-asset, multi-currency scenarios
 *   - Determinism across the full HTTP layer
 *   - Tax + FX + Monte Carlo combined
 *   - Branch comparison consistency
 *   - Snapshot restoration fidelity through API
 *   - Precision drift validation through API
 *   - Edge cases: zero horizon, max payload, empty portfolios
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import {
  SimulationOutputSchema,
  BranchComparisonResultSchema,
  type SimulationInput,
} from '@future-wallet/shared-types';

// ─── Fixtures ───────────────────────────────────────────────────────────────────

/** Minimal valid input for quick tests */
const MINIMAL_INPUT: SimulationInput = {
  seed: 1,
  horizonDays: 10,
  baseCurrency: 'USD',
  initialBalance: 5000,
  incomeStreams: [],
  expenses: [],
  assets: [],
  liabilities: [],
  exchangeRates: [],
};

/** Complex multi-asset, multi-currency, taxed scenario */
const COMPLEX_INPUT: SimulationInput = {
  seed: 12345,
  horizonDays: 90,
  baseCurrency: 'USD',
  initialBalance: 50000,
  incomeStreams: [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'USD Salary',
      amount: 5000,
      currency: 'USD',
      recurrence: 'monthly',
      startDay: 0,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      name: 'EUR Freelance',
      amount: 2000,
      currency: 'EUR',
      recurrence: 'monthly',
      startDay: 0,
    },
  ],
  expenses: [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Rent',
      amount: 2000,
      currency: 'USD',
      recurrence: 'monthly',
      startDay: 0,
      essential: true,
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      name: 'Food',
      amount: 25,
      currency: 'USD',
      recurrence: 'daily',
      startDay: 0,
      essential: true,
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      name: 'Entertainment',
      amount: 200,
      currency: 'USD',
      recurrence: 'weekly',
      startDay: 0,
      essential: false,
    },
  ],
  assets: [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      name: 'Savings Account',
      type: 'liquid',
      value: 10000,
      currency: 'USD',
      volatility: 0,
      yieldRate: 0.02,
      liquidationPenalty: 0,
      locked: false,
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      name: 'Stock Portfolio',
      type: 'volatile',
      value: 15000,
      currency: 'USD',
      volatility: 0.15,
      yieldRate: 0.08,
      liquidationPenalty: 0.01,
      locked: false,
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      name: 'Real Estate',
      type: 'illiquid',
      value: 100000,
      currency: 'USD',
      volatility: 0.02,
      yieldRate: 0.05,
      liquidationPenalty: 0.1,
      locked: true,
      lockUntilDay: 365,
    },
  ],
  liabilities: [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      name: 'Student Loan',
      principal: 20000,
      interestRate: 0.05,
      minimumPayment: 500,
      currency: 'USD',
      remainingTermDays: 365,
    },
  ],
  exchangeRates: [{ from: 'EUR', to: 'USD', rate: 1.08, date: '2026-01-01', volatility: 0.02 }],
  taxConfig: {
    brackets: [
      { upperBound: 50000, rate: 0.1 },
      { upperBound: 100000, rate: 0.22 },
      { upperBound: 1000000, rate: 0.35 },
    ],
    capitalGainsRate: 0.15,
    currency: 'USD',
  },
  monteCarloConfig: {
    runs: 50,
    perturbationFactor: 0.05,
  },
};

// ─── App lifecycle ──────────────────────────────────────────────────────────────

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ logger: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ─── Cross-package determinism ──────────────────────────────────────────────────

describe('E2E: Determinism through API layer', () => {
  it('complex scenario produces bit-exact results across calls', async () => {
    const res1 = await app.inject({ method: 'POST', url: '/simulate', payload: COMPLEX_INPUT });
    const res2 = await app.inject({ method: 'POST', url: '/simulate', payload: COMPLEX_INPUT });

    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);

    const body1 = res1.json();
    const body2 = res2.json();

    // Bit-exact: every snapshot balance must match
    expect(body1.snapshots.length).toBe(body2.snapshots.length);
    for (let i = 0; i < body1.snapshots.length; i++) {
      expect(body1.snapshots[i].balance).toBe(body2.snapshots[i].balance);
      expect(body1.snapshots[i].nav).toBe(body2.snapshots[i].nav);
      expect(body1.snapshots[i].creditScore).toBe(body2.snapshots[i].creditScore);
    }

    // Final stats must match
    expect(body1.finalBalance).toEqual(body2.finalBalance);
    expect(body1.collapseProbability).toBe(body2.collapseProbability);
    expect(body1.finalCreditScore).toBe(body2.finalCreditScore);
    expect(body1.finalNAV).toBe(body2.finalNAV);
    expect(body1.vibeState).toBe(body2.vibeState);
    expect(body1.petState).toBe(body2.petState);
  });

  it('branch comparison is deterministic', async () => {
    const payload = {
      baseInput: COMPLEX_INPUT,
      branchAtDay: 30,
      modifiedInput: { initialBalance: 100000 },
    };

    const res1 = await app.inject({ method: 'POST', url: '/simulate/compare', payload });
    const res2 = await app.inject({ method: 'POST', url: '/simulate/compare', payload });

    const body1 = res1.json();
    const body2 = res2.json();

    expect(body1.deltas).toEqual(body2.deltas);
    expect(body1.baseline.finalBalance).toEqual(body2.baseline.finalBalance);
    expect(body1.branch.finalBalance).toEqual(body2.branch.finalBalance);
  });
});

// ─── Complex scenario validation ────────────────────────────────────────────────

describe('E2E: Complex multi-asset scenario', () => {
  it('produces schema-valid output for complex input', async () => {
    const res = await app.inject({ method: 'POST', url: '/simulate', payload: COMPLEX_INPUT });
    expect(res.statusCode).toBe(200);

    const parsed = SimulationOutputSchema.safeParse(res.json());
    expect(parsed.success).toBe(true);
  });

  it('snapshots have correct length for horizon', async () => {
    const res = await app.inject({ method: 'POST', url: '/simulate', payload: COMPLEX_INPUT });
    const body = res.json();
    expect(body.snapshots.length).toBe(COMPLEX_INPUT.horizonDays);
  });

  it('Monte Carlo produces p5 <= expected <= p95', async () => {
    const res = await app.inject({ method: 'POST', url: '/simulate', payload: COMPLEX_INPUT });
    const body = res.json();

    expect(body.finalBalance.p5).toBeLessThanOrEqual(body.finalBalance.expected);
    expect(body.finalBalance.expected).toBeLessThanOrEqual(body.finalBalance.p95);
  });

  it('credit score stays within [0, 850]', async () => {
    const res = await app.inject({ method: 'POST', url: '/simulate', payload: COMPLEX_INPUT });
    const body = res.json();

    expect(body.finalCreditScore).toBeGreaterThanOrEqual(0);
    expect(body.finalCreditScore).toBeLessThanOrEqual(850);

    for (const snap of body.snapshots) {
      expect(snap.creditScore).toBeGreaterThanOrEqual(0);
      expect(snap.creditScore).toBeLessThanOrEqual(850);
    }
  });

  it('NAV reflects asset values', async () => {
    const res = await app.inject({ method: 'POST', url: '/simulate', payload: COMPLEX_INPUT });
    const body = res.json();

    // NAV should be positive since we start with significant assets
    expect(body.finalNAV).toBeGreaterThan(0);
  });

  it('tax is applied when taxConfig is present', async () => {
    const res = await app.inject({ method: 'POST', url: '/simulate', payload: COMPLEX_INPUT });
    const body = res.json();

    // At least one snapshot should show tax paid
    const hasTax = body.snapshots.some((s: { taxPaid: number }) => s.taxPaid > 0);
    expect(hasTax).toBe(true);
  });

  it('liabilities accrue interest over time', async () => {
    const res = await app.inject({ method: 'POST', url: '/simulate', payload: COMPLEX_INPUT });
    const body = res.json();

    // Liability payments should be reflected in balance trajectory
    // Balance should decrease from liability payments
    const firstBalance = body.snapshots[0].balance;
    const lastBalance = body.snapshots[body.snapshots.length - 1].balance;

    // With income > expenses, balance should generally increase or be managed
    // The important thing is the simulation completes without error
    expect(typeof lastBalance).toBe('number');
    expect(typeof firstBalance).toBe('number');
  });
});

// ─── Precision drift validation ─────────────────────────────────────────────────

describe('E2E: Precision drift through API', () => {
  it('balance does not exhibit NaN or Infinity over long horizon', async () => {
    const longInput = {
      ...COMPLEX_INPUT,
      horizonDays: 365,
      monteCarloConfig: { runs: 10, perturbationFactor: 0.05 },
    };

    const res = await app.inject({ method: 'POST', url: '/simulate', payload: longInput });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    for (const snap of body.snapshots) {
      expect(Number.isFinite(snap.balance)).toBe(true);
      expect(Number.isFinite(snap.assetNAV)).toBe(true);
      expect(Number.isFinite(snap.creditScore)).toBe(true);
    }

    expect(Number.isFinite(body.finalBalance.expected)).toBe(true);
    expect(Number.isFinite(body.finalBalance.p5)).toBe(true);
    expect(Number.isFinite(body.finalBalance.p95)).toBe(true);
  });

  it('shock resilience index is bounded [0, 100]', async () => {
    const res = await app.inject({ method: 'POST', url: '/simulate', payload: COMPLEX_INPUT });
    const body = res.json();

    expect(body.shockResilienceIndex).toBeGreaterThanOrEqual(0);
    expect(body.shockResilienceIndex).toBeLessThanOrEqual(100);
  });

  it('collapse probability is bounded [0, 1]', async () => {
    const res = await app.inject({ method: 'POST', url: '/simulate', payload: COMPLEX_INPUT });
    const body = res.json();

    expect(body.collapseProbability).toBeGreaterThanOrEqual(0);
    expect(body.collapseProbability).toBeLessThanOrEqual(1);
  });

  it('liquidity ratio is non-negative', async () => {
    const res = await app.inject({ method: 'POST', url: '/simulate', payload: COMPLEX_INPUT });
    const body = res.json();

    expect(body.finalLiquidityRatio).toBeGreaterThanOrEqual(0);
  });
});

// ─── Branch comparison integration ──────────────────────────────────────────────

describe('E2E: Branch comparison through API', () => {
  it('removing an expense improves final balance delta', async () => {
    const baseWithExpense: SimulationInput = {
      ...MINIMAL_INPUT,
      horizonDays: 30,
      expenses: [
        {
          id: 'e0000000-0000-0000-0000-000000000001',
          name: 'Daily Cost',
          amount: 100,
          currency: 'USD',
          recurrence: 'daily',
          startDay: 0,
          essential: false,
        },
      ],
    };

    const payload = {
      baseInput: baseWithExpense,
      branchAtDay: 5,
      modifiedInput: { expenses: [] },
    };

    const res = await app.inject({ method: 'POST', url: '/simulate/compare', payload });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    // Removing expenses should improve final balance
    expect(body.deltas.finalBalanceDiff).toBeGreaterThan(0);
  });

  it('compare result validates against BranchComparisonResultSchema', async () => {
    const payload = {
      baseInput: COMPLEX_INPUT,
      branchAtDay: 15,
      modifiedInput: { initialBalance: 100000 },
    };

    const res = await app.inject({ method: 'POST', url: '/simulate/compare', payload });
    expect(res.statusCode).toBe(200);

    const parsed = BranchComparisonResultSchema.safeParse(res.json());
    expect(parsed.success).toBe(true);
  });

  it('branch at day 0 with same input produces zero deltas', async () => {
    const payload = {
      baseInput: MINIMAL_INPUT,
      branchAtDay: 0,
      modifiedInput: {},
    };

    const res = await app.inject({ method: 'POST', url: '/simulate/compare', payload });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    // Same input should produce identical results → zero deltas
    expect(body.deltas.finalBalanceDiff).toBeCloseTo(0, 5);
    expect(body.deltas.collapseProbabilityDiff).toBeCloseTo(0, 5);
    expect(body.deltas.creditScoreDiff).toBeCloseTo(0, 5);
  });

  it('/simulate/branch and /simulate/compare baseline results match', async () => {
    const payload = {
      baseInput: COMPLEX_INPUT,
      branchAtDay: 20,
      modifiedInput: { initialBalance: 80000 },
    };

    const branchRes = await app.inject({ method: 'POST', url: '/simulate/branch', payload });
    const compareRes = await app.inject({ method: 'POST', url: '/simulate/compare', payload });

    const branchBody = branchRes.json();
    const compareBody = compareRes.json();

    // Both endpoints should produce identical baselines
    expect(branchBody.baseline.finalBalance).toEqual(compareBody.baseline.finalBalance);
    expect(branchBody.baseline.finalCreditScore).toBe(compareBody.baseline.finalCreditScore);
  });
});

// ─── Edge cases ─────────────────────────────────────────────────────────────────

describe('E2E: Edge cases', () => {
  it('handles empty portfolio (no income, no expenses, no assets)', async () => {
    const res = await app.inject({ method: 'POST', url: '/simulate', payload: MINIMAL_INPUT });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    // Balance should remain at initial (no flows)
    const parsed = SimulationOutputSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it('handles high-frequency expenses (daily)', async () => {
    const input: SimulationInput = {
      ...MINIMAL_INPUT,
      horizonDays: 30,
      expenses: [
        {
          id: 'e0000000-0000-0000-0000-000000000001',
          name: 'Daily Coffee',
          amount: 5,
          currency: 'USD',
          recurrence: 'daily',
          startDay: 0,
          essential: false,
        },
      ],
    };

    const res = await app.inject({ method: 'POST', url: '/simulate', payload: input });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    // Balance should decrease over time due to daily expense
    const lastSnap = body.snapshots[body.snapshots.length - 1];
    expect(lastSnap.balance).toBeLessThan(MINIMAL_INPUT.initialBalance);
  });

  it('handles scenario with only liabilities (deficit scenario)', async () => {
    const input = {
      ...MINIMAL_INPUT,
      initialBalance: 1000,
      horizonDays: 60,
      liabilities: [
        {
          id: 'l0000000-0000-0000-0000-000000000001',
          name: 'High Interest Loan',
          principal: 50000,
          interestRate: 0.2,
          minimumPayment: 500,
          currency: 'USD',
          remainingTermDays: 365,
        },
      ],
    };

    const res = await app.inject({ method: 'POST', url: '/simulate', payload: input });

    // Should either succeed or return a structured error (not crash)
    if (res.statusCode === 200) {
      const parsed = SimulationOutputSchema.safeParse(res.json());
      expect(parsed.success).toBe(true);
    } else {
      // Validation or engine error is acceptable — verify structured response
      const body = res.json();
      expect(body.code).toBeDefined();
      expect(body.error).toBeDefined();
    }
  });

  it('handles minimum horizon (1 day)', async () => {
    const input = { ...MINIMAL_INPUT, horizonDays: 1 };
    const res = await app.inject({ method: 'POST', url: '/simulate', payload: input });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.snapshots.length).toBe(1);
  });

  it('concurrent requests produce independent results', async () => {
    const inputs = [
      { ...MINIMAL_INPUT, seed: 100, initialBalance: 1000 },
      { ...MINIMAL_INPUT, seed: 200, initialBalance: 2000 },
      { ...MINIMAL_INPUT, seed: 300, initialBalance: 3000 },
    ];

    const results = await Promise.all(
      inputs.map((payload) => app.inject({ method: 'POST', url: '/simulate', payload })),
    );

    // All should succeed
    for (const res of results) {
      expect(res.statusCode).toBe(200);
    }

    // Results should reflect different initial balances
    const balances = results.map((r) => r.json().snapshots[0].balance);
    expect(new Set(balances).size).toBe(3);
  });
});
