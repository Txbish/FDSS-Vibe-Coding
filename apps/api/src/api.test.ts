/**
 * API endpoint tests — Fastify inject-based integration tests.
 *
 * Tests cover:
 *   - GET  /health
 *   - POST /simulate         (valid, invalid, determinism)
 *   - POST /simulate/branch  (valid, invalid)
 *   - POST /simulate/compare (valid, delta structure)
 *   - Error handling          (validation, payload limits, engine errors)
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import {
  ApiErrorSchema,
  SimulationOutputSchema,
  BranchComparisonResultSchema,
} from '@future-wallet/shared-types';
import type { SimulationInput } from '@future-wallet/shared-types';

// ─── Test fixtures ──────────────────────────────────────────────────────────────

const VALID_INPUT: SimulationInput = {
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
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Food',
      amount: 30,
      currency: 'USD',
      recurrence: 'daily',
      startDay: 0,
      essential: true,
    },
  ],
  assets: [],
  liabilities: [],
  exchangeRates: [],
};

const VALID_BRANCH_REQUEST = {
  baseInput: VALID_INPUT,
  branchAtDay: 10,
  modifiedInput: {
    initialBalance: 20000,
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

// ─── GET /health ────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('returns a valid ISO timestamp', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    const body = res.json();
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
  });
});

// ─── POST /simulate ─────────────────────────────────────────────────────────────

describe('POST /simulate', () => {
  it('returns 200 with valid simulation output', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate',
      payload: VALID_INPUT,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    // Validate against schema
    const parsed = SimulationOutputSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it('returns correct metadata in output', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate',
      payload: VALID_INPUT,
    });
    const body = res.json();

    expect(body.seed).toBe(42);
    expect(body.horizonDays).toBe(30);
    expect(body.baseCurrency).toBe('USD');
    expect(body.snapshots).toHaveLength(30); // horizonDays entries
  });

  it('returns deterministic results for same seed', async () => {
    const res1 = await app.inject({
      method: 'POST',
      url: '/simulate',
      payload: VALID_INPUT,
    });
    const res2 = await app.inject({
      method: 'POST',
      url: '/simulate',
      payload: VALID_INPUT,
    });
    const body1 = res1.json();
    const body2 = res2.json();

    expect(body1.finalBalance.expected).toBe(body2.finalBalance.expected);
    expect(body1.finalCreditScore).toBe(body2.finalCreditScore);
    expect(body1.vibeState).toBe(body2.vibeState);
    expect(body1.collapseProbability).toBe(body2.collapseProbability);
  });

  it('returns different results for different seeds with volatile assets', async () => {
    const inputWithVolatile = {
      ...VALID_INPUT,
      assets: [
        {
          id: '44444444-4444-4444-4444-444444444444',
          name: 'Stock Portfolio',
          value: 5000,
          currency: 'USD',
          type: 'volatile' as const,
          volatility: 0.2,
          yieldRate: 0.08,
          liquidationPenalty: 0,
          locked: false,
        },
      ],
    };

    const res1 = await app.inject({
      method: 'POST',
      url: '/simulate',
      payload: { ...inputWithVolatile, seed: 42 },
    });
    const res2 = await app.inject({
      method: 'POST',
      url: '/simulate',
      payload: { ...inputWithVolatile, seed: 999 },
    });
    const body1 = res1.json();
    const body2 = res2.json();

    // With volatile assets and different seeds, final NAV should differ
    expect(body1.finalNAV).not.toBe(body2.finalNAV);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate',
      payload: { seed: 42 }, // missing most required fields
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();

    const parsed = ApiErrorSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid field types', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate',
      payload: {
        ...VALID_INPUT,
        seed: 'not-a-number',
        horizonDays: -5,
      },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for empty body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('includes validation details in error response', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate',
      payload: { seed: 42 },
    });
    const body = res.json();
    expect(body.details).toBeDefined();
    expect(body.details.fieldErrors).toBeDefined();
  });
});

// ─── POST /simulate/branch ──────────────────────────────────────────────────────

describe('POST /simulate/branch', () => {
  it('returns 200 with valid branch result', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate/branch',
      payload: VALID_BRANCH_REQUEST,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.baseline).toBeDefined();
    expect(body.branch).toBeDefined();
    expect(body.branchAtDay).toBe(10);
  });

  it('baseline output validates against SimulationOutputSchema', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate/branch',
      payload: VALID_BRANCH_REQUEST,
    });
    const body = res.json();

    const baselineParsed = SimulationOutputSchema.safeParse(body.baseline);
    expect(baselineParsed.success).toBe(true);
  });

  it('returns 400 for missing baseInput', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate/branch',
      payload: { branchAtDay: 10, modifiedInput: {} },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for negative branchAtDay', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate/branch',
      payload: { ...VALID_BRANCH_REQUEST, branchAtDay: -1 },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns deterministic branch results for same seed', async () => {
    const res1 = await app.inject({
      method: 'POST',
      url: '/simulate/branch',
      payload: VALID_BRANCH_REQUEST,
    });
    const res2 = await app.inject({
      method: 'POST',
      url: '/simulate/branch',
      payload: VALID_BRANCH_REQUEST,
    });
    const body1 = res1.json();
    const body2 = res2.json();

    expect(body1.baseline.finalBalance.expected).toBe(body2.baseline.finalBalance.expected);
    expect(body1.branch.finalBalance.expected).toBe(body2.branch.finalBalance.expected);
  });
});

// ─── POST /simulate/compare ─────────────────────────────────────────────────────

describe('POST /simulate/compare', () => {
  it('returns 200 with valid comparison result', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate/compare',
      payload: VALID_BRANCH_REQUEST,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    const parsed = BranchComparisonResultSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it('returns structured deltas', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate/compare',
      payload: VALID_BRANCH_REQUEST,
    });
    const body = res.json();

    expect(body.deltas).toBeDefined();
    expect(typeof body.deltas.finalBalanceDiff).toBe('number');
    expect(typeof body.deltas.collapseProbabilityDiff).toBe('number');
    expect(typeof body.deltas.creditScoreDiff).toBe('number');
    expect(typeof body.deltas.navDiff).toBe('number');
    expect(typeof body.deltas.liquidityRatioDiff).toBe('number');
    expect(typeof body.deltas.shockResilienceIndexDiff).toBe('number');
  });

  it('returns vibe and pet state changes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate/compare',
      payload: VALID_BRANCH_REQUEST,
    });
    const body = res.json();

    expect(body.deltas.vibeStateChange).toEqual({
      from: expect.any(String),
      to: expect.any(String),
    });
    expect(body.deltas.petStateChange).toEqual({
      from: expect.any(String),
      to: expect.any(String),
    });
  });

  it('includes baseline, branch, and branchAtDay', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate/compare',
      payload: VALID_BRANCH_REQUEST,
    });
    const body = res.json();

    expect(body.baseline).toBeDefined();
    expect(body.branch).toBeDefined();
    expect(body.branchAtDay).toBe(10);
  });

  it('returns 400 for invalid comparison request', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate/compare',
      payload: { baseInput: { seed: 1 } },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('comparison deltas are consistent with branch results', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate/compare',
      payload: VALID_BRANCH_REQUEST,
    });
    const body = res.json();

    // Delta should equal branch minus baseline
    const expectedBalanceDiff =
      body.branch.finalBalance.expected - body.baseline.finalBalance.expected;
    expect(body.deltas.finalBalanceDiff).toBeCloseTo(expectedBalanceDiff, 10);

    const expectedCollapseDiff =
      body.branch.collapseProbability - body.baseline.collapseProbability;
    expect(body.deltas.collapseProbabilityDiff).toBeCloseTo(expectedCollapseDiff, 10);
  });
});

// ─── Error handling ─────────────────────────────────────────────────────────────

describe('Error handling', () => {
  it('returns structured ApiError for validation failures', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate',
      payload: { invalid: true },
    });
    const body = res.json();

    const parsed = ApiErrorSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.error).toBeDefined();
  });

  it('returns 413 for oversized payloads', async () => {
    // Create a payload larger than 1 MB
    const hugePayload = {
      ...VALID_INPUT,
      _padding: 'x'.repeat(1_100_000),
    };

    const res = await app.inject({
      method: 'POST',
      url: '/simulate',
      payload: hugePayload,
    });
    expect(res.statusCode).toBe(413);
    const body = res.json();
    expect(body.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/nonexistent',
    });
    expect(res.statusCode).toBe(404);
  });

  it('all error responses have required ApiError fields', async () => {
    // Test validation error shape
    const res = await app.inject({
      method: 'POST',
      url: '/simulate',
      payload: {},
    });
    const body = res.json();

    expect(body).toHaveProperty('code');
    expect(body).toHaveProperty('error');
    expect(typeof body.code).toBe('string');
    expect(typeof body.error).toBe('string');
  });
});

// ─── Content type handling ──────────────────────────────────────────────────────

describe('Content type handling', () => {
  it('returns 400 for malformed JSON', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simulate',
      headers: { 'content-type': 'application/json' },
      body: '{invalid json',
    });
    // Fastify returns 400 for parse errors
    expect(res.statusCode).toBe(400);
  });
});
