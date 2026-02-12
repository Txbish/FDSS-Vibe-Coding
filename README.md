# Future Wallet

**High-Fidelity Financial Projection & Simulation Engine**

Built for DATAFEST'26 -- a deterministic financial simulator that models complex user trajectories over multi-horizon daily timelines, with a real-time dashboard for visualizing results.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development](#development)
- [Backend](#backend)
  - [Shared Types](#shared-types-future-walletshared-types)
  - [Simulation Engine](#simulation-engine-future-walletsimulation-engine)
  - [API Server](#api-server-future-walletapi)
- [Frontend](#frontend)
  - [Dashboard Overview](#dashboard-overview)
  - [Pages and Components](#pages-and-components)
  - [API Client](#api-client)
- [API Reference](#api-reference)
- [Testing](#testing)
- [CI/CD](#cicd)
- [Code Quality](#code-quality)
- [Environment Variables](#environment-variables)
- [Tech Stack](#tech-stack)

---

## Overview

Future Wallet is a full-stack financial modeling platform that simulates the evolution of a user's economic state. Given structured inputs (income streams, expenses, assets, liabilities, exchange rates, tax configuration), the engine produces high-resolution daily trajectories with statistical distributions via Monte Carlo analysis.

### Core Guarantees

- **Determinism**: Identical seeds and inputs produce bit-exact identical outputs. Every stochastic element flows through a seeded PRNG -- `Math.random()` is never used.
- **Daily Granularity**: All computations, state transitions, and environmental influences are calculated at daily resolution for up to 3,650 days (10 years).
- **DAG Execution Order**: Financial components are nodes in a Directed Acyclic Graph. The engine resolves activation order via topological sort with alphabetical tie-breaking for deterministic execution.
- **Financial Precision**: All monetary calculations use `Decimal.js` with 20-digit precision and banker's rounding to prevent floating-point drift.

---

## Architecture

```
                    +-----------------------+
                    |   Web Dashboard       |
                    |   (React + Vite)      |
                    |   :5173               |
                    +----------+------------+
                               |
                          Vite Proxy
                        /api/* -> :3001/*
                               |
                    +----------v------------+
                    |   API Server          |
                    |   (Fastify)           |
                    |   :3001               |
                    +----------+------------+
                               |
                    +----------v------------+
                    |   Simulation Engine   |
                    |   (Pure Functions)    |
                    +----------+------------+
                               |
                    +----------v------------+
                    |   Shared Types        |
                    |   (Zod Schemas)       |
                    +-----------------------+
```

The system is organized as a **pnpm monorepo** with Turborepo for task orchestration. Dependencies flow upward: `shared-types` is consumed by `simulation-engine`, which is consumed by `api`, which is consumed by `web-dashboard` (via HTTP).

---

## Project Structure

```
future-wallet/
├── apps/
│   ├── api/                          # Fastify REST API server
│   │   └── src/
│   │       ├── app.ts                # App factory (buildApp) with all routes
│   │       ├── index.ts              # Server entrypoint (port 3001)
│   │       ├── api.test.ts           # 26 endpoint tests
│   │       └── integration.test.ts   # 22 E2E integration tests
│   │
│   └── web-dashboard/                # React SPA dashboard
│       ├── index.html                # HTML shell
│       ├── vite.config.ts            # Vite config with API proxy
│       └── src/
│           ├── main.tsx              # React entry point
│           ├── App.tsx               # Router (Landing + Engine pages)
│           ├── api.ts                # API client (fetch wrappers)
│           ├── utils.ts              # Utility functions (UUID fallback)
│           ├── index.css             # Full application styles
│           ├── pages/
│           │   ├── LandingPage.tsx    # Marketing/intro landing page
│           │   └── EnginePage.tsx     # Simulation control room
│           └── components/
│               ├── SimulationForm.tsx  # Input form with all parameters
│               ├── BalanceChart.tsx    # Recharts balance trajectory
│               ├── MetricCard.tsx      # Metric display card
│               ├── StatusBadge.tsx     # Vibe/pet state badge
│               └── HeroGlobe.tsx      # 3D globe (Three.js)
│
├── packages/
│   ├── shared-types/                 # Zod schemas & TypeScript types
│   │   └── src/
│   │       ├── index.ts              # All schemas and type exports
│   │       └── schemas.test.ts       # 69 schema validation tests
│   │
│   └── simulation-engine/            # Core deterministic engine
│       └── src/
│           ├── index.ts              # Public API re-exports
│           ├── engine.ts             # Main simulate() function
│           ├── rng.ts                # Seeded PRNG (seedrandom)
│           ├── dag.ts                # Topological sort (Kahn's algorithm)
│           ├── state.ts              # SimulationState + snapshot conversion
│           ├── fx.ts                 # Multi-currency exchange engine
│           ├── tax.ts                # Progressive brackets + capital gains
│           ├── branch.ts             # Branch comparison (delta analysis)
│           ├── engine.test.ts        # 9 core engine tests
│           ├── engine-integration.test.ts  # 42 integration tests
│           ├── spec-validation.test.ts     # 22 spec compliance tests
│           ├── fx.test.ts            # 21 exchange rate tests
│           ├── tax.test.ts           # 18 tax system tests
│           └── branch.test.ts        # 5 branch comparison tests
│
├── .github/workflows/ci.yml         # GitHub Actions CI pipeline
├── turbo.json                        # Turborepo task configuration
├── pnpm-workspace.yaml               # Workspace definition
├── tsconfig.base.json                # Shared TypeScript config
├── eslint.config.mjs                 # ESLint flat config
├── .prettierrc                       # Prettier config
└── .husky/pre-commit                 # Pre-commit hook (lint-staged)
```

---

## Prerequisites

- **Node.js** >= 20.0.0 (developed on Node 24)
- **pnpm** >= 9.0.0 (specified: `pnpm@9.15.4`)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Txbish/FDSS-Vibe-Coding.git
cd FDSS-Vibe-Coding
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Build all packages

```bash
pnpm build
```

This builds in dependency order: `shared-types` -> `simulation-engine` -> `api` -> `web-dashboard`.

### 4. Run the full stack in development mode

```bash
pnpm dev
```

This starts both servers concurrently:

- **API server**: http://localhost:3001 (with hot-reload via `tsx watch`)
- **Dashboard**: http://localhost:5173 (with Vite HMR)

The Vite dev server proxies `/api/*` requests to `http://localhost:3001/*` (stripping the `/api` prefix), so the frontend and backend communicate seamlessly during development.

### 5. Open the dashboard

Navigate to http://localhost:5173 in your browser. You will see the landing page. Click through to the **Simulation Control Room** to run simulations.

---

## Development

### Available Scripts (root)

| Command             | Description                                       |
| ------------------- | ------------------------------------------------- |
| `pnpm dev`          | Start all apps in development mode (hot-reload)   |
| `pnpm build`        | Build all packages (dependency-ordered via Turbo) |
| `pnpm test`         | Run all test suites (234 tests)                   |
| `pnpm lint`         | Lint all packages with ESLint                     |
| `pnpm typecheck`    | Type-check all packages with TypeScript           |
| `pnpm format`       | Format all files with Prettier                    |
| `pnpm format:check` | Check formatting without writing                  |
| `pnpm clean`        | Remove all build artifacts and node_modules       |

### Working with Turborepo

All tasks are orchestrated by Turborepo. The dependency graph is defined in `turbo.json`:

- **`build`** depends on `^build` (upstream packages build first)
- **`test`** depends on `build` (tests run against compiled output)
- **`lint`** and **`typecheck`** depend on `^build` (need compiled type declarations)
- **`dev`** is persistent and never cached
- **`clean`** is never cached

Turbo caches successful task outputs. After the first run, unchanged packages will be served from cache.

---

## Backend

### Shared Types (`@future-wallet/shared-types`)

The single source of truth for all data contracts. Every schema is defined using Zod with TypeScript types inferred automatically.

**Key schemas:**

| Schema                         | Purpose                                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SimulationInputSchema`        | Full simulation input: seed, horizon, balance, income, expenses, assets, liabilities, exchange rates, tax config, Monte Carlo config                           |
| `SimulationOutputSchema`       | Complete output: snapshots, finalBalance (expected/p5/p95), collapseProbability, vibeState, petState, creditScore, NAV, liquidityRatio, shockResilienceIndex   |
| `DailySnapshotSchema`          | Single day of state: balance, income, expenses, netCashFlow, assetNAV, totalDebt, creditScore, liquidityRatio, shockResilienceIndex, taxPaid, capitalGainsTax  |
| `BranchResultSchema`           | What-if branch: baseline output, branch output, branchAtDay                                                                                                    |
| `BranchComparisonResultSchema` | Full comparison: both outputs + structured deltas (finalBalanceDiff, collapseProbabilityDiff, creditScoreDiff, navDiff, vibeStateChange, petStateChange, etc.) |
| `ApiErrorSchema`               | Structured error: code (VALIDATION_ERROR, ENGINE_ERROR, TIMEOUT_ERROR, PAYLOAD_TOO_LARGE, INTERNAL_ERROR) + message + optional details                         |

**Domain types:**

- `Asset` -- liquid, illiquid, yield_generating, volatile (with volatility, yieldRate, liquidationPenalty, lock support)
- `Liability` -- principal, interestRate, minimumPayment, remainingTermDays
- `IncomeStream` / `Expense` -- amount, currency, recurrence (daily/weekly/biweekly/monthly/yearly/once), startDay/endDay, essential flag
- `ExchangeRate` -- from/to currency, rate, date, volatility
- `TaxConfig` -- progressive brackets + capitalGainsRate
- `MonteCarloConfig` -- runs (1-1000) + perturbationFactor (0-0.5)
- `VibeState` -- thriving, stable, strained, critical, collapsed
- `PetState` -- happy, content, anxious, distressed, fainted

### Simulation Engine (`@future-wallet/simulation-engine`)

A pure-function engine with zero side effects. No network calls, no disk I/O, no `Math.random()`.

**Module breakdown:**

| Module      | Responsibility                                                                                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engine.ts` | Main `simulate()` and `simulateBranch()` functions. Runs the daily loop, processes income/expenses/assets/liabilities/tax per DAG execution order, aggregates Monte Carlo runs for statistical output.      |
| `rng.ts`    | `DeterministicRNG` class wrapping `seedrandom`. Provides `next()` (uniform [0,1)), `range(min, max)`, and `gaussian(mean, stddev)` via Box-Muller transform.                                                |
| `dag.ts`    | Topological sort via Kahn's algorithm with alphabetical tie-breaking. Cycle detection with clear error messages.                                                                                            |
| `state.ts`  | `SimulationState` (mutable working memory), `createInitialState()`, `stateToSnapshot()`, `deriveVibeState()`, `derivePetState()`. Uses Decimal.js configured for 20-digit precision with banker's rounding. |
| `fx.ts`     | `ExchangeRateEngine` class. Daily rate fluctuation via `baseRate * (1 + gaussian(0, volatility / sqrt(365)))`. Rate caching per day. Conversion logging for precision audit. All math in Decimal.js.        |
| `tax.ts`    | Progressive income tax brackets (marginal rates), capital gains tax on realized asset sales. `computeProgressiveTax()`, `computeCapitalGainsTax()`, `computeDailyTax()`.                                    |
| `branch.ts` | `computeBranchDeltas()` and `compareBranches()`. Computes structured differences between baseline and branch simulation outputs.                                                                            |

**How a simulation run works:**

1. Parse and validate `SimulationInput` via Zod
2. Build the DAG of financial components (income -> balance -> expenses -> assets -> liabilities -> tax -> credit)
3. Resolve execution order via topological sort
4. For each Monte Carlo run (with seed perturbation):
   a. Create initial state from inputs
   b. For each day in [0, horizonDays):
   - Process income streams (with FX conversion if needed)
   - Apply progressive income tax
   - Process expenses (essential first, then discretionary)
   - Update asset valuations (volatility-driven price changes)
   - Generate yield on yield-generating assets
   - Process liability payments (interest accrual + minimum payments)
   - Auto-liquidate assets under deficit conditions (with penalties)
   - Apply capital gains tax on realized asset sales
   - Update credit score, shock resilience, liquidity ratio
   - Record daily snapshot
     c. Determine collapse day, vibe state, pet state
5. Aggregate Monte Carlo results: expected final balance, p5/p95 percentiles, collapse probability
6. Return `SimulationOutput`

### API Server (`@future-wallet/api`)

A Fastify HTTP server exposing the simulation engine over REST.

**Key design decisions:**

- **Factory pattern**: `buildApp()` creates and returns the Fastify instance, enabling `app.inject()` for testing without starting a real server
- **Zod validation**: All inputs are validated with Zod schemas before reaching the engine
- **Structured errors**: Every error response follows `ApiErrorSchema` with a machine-readable code
- **CORS**: Configured for `localhost:5173` (Vite dev) and `localhost:3000`
- **Body limit**: 1 MB maximum payload size

**Routes:**

| Method | Path                | Description                                              |
| ------ | ------------------- | -------------------------------------------------------- |
| `GET`  | `/health`           | Health check (returns `{ status: "ok", timestamp }`)     |
| `POST` | `/simulate`         | Run a full simulation                                    |
| `POST` | `/simulate/branch`  | Run a what-if branch (returns baseline + branch outputs) |
| `POST` | `/simulate/compare` | Run a branch with structured delta analysis              |

See [API Reference](#api-reference) for request/response details.

---

## Frontend

### Dashboard Overview

The web dashboard is a React 19 SPA built with Vite. It provides a visual interface for configuring simulations, viewing results, and comparing what-if scenarios.

**Key technologies:**

- **React 19** with hooks-based state management
- **React Router v7** for client-side routing
- **Framer Motion** for page transitions and animations
- **Recharts** for balance trajectory charts
- **Three.js** (via `@react-three/fiber`) for the 3D hero globe on the landing page
- **Vite 6** for development server and production bundling

### Pages and Components

**Landing Page** (`/`)

- Marketing-style introduction with animated statistics
- Interactive 3D globe visualization (Three.js)
- Feature pillars describing engine capabilities
- Sample charts (area chart, bar chart) with synthetic data
- Navigation to the simulation engine

**Engine Page** (`/engine`)

- Full simulation control room
- **SimulationForm**: Configurable parameters including:
  - Initial balance, horizon (days), seed, base currency
  - Monthly income (with separate currency selection)
  - Monthly rent, daily food costs
  - Monte Carlo runs (1-100)
  - Toggle panels for: Taxation, Assets, Liabilities, Exchange Rates, What-If Branch
  - Asset configuration: name, value, type (liquid/illiquid/yield_generating/volatile), volatility, yield rate, liquidation penalty
  - Liability configuration: name, principal, interest rate, minimum payment, term
  - Exchange rate configuration: from/to currency pairs with rates
  - What-if branch: branch day and modified income
- **Results display** (after simulation):
  - MetricCards for: Final Balance, Collapse Probability, Credit Score, NAV, Liquidity Ratio, Shock Resilience, Total Tax Paid
  - StatusBadges for Financial Vibe and Behavioral (Pet) State
  - Balance range (P5 - P95 percentiles)
  - BalanceChart: Dual-line chart showing balance trajectory and NAV over time
  - Last-day tax paid detail
- **Branch comparison** (after what-if run):
  - Delta metrics: Balance Delta, Collapse Prob. Delta, Credit Score Delta, NAV Delta
  - Vibe state change indicator
  - Color-coded success/danger variants

### API Client

The frontend communicates with the backend through three functions in `api.ts`:

| Function                                               | Backend Route                | Purpose                            |
| ------------------------------------------------------ | ---------------------------- | ---------------------------------- |
| `runSimulation(input)`                                 | `POST /api/simulate`         | Run a baseline simulation          |
| `runBranch(baseInput, branchAtDay, modifiedInput)`     | `POST /api/simulate/branch`  | Run a what-if branch (raw results) |
| `runComparison(baseInput, branchAtDay, modifiedInput)` | `POST /api/simulate/compare` | Run a branch with delta analysis   |

All requests go through the Vite proxy (`/api/*` -> `http://localhost:3001/*`), so the frontend never needs to know the backend's actual URL during development.

For production deployment, either configure a reverse proxy (nginx, Caddy) to route `/api/*` to the API server, or set the `API_BASE` constant in `api.ts` to the backend's URL.

---

## API Reference

### `GET /health`

Health check endpoint.

**Response** `200`:

```json
{
  "status": "ok",
  "timestamp": "2026-02-12T15:00:00.000Z"
}
```

### `POST /simulate`

Run a full simulation with Monte Carlo statistical analysis.

**Request body** (`SimulationInput`):

```json
{
  "seed": 42,
  "horizonDays": 365,
  "baseCurrency": "USD",
  "initialBalance": 10000,
  "monteCarloConfig": { "runs": 50, "perturbationFactor": 0.05 },
  "incomeStreams": [
    {
      "id": "uuid-here",
      "name": "Salary",
      "amount": 5000,
      "currency": "USD",
      "recurrence": "monthly",
      "startDay": 0
    }
  ],
  "expenses": [
    {
      "id": "uuid-here",
      "name": "Rent",
      "amount": 1500,
      "currency": "USD",
      "recurrence": "monthly",
      "startDay": 0,
      "essential": true
    }
  ],
  "assets": [],
  "liabilities": [],
  "exchangeRates": [],
  "taxConfig": {
    "brackets": [
      { "upperBound": 10000, "rate": 0.1 },
      { "upperBound": 40000, "rate": 0.12 }
    ],
    "capitalGainsRate": 0.15,
    "currency": "USD"
  }
}
```

**Response** `200` (`SimulationOutput`):

```json
{
  "seed": 42,
  "horizonDays": 365,
  "baseCurrency": "USD",
  "computedAt": "2026-02-12T15:00:00.000Z",
  "snapshots": [
    {
      "day": 0,
      "date": "2026-02-12",
      "balance": 10000,
      "totalIncome": 0,
      "totalExpenses": 0,
      "netCashFlow": 0,
      "assetNAV": 0,
      "totalDebt": 0,
      "creditScore": 700,
      "liquidityRatio": 1.0,
      "shockResilienceIndex": 50,
      "taxPaid": 0,
      "capitalGainsTax": 0
    }
  ],
  "finalBalance": { "expected": 45000, "p5": 42000, "p95": 48000 },
  "collapseProbability": 0.0,
  "collapseDay": null,
  "vibeState": "thriving",
  "petState": "happy",
  "finalCreditScore": 750,
  "shockResilienceIndex": 85,
  "finalNAV": 0,
  "finalLiquidityRatio": 1.0
}
```

**Error responses:**

| Status | Code                | When                                   |
| ------ | ------------------- | -------------------------------------- |
| `400`  | `VALIDATION_ERROR`  | Invalid input (Zod validation failure) |
| `413`  | `PAYLOAD_TOO_LARGE` | Request body exceeds 1 MB              |
| `500`  | `ENGINE_ERROR`      | Simulation engine threw an error       |
| `500`  | `INTERNAL_ERROR`    | Unexpected server error                |

### `POST /simulate/branch`

Run a what-if branch simulation. Returns both baseline and branch outputs.

**Request body** (`BranchRequest`):

```json
{
  "baseInput": { "...SimulationInput..." },
  "branchAtDay": 90,
  "modifiedInput": {
    "incomeStreams": [
      {
        "id": "uuid-here",
        "name": "New Job",
        "amount": 7000,
        "currency": "USD",
        "recurrence": "monthly",
        "startDay": 0
      }
    ]
  }
}
```

**Response** `200` (`BranchResult`):

```json
{
  "baseline": { "...SimulationOutput..." },
  "branch": { "...SimulationOutput..." },
  "branchAtDay": 90
}
```

### `POST /simulate/compare`

Run a branch comparison with structured delta analysis.

**Request body**: Same as `/simulate/branch`.

**Response** `200` (`BranchComparisonResult`):

```json
{
  "baseline": { "...SimulationOutput..." },
  "branch": { "...SimulationOutput..." },
  "branchAtDay": 90,
  "deltas": {
    "finalBalanceDiff": 12500.50,
    "collapseProbabilityDiff": -0.05,
    "creditScoreDiff": 15,
    "navDiff": 3000,
    "liquidityRatioDiff": 0.2,
    "shockResilienceIndexDiff": 5,
    "vibeStateChange": { "from": "stable", "to": "thriving" },
    "petStateChange": { "from": "content", "to": "happy" }
  }
}
```

---

## Testing

The project has **234 tests** across three packages:

| Package                            | Tests | File(s)                                                                                    |
| ---------------------------------- | ----- | ------------------------------------------------------------------------------------------ |
| `@future-wallet/shared-types`      | 69    | `schemas.test.ts` -- Validates all Zod schemas accept valid inputs and reject invalid ones |
| `@future-wallet/simulation-engine` | 117   | 6 test files covering engine core, FX, tax, branching, integration, and spec compliance    |
| `@future-wallet/api`               | 48    | `api.test.ts` (26 endpoint tests) + `integration.test.ts` (22 E2E tests)                   |

### Running tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @future-wallet/shared-types test
pnpm --filter @future-wallet/simulation-engine test
pnpm --filter @future-wallet/api test

# Watch mode (for development)
pnpm --filter @future-wallet/simulation-engine test:watch
```

### Notable test categories

- **Determinism tests**: Verify that identical seed + input produces bit-exact identical output across runs
- **Monte Carlo tests**: Verify p5 <= expected <= p95 ordering, tighter intervals with more runs
- **Spec compliance tests**: Validate all requirements from the DATAFEST'26 specification
- **Precision drift tests**: Ensure no NaN/Infinity values over long horizons (3,650 days)
- **Schema boundary tests**: Validate Zod schemas at their exact boundaries (min/max values)
- **E2E API tests**: Full request-response cycle through Fastify injection, including error cases

---

## CI/CD

GitHub Actions runs on every push to `main` and every pull request targeting `main`.

**Pipeline** (`.github/workflows/ci.yml`):

1. **Checkout** code
2. **Setup** pnpm + Node.js 24 with dependency caching
3. **Install** dependencies (`--frozen-lockfile`)
4. **Lint** all packages
5. **Typecheck** all packages
6. **Build** all packages
7. **Test** all packages (234 tests)

Concurrency is configured to cancel in-progress runs when a new commit is pushed to the same branch.

---

## Code Quality

### Linting

ESLint with the flat config format (`eslint.config.mjs`):

- `@eslint/js` recommended rules
- `typescript-eslint` recommended rules
- `eslint-config-prettier` to disable conflicting rules
- Custom rules: consistent type imports, no unused vars (except `_` prefixed), warn on explicit `any`

### Formatting

Prettier with the following settings:

- Single quotes
- Trailing commas everywhere
- Semicolons
- 100 character print width
- 2-space indentation
- Always use parens for arrow function parameters

### Pre-commit Hooks

Husky runs `lint-staged` on every commit:

- `.ts`, `.tsx`, `.js`, `.jsx` files: `eslint --fix` + `prettier --write`
- `.json`, `.md`, `.yaml`, `.yml` files: `prettier --write`

### TypeScript

Strict mode enabled via `tsconfig.base.json`:

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `isolatedModules: true`
- `composite: true` (for project references)
- Target: ES2022, Module: ESNext, Resolution: bundler

---

## Environment Variables

| Variable | Default   | Description     |
| -------- | --------- | --------------- |
| `PORT`   | `3001`    | API server port |
| `HOST`   | `0.0.0.0` | API server host |

No `.env` file is required for development. The defaults work out of the box.

---

## Tech Stack

### Backend

| Technology          | Purpose                                      |
| ------------------- | -------------------------------------------- |
| **TypeScript 5.5+** | Language (strict mode)                       |
| **Fastify 5**       | HTTP server framework                        |
| **Zod 3.24+**       | Runtime schema validation and type inference |
| **Decimal.js**      | Arbitrary-precision decimal arithmetic       |
| **seedrandom**      | Deterministic PRNG                           |
| **Vitest 3**        | Test runner                                  |

### Frontend

| Technology                            | Purpose                         |
| ------------------------------------- | ------------------------------- |
| **React 19**                          | UI framework                    |
| **Vite 6**                            | Dev server + bundler            |
| **React Router 7**                    | Client-side routing             |
| **Framer Motion 12**                  | Animations and page transitions |
| **Recharts 2**                        | Data visualization (charts)     |
| **Three.js** / **@react-three/fiber** | 3D globe visualization          |

### Tooling

| Technology         | Purpose                               |
| ------------------ | ------------------------------------- |
| **pnpm 9**         | Package manager (workspaces)          |
| **Turborepo 2**    | Monorepo task orchestration + caching |
| **ESLint 9**       | Linting (flat config)                 |
| **Prettier 3**     | Code formatting                       |
| **Husky 9**        | Git hooks                             |
| **lint-staged 15** | Pre-commit linting                    |
| **GitHub Actions** | CI pipeline                           |
