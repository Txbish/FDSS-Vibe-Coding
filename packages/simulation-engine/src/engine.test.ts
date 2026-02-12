/**
 * Core engine tests — determinism is the #1 priority.
 */
import { describe, expect, it } from 'vitest';
import { simulate } from './engine.js';
import { topologicalSort } from './dag.js';
import { DeterministicRNG } from './rng.js';
import type { SimulationInput } from '@future-wallet/shared-types';

const BASE_INPUT: SimulationInput = {
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

describe('DeterministicRNG', () => {
  it('produces identical sequences for identical seeds', () => {
    const rng1 = new DeterministicRNG(42);
    const rng2 = new DeterministicRNG(42);

    const seq1 = Array.from({ length: 100 }, () => rng1.next());
    const seq2 = Array.from({ length: 100 }, () => rng2.next());

    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = new DeterministicRNG(42);
    const rng2 = new DeterministicRNG(99);

    expect(rng1.next()).not.toEqual(rng2.next());
  });
});

describe('DAG topological sort', () => {
  it('resolves a simple dependency chain', () => {
    const result = topologicalSort([
      { id: 'a', dependsOn: [] },
      { id: 'b', dependsOn: ['a'] },
      { id: 'c', dependsOn: ['b'] },
    ]);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('throws on cycle detection', () => {
    expect(() =>
      topologicalSort([
        { id: 'a', dependsOn: ['b'] },
        { id: 'b', dependsOn: ['a'] },
      ]),
    ).toThrow('DAG cycle detected');
  });

  it('throws on unknown dependency', () => {
    expect(() =>
      topologicalSort([{ id: 'a', dependsOn: ['nonexistent'] }]),
    ).toThrow('unknown node');
  });
});

describe('simulate()', () => {
  it('is deterministic — same seed produces bit-exact output', () => {
    const result1 = simulate(BASE_INPUT);
    const result2 = simulate(BASE_INPUT);

    // Compare snapshots (exclude computedAt timestamp)
    expect(result1.snapshots).toEqual(result2.snapshots);
    expect(result1.finalBalance).toEqual(result2.finalBalance);
    expect(result1.collapseProbability).toEqual(result2.collapseProbability);
    expect(result1.finalCreditScore).toEqual(result2.finalCreditScore);
  });

  it('produces correct number of snapshots', () => {
    const result = simulate(BASE_INPUT);
    expect(result.snapshots).toHaveLength(30);
  });

  it('starts with the initial balance', () => {
    const result = simulate(BASE_INPUT);
    // Day 0: +3000 salary, -1500 rent, -30 food = 10000 + 1470 = 11470
    expect(result.snapshots[0].day).toBe(0);
  });

  it('produces valid output schema fields', () => {
    const result = simulate(BASE_INPUT);

    expect(result.seed).toBe(42);
    expect(result.horizonDays).toBe(30);
    expect(result.baseCurrency).toBe('USD');
    expect(result.vibeState).toBeDefined();
    expect(result.petState).toBeDefined();
    expect(result.finalCreditScore).toBeGreaterThanOrEqual(300);
    expect(result.finalCreditScore).toBeLessThanOrEqual(850);
    expect(result.collapseProbability).toBeGreaterThanOrEqual(0);
    expect(result.collapseProbability).toBeLessThanOrEqual(1);
  });
});
