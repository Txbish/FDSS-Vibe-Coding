/**
 * Branch comparison tests — delta computation and structured comparison.
 */
import { describe, expect, it } from 'vitest';
import { computeBranchDeltas, compareBranches } from './branch.js';
import type { SimulationOutput } from '@future-wallet/shared-types';

function makeOutput(overrides: Partial<SimulationOutput> = {}): SimulationOutput {
  return {
    seed: 42,
    horizonDays: 30,
    baseCurrency: 'USD',
    computedAt: '2026-01-01T00:00:00.000Z',
    snapshots: [],
    finalBalance: { expected: 10000, p5: 8000, p95: 12000 },
    collapseProbability: 0.1,
    collapseDay: null,
    vibeState: 'stable',
    petState: 'content',
    finalCreditScore: 700,
    shockResilienceIndex: 60,
    finalNAV: 5000,
    finalLiquidityRatio: 2.0,
    ...overrides,
  };
}

describe('computeBranchDeltas', () => {
  it('computes zero deltas for identical outputs', () => {
    const baseline = makeOutput();
    const branch = makeOutput();

    const deltas = computeBranchDeltas(baseline, branch);

    expect(deltas.finalBalanceDiff).toBe(0);
    expect(deltas.collapseProbabilityDiff).toBe(0);
    expect(deltas.creditScoreDiff).toBe(0);
    expect(deltas.navDiff).toBe(0);
    expect(deltas.liquidityRatioDiff).toBe(0);
    expect(deltas.shockResilienceIndexDiff).toBe(0);
    expect(deltas.vibeStateChange.from).toBe('stable');
    expect(deltas.vibeStateChange.to).toBe('stable');
  });

  it('computes positive deltas when branch improves', () => {
    const baseline = makeOutput({
      finalBalance: { expected: 10000, p5: 8000, p95: 12000 },
      collapseProbability: 0.2,
      finalCreditScore: 650,
      finalNAV: 5000,
      finalLiquidityRatio: 1.5,
      shockResilienceIndex: 50,
      vibeState: 'strained',
      petState: 'anxious',
    });

    const branch = makeOutput({
      finalBalance: { expected: 15000, p5: 12000, p95: 18000 },
      collapseProbability: 0.05,
      finalCreditScore: 750,
      finalNAV: 8000,
      finalLiquidityRatio: 3.0,
      shockResilienceIndex: 80,
      vibeState: 'thriving',
      petState: 'happy',
    });

    const deltas = computeBranchDeltas(baseline, branch);

    expect(deltas.finalBalanceDiff).toBe(5000);
    expect(deltas.collapseProbabilityDiff).toBeCloseTo(-0.15);
    expect(deltas.creditScoreDiff).toBe(100);
    expect(deltas.navDiff).toBe(3000);
    expect(deltas.liquidityRatioDiff).toBeCloseTo(1.5);
    expect(deltas.shockResilienceIndexDiff).toBe(30);
    expect(deltas.vibeStateChange).toEqual({ from: 'strained', to: 'thriving' });
    expect(deltas.petStateChange).toEqual({ from: 'anxious', to: 'happy' });
  });

  it('computes negative deltas when branch worsens', () => {
    const baseline = makeOutput({
      finalBalance: { expected: 20000, p5: 15000, p95: 25000 },
      finalCreditScore: 800,
    });

    const branch = makeOutput({
      finalBalance: { expected: 5000, p5: 2000, p95: 8000 },
      finalCreditScore: 550,
    });

    const deltas = computeBranchDeltas(baseline, branch);

    expect(deltas.finalBalanceDiff).toBe(-15000);
    expect(deltas.creditScoreDiff).toBe(-250);
  });
});

describe('compareBranches', () => {
  it('returns full comparison result with all fields', () => {
    const baseline = makeOutput({ vibeState: 'stable' });
    const branch = makeOutput({ vibeState: 'thriving' });

    const result = compareBranches(baseline, branch, 15);

    expect(result.baseline).toBe(baseline);
    expect(result.branch).toBe(branch);
    expect(result.branchAtDay).toBe(15);
    expect(result.deltas).toBeDefined();
    expect(result.deltas.vibeStateChange).toEqual({ from: 'stable', to: 'thriving' });
  });

  it('includes correct branchAtDay', () => {
    const baseline = makeOutput();
    const branch = makeOutput();

    const result = compareBranches(baseline, branch, 0);
    expect(result.branchAtDay).toBe(0);

    const result2 = compareBranches(baseline, branch, 365);
    expect(result2.branchAtDay).toBe(365);
  });
});
