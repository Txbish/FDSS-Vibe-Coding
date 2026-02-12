import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type {
  SimulationInput,
  SimulationOutput,
  BranchComparisonResult,
} from '@future-wallet/shared-types';
import { runSimulation, runComparison } from '../api';
import { BalanceChart } from '../components/BalanceChart';
import { MetricCard } from '../components/MetricCard';
import { SimulationForm } from '../components/SimulationForm';
import { StatusBadge } from '../components/StatusBadge';

const ENGINE_SIGNALS = [
  { label: 'Branch Capacity', value: '128 Trees' },
  { label: 'Replay Fidelity', value: '99.97%' },
  { label: 'Shock Detection', value: 'Sub-second' },
] as const;

const ENGINE_PROTOCOL = [
  'Set seed and horizon for deterministic replay.',
  'Run baseline simulation and inspect collapse probability.',
  'Compare distribution spread before execution decisions.',
  'Validate liquidity ratio and shock resilience together.',
] as const;

export function EnginePage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<SimulationOutput | null>(null);
  const [branchResult, setBranchResult] = useState<BranchComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const leaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) {
        window.clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  const handleSimulate = async (input: SimulationInput) => {
    setLoading(true);
    setError(null);
    setBranchResult(null);
    try {
      const output = await runSimulation(input);
      setResult(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBranch = async (
    input: SimulationInput,
    branchDay: number,
    modified: Partial<SimulationInput>,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const comparisonOut = await runComparison(input, branchDay, modified);
      setBranchResult(comparisonOut);
      // Also set the baseline result so metrics stay visible
      setResult(comparisonOut.baseline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Branch simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLanding = () => {
    if (isLeaving) {
      return;
    }

    setIsLeaving(true);
    leaveTimerRef.current = window.setTimeout(() => {
      navigate('/');
    }, 460);
  };

  return (
    <div className="page-shell engine-page-shell">
      <div className={`route-transfer ${isLeaving ? 'active' : ''}`} aria-hidden />
      <div className="ambient-field engine-ambient" aria-hidden>
        <div className="orb orb-one" />
        <div className="orb orb-two" />
      </div>
      <div className="engine-grid-lines" aria-hidden />

      <div className="engine-content-shell">
        <header className="engine-topbar">
          <button type="button" className="ghost-button" onClick={handleBackToLanding}>
            Back To Landing
          </button>
          <div className="engine-pill-tag">ARBS // MAIN SIMULATION ENGINE</div>
        </header>

        <motion.section
          className="engine-hero-panel"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="section-kicker">Execution Workspace</p>
          <h1 className="engine-title">Simulation Control Room</h1>
          <p className="engine-subtitle">
            Run deterministic arbitrage scenarios, inspect distribution tails, and validate
            resilience before deploying strategy shifts.
          </p>
          <div className="engine-signal-grid">
            {ENGINE_SIGNALS.map((signal) => (
              <article key={signal.label} className="engine-signal-card">
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
              </article>
            ))}
          </div>
        </motion.section>

        <div className="engine-layout">
          <motion.section
            className="engine-main-column"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.52, delay: 0.08, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <SimulationForm
              onSubmit={handleSimulate}
              onBranch={handleBranch}
              loading={loading}
              hasResult={!!result}
            />

            {error && <div className="error-banner">Simulation failed: {error}</div>}
            {loading && <div className="loading-spinner">Running simulation...</div>}

            {result && !loading && (
              <>
                <div className="card-grid">
                  <MetricCard
                    label="Final Balance"
                    value={`$${result.finalBalance.expected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  />
                  <MetricCard
                    label="Collapse Probability"
                    value={`${(result.collapseProbability * 100).toFixed(1)}%`}
                    variant={
                      result.collapseProbability > 0.5
                        ? 'danger'
                        : result.collapseProbability > 0.2
                          ? 'warning'
                          : 'success'
                    }
                  />
                  <MetricCard label="Credit Score" value={result.finalCreditScore.toFixed(0)} />
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
                  {(() => {
                    const totalTaxPaid = result.snapshots.reduce(
                      (sum, s) => sum + s.taxPaid + s.capitalGainsTax,
                      0,
                    );
                    return totalTaxPaid > 0 ? (
                      <MetricCard
                        label="Total Tax Paid"
                        value={`$${totalTaxPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      />
                    ) : null;
                  })()}
                </div>

                <div className="status-grid">
                  <article className="status-card">
                    <div className="card-label">Financial Vibe</div>
                    <div className="card-value">
                      <StatusBadge status={result.vibeState} />
                    </div>
                  </article>
                  <article className="status-card">
                    <div className="card-label">Behavioral State</div>
                    <div className="card-value">
                      <StatusBadge status={result.petState} />
                    </div>
                  </article>
                  <article className="status-card">
                    <div className="card-label">Balance Range (P5 - P95)</div>
                    <div className="card-value range-text">
                      $
                      {result.finalBalance.p5.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                      {'  -  '}$
                      {result.finalBalance.p95.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </article>
                </div>

                <div className="chart-container">
                  <h3>Balance Trajectory</h3>
                  <BalanceChart snapshots={result.snapshots} />
                </div>

                {/* Behavioral Metrics from last snapshot */}
                {result.snapshots.length > 0 &&
                  (() => {
                    const lastSnap = result.snapshots[result.snapshots.length - 1];
                    if (lastSnap.taxPaid === undefined || lastSnap.taxPaid <= 0) return null;
                    return (
                      <div className="status-grid" style={{ marginTop: '1.5rem' }}>
                        <article className="status-card">
                          <div className="card-label">Tax Paid (today)</div>
                          <div className="card-value">${lastSnap.taxPaid.toFixed(2)}</div>
                        </article>
                      </div>
                    );
                  })()}

                {/* Branch Comparison */}
                {branchResult && branchResult.deltas && (
                  <motion.div
                    className="branch-comparison"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <h3>Branch Comparison</h3>
                    <p className="branch-summary">
                      Branched at day {branchResult.branchAtDay}: vibe shifted from{' '}
                      <strong>{branchResult.deltas.vibeStateChange.from}</strong> to{' '}
                      <strong>{branchResult.deltas.vibeStateChange.to}</strong>.
                    </p>
                    <div className="card-grid">
                      <MetricCard
                        label="Balance Delta"
                        value={`${branchResult.deltas.finalBalanceDiff >= 0 ? '+' : ''}$${branchResult.deltas.finalBalanceDiff.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                        variant={branchResult.deltas.finalBalanceDiff >= 0 ? 'success' : 'danger'}
                      />
                      <MetricCard
                        label="Collapse Prob. Delta"
                        value={`${branchResult.deltas.collapseProbabilityDiff >= 0 ? '+' : ''}${(branchResult.deltas.collapseProbabilityDiff * 100).toFixed(1)}%`}
                        variant={
                          branchResult.deltas.collapseProbabilityDiff <= 0 ? 'success' : 'danger'
                        }
                      />
                      <MetricCard
                        label="Credit Score Delta"
                        value={`${branchResult.deltas.creditScoreDiff >= 0 ? '+' : ''}${branchResult.deltas.creditScoreDiff.toFixed(0)}`}
                        variant={branchResult.deltas.creditScoreDiff >= 0 ? 'success' : 'danger'}
                      />
                      <MetricCard
                        label="NAV Delta"
                        value={`${branchResult.deltas.navDiff >= 0 ? '+' : ''}$${branchResult.deltas.navDiff.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                        variant={branchResult.deltas.navDiff >= 0 ? 'success' : 'danger'}
                      />
                      <MetricCard
                        label="Vibe Improved?"
                        value={
                          branchResult.deltas.vibeStateChange.from !==
                          branchResult.deltas.vibeStateChange.to
                            ? 'Changed'
                            : 'Same'
                        }
                        variant={
                          branchResult.deltas.vibeStateChange.from !==
                          branchResult.deltas.vibeStateChange.to
                            ? 'success'
                            : 'warning'
                        }
                      />
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </motion.section>

          <motion.aside
            className="engine-sidebar"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.56, delay: 0.14, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <article className="engine-note-card">
              <h3>Execution Protocol</h3>
              <ol className="engine-note-list">
                {ENGINE_PROTOCOL.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </article>

            <article className="engine-note-card engine-note-accent">
              <h3>Model Integrity</h3>
              <p>
                Every run is seed-locked for replay consistency. Compare branch outcomes using the
                same seed to isolate parameter impact instead of random drift.
              </p>
            </article>
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
