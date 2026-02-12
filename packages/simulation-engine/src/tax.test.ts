/**
 * Tax system tests — progressive brackets, capital gains, daily computation.
 */
import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import { computeProgressiveTax, computeCapitalGainsTax, computeDailyTax } from './tax.js';
import type { TaxConfig } from '@future-wallet/shared-types';

const STANDARD_TAX_CONFIG: TaxConfig = {
  brackets: [
    { upperBound: 10000, rate: 0.1 },
    { upperBound: 40000, rate: 0.2 },
    { upperBound: 85000, rate: 0.3 },
    { upperBound: 163000, rate: 0.35 },
  ],
  capitalGainsRate: 0.15,
  currency: 'USD',
};

describe('computeProgressiveTax', () => {
  it('returns 0 for zero income', () => {
    const tax = computeProgressiveTax(new Decimal(0), STANDARD_TAX_CONFIG);
    expect(tax.toNumber()).toBe(0);
  });

  it('returns 0 for negative income', () => {
    const tax = computeProgressiveTax(new Decimal(-5000), STANDARD_TAX_CONFIG);
    expect(tax.toNumber()).toBe(0);
  });

  it('computes tax correctly within the first bracket', () => {
    // $5000 income: all in 10% bracket -> $500
    const tax = computeProgressiveTax(new Decimal(5000), STANDARD_TAX_CONFIG);
    expect(tax.toNumber()).toBe(500);
  });

  it('computes tax correctly spanning two brackets', () => {
    // $25000 income:
    //   First $10000 at 10% = $1000
    //   Next  $15000 at 20% = $3000
    //   Total = $4000
    const tax = computeProgressiveTax(new Decimal(25000), STANDARD_TAX_CONFIG);
    expect(tax.toNumber()).toBe(4000);
  });

  it('computes tax correctly spanning all brackets', () => {
    // $100000 income:
    //   First  $10000 at 10% = $1000
    //   Next   $30000 at 20% = $6000
    //   Next   $45000 at 30% = $13500
    //   Next   $15000 at 35% = $5250
    //   Total = $25750
    const tax = computeProgressiveTax(new Decimal(100000), STANDARD_TAX_CONFIG);
    expect(tax.toNumber()).toBe(25750);
  });

  it('taxes excess above highest bracket at highest rate', () => {
    // $200000 income:
    //   First  $10000  at 10% = $1000
    //   Next   $30000  at 20% = $6000
    //   Next   $45000  at 30% = $13500
    //   Next   $78000  at 35% = $27300
    //   Excess $37000  at 35% = $12950
    //   Total = $60750
    const tax = computeProgressiveTax(new Decimal(200000), STANDARD_TAX_CONFIG);
    expect(tax.toNumber()).toBe(60750);
  });

  it('handles unsorted brackets correctly', () => {
    const unsortedConfig: TaxConfig = {
      brackets: [
        { upperBound: 40000, rate: 0.2 },
        { upperBound: 10000, rate: 0.1 },
      ],
      capitalGainsRate: 0.15,
      currency: 'USD',
    };
    // $25000: first $10000 at 10% = $1000, next $15000 at 20% = $3000 -> $4000
    const tax = computeProgressiveTax(new Decimal(25000), unsortedConfig);
    expect(tax.toNumber()).toBe(4000);
  });

  it('handles single bracket config', () => {
    const singleBracketConfig: TaxConfig = {
      brackets: [{ upperBound: 100000, rate: 0.25 }],
      capitalGainsRate: 0.1,
      currency: 'USD',
    };
    const tax = computeProgressiveTax(new Decimal(50000), singleBracketConfig);
    expect(tax.toNumber()).toBe(12500);
  });

  it('uses Decimal.js precision (no floating-point drift)', () => {
    // Verify precision on a carefully chosen input
    const config: TaxConfig = {
      brackets: [
        { upperBound: 10000, rate: 0.1 },
        { upperBound: 30000, rate: 0.22 },
      ],
      capitalGainsRate: 0.15,
      currency: 'USD',
    };
    // $15000: first $10000 at 10% = $1000, next $5000 at 22% = $1100 -> $2100
    const tax = computeProgressiveTax(new Decimal(15000), config);
    expect(tax.toNumber()).toBe(2100);
  });
});

describe('computeCapitalGainsTax', () => {
  it('returns 0 for zero gains', () => {
    const tax = computeCapitalGainsTax(new Decimal(0), STANDARD_TAX_CONFIG);
    expect(tax.toNumber()).toBe(0);
  });

  it('returns 0 for negative gains (losses)', () => {
    const tax = computeCapitalGainsTax(new Decimal(-1000), STANDARD_TAX_CONFIG);
    expect(tax.toNumber()).toBe(0);
  });

  it('applies flat capital gains rate correctly', () => {
    // $10000 gain at 15% = $1500
    const tax = computeCapitalGainsTax(new Decimal(10000), STANDARD_TAX_CONFIG);
    expect(tax.toNumber()).toBe(1500);
  });

  it('handles large gains precisely', () => {
    const tax = computeCapitalGainsTax(new Decimal(1000000), STANDARD_TAX_CONFIG);
    expect(tax.toNumber()).toBe(150000);
  });
});

describe('computeDailyTax', () => {
  it('returns zero for zero daily income and no gains', () => {
    const result = computeDailyTax(
      new Decimal(0),
      new Decimal(0),
      new Decimal(0),
      STANDARD_TAX_CONFIG,
    );
    expect(result.incomeTax.toNumber()).toBe(0);
    expect(result.capitalGainsTax.toNumber()).toBe(0);
    expect(result.totalTax.toNumber()).toBe(0);
  });

  it('computes marginal income tax correctly (first day)', () => {
    // Day 1: cumulative = 0, daily income = $100
    // Tax on $100 at 10% bracket = $10
    const result = computeDailyTax(
      new Decimal(100),
      new Decimal(0),
      new Decimal(0),
      STANDARD_TAX_CONFIG,
    );
    expect(result.incomeTax.toNumber()).toBe(10);
  });

  it('computes marginal tax at bracket boundary', () => {
    // Cumulative = $9950, daily income = $100
    // Tax on ($10050) - Tax on ($9950) = marginal
    // Tax on $10050: $10000 * 0.1 + $50 * 0.2 = $1010
    // Tax on $9950:  $9950 * 0.1 = $995
    // Marginal = $1010 - $995 = $15
    const result = computeDailyTax(
      new Decimal(100),
      new Decimal(0),
      new Decimal(9950),
      STANDARD_TAX_CONFIG,
    );
    expect(result.incomeTax.toNumber()).toBe(15);
  });

  it('combines income tax and capital gains tax', () => {
    const result = computeDailyTax(
      new Decimal(100),
      new Decimal(500),
      new Decimal(0),
      STANDARD_TAX_CONFIG,
    );
    expect(result.incomeTax.toNumber()).toBe(10); // $100 at 10%
    expect(result.capitalGainsTax.toNumber()).toBe(75); // $500 at 15%
    expect(result.totalTax.toNumber()).toBe(85);
  });

  it('totalTax equals incomeTax plus capitalGainsTax', () => {
    const result = computeDailyTax(
      new Decimal(200),
      new Decimal(300),
      new Decimal(5000),
      STANDARD_TAX_CONFIG,
    );
    const expected = result.incomeTax.plus(result.capitalGainsTax);
    expect(result.totalTax.eq(expected)).toBe(true);
  });
});
