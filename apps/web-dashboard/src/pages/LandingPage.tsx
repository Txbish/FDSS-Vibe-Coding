import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HeroGlobe } from '../components/HeroGlobe';

const FEATURE_PILLARS = [
  {
    title: 'Deterministic Arbitrage Core',
    detail:
      'A reproducible simulation graph with seed-locked outcomes for every branch, portfolio, and instrument pairing.',
    stat: '99.97% replay fidelity',
  },
  {
    title: 'Branch-Aware Scenario Engine',
    detail:
      'Fork baseline assumptions into stress, momentum, and constrained liquidity pathways without losing audit lineage.',
    stat: '3.1x faster scenario merges',
  },
  {
    title: 'Risk Telemetry Fabric',
    detail:
      'Continuous volatility, liquidity, and collapse exposure indicators streamed into one decision surface.',
    stat: 'Sub-second anomaly flags',
  },
] as const;

const SCENARIO_COMPARISON = [
  {
    name: 'Baseline Carry',
    expectedReturn: '+11.4%',
    maxDrawdown: '-7.1%',
    confidence: '78%',
    className: 'neutral',
  },
  {
    name: 'Adaptive Arbitrage',
    expectedReturn: '+19.8%',
    maxDrawdown: '-5.6%',
    confidence: '92%',
    className: 'positive',
  },
  {
    name: 'Stress Liquidity',
    expectedReturn: '+4.2%',
    maxDrawdown: '-14.9%',
    confidence: '65%',
    className: 'caution',
  },
] as const;

const TRUST_SIGNALS = [
  'Deterministic seed control for every replay and backtest',
  'Branch lineage traceability from baseline to stressed state',
  'Model health alerts for sudden regime shifts and liquidity shocks',
  'Execution-grade summaries ready for strategy review',
] as const;

const PREVIEW_METRICS = [
  { label: 'Signal Precision', value: 96.4, suffix: '%', decimals: 1, trend: '+2.6 MoM' },
  { label: 'Expected Alpha', value: 18.7, suffix: '%', decimals: 1, trend: '+4.1 vs baseline' },
  {
    label: 'Volatility Containment',
    value: 73,
    suffix: '/100',
    decimals: 0,
    trend: 'Stable regime',
  },
  {
    label: 'Execution Confidence',
    value: 92,
    suffix: '%',
    decimals: 0,
    trend: 'Institutional grade',
  },
] as const;

const PREVIEW_TRAJECTORY = [
  { month: 'Jan', baseline: 100, adaptive: 100 },
  { month: 'Feb', baseline: 102, adaptive: 105 },
  { month: 'Mar', baseline: 106, adaptive: 112 },
  { month: 'Apr', baseline: 108, adaptive: 119 },
  { month: 'May', baseline: 112, adaptive: 126 },
  { month: 'Jun', baseline: 114, adaptive: 131 },
  { month: 'Jul', baseline: 116, adaptive: 137 },
  { month: 'Aug', baseline: 118, adaptive: 143 },
];

const PREVIEW_SCENARIO_BARS = [
  { scenario: 'Conservative', return: 9.1, risk: 3.2 },
  { scenario: 'Balanced', return: 14.8, risk: 4.8 },
  { scenario: 'Adaptive', return: 19.8, risk: 5.1 },
  { scenario: 'Aggressive', return: 23.4, risk: 8.7 },
];

const ANALYTICAL_INDICATORS = [
  { label: 'Liquidity Robustness', score: 86 },
  { label: 'Cross-Asset Correlation Control', score: 74 },
  { label: 'Collapse Guardrail Strength', score: 91 },
] as const;

interface CountUpValueProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  durationMs?: number;
}

