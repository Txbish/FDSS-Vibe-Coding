# Future Wallet — Backend Specification & Progress Tracker

> **Role:** Backend Agent — owns `packages/shared-types/`, `packages/simulation-engine/`, `apps/api/`
> **Last Updated:** 2026-02-12
> **Event:** DATAFEST'26 — Financial Modeling & Data Visualization

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Rules & Constraints](#3-rules--constraints)
4. [Package Boundaries](#4-package-boundaries)
5. [Shared Types Contract](#5-shared-types-contract)
6. [Simulation Engine Design](#6-simulation-engine-design)
7. [API Design](#7-api-design)
8. [Testing Strategy](#8-testing-strategy)
9. [Branching & PR Strategy](#9-branching--pr-strategy)
10. [Milestone Progress](#10-milestone-progress)
11. [Spec Compliance Matrix](#11-spec-compliance-matrix)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      MONOREPO ROOT                          │
│   turbo.json · tsconfig.base.json · eslint · prettier       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  packages/shared-types/        packages/simulation-engine/  │
│  ┌───────────────────┐         ┌────────────────────────┐   │
│  │ Zod schemas        │         │ rng.ts    (seeded PRNG)│   │
│  │ TS type exports    │◄────────│ dag.ts    (topo sort)  │   │
│  │ API contracts      │         │ state.ts  (mut. state) │   │
│  │ Validation helpers │         │ engine.ts (core loop)  │   │
│  └───────────────────┘         │ fx.ts     (exchange)   │   │
│         ▲                       │ tax.ts    (taxation)   │   │
│         │                       │ monte-carlo.ts (MC)    │   │
│         │                       │ branch.ts (compare)    │   │
│         │                       └──────────┬─────────────┘   │
│         │                                  │                 │
│  apps/api/                                 │                 │
│  ┌──────────────────────────────┐          │                 │
│  │ Fastify REST server           │◄─────────┘                │
│  │ POST /simulate                │                           │
│  │ POST /simulate/branch         │                           │
│  │ POST /simulate/compare        │                           │
│  │ GET  /health                  │                           │
│  │ Request validation (Zod)      │                           │
│  │ Error handling                │                           │
│  └──────────────────────────────┘                           │
│                                                             │
│  apps/web-dashboard/   ← FRONTEND TEAM (DO NOT TOUCH)       │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Graph

```
shared-types  ◄── simulation-engine  ◄── api
     ▲
     │
     └─── web-dashboard (types only, via HTTP to api)
```

- `shared-types` is the foundational package (no internal deps)
- `simulation-engine` depends on `shared-types`
- `api` depends on both `shared-types` and `simulation-engine`
- `web-dashboard` depends only on `shared-types` (frontend team domain)

---

## 2. Tech Stack

| Concern               | Technology             | Version    | Rationale                                        |
| --------------------- | ---------------------- | ---------- | ------------------------------------------------ |
| Runtime               | Node.js                | 24.x       | Project requirement (nvm)                        |
| Package Manager       | pnpm                   | 9.15.4     | Workspace monorepo                               |
| Monorepo Orchestrator | Turborepo              | 2.x        | Task pipeline, caching                           |
| Language              | TypeScript             | 5.5+       | Strict mode, composite projects                  |
| API Framework         | Fastify                | 5.x        | High performance, schema-first                   |
| Validation            | Zod                    | 3.24+      | Runtime schema validation, type inference        |
| Financial Precision   | Decimal.js             | 10.4+      | 20-digit precision, banker's rounding            |
| Deterministic RNG     | seedrandom             | 3.x        | Bit-exact reproducibility                        |
| Test Framework        | Vitest                 | 3.x        | Fast, ESM-native, compatible with existing setup |
| API Testing           | Fastify `.inject()`    | built-in   | No real HTTP needed, lightweight                 |
| Linting               | ESLint 9 (flat config) | 9.x        | With TS plugin + prettier                        |
| Formatting            | Prettier               | 3.4+       | Single quotes, trailing commas, semi             |
| CI                    | GitHub Actions         | -          | Lint → Build → Test pipeline                     |
| Pre-commit            | Husky + lint-staged    | 9.x / 15.x | Enforced code quality                            |

---

## 3. Rules & Constraints

### Inviolable Rules

1. **Determinism is sacred** — Given identical seeds and inputs, the engine MUST produce bit-exact identical outputs. Every stochastic element uses `DeterministicRNG`. `Math.random()` is forbidden in simulation code.

2. **Decimal.js for all money** — No native floating-point arithmetic on financial values. All balance, income, expense, tax, and conversion calculations use `Decimal.js` with 20-digit precision and `ROUND_HALF_EVEN` (banker's rounding).

3. **DAG-first execution** — All day-step components are resolved through topological sort. No component executes before its dependencies. Cycle detection is mandatory.

4. **Backward compatibility** — No breaking changes to existing shared-types schemas. All additions are additive (new optional fields, new types). The frontend team must never be broken by backend schema changes.

5. **Test before commit** — Every feature must have corresponding tests. No untested code reaches a PR.

6. **Clean atomic commits** — Each commit is a single logical unit. Conventional commit messages (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).

7. **No frontend files** — Never modify anything in `apps/web-dashboard/`.

### Design Principles

- **Pure functions** — The simulation engine has zero side effects. Input → Output, nothing else.
- **Separation of concerns** — Each module handles exactly one responsibility (FX, tax, liquidation, etc.)
- **Fail-fast validation** — Zod schemas validate all inputs at the API boundary. The engine trusts validated data.
- **Precision audit trail** — Currency conversions produce logs for drift detection.

---

## 4. Package Boundaries

### Backend Agent Owns

| Package                            | Path                          | Responsibility                                                 |
| ---------------------------------- | ----------------------------- | -------------------------------------------------------------- |
| `@future-wallet/shared-types`      | `packages/shared-types/`      | All Zod schemas, TypeScript types, API contracts               |
| `@future-wallet/simulation-engine` | `packages/simulation-engine/` | Core simulation: RNG, DAG, state, engine, FX, tax, Monte Carlo |
| `@future-wallet/api`               | `apps/api/`                   | REST API: endpoints, validation, error handling                |

### Frontend Team Owns

| Package                        | Path                  | Responsibility                             |
| ------------------------------ | --------------------- | ------------------------------------------ |
| `@future-wallet/web-dashboard` | `apps/web-dashboard/` | React UI, charts, forms, user interactions |

### Shared Contract (Coordination Point)

`@future-wallet/shared-types` is the only shared dependency. Changes to this package must be:

- Backward-compatible (additive only)
- Communicated to the frontend team via PR descriptions
- Merged before dependent frontend work begins

---

## 5. Shared Types Contract

### Input Types

#### SimulationInput

```typescript
{
  seed: number;                    // RNG seed for determinism
  horizonDays: number;             // 1-3650 (up to 10 years)
  baseCurrency: CurrencyCode;      // 3-char ISO code
  initialBalance: number;          // Starting balance
  incomeStreams: IncomeStream[];    // Recurring/one-time income
  expenses: Expense[];             // Recurring/one-time expenses
  assets: Asset[];                 // Portfolio holdings
  liabilities: Liability[];        // Debts
  exchangeRates: ExchangeRate[];   // Base FX rates (with volatility)
  taxConfig?: TaxConfig;           // Progressive brackets + cap gains
  monteCarloRuns?: number;         // Number of MC runs (default 100)
}
```

#### Key Sub-Types

- **IncomeStream / Expense**: Have `currency`, `recurrence`, `startDay`, `endDay`
- **Asset**: Has `type` (liquid/illiquid/yield_generating/volatile), `volatility`, `yieldRate`, `locked`, `lockUntilDay`, `liquidationPenalty`
- **Liability**: Has `principal`, `interestRate`, `minimumPayment`, `remainingTermDays`
- **ExchangeRate**: Has `from`, `to`, `rate`, `date`, `volatility` (NEW)
- **TaxConfig**: Has `brackets` (progressive), `capitalGainsRate`

### Output Types

#### SimulationOutput

```typescript
{
  seed, horizonDays, baseCurrency, computedAt,
  snapshots: DailySnapshot[],
  finalBalance: { expected, p5, p95 },  // From Monte Carlo distribution
  collapseProbability, collapseDay,
  vibeState, petState,
  finalCreditScore, shockResilienceIndex,
  finalNAV, finalLiquidityRatio
}
```

#### DailySnapshot (per-day state)

```typescript
{
  (day,
    date,
    balance,
    totalIncome,
    totalExpenses,
    netCashFlow,
    assetNAV,
    totalDebt,
    creditScore,
    liquidityRatio,
    shockResilienceIndex,
    taxPaid, // NEW: income tax deducted this day
    capitalGainsTax); // NEW: cap gains tax on realized sales
}
```

#### BranchComparisonResult (NEW)

```typescript
{
  baseline: SimulationOutput,
  branch: SimulationOutput,
  branchAtDay: number,
  deltas: {
    finalBalanceDiff: number,
    collapseProbabilityDiff: number,
    creditScoreDiff: number,
    navDiff: number,
    vibeStateChange: { from: VibeState, to: VibeState },
    petStateChange: { from: PetState, to: PetState }
  }
}
```

---

## 6. Simulation Engine Design

### DAG Component Order

```
income ──────┐
             ├──► expenses ──┐
             │               ├──► liabilities ──┐
taxation ────┘               │                  ├──► auto_liquidation ──► credit_score ──► behavioral
                             │                  │
asset_valuation ─────────────┘                  │
                                                │
fx_conversion (implicit, applied within each component)
```

### Component Descriptions

| Component          | Dependencies                      | Description                                                                                                                              |
| ------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `income`           | none                              | Process recurring/one-time income streams. Convert to base currency if needed.                                                           |
| `taxation`         | `income`                          | Apply progressive tax brackets to income. Deduct tax from balance.                                                                       |
| `expenses`         | `income`                          | Process recurring/one-time expenses. Convert to base currency if needed.                                                                 |
| `liabilities`      | `expenses`                        | Accrue daily interest. Deduct minimum payments.                                                                                          |
| `asset_valuation`  | none                              | Update asset values based on volatility (RNG) and yield rates. Check lock expiry.                                                        |
| `auto_liquidation` | `expenses`, `liabilities`         | If balance < 0, liquidate assets in priority order: liquid → volatile → yield_generating. Illiquid never auto-liquidated. Respect locks. |
| `credit_score`     | `liabilities`, `auto_liquidation` | Gradual scoring: f(debt_ratio, punctuality, restructuring). Bounded [300, 850].                                                          |
| `behavioral`       | `credit_score`                    | Track shock clustering, recovery slope. Derive vibe/pet state. Detect collapse (30+ consecutive deficit days).                           |

### Multi-Currency Exchange (NEW)

- Base rates provided in input as `ExchangeRate[]` with optional `volatility`
- Engine generates daily rates: `dailyRate = baseRate * (1 + rng.gaussian(0, volatility / sqrt(365)))`
- Conversion occurs at transaction time (when income/expense is processed)
- All conversions use `Decimal.js` for precision
- Conversion log tracks every conversion for precision audit

### Taxation (NEW)

- Progressive bracket system: income taxed at marginal rates
- Capital gains tax: applied when assets are liquidated (realized gains)
- Tax deducted from balance after income processing
- Daily snapshot records `taxPaid` and `capitalGainsTax`

### Monte Carlo (NEW)

- Default 100 runs (configurable via `monteCarloRuns`)
- Each run uses seed offset: `seed + runIndex`
- Primary run (index 0) produces the full `snapshots[]` trajectory
- All runs produce final balances → sorted → extract p5, p95, expected (mean)
- Collapse probability = fraction of runs that experienced collapse
- Deterministic: same seed + same monteCarloRuns = identical output

### Branching & Comparison (ENHANCED)

- `simulateBranch()` runs baseline and branch simulations
- `compareBranches()` computes structured deltas between results
- Snapshot restoration validated: restoring state at day N and running forward must produce identical trajectory to original run from day N

---

## 7. API Design

### Endpoints

| Method | Path                | Request Body      | Response                            | Description                    |
| ------ | ------------------- | ----------------- | ----------------------------------- | ------------------------------ |
| `GET`  | `/health`           | —                 | `{ status, timestamp }`             | Health check                   |
| `POST` | `/simulate`         | `SimulationInput` | `SimulationOutput`                  | Run full simulation            |
| `POST` | `/simulate/branch`  | `BranchRequest`   | `{ baseline, branch, branchAtDay }` | Run branching what-if          |
| `POST` | `/simulate/compare` | `BranchRequest`   | `BranchComparisonResult`            | Compare with structured deltas |

### Error Response Envelope

```typescript
{
  error: string;      // Human-readable message
  code: string;       // Machine-readable error code
  details?: object;   // Zod validation errors or additional context
}
```

### Error Codes

| Code                | HTTP Status | Description                      |
| ------------------- | ----------- | -------------------------------- |
| `VALIDATION_ERROR`  | 400         | Input failed Zod validation      |
| `ENGINE_ERROR`      | 500         | Simulation engine threw an error |
| `TIMEOUT_ERROR`     | 408         | Simulation exceeded time limit   |
| `PAYLOAD_TOO_LARGE` | 413         | Request body exceeds size limit  |

### Limits

- Max request body: 1 MB
- Simulation timeout: 30 seconds
- CORS: `localhost:5173`, `localhost:3000`

---

## 8. Testing Strategy

### Test Layers

| Layer              | Location                                   | Framework               | Coverage Target            |
| ------------------ | ------------------------------------------ | ----------------------- | -------------------------- |
| Unit: shared-types | `packages/shared-types/src/__tests__/`     | Vitest                  | All schemas valid/invalid  |
| Unit: engine       | `packages/simulation-engine/src/*.test.ts` | Vitest                  | All components, edge cases |
| API: endpoints     | `apps/api/src/__tests__/`                  | Vitest + Fastify inject | All endpoints, error paths |
| Integration        | `apps/api/src/__tests__/integration/`      | Vitest + Fastify inject | End-to-end scenarios       |

### Spec Validation Tests (Section 5 Compliance)

| Validation Condition          | Test Description                                                   |
| ----------------------------- | ------------------------------------------------------------------ |
| Currency conversion precision | Multi-hop conversion (A→B→C→A) must not drift beyond 1e-10         |
| Snapshot restoration fidelity | Restore state at day N, run forward, compare bit-exact to original |
| Tax-gain alignment            | `taxPaid` must equal `f(realizedGains, brackets)`                  |
| DAG consistency               | No cycles, no unknown deps, no infinite loops                      |

---

## 9. Branching & PR Strategy

```
main (protected)
 ├── backend/milestone-1-types-and-spec     → PR #1
 ├── backend/milestone-2-engine-features    → PR #2 (after PR #1 merged)
 ├── backend/milestone-3-api-hardening      → PR #3 (after PR #2 merged)
 ├── backend/milestone-4-integration        → PR #4 (after PR #3 merged)
 └── backend/milestone-5-polish             → PR #5 (after PR #4 merged)
```

### Conflict Avoidance

- Backend only touches: `packages/shared-types/`, `packages/simulation-engine/`, `apps/api/`, `.opencode/`
- Frontend only touches: `apps/web-dashboard/`
- Only overlap: `shared-types` — changed first in Milestone 1, giving frontend stable types
- Sequential merges ensure linear history

---

## 10. Milestone Progress

### Milestone 1: Shared Types & Backend Spec

**Branch:** `backend/milestone-1-types-and-spec`
**Status:** IN PROGRESS

| #   | Task                                                 | Status      |
| --- | ---------------------------------------------------- | ----------- |
| 1   | Create backend specification doc                     | IN PROGRESS |
| 2   | Add Monte Carlo config and tax output fields         | PENDING     |
| 3   | Add exchange rate volatility and conversion tracking | PENDING     |
| 4   | Add branch comparison result schema                  | PENDING     |
| 5   | Add schema validation test suite                     | PENDING     |

### Milestone 2: Engine Feature Completion

**Branch:** `backend/milestone-2-engine-features`
**Status:** PENDING

| #    | Task                                                 | Status  |
| ---- | ---------------------------------------------------- | ------- |
| 1    | Implement progressive tax bracket system             | PENDING |
| 2    | Implement multi-currency exchange rate engine        | PENDING |
| 3    | Implement Monte Carlo simulation                     | PENDING |
| 4    | Enhance asset liquidation with type-aware priorities | PENDING |
| 5    | Add conditional DAG component activation             | PENDING |
| 6    | Implement branch comparison utilities                | PENDING |
| 7    | Add snapshot restoration validation                  | PENDING |
| 8-12 | Comprehensive test suites                            | PENDING |

### Milestone 3: API Hardening

**Branch:** `backend/milestone-3-api-hardening`
**Status:** PENDING

| #   | Task                                | Status  |
| --- | ----------------------------------- | ------- |
| 1   | Add vitest + test infrastructure    | PENDING |
| 2-6 | Endpoint tests                      | PENDING |
| 7   | Structured error responses          | PENDING |
| 8   | Request validation & payload limits | PENDING |

### Milestone 4: Integration Tests

**Branch:** `backend/milestone-4-integration`
**Status:** PENDING

| #   | Task                            | Status  |
| --- | ------------------------------- | ------- |
| 1-5 | Integration & validation suites | PENDING |

### Milestone 5: Polish

**Branch:** `backend/milestone-5-polish`
**Status:** PENDING

| #   | Task                          | Status  |
| --- | ----------------------------- | ------- |
| 1   | Update CI for all test suites | PENDING |
| 2   | Final spec status update      | PENDING |
| 3   | Final lint/format/typecheck   | PENDING |

---

## 11. Spec Compliance Matrix

Cross-reference against `specification.txt` sections:

| Spec Section | Requirement                     | Implementation                        | Status                |
| ------------ | ------------------------------- | ------------------------------------- | --------------------- |
| 1.1          | Determinism (bit-exact)         | Seeded RNG, Decimal.js, DAG           | DONE                  |
| 1.1          | Daily granularity               | Day-step loop                         | DONE                  |
| 1.1          | DAG dependency resolution       | Kahn's algorithm, topo sort           | DONE                  |
| 2.1          | Multi-currency exchange         | `fx.ts` with RNG-based daily rates    | PENDING               |
| 2.1          | Conversion at transaction time  | Applied in income/expense processing  | PENDING               |
| 2.1          | Floating-point precision        | Decimal.js for all conversions        | PENDING               |
| 2.2          | Asset valuation (4 types)       | Daily volatility + yield              | DONE                  |
| 2.2          | Auto-liquidation                | Deficit-triggered, penalty-aware      | PARTIAL (liquid only) |
| 2.2          | Lock mechanics                  | `locked` + `lockUntilDay`             | DONE                  |
| 2.3          | Credit evolution                | Gradual scoring model                 | DONE                  |
| 2.3          | Progressive tax brackets        | `tax.ts`                              | PENDING               |
| 2.3          | Capital gains distinction       | Realized vs unrealized tracking       | PENDING               |
| 3.1          | DAG activation order            | Topological sort                      | DONE                  |
| 3.1          | Structural changes (activation) | startDay/endDay conditional execution | PARTIAL               |
| 3.1          | Prevent inconsistent states     | DAG ensures ordering                  | DONE                  |
| 3.2          | Shock clustering density        | `shockCount` tracking                 | DONE                  |
| 3.2          | Recovery slope                  | `recoveryDays` tracking               | DONE                  |
| 3.2          | Vibe & Pet state                | Derived from quantitative metrics     | DONE                  |
| 3.3          | Branching (what-if)             | `simulateBranch()`                    | DONE                  |
| 3.3          | Merging (comparison)            | `compareBranches()`                   | PENDING               |
| 4            | Balance distribution (p5/p95)   | Monte Carlo with N runs               | PENDING               |
| 4            | Collapse probability & timing   | Tracked in behavioral metrics         | DONE                  |
| 4            | Vibe & Pet state output         | In SimulationOutput                   | DONE                  |
| 4            | Credit score & RSI              | In SimulationOutput                   | DONE                  |
| 4            | NAV & Liquidity ratio           | In DailySnapshot                      | DONE                  |
| 5            | Precision drift validation      | Test suite                            | PENDING               |
| 5            | Snapshot restoration fidelity   | Test suite                            | PENDING               |
| 5            | Tax-gain alignment              | Test suite                            | PENDING               |
| 5            | DAG consistency                 | Test suite                            | PENDING               |
