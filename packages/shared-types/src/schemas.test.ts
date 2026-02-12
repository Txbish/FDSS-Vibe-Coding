/**
 * Schema validation tests for @future-wallet/shared-types.
 *
 * Tests every Zod schema with valid inputs (should parse) and invalid inputs (should reject).
 * Verifies defaults, constraints, and edge cases.
 */
import { describe, expect, it } from 'vitest';
import {
  CurrencyCodeSchema,
  ExchangeRateSchema,
  AssetTypeSchema,
  AssetSchema,
  RecurrenceSchema,
  IncomeStreamSchema,
  ExpenseSchema,
  LiabilitySchema,
  TaxBracketSchema,
  TaxConfigSchema,
  MonteCarloConfigSchema,
  SimulationInputSchema,
  DailySnapshotSchema,
  VibeStateSchema,
  PetStateSchema,
  SimulationOutputSchema,
  BranchRequestSchema,
  BranchComparisonDeltasSchema,
  BranchComparisonResultSchema,
  CurrencyConversionLogSchema,
  ApiErrorSchema,
} from './index.js';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const VALID_UUID = '11111111-1111-1111-1111-111111111111';

function validAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    name: 'Test Asset',
    type: 'liquid' as const,
    value: 1000,
    currency: 'USD',
    volatility: 0.1,
    yieldRate: 0.05,
    liquidationPenalty: 0.02,
    locked: false,
    ...overrides,
  };
}

function validIncomeStream(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    name: 'Salary',
    amount: 3000,
    currency: 'USD',
    recurrence: 'monthly' as const,
    startDay: 0,
    ...overrides,
  };
}

function validExpense(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    name: 'Rent',
    amount: 1500,
    currency: 'USD',
    recurrence: 'monthly' as const,
    startDay: 0,
    essential: true,
    ...overrides,
  };
}

function validLiability(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    name: 'Student Loan',
    principal: 50000,
    interestRate: 0.045,
    currency: 'USD',
    minimumPayment: 500,
    remainingTermDays: 3650,
    ...overrides,
  };
}

function validExchangeRate(overrides: Record<string, unknown> = {}) {
  return {
    from: 'USD',
    to: 'EUR',
    rate: 0.85,
    date: '2026-01-01',
    volatility: 0.02,
    ...overrides,
  };
}

function validSimulationInput(overrides: Record<string, unknown> = {}) {
  return {
    seed: 42,
    horizonDays: 30,
    baseCurrency: 'USD',
    initialBalance: 10000,
    incomeStreams: [validIncomeStream()],
    expenses: [validExpense()],
    assets: [],
    liabilities: [],
    exchangeRates: [],
    ...overrides,
  };
}

function validDailySnapshot(overrides: Record<string, unknown> = {}) {
  return {
    day: 0,
    date: '2026-01-01',
    balance: 10000,
    totalIncome: 3000,
    totalExpenses: 1500,
    netCashFlow: 1500,
    assetNAV: 0,
    totalDebt: 0,
    creditScore: 650,
    liquidityRatio: 0,
    shockResilienceIndex: 50,
    taxPaid: 0,
    capitalGainsTax: 0,
    ...overrides,
  };
}

function validSimulationOutput(overrides: Record<string, unknown> = {}) {
  return {
    seed: 42,
    horizonDays: 30,
    baseCurrency: 'USD',
    computedAt: '2026-01-01T00:00:00.000Z',
    snapshots: [validDailySnapshot()],
    finalBalance: { expected: 10000, p5: 8000, p95: 12000 },
    collapseProbability: 0,
    collapseDay: null,
    vibeState: 'stable' as const,
    petState: 'content' as const,
    finalCreditScore: 650,
    shockResilienceIndex: 50,
    finalNAV: 0,
    finalLiquidityRatio: 0,
    ...overrides,
  };
}

// ─── CurrencyCode ───────────────────────────────────────────────────────────────

