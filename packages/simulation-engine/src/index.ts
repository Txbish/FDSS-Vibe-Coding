/**
 * @future-wallet/simulation-engine
 *
 * Deterministic financial simulation engine.
 * Pure-function architecture — no side effects, no Math.random().
 */
export { simulate, simulateBranch } from './engine.js';
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
