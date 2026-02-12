/**
 * API client for the Future Wallet backend.
 *
 * The Vite dev-server proxy rewrites `/api/*` → `http://localhost:3001/*`,
 * so the frontend always uses the `/api` prefix while the backend serves
 * routes without it (e.g. POST /simulate).
 */
import type {
  SimulationInput,
  SimulationOutput,
  BranchResult,
  BranchComparisonResult,
} from '@future-wallet/shared-types';

const API_BASE = '/api';

export async function runSimulation(input: SimulationInput): Promise<SimulationOutput> {
  const res = await fetch(`${API_BASE}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export async function runBranch(
  baseInput: SimulationInput,
  branchAtDay: number,
  modifiedInput: Partial<SimulationInput>,
): Promise<BranchResult> {
  const res = await fetch(`${API_BASE}/simulate/branch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseInput, branchAtDay, modifiedInput }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Run a branch comparison via POST /simulate/compare.
 * Returns baseline, branch, branchAtDay, and a `deltas` object with
 * structured differences between the two scenarios.
 */
export async function runComparison(
  baseInput: SimulationInput,
  branchAtDay: number,
  modifiedInput: Partial<SimulationInput>,
): Promise<BranchComparisonResult> {
  const res = await fetch(`${API_BASE}/simulate/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseInput, branchAtDay, modifiedInput }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}
