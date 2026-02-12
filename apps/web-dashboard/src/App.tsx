import { useState } from 'react';
import type { SimulationInput, SimulationOutput } from '@future-wallet/shared-types';
import { runSimulation } from './api';
import { BalanceChart } from './components/BalanceChart';
import { MetricCard } from './components/MetricCard';
import { SimulationForm } from './components/SimulationForm';
import { StatusBadge } from './components/StatusBadge';

const VIBE_EMOJI: Record<string, string> = {
  thriving: '🌟',
  stable: '😊',
  strained: '😰',
  critical: '🚨',
  collapsed: '💀',
};

const PET_EMOJI: Record<string, string> = {
  happy: '🐱',
  content: '🐈',
  anxious: '🙀',
  distressed: '😿',
  fainted: '😵',
};

export function App() {
  const [result, setResult] = useState<SimulationOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async (input: SimulationInput) => {
    setLoading(true);
    setError(null);
    try {
      const output = await runSimulation(input);
      setResult(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="dashboard-header">
        <span className="emoji">💰</span>
        <div>
          <h1>Future Wallet</h1>
          <h2>Financial Projection & Simulation Engine</h2>
        </div>
      </div>

      <SimulationForm onSubmit={handleSimulate} loading={loading} />

      {error && <div className="error-banner">⚠️ {error}</div>}

      {loading && (
        <div className="loading-spinner">⏳ Running simulation…</div>
      )}

      {result && !loading && (
        <>
          {/* KPI Cards */}
          <div className="card-grid">
            <MetricCard
              label="Final Balance"
              value={`$${result.finalBalance.expected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <MetricCard
              label="Collapse Probability"
              value={`${(result.collapseProbability * 100).toFixed(1)}%`}
              variant={result.collapseProbability > 0.5 ? 'danger' : result.collapseProbability > 0.2 ? 'warning' : 'success'}
            />
            <MetricCard
              label="Credit Score"
              value={result.finalCreditScore.toFixed(0)}
            />
            <MetricCard
              label="Net Asset Value"
              value={`$${result.finalNAV.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <MetricCard
              label="Liquidity Ratio"
              value={result.finalLiquidityRatio.toFixed(2)}
            />
            <MetricCard
              label="Shock Resilience"
              value={`${result.shockResilienceIndex.toFixed(0)}/100`}
            />
          </div>

          {/* Vibe & Pet State */}
          <div className="card-grid">
            <div className="card">
              <div className="card-label">Financial Vibe</div>
              <div className="card-value">
                {VIBE_EMOJI[result.vibeState] ?? '❓'}{' '}
                <StatusBadge status={result.vibeState} />
              </div>
            </div>
            <div className="card">
              <div className="card-label">Pet State</div>
              <div className="card-value">
                {PET_EMOJI[result.petState] ?? '❓'}{' '}
                <StatusBadge status={result.petState} />
              </div>
            </div>
            <div className="card">
              <div className="card-label">Balance Range (P5 – P95)</div>
              <div className="card-value" style={{ fontSize: '1.1rem' }}>
                ${result.finalBalance.p5.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                {' — '}
                ${result.finalBalance.p95.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Balance Trajectory Chart */}
          <div className="chart-container">
            <h2>📈 Balance Trajectory</h2>
            <BalanceChart snapshots={result.snapshots} />
          </div>
        </>
      )}
    </>
  );
}