describe('CurrencyCodeSchema', () => {
  it('accepts valid 3-letter codes', () => {
    expect(CurrencyCodeSchema.parse('USD')).toBe('USD');
    expect(CurrencyCodeSchema.parse('eur')).toBe('EUR'); // toUpperCase
    expect(CurrencyCodeSchema.parse('GBP')).toBe('GBP');
  });

  it('rejects invalid currency codes', () => {
    expect(() => CurrencyCodeSchema.parse('US')).toThrow(); // too short
    expect(() => CurrencyCodeSchema.parse('USDX')).toThrow(); // too long
    expect(() => CurrencyCodeSchema.parse('')).toThrow(); // empty
    expect(() => CurrencyCodeSchema.parse(123)).toThrow(); // not string
  });
});

// ─── ExchangeRate ───────────────────────────────────────────────────────────────

describe('ExchangeRateSchema', () => {
  it('accepts valid exchange rates', () => {
    const result = ExchangeRateSchema.parse(validExchangeRate());
    expect(result.from).toBe('USD');
    expect(result.to).toBe('EUR');
    expect(result.rate).toBe(0.85);
    expect(result.volatility).toBe(0.02);
  });

  it('defaults volatility to 0 when omitted', () => {
    const { volatility: _, ...noVol } = validExchangeRate();
    const result = ExchangeRateSchema.parse(noVol);
    expect(result.volatility).toBe(0);
  });

  it('rejects zero or negative rates', () => {
    expect(() => ExchangeRateSchema.parse(validExchangeRate({ rate: 0 }))).toThrow();
    expect(() => ExchangeRateSchema.parse(validExchangeRate({ rate: -1 }))).toThrow();
  });

  it('rejects volatility outside [0, 1]', () => {
    expect(() => ExchangeRateSchema.parse(validExchangeRate({ volatility: -0.1 }))).toThrow();
    expect(() => ExchangeRateSchema.parse(validExchangeRate({ volatility: 1.1 }))).toThrow();
  });

  it('rejects invalid date format', () => {
    expect(() => ExchangeRateSchema.parse(validExchangeRate({ date: 'not-a-date' }))).toThrow();
    expect(() => ExchangeRateSchema.parse(validExchangeRate({ date: '01-01-2026' }))).toThrow();
  });
});

// ─── AssetType ──────────────────────────────────────────────────────────────────

describe('AssetTypeSchema', () => {
  it('accepts all valid asset types', () => {
    expect(AssetTypeSchema.parse('liquid')).toBe('liquid');
    expect(AssetTypeSchema.parse('illiquid')).toBe('illiquid');
    expect(AssetTypeSchema.parse('yield_generating')).toBe('yield_generating');
    expect(AssetTypeSchema.parse('volatile')).toBe('volatile');
  });

  it('rejects invalid asset types', () => {
    expect(() => AssetTypeSchema.parse('stock')).toThrow();
    expect(() => AssetTypeSchema.parse('')).toThrow();
  });
});

// ─── Asset ──────────────────────────────────────────────────────────────────────

describe('AssetSchema', () => {
  it('accepts valid assets', () => {
    const result = AssetSchema.parse(validAsset());
    expect(result.id).toBe(VALID_UUID);
    expect(result.type).toBe('liquid');
    expect(result.value).toBe(1000);
  });

  it('applies defaults for optional fields', () => {
    const minimal = {
      id: VALID_UUID,
      name: 'Minimal Asset',
      type: 'liquid',
      value: 100,
      currency: 'USD',
    };
    const result = AssetSchema.parse(minimal);
    expect(result.volatility).toBe(0);
    expect(result.yieldRate).toBe(0);
    expect(result.liquidationPenalty).toBe(0);
    expect(result.locked).toBe(false);
    expect(result.lockUntilDay).toBeUndefined();
  });

  it('rejects negative values', () => {
    expect(() => AssetSchema.parse(validAsset({ value: -100 }))).toThrow();
  });

  it('rejects non-UUID ids', () => {
    expect(() => AssetSchema.parse(validAsset({ id: 'not-a-uuid' }))).toThrow();
  });

  it('rejects volatility outside [0, 1]', () => {
    expect(() => AssetSchema.parse(validAsset({ volatility: 1.5 }))).toThrow();
    expect(() => AssetSchema.parse(validAsset({ volatility: -0.1 }))).toThrow();
  });

  it('rejects liquidation penalty outside [0, 1]', () => {
    expect(() => AssetSchema.parse(validAsset({ liquidationPenalty: 2 }))).toThrow();
  });
});

