/**
 * Branch comparison utilities.
 *
 * Computes structured deltas between baseline and branch simulation results.
 * Per spec Section 3.3: "Merging: Comparison and integration of divergent trajectory results."
 */
import type {
  BranchComparisonDeltas,
  BranchComparisonResult,
  SimulationOutput,
} from '@future-wallet/shared-types';

/**
 * Computes structured delta metrics between two simulation outputs.
 *
 * Positive deltas mean the branch improved vs baseline.
 * Negative deltas mean the branch worsened vs baseline.
 */
export function computeBranchDeltas(
  baseline: SimulationOutput,
  branch: SimulationOutput,
): BranchComparisonDeltas {
  return {
    finalBalanceDiff: branch.finalBalance.expected - baseline.finalBalance.expected,
    collapseProbabilityDiff: branch.collapseProbability - baseline.collapseProbability,
    creditScoreDiff: branch.finalCreditScore - baseline.finalCreditScore,
    navDiff: branch.finalNAV - baseline.finalNAV,
    liquidityRatioDiff: branch.finalLiquidityRatio - baseline.finalLiquidityRatio,
    shockResilienceIndexDiff: branch.shockResilienceIndex - baseline.shockResilienceIndex,
    vibeStateChange: {
      from: baseline.vibeState,
      to: branch.vibeState,
    },
    petStateChange: {
      from: baseline.petState,
      to: branch.petState,
    },
  };
}

/**
 * Creates a full comparison result with both outputs and computed deltas.
 */
export function compareBranches(
  baseline: SimulationOutput,
  branch: SimulationOutput,
  branchAtDay: number,
): BranchComparisonResult {
  return {
    baseline,
    branch,
    branchAtDay,
    deltas: computeBranchDeltas(baseline, branch),
  };
}
