/**
 * @future-wallet/shared-types
 *
 * Central type definitions and Zod schemas for the Future Wallet system.
 * All API contracts, simulation inputs/outputs, and domain models live here.
 */

import { z } from 'zod';

// ─── Currency & Exchange ────────────────────────────────────────────────────────

export const CurrencyCodeSchema = z.string().length(3).toUpperCase();
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

export const ExchangeRateSchema = z.object({
  from: CurrencyCodeSchema,
  to: CurrencyCodeSchema,
  rate: z.number().positive(),
  date: z.string().date(), // YYYY-MM-DD
  /** Daily volatility factor for RNG-based rate fluctuation (default 0 = stable) */
  volatility: z.number().min(0).max(1).default(0),
});
export type ExchangeRate = z.infer<typeof ExchangeRateSchema>;

/** Tracks a single currency conversion for precision audit */
export const CurrencyConversionLogSchema = z.object({
  day: z.number().int().nonnegative(),
  from: CurrencyCodeSchema,
  to: CurrencyCodeSchema,
  originalAmount: z.number(),
  convertedAmount: z.number(),
  rateUsed: z.number().positive(),
  context: z.string(), // e.g. 'income:Salary', 'expense:Rent', 'liquidation:Stock'
});
export type CurrencyConversionLog = z.infer<typeof CurrencyConversionLogSchema>;

// ─── Asset Definitions ──────────────────────────────────────────────────────────

export const AssetTypeSchema = z.enum(['liquid', 'illiquid', 'yield_generating', 'volatile']);
export type AssetType = z.infer<typeof AssetTypeSchema>;

export const AssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: AssetTypeSchema,
  value: z.number().nonnegative(),
  currency: CurrencyCodeSchema,
  volatility: z.number().min(0).max(1).default(0),
  yieldRate: z.number().default(0), // annual yield as decimal
  liquidationPenalty: z.number().min(0).max(1).default(0),
  locked: z.boolean().default(false),
  lockUntilDay: z.number().int().nonnegative().optional(),
});
export type Asset = z.infer<typeof AssetSchema>;

// ─── Income & Expense ───────────────────────────────────────────────────────────

export const RecurrenceSchema = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'yearly',
  'once',
]);
export type Recurrence = z.infer<typeof RecurrenceSchema>;

export const IncomeStreamSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  amount: z.number().positive(),
  currency: CurrencyCodeSchema,
  recurrence: RecurrenceSchema,
  startDay: z.number().int().nonnegative().default(0),
  endDay: z.number().int().nonnegative().optional(),
});
export type IncomeStream = z.infer<typeof IncomeStreamSchema>;

export const ExpenseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  amount: z.number().positive(),
  currency: CurrencyCodeSchema,
  recurrence: RecurrenceSchema,
  startDay: z.number().int().nonnegative().default(0),
  endDay: z.number().int().nonnegative().optional(),
  essential: z.boolean().default(true),
});
export type Expense = z.infer<typeof ExpenseSchema>;

// ─── Liability / Debt ───────────────────────────────────────────────────────────

export const LiabilitySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  principal: z.number().positive(),
  interestRate: z.number().min(0), // annual rate
  currency: CurrencyCodeSchema,
  minimumPayment: z.number().nonnegative(),
  remainingTermDays: z.number().int().positive(),
});
export type Liability = z.infer<typeof LiabilitySchema>;

// ─── Tax Configuration ──────────────────────────────────────────────────────────

export const TaxBracketSchema = z.object({
  upperBound: z.number().positive(), // income up to this amount
  rate: z.number().min(0).max(1), // tax rate for this bracket
});
export type TaxBracket = z.infer<typeof TaxBracketSchema>;

export const TaxConfigSchema = z.object({
  brackets: z.array(TaxBracketSchema).min(1),
  capitalGainsRate: z.number().min(0).max(1).default(0.15),
  currency: CurrencyCodeSchema,
});
export type TaxConfig = z.infer<typeof TaxConfigSchema>;

// ─── Monte Carlo Configuration ──────────────────────────────────────────────────

