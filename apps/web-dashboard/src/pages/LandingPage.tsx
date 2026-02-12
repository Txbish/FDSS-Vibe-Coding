import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Brain,
  Calculator,
  CheckCircle2,
  GitBranch,
  Globe,
  LineChart,
  Play,
  Shield,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const PREVIEW_BALANCE = Array.from({ length: 60 }, (_, i) => ({
  day: i * 6,
  baseline: 10000 + i * 120 + Math.sin(i * 0.4) * 800,
  optimized: 10000 + i * 180 + Math.sin(i * 0.3) * 600,
}));

const PREVIEW_RISK = [
  { scenario: 'Conservative', return: 6.2, risk: 4.1 },
  { scenario: 'Balanced', return: 11.8, risk: 9.3 },
  { scenario: 'Aggressive', return: 18.4, risk: 16.7 },
  { scenario: 'Speculative', return: 24.1, risk: 28.5 },
];

const AUDIENCE_SEGMENTS = [
  {
    icon: Users,
    title: 'Young Professionals',
    description:
      'Building your first financial plan? See exactly how your salary, rent, and savings goals play out over 1-5 years.',
  },
  {
    icon: Target,
    title: 'Freelancers & Gig Workers',
    description:
      'Irregular income makes planning hard. Model multiple income streams with different frequencies and see your real risk level.',
  },
  {
    icon: TrendingUp,
    title: 'Financial Advisors',
    description:
      'Show clients data-driven projections. Compare scenarios side-by-side with reproducible, deterministic results.',
  },
];

const CAPABILITIES = [
  {
    icon: Brain,
    title: 'Deterministic Engine',
    description:
      'Same inputs always produce identical results. No hidden randomness — every simulation is reproducible and verifiable.',
    stat: '100%',
    statLabel: 'Reproducible',
  },
  {
    icon: BarChart3,
    title: 'Monte Carlo Analysis',
    description:
      'Run up to 1,000 parallel simulations with slight variations to estimate probability distributions and confidence intervals.',
    stat: '1,000',
    statLabel: 'Max Scenarios',
  },
  {
    icon: GitBranch,
    title: 'What-If Branching',
    description:
      'Compare your baseline against alternatives. See exactly how a raise, new expense, or market shift changes your future.',
    stat: '6+',
    statLabel: 'Delta Metrics',
  },
  {
    icon: Globe,
    title: 'Multi-Currency',
    description:
      'Handle income, expenses, and assets in different currencies with configurable exchange rate volatility.',
    stat: '10+',
    statLabel: 'Currencies',
  },
  {
    icon: Shield,
    title: 'Risk Assessment',
    description:
      'Credit score, shock resilience, liquidity ratio, and collapse probability — all computed for every simulated day.',
    stat: '12',
    statLabel: 'Daily Metrics',
  },
  {
    icon: Calculator,
    title: 'Tax Simulation',
    description:
      'Progressive income tax brackets and capital gains tax applied automatically. Track cumulative tax burden over time.',
    stat: '6',
    statLabel: 'Tax Brackets',
  },
];

const METRICS_HIGHLIGHTS = [
  { label: 'Balance Trajectory', desc: 'Day-by-day cash balance with P5-P95 confidence bands' },
  { label: 'Cash Flow Analysis', desc: 'Income vs. expenses vs. net flow, visualized daily' },
  { label: 'Credit Score Tracking', desc: '0-850 score with Good/Fair/Poor zone indicators' },
  { label: 'Debt Payoff Curve', desc: 'Watch total debt decline as payments outpace interest' },
  { label: 'Tax Burden Chart', desc: 'Cumulative income tax and capital gains over the horizon' },
  { label: 'Health Indicators', desc: 'Liquidity ratio and shock resilience on a dual-axis chart' },
];