// ─── Recurrence ─────────────────────────────────────────────────────────────────

describe('RecurrenceSchema', () => {
  it('accepts all valid recurrence values', () => {
    const valid = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly', 'once'];
    for (const v of valid) {
      expect(RecurrenceSchema.parse(v)).toBe(v);
    }
  });

  it('rejects invalid recurrence values', () => {
    expect(() => RecurrenceSchema.parse('quarterly')).toThrow();
    expect(() => RecurrenceSchema.parse('')).toThrow();
  });
});

// ─── IncomeStream ───────────────────────────────────────────────────────────────

describe('IncomeStreamSchema', () => {
  it('accepts valid income streams', () => {
    const result = IncomeStreamSchema.parse(validIncomeStream());
    expect(result.name).toBe('Salary');
    expect(result.amount).toBe(3000);
    expect(result.recurrence).toBe('monthly');
  });

  it('defaults startDay to 0', () => {
    const { startDay: _, ...noStart } = validIncomeStream();
    const result = IncomeStreamSchema.parse(noStart);
    expect(result.startDay).toBe(0);
  });

  it('rejects zero or negative amounts', () => {
    expect(() => IncomeStreamSchema.parse(validIncomeStream({ amount: 0 }))).toThrow();
    expect(() => IncomeStreamSchema.parse(validIncomeStream({ amount: -100 }))).toThrow();
  });

  it('rejects non-UUID ids', () => {
    expect(() => IncomeStreamSchema.parse(validIncomeStream({ id: 'bad-id' }))).toThrow();
  });
});

// ─── Expense ────────────────────────────────────────────────────────────────────

describe('ExpenseSchema', () => {
  it('accepts valid expenses', () => {
    const result = ExpenseSchema.parse(validExpense());
    expect(result.name).toBe('Rent');
    expect(result.essential).toBe(true);
  });

  it('defaults essential to true', () => {
    const { essential: _, ...noEssential } = validExpense();
    const result = ExpenseSchema.parse(noEssential);
    expect(result.essential).toBe(true);
  });

  it('rejects non-positive amounts', () => {
    expect(() => ExpenseSchema.parse(validExpense({ amount: 0 }))).toThrow();
  });
});

// ─── Liability ──────────────────────────────────────────────────────────────────

describe('LiabilitySchema', () => {
  it('accepts valid liabilities', () => {
    const result = LiabilitySchema.parse(validLiability());
    expect(result.principal).toBe(50000);
    expect(result.interestRate).toBe(0.045);
  });

  it('rejects non-positive principal', () => {
    expect(() => LiabilitySchema.parse(validLiability({ principal: 0 }))).toThrow();
    expect(() => LiabilitySchema.parse(validLiability({ principal: -1000 }))).toThrow();
  });

  it('rejects negative interest rates', () => {
    expect(() => LiabilitySchema.parse(validLiability({ interestRate: -0.01 }))).toThrow();
  });

  it('rejects zero or negative remaining term', () => {
    expect(() => LiabilitySchema.parse(validLiability({ remainingTermDays: 0 }))).toThrow();
    expect(() => LiabilitySchema.parse(validLiability({ remainingTermDays: -1 }))).toThrow();
  });
});

// ─── TaxConfig ──────────────────────────────────────────────────────────────────

describe('TaxBracketSchema', () => {
  it('accepts valid brackets', () => {
    const result = TaxBracketSchema.parse({ upperBound: 50000, rate: 0.22 });
    expect(result.upperBound).toBe(50000);
    expect(result.rate).toBe(0.22);
  });

  it('rejects rate outside [0, 1]', () => {
    expect(() => TaxBracketSchema.parse({ upperBound: 50000, rate: 1.1 })).toThrow();
    expect(() => TaxBracketSchema.parse({ upperBound: 50000, rate: -0.1 })).toThrow();
  });
});

