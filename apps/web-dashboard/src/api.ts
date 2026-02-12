/**
 * API client for the Future Wallet backend.
 */
import type { SimulationInput, SimulationOutput, BranchResult } from '@future-wallet/shared-types';

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