function CountUpValue({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  durationMs = 1300,
}: CountUpValueProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let rafId = 0;

    const animate = (timestamp: number) => {
      const progress = Math.min((timestamp - start) / durationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * easedProgress);
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [durationMs, value]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const [isRouting, setIsRouting] = useState(false);
  const routeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (routeTimerRef.current) {
        window.clearTimeout(routeTimerRef.current);
      }
    };
  }, []);

  const handleLaunchEngine = () => {
    if (isRouting) {
      return;
    }

    setIsRouting(true);
    routeTimerRef.current = window.setTimeout(() => {
      navigate('/engine');
    }, 520);
  };

  return (
    <div className="page-shell landing-page">
      <div className={`route-transfer ${isRouting ? 'active' : ''}`} aria-hidden />
      <div className="ambient-field" aria-hidden>
        <div className="orb orb-one" />
        <div className="orb orb-two" />
      </div>

      <section className="hero-stage">
        <header className="top-nav">
          <div className="brand-pill">
            <span className="status-dot" />
            <span>ARBS // Arbitrage Systems</span>
          </div>
          <nav className="brand-pill nav-links">
            <a href="#features">Features</a>
            <a href="#scenarios">Scenarios</a>
            <a href="#intelligence">Intelligence</a>
            <button type="button" className="nav-engine-link" onClick={handleLaunchEngine}>
              Engine
            </button>
          </nav>
        </header>

        <main className="hero-main">
          <div className="data-block data-tl">
            MODEL: MULTI-ASSET ARBITRAGE
            <br />
            LATENCY WINDOW: 27MS
            <br />
            RISK DOMAIN: CONTROLLED
            <br />
            <br />
            [SYSTEM ONLINE]
          </div>

          <motion.div
            className="hero-title-wrapper"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="hero-globe-layer" aria-hidden>
              <motion.div
                className="hero-globe-inner"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 0.96, scale: 1 }}
                transition={{ duration: 1.1, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <HeroGlobe />
              </motion.div>
            </div>
            <h1 className="hero-title">ARBS</h1>
            <div className="title-line" />
            <div className="star-graphic" aria-hidden>
              <svg viewBox="0 0 40 40">
                <path d="M20 0 L23 17 L40 20 L23 23 L20 40 L17 23 L0 20 L17 17 Z" />
              </svg>
            </div>
          </motion.div>

          <div className="subtitle-pill-cluster">
            <span className="pill">Deterministic Simulation</span>
            <span className="pill accent">Intelligence Amplified</span>
            <span className="pill">Execution Ready</span>
          </div>

          <div className="hero-cta-cluster">
            <button className="cta-button" type="button" onClick={handleLaunchEngine}>
              Launch Simulation Engine
            </button>
            <a className="ghost-button" href="#dashboard-preview">
              View Dashboard Preview
            </a>
          </div>

          <div className="data-block data-tr">
            VOLATILITY FILTER: ADAPTIVE
            <br />
            CAPITAL EFFICIENCY: 91.7%
            <br />
            SCENARIO BRANCHES: 128
            <br />
            <br />
            [DEPLOYMENT GRADE]
          </div>
        </main>

        <div className="grunge-map">
          <div className="map-texture" />
          <div className="map-texture-2" />
          <div className="footer-content">
            <div>
              DATA FABRIC
              <br />
              CROSS-ASSET STREAM
              <br />
              LIVE SIGNAL BUS
            </div>
            <div className="coordinate-circle">
              <div className="line-graphic" />
            </div>
            <div className="footer-right">
              ARBITRAGE SYSTEMS
              <br />
              MODEL VERSION 4.7
              <br />
              STATE: MONITORING
            </div>
          </div>
        </div>
      </section>

      <div className="content-shell">
        <motion.section className="section-block" id="features" whileHover={{ y: -2 }}>
          <p className="section-kicker">Platform Features</p>
          <h2 className="section-title">Built to extract signal, not noise</h2>
          <p className="section-summary">
            ARBS unifies deterministic simulation, branch-based what-if analysis, and risk telemetry
            into one operating surface.
          </p>
          <div className="feature-grid">
            {FEATURE_PILLARS.map((pillar) => (
              <article key={pillar.title} className="feature-card">
                <h3>{pillar.title}</h3>
                <p>{pillar.detail}</p>
                <span className="feature-stat">{pillar.stat}</span>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section className="section-block" id="scenarios" whileHover={{ y: -2 }}>
          <p className="section-kicker">Scenario Comparison</p>
          <h2 className="section-title">Evaluate paths before capital allocation</h2>
          <div className="scenario-grid">
            {SCENARIO_COMPARISON.map((scenario) => (
              <article key={scenario.name} className={`scenario-card ${scenario.className}`}>
                <h3>{scenario.name}</h3>
                <div className="scenario-stats">
                  <p>
                    Expected Return <strong>{scenario.expectedReturn}</strong>
                  </p>
                  <p>
                    Max Drawdown <strong>{scenario.maxDrawdown}</strong>
                  </p>
                  <p>
                    Confidence <strong>{scenario.confidence}</strong>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="section-block intelligence-block"
          id="intelligence"
          whileHover={{ y: -2 }}
        >
          <p className="section-kicker">Trust + Intelligence</p>
          <h2 className="section-title">Designed for high-consequence decisions</h2>
          <p className="section-summary">
            From backtest confidence to collapse guardrails, every model output is rendered with
            explicit assumptions and review-ready traces.
          </p>
          <div className="trust-grid">
            {TRUST_SIGNALS.map((signal) => (
              <div key={signal} className="trust-item">
                {signal}
              </div>
            ))}
          </div>
        </motion.section>

        <section className="section-block final-cta-block">
          <p className="section-kicker">Ready To Execute</p>
          <h2 className="section-title">Move from concept to simulation in one click</h2>
          <button className="cta-button cta-emphasis" type="button" onClick={handleLaunchEngine}>
            Enter Main Simulation Engine
          </button>
        </section>

        <section className="section-block dashboard-preview" id="dashboard-preview">
          <p className="section-kicker">Simulation Dashboard Preview</p>
          <h2 className="section-title">Live metrics, comparative outcomes, analytical depth</h2>

          <div className="preview-metric-grid">
            {PREVIEW_METRICS.map((metric) => (
              <article key={metric.label} className="preview-metric-card">
                <p>{metric.label}</p>
                <h3>
                  <CountUpValue
                    value={metric.value}
                    suffix={metric.suffix}
                    decimals={metric.decimals}
                  />
                </h3>
                <span>{metric.trend}</span>
              </article>
            ))}
          </div>

          <div className="preview-chart-grid">
            <article className="chart-card">
              <h3>Performance Trajectory</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={PREVIEW_TRAJECTORY}>
                  <defs>
                    <linearGradient id="adaptiveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--rust)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--rust)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--line-muted)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'var(--ink-muted)', fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fill: 'var(--ink-muted)', fontSize: 12 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--paper-solid)',
                      border: '1px solid var(--ink-soft)',
                      borderRadius: '10px',
                      color: 'var(--ink)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="adaptive"
                    stroke="var(--rust)"
                    strokeWidth={2.5}
                    fill="url(#adaptiveGradient)"
                    name="Adaptive"
                  />
                  <Area
                    type="monotone"
                    dataKey="baseline"
                    stroke="var(--terra-green)"
                    strokeWidth={2}
                    fillOpacity={0}
                    name="Baseline"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </article>

            <article className="chart-card">
              <h3>Scenario Return vs Risk</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={PREVIEW_SCENARIO_BARS}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--line-muted)" />
                  <XAxis
                    dataKey="scenario"
                    tick={{ fill: 'var(--ink-muted)', fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fill: 'var(--ink-muted)', fontSize: 12 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--paper-solid)',
                      border: '1px solid var(--ink-soft)',
                      borderRadius: '10px',
                      color: 'var(--ink)',
                    }}
                  />
                  <ReferenceLine y={0} stroke="var(--ink-soft)" />
                  <Bar dataKey="return" fill="var(--rust)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="risk" fill="var(--sun-gold)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </article>
          </div>

          <div className="indicator-grid">
            {ANALYTICAL_INDICATORS.map((indicator) => (
              <article key={indicator.label} className="indicator-card">
                <p>{indicator.label}</p>
                <div className="indicator-track">
                  <span style={{ width: `${indicator.score}%` }} />
                </div>
                <strong>{indicator.score}/100</strong>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