describe('TaxConfigSchema', () => {
  it('accepts valid tax configs', () => {
    const result = TaxConfigSchema.parse({
      brackets: [
        { upperBound: 10000, rate: 0.1 },
        { upperBound: 50000, rate: 0.22 },
      ],
      currency: 'USD',
    });
    expect(result.brackets).toHaveLength(2);
    expect(result.capitalGainsRate).toBe(0.15); // default
  });

  it('requires at least one bracket', () => {
    expect(() =>
      TaxConfigSchema.parse({
        brackets: [],
        currency: 'USD',
      }),
    ).toThrow();
  });

  it('rejects capital gains rate outside [0, 1]', () => {
    expect(() =>
      TaxConfigSchema.parse({
        brackets: [{ upperBound: 50000, rate: 0.22 }],
        capitalGainsRate: 1.5,
        currency: 'USD',
      }),
    ).toThrow();
  });
});

// ─── MonteCarloConfig ───────────────────────────────────────────────────────────

describe('MonteCarloConfigSchema', () => {
  it('accepts valid config', () => {
    const result = MonteCarloConfigSchema.parse({ runs: 200, perturbationFactor: 0.1 });
    expect(result.runs).toBe(200);
    expect(result.perturbationFactor).toBe(0.1);
  });

  it('applies defaults', () => {
    const result = MonteCarloConfigSchema.parse({});
    expect(result.runs).toBe(100);
    expect(result.perturbationFactor).toBe(0.05);
  });

  it('rejects runs > 1000', () => {
    expect(() => MonteCarloConfigSchema.parse({ runs: 1001 })).toThrow();
  });

  it('rejects non-positive runs', () => {
    expect(() => MonteCarloConfigSchema.parse({ runs: 0 })).toThrow();
    expect(() => MonteCarloConfigSchema.parse({ runs: -1 })).toThrow();
  });

  it('rejects perturbationFactor outside [0, 0.5]', () => {
    expect(() => MonteCarloConfigSchema.parse({ perturbationFactor: 0.6 })).toThrow();
    expect(() => MonteCarloConfigSchema.parse({ perturbationFactor: -0.01 })).toThrow();
  });
});

// ─── SimulationInput ────────────────────────────────────────────────────────────

describe('SimulationInputSchema', () => {
  it('accepts valid minimal input', () => {
    const result = SimulationInputSchema.parse({
      horizonDays: 30,
      baseCurrency: 'USD',
    });
    expect(result.seed).toBe(42); // default
    expect(result.initialBalance).toBe(0); // default
    expect(result.incomeStreams).toEqual([]); // default
    expect(result.monteCarloConfig).toBeUndefined(); // optional
  });

  it('accepts full input with all fields', () => {
    const result = SimulationInputSchema.parse({
      ...validSimulationInput(),
      assets: [validAsset()],
      liabilities: [validLiability()],
      exchangeRates: [validExchangeRate()],
      taxConfig: {
        brackets: [{ upperBound: 50000, rate: 0.22 }],
        currency: 'USD',
      },
      monteCarloConfig: { runs: 50 },
    });
    expect(result.assets).toHaveLength(1);
    expect(result.taxConfig).toBeDefined();
    expect(result.monteCarloConfig?.runs).toBe(50);
  });

  it('rejects horizonDays > 3650', () => {
    expect(() =>
      SimulationInputSchema.parse(validSimulationInput({ horizonDays: 3651 })),
    ).toThrow();
  });

  it('rejects horizonDays <= 0', () => {
    expect(() => SimulationInputSchema.parse(validSimulationInput({ horizonDays: 0 }))).toThrow();
  });

  it('rejects missing required field baseCurrency', () => {
    expect(() => SimulationInputSchema.parse({ horizonDays: 30 })).toThrow();
  });
});

// ─── DailySnapshot ──────────────────────────────────────────────────────────────

describe('DailySnapshotSchema', () => {
  it('accepts valid snapshots', () => {
    const result = DailySnapshotSchema.parse(validDailySnapshot());
    expect(result.day).toBe(0);
    expect(result.taxPaid).toBe(0);
    expect(result.capitalGainsTax).toBe(0);
  });

  it('defaults taxPaid and capitalGainsTax to 0', () => {
    const { taxPaid: _t, capitalGainsTax: _c, ...noTax } = validDailySnapshot();
    const result = DailySnapshotSchema.parse(noTax);
    expect(result.taxPaid).toBe(0);
    expect(result.capitalGainsTax).toBe(0);
  });

  it('rejects credit score outside [0, 850]', () => {
    expect(() => DailySnapshotSchema.parse(validDailySnapshot({ creditScore: 851 }))).toThrow();
    expect(() => DailySnapshotSchema.parse(validDailySnapshot({ creditScore: -1 }))).toThrow();
  });

  it('rejects shock resilience index outside [0, 100]', () => {
    expect(() =>
      DailySnapshotSchema.parse(validDailySnapshot({ shockResilienceIndex: 101 })),
    ).toThrow();
    expect(() =>
      DailySnapshotSchema.parse(validDailySnapshot({ shockResilienceIndex: -1 })),
    ).toThrow();
  });

  it('rejects negative day', () => {
    expect(() => DailySnapshotSchema.parse(validDailySnapshot({ day: -1 }))).toThrow();
  });
});

