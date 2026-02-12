import { useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  SimulationInput,
  SimulationOutput,
  BranchComparisonResult,
} from '@future-wallet/shared-types';
import { runSimulation, runComparison } from '../api';
import { SimulationForm } from '../components/SimulationForm';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingStates';
import { InfoTip } from '../components/InfoTip';
import {
  BalanceChart,
  CashFlowChart,
  CreditScoreChart,
  DebtChart,
  TaxChart,
  HealthIndicatorsChart,
} from '../components/charts';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  getCollapseVariant,
  getCreditVariant,
} from '../utils';
import {
  DollarSign,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  Droplets,
  Shield,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  GitBranch,
  Clock,
  Hash,
  Globe,
  BarChart3,
  BookOpen,
  Lightbulb,
  Play,
} from 'lucide-react';

export function SimulatePage() {
  const [result, setResult] = useState<SimulationOutput | null>(null);
  const [branchResult, setBranchResult] = useState<BranchComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSimulate(input: SimulationInput) {
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
  }

  async function handleBranch(
    base: SimulationInput,
    branchDay: number,
    modified: Partial<SimulationInput>,
  ) {
    setLoading(true);
    setError(null);
    try {
      const comparison = await runComparison(base, branchDay, modified);
      setBranchResult(comparison);
      setResult(comparison.baseline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Branch comparison failed');
    } finally {
      setLoading(false);
    }
  }

  const snapshots = result?.snapshots ?? [];
  const totalTaxPaid = snapshots.reduce(
    (sum, s) => sum + (s.taxPaid ?? 0) + (s.capitalGainsTax ?? 0),
    0,
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-ink-muted mb-3">
          <Link to="/" className="hover:text-rust transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-ink font-medium">Simulator</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-1.5 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-rust" />
              Financial Simulator
            </h1>
            <p className="text-sm text-ink-muted max-w-xl">
              Configure your scenario, run the engine, and explore interactive results. Every
              simulation is deterministic — same inputs, same outputs, every time.
            </p>
          </div>
          <Link
            to="/learn"
            className="flex items-center gap-1.5 text-xs font-medium text-terra hover:text-terra-light transition-colors shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Need help understanding the results?
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-[400px_1fr] gap-8">
        {/* Left: Form */}
        <div className="min-w-0">
          <div className="sticky top-20">
            <SimulationForm
              onSubmit={handleSimulate}
              onBranch={handleBranch}
              loading={loading}
              hasResult={!!result}
            />
          </div>
        </div>

        {/* Right: Results */}
        <div className="min-w-0 space-y-6">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-danger/30 bg-danger/5 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-danger">Simulation Error</p>
                <p className="text-xs text-ink-muted mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <LoadingSpinner />
              <p className="text-sm text-ink-muted mt-4 animate-pulse-soft">
                Running simulation...
              </p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !result && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-surface-alt flex items-center justify-center mb-5 border border-border">
                <Play className="w-10 h-10 text-ink-muted/30" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">Ready to Simulate</h3>
              <p className="text-sm text-ink-muted max-w-md mb-6">
                Configure your financial scenario in the form and click{' '}
                <span className="font-semibold text-rust">&quot;Run Simulation&quot;</span> to
                generate comprehensive results with 6 interactive charts and key metrics.
              </p>

              {/* Quick tips */}
              <div className="w-full max-w-sm space-y-2">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-alt border border-border text-left">
                  <Lightbulb className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <p className="text-xs text-ink-muted leading-relaxed">
                    <span className="font-semibold text-ink-soft">Quick start:</span> The default
                    values model a $10K balance with $5K/month salary and basic expenses. Just click
                    Run.
                  </p>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-alt border border-border text-left">
                  <GitBranch className="w-4 h-4 text-terra shrink-0 mt-0.5" />
                  <p className="text-xs text-ink-muted leading-relaxed">
                    <span className="font-semibold text-ink-soft">What-If:</span> After your first
                    run, open the &quot;What-If Branch&quot; section to compare alternative
                    scenarios.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && result && (
            <div className="space-y-6 animate-fade-in">
              {/* Summary banner */}
              <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <h2 className="text-base font-bold text-ink">Simulation Results</h2>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-muted">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Seed {result.seed}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {result.horizonDays} days
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {result.baseCurrency}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(result.computedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                {/* Status badges */}
                <div className="flex flex-wrap gap-3">
                  <StatusBadge label="Financial Vibe" status={result.vibeState} />
                  <StatusBadge label="Pet Status" status={result.petState} />
                  {result.collapseDay != null && (
                    <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-danger/30 bg-danger/10 text-sm font-medium text-danger">
                      <AlertTriangle className="w-4 h-4" />
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider opacity-70 leading-none">
                          Collapse Day
                        </span>
                        <span className="font-semibold leading-tight mt-0.5">
                          Day {result.collapseDay}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Key Metrics */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-ink">Key Metrics</h2>
                  <InfoTip content="These are the final values at the end of your simulation period. Each metric tells a different part of your financial story." />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
                  <MetricCard
                    label="Final Balance"
                    value={formatCurrency(result.finalBalance.expected)}
                    subtitle={`Range: ${formatCurrency(result.finalBalance.p5)} — ${formatCurrency(result.finalBalance.p95)}`}
                    icon={<Wallet className="w-4 h-4" />}
                    tooltip="Your projected cash balance at the end of the simulation. The range shows P5-P95 from Monte Carlo runs — 90% of scenarios fall within this band."
                    variant={result.finalBalance.expected >= 0 ? 'success' : 'danger'}
                  />
                  <MetricCard
                    label="Collapse Probability"
                    value={formatPercent(result.collapseProbability)}
                    icon={<AlertTriangle className="w-4 h-4" />}
                    tooltip="The probability your finances reach a 'collapsed' state during the simulation. Below 10% is healthy. Above 40% requires action."
                    variant={getCollapseVariant(result.collapseProbability)}
                  />
                  <MetricCard
                    label="Credit Score"
                    value={formatNumber(result.finalCreditScore)}
                    subtitle={
                      result.finalCreditScore >= 700
                        ? 'Good'
                        : result.finalCreditScore >= 550
                          ? 'Fair'
                          : 'Poor'
                    }
                    icon={<CreditCard className="w-4 h-4" />}
                    tooltip="Simulated credit score (0-850). Based on debt-to-income ratio, payment history, and overall health. 700+ is 'Good', 550-700 is 'Fair'."
                    variant={getCreditVariant(result.finalCreditScore)}
                  />
                  <MetricCard
                    label="Net Asset Value"
                    value={formatCurrency(result.finalNAV)}
                    icon={<TrendingUp className="w-4 h-4" />}
                    tooltip="Total value of all your assets converted to your base currency. Includes stocks, bonds, real estate, and other holdings."
                  />
                  <MetricCard
                    label="Liquidity Ratio"
                    value={result.finalLiquidityRatio.toFixed(2)}
                    icon={<Droplets className="w-4 h-4" />}
                    tooltip="Liquid assets divided by short-term obligations. Above 1.0 means you can easily cover your debts. Below 1.0 means you might face cash crunches."
                    variant={
                      result.finalLiquidityRatio >= 1
                        ? 'success'
                        : result.finalLiquidityRatio >= 0.5
                          ? 'warning'
                          : 'danger'
                    }
                  />
                  <MetricCard
                    label="Shock Resilience"
                    value={`${result.shockResilienceIndex.toFixed(0)}/100`}
                    icon={<Shield className="w-4 h-4" />}
                    tooltip="How well your finances can absorb unexpected shocks (0-100). Above 60 is resilient. Below 30 is fragile and at risk of collapse."
                    variant={
                      result.shockResilienceIndex >= 60
                        ? 'success'
                        : result.shockResilienceIndex >= 30
                          ? 'warning'
                          : 'danger'
                    }
                  />
                  {totalTaxPaid > 0 && (
                    <MetricCard
                      label="Total Tax Paid"
                      value={formatCurrency(totalTaxPaid)}
                      icon={<DollarSign className="w-4 h-4" />}
                      tooltip="Sum of all income taxes and capital gains taxes paid across the entire simulation period."
                    />
                  )}
                </div>
              </div>

              {/* Charts */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-ink">Charts & Analysis</h2>
                  <InfoTip content="Interactive charts showing different aspects of your financial trajectory. Hover over any chart to see exact values for each day." />
                </div>
                <div className="space-y-4">
                  <BalanceChart
                    snapshots={snapshots}
                    branchSnapshots={branchResult?.branch.snapshots}
                    collapseDay={result.collapseDay}
                  />
                  <div className="grid lg:grid-cols-2 gap-4">
                    <CashFlowChart snapshots={snapshots} />
                    <CreditScoreChart snapshots={snapshots} />
                  </div>
                  <div className="grid lg:grid-cols-2 gap-4">
                    <DebtChart snapshots={snapshots} />
                    <TaxChart snapshots={snapshots} />
                  </div>
                  <HealthIndicatorsChart snapshots={snapshots} />
                </div>
              </div>

              {/* Branch Comparison */}
              {branchResult && (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-2 mb-3">
                    <GitBranch className="w-4 h-4 text-terra" />
                    <h2 className="text-sm font-semibold text-ink">Branch Comparison</h2>
                    <InfoTip content="This shows the difference between your baseline scenario and the what-if branch. Positive values mean the branch performs better." />
                  </div>
                  <p className="text-xs text-ink-muted mb-3">
                    Branch diverges at day {branchResult.branchAtDay}. Deltas show (branch -
                    baseline).
                  </p>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
                    <DeltaCard
                      label="Balance Impact"
                      value={branchResult.deltas.finalBalanceDiff}
                      format="currency"
                    />
                    <DeltaCard
                      label="Collapse Prob"
                      value={branchResult.deltas.collapseProbabilityDiff}
                      format="percent"
                      invertColor
                    />
                    <DeltaCard
                      label="Credit Score"
                      value={branchResult.deltas.creditScoreDiff}
                      format="number"
                    />
                    <DeltaCard
                      label="NAV Impact"
                      value={branchResult.deltas.navDiff}
                      format="currency"
                    />
                    <DeltaCard
                      label="Liquidity"
                      value={branchResult.deltas.liquidityRatioDiff}
                      format="ratio"
                    />
                    <DeltaCard
                      label="Shock Resilience"
                      value={branchResult.deltas.shockResilienceIndexDiff}
                      format="number"
                    />
                  </div>
                  {/* State changes */}
                  <div className="flex flex-wrap gap-3 mt-3">
                    <div className="flex items-center gap-2 text-xs text-ink-muted px-3 py-2 rounded-lg bg-surface-alt border border-border">
                      <span className="font-medium">Vibe:</span>
                      <span className="capitalize">{branchResult.deltas.vibeStateChange.from}</span>
                      <ArrowSeparator />
                      <span className="capitalize font-semibold">
                        {branchResult.deltas.vibeStateChange.to}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ink-muted px-3 py-2 rounded-lg bg-surface-alt border border-border">
                      <span className="font-medium">Pet:</span>
                      <span className="capitalize">{branchResult.deltas.petStateChange.from}</span>
                      <ArrowSeparator />
                      <span className="capitalize font-semibold">
                        {branchResult.deltas.petStateChange.to}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delta card for branch comparison                                    */
/* ------------------------------------------------------------------ */

function ArrowSeparator() {
  return <span className="text-ink-muted">→</span>;
}

function DeltaCard({
  label,
  value,
  format,
  invertColor,
}: {
  label: string;
  value: number;
  format: 'currency' | 'percent' | 'number' | 'ratio';
  invertColor?: boolean;
}) {
  const positive = invertColor ? value < 0 : value > 0;
  const negative = invertColor ? value > 0 : value < 0;
  const color = positive ? 'text-success' : negative ? 'text-danger' : 'text-ink-muted';

  let formatted: string;
  switch (format) {
    case 'currency':
      formatted = formatCurrency(Math.abs(value));
      break;
    case 'percent':
      formatted = formatPercent(Math.abs(value));
      break;
    case 'ratio':
      formatted = Math.abs(value).toFixed(2);
      break;
    default:
      formatted = formatNumber(Math.abs(value), 1);
  }

  const prefix = value > 0 ? '+' : value < 0 ? '-' : '';

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <span className="text-[10px] font-medium text-ink-muted uppercase tracking-wide">
        {label}
      </span>
      <div className={`flex items-center gap-1.5 mt-1 ${color}`}>
        {value > 0 && <ArrowUpRight className="w-4 h-4" />}
        {value < 0 && <ArrowDownRight className="w-4 h-4" />}
        {value === 0 && <Minus className="w-4 h-4" />}
        <span className="text-lg font-bold tabular-nums">
          {prefix}
          {formatted}
        </span>
      </div>
    </div>
  );
}