const SOCIAL_PROOF = [
  {
    metric: '12+',
    label: 'Metrics per day',
    detail: 'Every simulated day produces 12 financial data points',
  },
  {
    metric: '6',
    label: 'Interactive charts',
    detail: 'Balance, cash flow, credit, debt, tax, and health',
  },
  {
    metric: '234',
    label: 'Backend tests',
    detail: 'Production-grade simulation engine, fully tested',
  },
  {
    metric: '< 2s',
    label: 'Simulation time',
    detail: '365-day simulation with 100 Monte Carlo runs',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      {/* ==================== HERO ==================== */}
      <section className="relative py-20 sm:py-28 lg:py-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rust/10 text-rust text-xs font-medium mb-6">
              <Zap className="w-3 h-3" />
              DATAFEST 2026 — Financial Simulation Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink tracking-tight leading-[1.1] mb-6">
              Know Your Financial Future <span className="text-rust">Before It Happens</span>
            </h1>
            <p className="text-lg sm:text-xl text-ink-muted leading-relaxed mb-4 max-w-2xl mx-auto">
              Future Wallet simulates your complete financial life — income, expenses, debt, assets,
              taxes, and exchange rates — day by day, for up to 10 years. See every possible outcome
              before making a single decision.
            </p>
            <p className="text-sm text-ink-muted/80 mb-8 max-w-xl mx-auto">
              Trusted by financial planners. Built for anyone who wants to make smarter money
              decisions with data, not guesswork.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/simulate"
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-rust text-white font-semibold text-sm hover:bg-rust-light shadow-sm hover:shadow-md transition-all"
              >
                <Play className="w-4 h-4" />
                Try the Simulator Free
              </Link>
              <Link
                to="/learn"
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl border border-border text-ink font-semibold text-sm hover:bg-surface-alt transition-all"
              >
                How It Works
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative gradient */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-rust/5 via-transparent to-transparent rounded-full blur-3xl" />
        </div>
      </section>

      {/* ==================== SOCIAL PROOF BAR ==================== */}
      <section className="py-8 border-y border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {SOCIAL_PROOF.map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-rust">{item.metric}</div>
                <div className="text-sm font-semibold text-ink mt-0.5">{item.label}</div>
                <div className="text-[11px] text-ink-muted mt-0.5">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== WHO IT'S FOR ==================== */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">
              Built for People Who Plan Ahead
            </h2>
            <p className="text-sm text-ink-muted max-w-xl mx-auto">
              Whether you are just starting out or advising others, Future Wallet gives you the
              financial clarity that spreadsheets cannot.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 stagger-children">
            {AUDIENCE_SEGMENTS.map((seg) => (
              <div
                key={seg.title}
                className="rounded-xl border border-border bg-surface p-6 hover:shadow-sm hover:border-border-strong transition-all text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-rust/10 flex items-center justify-center mx-auto mb-4">
                  <seg.icon className="w-6 h-6 text-rust" />
                </div>
                <h3 className="text-base font-semibold text-ink mb-2">{seg.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{seg.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PRODUCT PREVIEW ==================== */}
      <section className="py-16 bg-surface-alt/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">See the Full Picture</h2>
            <p className="text-sm text-ink-muted max-w-xl mx-auto">
              Real-time interactive charts powered by simulation data. Every data point is a
              simulated day of your financial life.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Balance preview */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold text-ink mb-1">Balance Trajectory</h3>
              <p className="text-xs text-ink-muted mb-4">
                Baseline vs. optimized scenario over 360 days
              </p>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={PREVIEW_BALANCE}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="prevBase" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2a5a42" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#2a5a42" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="prevOpt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c85228" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#c85228" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d5" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: '#7a756c' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#7a756c' }}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                      tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#f8f6f1',
                        border: '1px solid #e5e0d5',
                        borderRadius: '10px',
                        fontSize: '11px',
                      }}
                      formatter={(v: number, name: string) => [
                        `$${v.toFixed(0)}`,
                        name === 'baseline' ? 'Baseline' : 'Optimized',
                      ]}
                      labelFormatter={(d: number) => `Day ${d}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="baseline"
                      stroke="#2a5a42"
                      strokeWidth={2}
                      fill="url(#prevBase)"
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="optimized"
                      stroke="#c85228"
                      strokeWidth={2}
                      fill="url(#prevOpt)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Risk profile preview */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold text-ink mb-1">Risk vs. Return</h3>
              <p className="text-xs text-ink-muted mb-4">
                Compare scenarios across the risk-return spectrum
              </p>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={PREVIEW_RISK} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d5" />
                    <XAxis
                      dataKey="scenario"
                      tick={{ fontSize: 10, fill: '#7a756c' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#7a756c' }}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#f8f6f1',
                        border: '1px solid #e5e0d5',
                        borderRadius: '10px',
                        fontSize: '11px',
                      }}
                      formatter={(v: number, name: string) => [
                        `${v}%`,
                        name === 'return' ? 'Return' : 'Risk',
                      ]}
                    />
                    <Bar dataKey="return" fill="#2a5a42" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="risk" fill="#c85228" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CAPABILITIES ==================== */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">
              Enterprise-Grade Engine, Zero Complexity
            </h2>
            <p className="text-sm text-ink-muted max-w-xl mx-auto">
              Under the hood, Future Wallet runs a production-grade deterministic simulation engine
              with 234 passing tests. You get the power without the complexity.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
            {CAPABILITIES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-surface p-5 hover:shadow-sm hover:border-border-strong transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-rust/10 flex items-center justify-center group-hover:bg-rust/15 transition-colors">
                    <f.icon className="w-5 h-5 text-rust" />
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-ink leading-none">{f.stat}</div>
                    <div className="text-[10px] text-ink-muted uppercase tracking-wider">
                      {f.statLabel}
                    </div>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-ink mb-2">{f.title}</h3>
                <p className="text-xs text-ink-muted leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== WHAT YOU GET ==================== */}
      <section className="py-16 bg-surface-alt/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">
              Every Simulation Delivers
            </h2>
            <p className="text-sm text-ink-muted max-w-xl mx-auto">
              Six interactive charts and a full metrics dashboard, generated from your scenario in
              seconds.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {METRICS_HIGHLIGHTS.map((m) => (
              <div
                key={m.label}
                className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface hover:border-border-strong transition-all"
              >
                <CheckCircle2 className="w-5 h-5 text-terra shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-ink mb-0.5">{m.label}</h4>
                  <p className="text-xs text-ink-muted leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS (brief) ==================== */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">
              Three Steps to Financial Clarity
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto stagger-children">
            {[
              {
                step: '1',
                title: 'Configure Your Scenario',
                desc: 'Enter your income, expenses, assets, and debts. Start simple — even one income and one expense gives useful results.',
                icon: LineChart,
              },
              {
                step: '2',
                title: 'Run the Simulation',
                desc: 'The engine processes each day: credits income, debits expenses, accrues interest, fluctuates markets, and computes health scores.',
                icon: Zap,
              },
              {
                step: '3',
                title: 'Explore & Compare',
                desc: 'View 6 interactive charts, key metrics, and run what-if branches to compare decisions side by side.',
                icon: GitBranch,
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-rust/10 flex items-center justify-center mx-auto mb-4">
                  <s.icon className="w-7 h-7 text-rust" />
                </div>
                <div className="text-[10px] font-bold text-rust uppercase tracking-widest mb-2">
                  Step {s.step}
                </div>
                <h3 className="text-base font-semibold text-ink mb-2">{s.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              to="/learn"
              className="inline-flex items-center gap-2 text-sm font-medium text-rust hover:text-rust-light transition-colors"
            >
              Read the full guide
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-20 bg-surface-alt/50">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-4">
            Stop Guessing. Start Simulating.
          </h2>
          <p className="text-sm text-ink-muted mb-8 max-w-lg mx-auto">
            Your financial future is too important for guesswork. Set up your scenario in under 2
            minutes and see every possible outcome — backed by a deterministic engine with 234
            passing tests.
          </p>
          <Link
            to="/simulate"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-rust text-white font-semibold text-sm hover:bg-rust-light shadow-sm hover:shadow-md transition-all"
          >
            <Play className="w-4 h-4" />
            Launch Simulator
          </Link>
        </div>
      </section>
    </div>
  );
}