// ─── VibeState & PetState ───────────────────────────────────────────────────────

describe('VibeStateSchema', () => {
  it('accepts all valid vibe states', () => {
    const valid = ['thriving', 'stable', 'strained', 'critical', 'collapsed'];
    for (const v of valid) {
      expect(VibeStateSchema.parse(v)).toBe(v);
    }
  });

  it('rejects invalid vibe states', () => {
    expect(() => VibeStateSchema.parse('unknown')).toThrow();
  });
});

describe('PetStateSchema', () => {
  it('accepts all valid pet states', () => {
    const valid = ['happy', 'content', 'anxious', 'distressed', 'fainted'];
    for (const v of valid) {
      expect(PetStateSchema.parse(v)).toBe(v);
    }
  });

  it('rejects invalid pet states', () => {
    expect(() => PetStateSchema.parse('dead')).toThrow();
  });
});

// ─── SimulationOutput ───────────────────────────────────────────────────────────

describe('SimulationOutputSchema', () => {
  it('accepts valid output', () => {
    const result = SimulationOutputSchema.parse(validSimulationOutput());
    expect(result.seed).toBe(42);
    expect(result.snapshots).toHaveLength(1);
    expect(result.finalBalance.expected).toBe(10000);
  });

  it('rejects collapseProbability outside [0, 1]', () => {
    expect(() =>
      SimulationOutputSchema.parse(validSimulationOutput({ collapseProbability: 1.1 })),
    ).toThrow();
    expect(() =>
      SimulationOutputSchema.parse(validSimulationOutput({ collapseProbability: -0.1 })),
    ).toThrow();
  });

  it('accepts null collapseDay', () => {
    const result = SimulationOutputSchema.parse(validSimulationOutput({ collapseDay: null }));
    expect(result.collapseDay).toBeNull();
  });

  it('accepts numeric collapseDay', () => {
    const result = SimulationOutputSchema.parse(validSimulationOutput({ collapseDay: 15 }));
    expect(result.collapseDay).toBe(15);
  });
});

// ─── BranchRequest ──────────────────────────────────────────────────────────────

describe('BranchRequestSchema', () => {
  it('accepts valid branch request', () => {
    const result = BranchRequestSchema.parse({
      baseInput: validSimulationInput(),
      branchAtDay: 10,
      modifiedInput: { initialBalance: 20000 },
    });
    expect(result.branchAtDay).toBe(10);
    expect(result.modifiedInput.initialBalance).toBe(20000);
  });

  it('accepts empty modifiedInput', () => {
    const result = BranchRequestSchema.parse({
      baseInput: validSimulationInput(),
      branchAtDay: 0,
      modifiedInput: {},
    });
    expect(result.modifiedInput).toEqual({});
  });

  it('rejects negative branchAtDay', () => {
    expect(() =>
      BranchRequestSchema.parse({
        baseInput: validSimulationInput(),
        branchAtDay: -1,
        modifiedInput: {},
      }),
    ).toThrow();
  });
});

// ─── BranchComparisonDeltas ─────────────────────────────────────────────────────

