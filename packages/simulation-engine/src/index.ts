/**
 * @future-wallet/simulation-engine
 *
 * Deterministic financial simulation engine.
 * Pure-function architecture — no side effects, no Math.random().
 */
export { simulate, simulateBranch, simulateSingleRun } from './engine.js';
export { DeterministicRNG } from './rng.js';
export { topologicalSort, type DAGNode } from './dag.js';
export {
  createInitialState,
  stateToSnapshot,
  deriveVibeState,
  derivePetState,
  snapshotState,
  type SimulationState,
} from './state.js';
export { ExchangeRateEngine } from './fx.js';
export {
  computeProgressiveTax,
  computeCapitalGainsTax,
  computeDailyTax,
  type TaxResult,
} from './tax.js';
export { computeBranchDeltas, compareBranches } from './branch.js';
