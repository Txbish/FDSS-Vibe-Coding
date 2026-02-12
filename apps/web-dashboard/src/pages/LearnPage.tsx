import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Calculator,
  CreditCard,
  DollarSign,
  Droplets,
  GitBranch,
  Globe,
  HelpCircle,
  LineChart,
  Play,
  Shield,
  TrendingUp,
  Zap,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const GLOSSARY = [
  {
    term: 'Balance',
    icon: DollarSign,
    simple: 'The money you currently have available to spend or save.',
    detail:
      'Your cash balance changes every simulated day as income arrives and expenses are paid. If it drops to zero, non-essential expenses get skipped automatically.',
  },
  {
    term: 'Net Asset Value (NAV)',
    icon: TrendingUp,
    simple:
      'The total value of everything you own (cash + investments), converted to one currency.',
    detail:
      'NAV includes liquid assets like savings, volatile assets like stocks, yield-generating assets like bonds, and illiquid assets like real estate. Each is valued daily based on market fluctuations.',
  },
  {
    term: 'Credit Score',
    icon: CreditCard,
    simple:
      'A number from 0 to 850 that represents how "creditworthy" your simulated finances are.',
    detail:
      'Calculated based on your debt-to-income ratio, whether you make payments on time, and your overall financial health. 700+ is Good, 550-700 is Fair, below 550 is Poor.',
  },
  {
    term: 'Collapse Probability',
    icon: Shield,
    simple: 'The chance your finances could reach a "collapsed" state during the simulation.',
    detail:
      'Estimated by running many simulations (Monte Carlo) with slight variations. A 5% collapse probability means 5 out of 100 scenarios ended in financial collapse. Below 10% is healthy.',
  },
  {
    term: 'Liquidity Ratio',
    icon: Droplets,
    simple: 'How easily you can cover your short-term debts with available cash and liquid assets.',
    detail:
      'Calculated as liquid assets divided by short-term obligations. Above 1.0 means you have more liquid money than you owe short-term. Below 1.0 means you might not be able to pay all your bills on time.',
  },
  {
    term: 'Shock Resilience Index',
    icon: Zap,
    simple: 'A score from 0-100 showing how well your finances can handle unexpected events.',
    detail:
      'Considers your savings buffer, income diversity, debt levels, and asset diversification. Above 60 means you are resilient. Below 30 means a single unexpected expense could cause a cascade of problems.',
  },
  {
    term: 'Monte Carlo Simulation',
    icon: BarChart3,
    simple:
      'Running the same scenario hundreds of times with tiny random variations to see the range of possible outcomes.',
    detail:
      'Instead of getting one answer, you get a probability distribution. The P5-P95 range means "90% of scenarios fell within this range." More runs = more accurate estimates.',
  },
  {
    term: 'What-If Branch',
    icon: GitBranch,
    simple:
      'A way to ask "What would happen if I changed something?" and compare it to your original plan.',
    detail:
      'You pick a day to diverge, change some parameters (like a raise or new expense), and the engine runs both scenarios. You see exact numerical differences for every metric.',
  },
  {
    term: 'Deterministic Simulation',
    icon: Brain,
    simple: 'The same inputs always produce the exact same outputs. Nothing is hidden or random.',
    detail:
      'Even the "random" parts (like market fluctuations) use a seed number. Same seed + same inputs = identical results. This makes simulations reproducible and verifiable.',
  },
  {
    term: 'Vibe State',
    icon: LineChart,
    simple:
      'A plain-English label for your overall financial mood: Thriving, Stable, Strained, Critical, or Collapsed.',
    detail:
      'Derived from a combination of balance trajectory, debt burden, credit score, and resilience. It is a quick at-a-glance summary so you do not need to parse every number.',
  },
  {
    term: 'Exchange Rate Volatility',
    icon: Globe,
    simple: 'How much a currency exchange rate can fluctuate day to day.',
    detail:
      'A volatility of 0 means the rate is fixed. A volatility of 0.01 means the rate can move about 1% per day up or down. Important for multi-currency scenarios.',
  },
  {
    term: 'Tax Brackets',
    icon: Calculator,
    simple:
      'Different portions of your income are taxed at different rates (progressive taxation).',
    detail:
      'For example, the first $11,600 might be taxed at 10%, the next $35,550 at 12%, and so on. Only the portion within each bracket is taxed at that rate, not your entire income.',
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    number: '01',
    title: 'Enter Your Financial Scenario',
    description:
      'Start with your current cash balance, then add income streams (salary, freelance, etc.), recurring expenses (rent, food, subscriptions), any assets you own, and debts you owe. You can also configure tax rules and currency exchange rates.',
    tip: 'Start simple. You can always add complexity later. Even just a balance + one income + one expense gives meaningful results.',
  },
  {
    number: '02',
    title: 'The Engine Simulates Day by Day',
    description:
      'For each day in your time horizon (e.g., 365 days), the engine processes everything in order: credits income, debits expenses, accrues interest on debt, fluctuates asset values, computes taxes, and updates all health metrics.',
    tip: 'Every step is deterministic. The same seed number guarantees identical results, so you can share and reproduce simulations.',
  },
  {
    number: '03',
    title: 'Monte Carlo Runs (Optional)',
    description:
      'If enabled, the engine runs your scenario 100+ times with tiny random variations. This gives you confidence intervals: instead of "you will have $15,000", you get "90% of scenarios end between $12,000 and $18,000".',
    tip: 'More runs = more accurate probability estimates. 100 runs is a good default; 500+ is recommended for important decisions.',
  },
  {
    number: '04',
    title: 'Explore Interactive Results',
    description:
      'View 6+ interactive charts covering balance trajectory, income vs. expenses, credit score, debt, tax burden, and health indicators. Every chart has tooltips explaining what you are looking at.',
    tip: 'Hover over any data point to see the exact values. The charts are not just pretty pictures; they are tools for understanding your financial trajectory.',
  },
  {
    number: '05',
    title: 'Run What-If Comparisons',
    description:
      'Curious what happens if you get a raise? Or take on more debt? Use the What-If Branch feature to compare two scenarios side by side. You will see exact numerical deltas for every metric.',
    tip: 'Great for decision-making. "Should I take this new job?" becomes a quantifiable comparison rather than guesswork.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LearnPage() {
  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-terra/10 text-terra text-xs font-medium mb-6">
            <BookOpen className="w-3 h-3" />
            Learning Center
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink tracking-tight leading-[1.1] mb-4">
            Understand Your <span className="text-terra">Financial Simulation</span>
          </h1>
          <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl mx-auto">
            No finance degree required. This page explains every concept, metric, and chart you will
            encounter in plain English.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-surface-alt/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">
              How the Simulator Works
            </h2>
            <p className="text-sm text-ink-muted max-w-xl mx-auto">
              From entering your data to getting actionable insights, here is the complete process.
            </p>
          </div>

          <div className="space-y-6">
            {HOW_IT_WORKS_STEPS.map((step) => (
              <div
                key={step.number}
                className="rounded-xl border border-border bg-surface p-5 sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rust/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-rust">{step.number}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-ink mb-2">{step.title}</h3>
                    <p className="text-sm text-ink-muted leading-relaxed mb-3">
                      {step.description}
                    </p>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-gold/5 border border-gold/20">
                      <HelpCircle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                      <p className="text-xs text-ink-soft leading-relaxed">
                        <span className="font-semibold">Tip:</span> {step.tip}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Glossary */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">
              Financial Terms Explained
            </h2>
            <p className="text-sm text-ink-muted max-w-xl mx-auto">
              Every metric and concept used in the simulator, explained in simple language with
              additional technical detail for those who want it.
            </p>
          </div>

          <div className="space-y-4 stagger-children">
            {GLOSSARY.map((item) => (
              <details
                key={item.term}
                className="group rounded-xl border border-border bg-surface overflow-hidden"
              >
                <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none hover:bg-surface-alt/50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                  <div className="w-9 h-9 rounded-lg bg-rust/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-rust" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-ink">{item.term}</h3>
                    <p className="text-xs text-ink-muted mt-0.5">{item.simple}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-muted group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <div className="px-5 pb-4 pt-0">
                  <div className="ml-12 p-3 rounded-lg bg-surface-alt border border-border">
                    <p className="text-xs text-ink-soft leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Charts Explained */}
      <section className="py-16 bg-surface-alt/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">
              Understanding the Charts
            </h2>
            <p className="text-sm text-ink-muted max-w-xl mx-auto">
              Each chart in the simulator shows a different dimension of your financial health. Here
              is what to look for.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <ChartExplainer
              title="Balance Trajectory"
              icon={<TrendingUp className="w-4 h-4 text-rust" />}
              whatItShows="Your cash balance over time, plotted day by day. If Monte Carlo is enabled, you also see the P5-P95 confidence band."
              whatToLookFor="An upward trend is good. If the line dips toward zero, you might be spending more than you earn. The collapse day marker (if present) shows when finances hit critical."
              color="rust"
            />
            <ChartExplainer
              title="Cash Flow Analysis"
              icon={<BarChart3 className="w-4 h-4 text-terra" />}
              whatItShows="Daily income (green bars) vs. expenses (red bars) vs. net cash flow (line). Shows the rhythm of money in and money out."
              whatToLookFor="Consistent positive net cash flow is ideal. Spikes in expenses may indicate one-time payments. Patterns reveal seasonal or periodic cash crunches."
              color="terra"
            />
            <ChartExplainer
              title="Credit Score"
              icon={<CreditCard className="w-4 h-4 text-gold" />}
              whatItShows="Your simulated credit score (0-850) over time with colored zones: Green (Good, 700+), Yellow (Fair, 550-700), Red (Poor, below 550)."
              whatToLookFor="A stable or rising score indicates healthy financial habits. Drops correlate with increasing debt or missed payments. Staying in the green zone is the goal."
              color="gold"
            />
            <ChartExplainer
              title="Debt Tracking"
              icon={<CreditCard className="w-4 h-4 text-rust" />}
              whatItShows="Total outstanding debt over time. Only appears if you have liabilities configured."
              whatToLookFor="A downward trend means you are paying off debt faster than interest accrues. If the line is flat or rising, your minimum payments may not be enough."
              color="rust"
            />
            <ChartExplainer
              title="Tax Burden"
              icon={<Calculator className="w-4 h-4 text-terra" />}
              whatItShows="Cumulative income tax and capital gains tax paid throughout the simulation. Only appears if tax configuration is enabled."
              whatToLookFor="The slope indicates your tax rate. Steeper slopes mean higher effective tax rates. Capital gains tax appears in spikes when assets are sold at a profit."
              color="terra"
            />
            <ChartExplainer
              title="Health Indicators"
              icon={<Shield className="w-4 h-4 text-gold" />}
              whatItShows="Two metrics on one chart: liquidity ratio (left axis) and shock resilience index (right axis), both over time."
              whatToLookFor="Liquidity ratio above 1.0 means you can cover obligations. Shock resilience above 60 means you can absorb surprises. Both declining simultaneously is a warning sign."
              color="gold"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-4">Ready to Try It?</h2>
          <p className="text-sm text-ink-muted mb-8 max-w-lg mx-auto">
            Now that you understand the concepts, jump into the simulator and explore your own
            financial scenarios. Start with the defaults and experiment from there.
          </p>
          <Link
            to="/simulate"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-rust text-white font-semibold text-sm hover:bg-rust-light shadow-sm hover:shadow-md transition-all"
          >
            <Play className="w-4 h-4" />
            Open Simulator
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart explainer card                                                */
/* ------------------------------------------------------------------ */

function ChartExplainer({
  title,
  icon,
  whatItShows,
  whatToLookFor,
  color,
}: {
  title: string;
  icon: React.ReactNode;
  whatItShows: string;
  whatToLookFor: string;
  color: 'rust' | 'terra' | 'gold';
}) {
  const bgMap = {
    rust: 'bg-rust/5 border-rust/20',
    terra: 'bg-terra/5 border-terra/20',
    gold: 'bg-gold/5 border-gold/20',
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-surface-alt flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      <div className="space-y-2">
        <div className={`p-3 rounded-lg border ${bgMap[color]}`}>
          <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">
            What it shows
          </p>
          <p className="text-xs text-ink-soft leading-relaxed">{whatItShows}</p>
        </div>
        <div className="p-3 rounded-lg bg-surface-alt">
          <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">
            What to look for
          </p>
          <p className="text-xs text-ink-soft leading-relaxed">{whatToLookFor}</p>
        </div>
      </div>
    </div>
  );
}