describe('BranchComparisonDeltasSchema', () => {
  it('accepts valid deltas', () => {
    const result = BranchComparisonDeltasSchema.parse({
      finalBalanceDiff: 5000,
      collapseProbabilityDiff: -0.1,
      creditScoreDiff: 25,
      navDiff: 3000,
      liquidityRatioDiff: 0.5,
      shockResilienceIndexDiff: 10,
      vibeStateChange: { from: 'stable', to: 'thriving' },
      petStateChange: { from: 'content', to: 'happy' },
    });
    expect(result.finalBalanceDiff).toBe(5000);
    expect(result.vibeStateChange.from).toBe('stable');
    expect(result.vibeStateChange.to).toBe('thriving');
  });

  it('accepts negative diffs (branch worse than baseline)', () => {
    const result = BranchComparisonDeltasSchema.parse({
      finalBalanceDiff: -5000,
      collapseProbabilityDiff: 0.3,
      creditScoreDiff: -50,
      navDiff: -2000,
      liquidityRatioDiff: -0.8,
      shockResilienceIndexDiff: -20,
      vibeStateChange: { from: 'thriving', to: 'collapsed' },
      petStateChange: { from: 'happy', to: 'fainted' },
    });
    expect(result.finalBalanceDiff).toBe(-5000);
  });
});

// ─── BranchComparisonResult ─────────────────────────────────────────────────────

describe('BranchComparisonResultSchema', () => {
  it('accepts valid comparison result', () => {
    const result = BranchComparisonResultSchema.parse({
      baseline: validSimulationOutput(),
      branch: validSimulationOutput({ seed: 43 }),
      branchAtDay: 10,
      deltas: {
        finalBalanceDiff: 0,
        collapseProbabilityDiff: 0,
        creditScoreDiff: 0,
        navDiff: 0,
        liquidityRatioDiff: 0,
        shockResilienceIndexDiff: 0,
        vibeStateChange: { from: 'stable', to: 'stable' },
        petStateChange: { from: 'content', to: 'content' },
      },
    });
    expect(result.branchAtDay).toBe(10);
    expect(result.deltas).toBeDefined();
  });
});

// ─── CurrencyConversionLog ──────────────────────────────────────────────────────

describe('CurrencyConversionLogSchema', () => {
  it('accepts valid conversion log', () => {
    const result = CurrencyConversionLogSchema.parse({
      day: 5,
      from: 'EUR',
      to: 'USD',
      originalAmount: 1000,
      convertedAmount: 1176.47,
      rateUsed: 1.17647,
      context: 'income:Salary',
    });
    expect(result.from).toBe('EUR');
    expect(result.to).toBe('USD');
    expect(result.context).toBe('income:Salary');
  });

  it('rejects negative day', () => {
    expect(() =>
      CurrencyConversionLogSchema.parse({
        day: -1,
        from: 'USD',
        to: 'EUR',
        originalAmount: 100,
        convertedAmount: 85,
        rateUsed: 0.85,
        context: 'expense:Rent',
      }),
    ).toThrow();
  });

  it('rejects non-positive rate', () => {
    expect(() =>
      CurrencyConversionLogSchema.parse({
        day: 0,
        from: 'USD',
        to: 'EUR',
        originalAmount: 100,
        convertedAmount: 0,
        rateUsed: 0,
        context: 'test',
      }),
    ).toThrow();
  });
});

// ─── ApiError ───────────────────────────────────────────────────────────────────

describe('ApiErrorSchema', () => {
  it('accepts valid error responses', () => {
    const result = ApiErrorSchema.parse({
      error: 'Invalid simulation input',
      code: 'VALIDATION_ERROR',
      details: { fieldErrors: { seed: ['must be integer'] } },
    });
    expect(result.code).toBe('VALIDATION_ERROR');
  });

  it('accepts all error codes', () => {
    const codes = [
      'VALIDATION_ERROR',
      'ENGINE_ERROR',
      'TIMEOUT_ERROR',
      'PAYLOAD_TOO_LARGE',
      'INTERNAL_ERROR',
    ] as const;
    for (const code of codes) {
      const result = ApiErrorSchema.parse({ error: 'test', code });
      expect(result.code).toBe(code);
    }
  });

  it('accepts error without details', () => {
    const result = ApiErrorSchema.parse({
      error: 'Something went wrong',
      code: 'INTERNAL_ERROR',
    });
    expect(result.details).toBeUndefined();
  });

  it('rejects unknown error codes', () => {
    expect(() =>
      ApiErrorSchema.parse({
        error: 'test',
        code: 'UNKNOWN_CODE',
      }),
    ).toThrow();
  });
});