export const MonteCarloConfigSchema = z.object({
  /** Number of simulation runs for statistical distribution (default 100) */
  runs: z.number().int().positive().max(1000).default(100),
  /** Perturbation factor for parameter variation across runs (default 0.05 = 5%) */
  perturbationFactor: z.number().min(0).max(0.5).default(0.05),
});
export type MonteCarloConfig = z.infer<typeof MonteCarloConfigSchema>;

// ─── Simulation Input ───────────────────────────────────────────────────────────

export const SimulationInputSchema = z.object({
  seed: z.number().int().default(42),
  horizonDays: z.number().int().positive().max(3650), // up to 10 years
  baseCurrency: CurrencyCodeSchema,
  initialBalance: z.number().default(0),
  incomeStreams: z.array(IncomeStreamSchema).default([]),
  expenses: z.array(ExpenseSchema).default([]),
  assets: z.array(AssetSchema).default([]),
  liabilities: z.array(LiabilitySchema).default([]),
  exchangeRates: z.array(ExchangeRateSchema).default([]),
  taxConfig: TaxConfigSchema.optional(),
  /** Monte Carlo configuration for statistical output (p5/p95). Omit to use defaults. */
  monteCarloConfig: MonteCarloConfigSchema.optional(),
});
export type SimulationInput = z.infer<typeof SimulationInputSchema>;

// ─── Daily Snapshot (single day of simulation state) ────────────────────────────

export const DailySnapshotSchema = z.object({
  day: z.number().int().nonnegative(),
  date: z.string(), // YYYY-MM-DD derived from start
  balance: z.number(),
  totalIncome: z.number(),
  totalExpenses: z.number(),
  netCashFlow: z.number(),
  assetNAV: z.number(), // net asset value
  totalDebt: z.number(),
  creditScore: z.number().min(0).max(850),
  liquidityRatio: z.number(), // liquid assets / total liabilities
  shockResilienceIndex: z.number().min(0).max(100),
  /** Income tax deducted this day (from progressive brackets) */
  taxPaid: z.number().default(0),
  /** Capital gains tax on realized asset sales this day */
  capitalGainsTax: z.number().default(0),
});
export type DailySnapshot = z.infer<typeof DailySnapshotSchema>;

// ─── Financial Health Indicators ────────────────────────────────────────────────

export const VibeStateSchema = z.enum(['thriving', 'stable', 'strained', 'critical', 'collapsed']);
export type VibeState = z.infer<typeof VibeStateSchema>;

export const PetStateSchema = z.enum(['happy', 'content', 'anxious', 'distressed', 'fainted']);
export type PetState = z.infer<typeof PetStateSchema>;

// ─── Simulation Output ──────────────────────────────────────────────────────────

export const SimulationOutputSchema = z.object({
  // Metadata
  seed: z.number().int(),
  horizonDays: z.number().int().positive(),
  baseCurrency: CurrencyCodeSchema,
  computedAt: z.string().datetime(),

  // Full trajectory
  snapshots: z.array(DailySnapshotSchema),

  // Finality — statistical distribution of final balance
  finalBalance: z.object({
    expected: z.number(),
    p5: z.number(), // 5th percentile
    p95: z.number(), // 95th percentile
  }),

  // Risk
  collapseProbability: z.number().min(0).max(1),
  collapseDay: z.number().int().nonnegative().nullable(), // day of first collapse, or null

  // Health
  vibeState: VibeStateSchema,
  petState: PetStateSchema,

  // Scores
  finalCreditScore: z.number().min(0).max(850),
  shockResilienceIndex: z.number().min(0).max(100),

  // Assets
  finalNAV: z.number(),
  finalLiquidityRatio: z.number(),
});
export type SimulationOutput = z.infer<typeof SimulationOutputSchema>;

// ─── Branching (what-if scenarios) ──────────────────────────────────────────────

export const BranchRequestSchema = z.object({
  /** Base simulation input */
  baseInput: SimulationInputSchema,
  /** Day to branch from */
  branchAtDay: z.number().int().nonnegative(),
  /** Modified input to apply from the branch point */
  modifiedInput: SimulationInputSchema.partial(),
});
export type BranchRequest = z.infer<typeof BranchRequestSchema>;

export const BranchResultSchema = z.object({
  baseline: SimulationOutputSchema,
  branch: SimulationOutputSchema,
  branchAtDay: z.number().int().nonnegative(),
});
export type BranchResult = z.infer<typeof BranchResultSchema>;
