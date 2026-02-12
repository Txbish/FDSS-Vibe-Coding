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
**Status:** COMPLETE (PR pending merge)

| #   | Task                                                 | Status |
| --- | ---------------------------------------------------- | ------ |
| 1   | Create backend specification doc                     | DONE   |
| 2   | Add Monte Carlo config and tax output fields         | DONE   |
| 3   | Add exchange rate volatility and conversion tracking | DONE   |
| 4   | Add branch comparison result schema                  | DONE   |
| 5   | Add schema validation test suite (69 tests)          | DONE   |

### Milestone 2: Engine Feature Completion

**Branch:** `backend/milestone-2-engine-features`
**Status:** COMPLETE (PR pending merge)

| #   | Task                                                   | Status |
| --- | ------------------------------------------------------ | ------ |
| 1   | Implement progressive tax bracket system (`tax.ts`)    | DONE   |
| 2   | Implement multi-currency FX engine (`fx.ts`)           | DONE   |
| 3   | Implement branch comparison utilities (`branch.ts`)    | DONE   |
| 4   | Rewrite engine: FX, tax, Monte Carlo integration       | DONE   |
| 5   | Enhanced liquidation: liquid→volatile→yield_generating | DONE   |
| 6   | Component activation via startDay/endDay               | DONE   |
| 7   | Monte Carlo p5/p95 via seed offsets                    | DONE   |
| 8   | Tax tests (18 tests)                                   | DONE   |
| 9   | FX tests (21 tests)                                    | DONE   |
| 10  | Branch tests (5 tests)                                 | DONE   |
| 11  | Engine integration tests (42 tests)                    | DONE   |
| 12  | Spec validation tests (22 tests)                       | DONE   |

**Test totals:** 117 engine tests + 69 shared-types tests = 186 tests passing

### Milestone 3: API Hardening

**Branch:** `backend/milestone-3-api-hardening`
**Status:** COMPLETE

| #   | Task                                    | Status |
| --- | --------------------------------------- | ------ |
| 1   | Extract buildApp() factory for testing  | DONE   |
| 2   | Structured error responses (ApiError)   | DONE   |
| 3   | Request validation & 1 MB payload limit | DONE   |
| 4   | POST /simulate/compare endpoint         | DONE   |
| 5   | Add vitest + test infrastructure        | DONE   |
| 6   | Comprehensive endpoint tests (26 tests) | DONE   |

**Test counts:** 26 API tests, 212 total across all packages (69 + 117 + 26)

### Milestone 4: Integration Tests

**Branch:** `backend/milestone-4-5-final`
**Status:** COMPLETE

| #   | Task                                                                       | Status |
| --- | -------------------------------------------------------------------------- | ------ |
| 1   | E2E determinism through API layer (bit-exact)                              | DONE   |
| 2   | Complex multi-asset scenario validation (7 tests)                          | DONE   |
| 3   | Precision drift validation through API (4 tests)                           | DONE   |
| 4   | Branch comparison integration (4 tests)                                    | DONE   |
| 5   | Edge cases: empty portfolio, daily expenses, deficit, concurrent (5 tests) | DONE   |

**Test counts:** 22 integration tests, 48 API tests total, 234 across all packages (69 + 117 + 48)

### Milestone 5: Polish

**Branch:** `backend/milestone-4-5-final`
**Status:** COMPLETE

| #   | Task                                       | Status |
| --- | ------------------------------------------ | ------ |
| 1   | Add typecheck step to CI workflow          | DONE   |
| 2   | Full lint/format/typecheck pass (0 errors) | DONE   |
| 3   | Final spec tracker update                  | DONE   |

**Final totals:** 234 tests across 3 packages, all passing. CI runs lint + typecheck + build + test.

---

## 11. Spec Compliance Matrix

Cross-reference against `specification.txt` sections:

| Spec Section | Requirement                     | Implementation                             | Status |
| ------------ | ------------------------------- | ------------------------------------------ | ------ |
| 1.1          | Determinism (bit-exact)         | Seeded RNG, Decimal.js, DAG                | DONE   |
| 1.1          | Daily granularity               | Day-step loop                              | DONE   |
| 1.1          | DAG dependency resolution       | Kahn's algorithm, topo sort                | DONE   |
| 2.1          | Multi-currency exchange         | `fx.ts` with RNG-based daily rates         | DONE   |
| 2.1          | Conversion at transaction time  | Applied in income/expense processing       | DONE   |
| 2.1          | Floating-point precision        | Decimal.js for all conversions             | DONE   |
| 2.2          | Asset valuation (4 types)       | Daily volatility + yield                   | DONE   |
| 2.2          | Auto-liquidation                | Type-aware cascade (liquid→volatile→yield) | DONE   |
| 2.2          | Lock mechanics                  | `locked` + `lockUntilDay`                  | DONE   |
| 2.3          | Credit evolution                | Gradual scoring model                      | DONE   |
| 2.3          | Progressive tax brackets        | `tax.ts` with marginal rate calc           | DONE   |
| 2.3          | Capital gains distinction       | Realized gains tracking + CGT              | DONE   |
| 3.1          | DAG activation order            | Topological sort                           | DONE   |
| 3.1          | Structural changes (activation) | startDay/endDay conditional execution      | DONE   |
| 3.1          | Prevent inconsistent states     | DAG ensures ordering                       | DONE   |
| 3.2          | Shock clustering density        | `shockCount` tracking                      | DONE   |
| 3.2          | Recovery slope                  | `recoveryDays` tracking                    | DONE   |
| 3.2          | Vibe & Pet state                | Derived from quantitative metrics          | DONE   |
| 3.3          | Branching (what-if)             | `simulateBranch()`                         | DONE   |
| 3.3          | Merging (comparison)            | `compareBranches()` + delta analysis       | DONE   |
| 4            | Balance distribution (p5/p95)   | Monte Carlo with N runs + seed offsets     | DONE   |
| 4            | Collapse probability & timing   | Tracked across MC runs                     | DONE   |
| 4            | Vibe & Pet state output         | In SimulationOutput                        | DONE   |
| 4            | Credit score & RSI              | In SimulationOutput                        | DONE   |
| 4            | NAV & Liquidity ratio           | In DailySnapshot                           | DONE   |
| 5            | Precision drift validation      | spec-validation.test.ts                    | DONE   |
| 5            | Snapshot restoration fidelity   | spec-validation.test.ts                    | DONE   |
| 5            | Tax-gain alignment              | spec-validation.test.ts                    | DONE   |
| 5            | DAG consistency                 | spec-validation.test.ts                    | DONE   |
