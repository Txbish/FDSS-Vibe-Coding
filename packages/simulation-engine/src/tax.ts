/**
 * Progressive tax bracket system.
 *
 * Implements:
 * - Progressive income tax brackets (marginal rate per bracket)
 * - Capital gains tax on realized asset sales
 * - All calculations use Decimal.js for financial precision
 *
 * Per spec Section 2.3: "Support for progressive brackets and the
 * distinction between realized and unrealized gains."
 */
import Decimal from 'decimal.js';
import type { TaxConfig } from '@future-wallet/shared-types';

/**
 * Result of daily tax computation.
 */
export interface TaxResult {
  /** Income tax deducted from progressive brackets */
  incomeTax: Decimal;
  /** Capital gains tax on realized asset sales */
  capitalGainsTax: Decimal;
  /** Total tax (income + capital gains) */
  totalTax: Decimal;
}

/**
 * Computes progressive income tax for a given annual income amount.
 *
 * Brackets are marginal: each bracket's rate applies only to the income
 * within that bracket's range. Income above the highest bracket is taxed
 * at the highest bracket's rate.
 *
 * @param annualIncome - Total annual income (pre-tax)
 * @param config - Tax configuration with progressive brackets
 * @returns Total annual tax amount
 */
export function computeProgressiveTax(annualIncome: Decimal, config: TaxConfig): Decimal {
  if (annualIncome.lte(0)) return new Decimal(0);

  const sortedBrackets = [...config.brackets].sort((a, b) => a.upperBound - b.upperBound);

  let totalTax = new Decimal(0);
  let previousBound = new Decimal(0);

  for (const bracket of sortedBrackets) {
    const upperBound = new Decimal(bracket.upperBound);
    const rate = new Decimal(bracket.rate);

    if (annualIncome.lte(previousBound)) break;

    const taxableInBracket = Decimal.min(annualIncome, upperBound).minus(previousBound);
    if (taxableInBracket.gt(0)) {
      totalTax = totalTax.plus(taxableInBracket.times(rate));
    }

    previousBound = upperBound;
  }

  // Income above the highest bracket: taxed at the highest bracket's rate
  if (annualIncome.gt(previousBound) && sortedBrackets.length > 0) {
    const highestRate = new Decimal(sortedBrackets[sortedBrackets.length - 1].rate);
    const excess = annualIncome.minus(previousBound);
    totalTax = totalTax.plus(excess.times(highestRate));
  }

  return totalTax;
}

/**
 * Computes capital gains tax on realized gains from asset liquidation.
 *
 * @param realizedGains - Total realized gains (proceeds - cost basis)
 * @param config - Tax configuration with capitalGainsRate
 * @returns Capital gains tax amount
 */
export function computeCapitalGainsTax(realizedGains: Decimal, config: TaxConfig): Decimal {
  if (realizedGains.lte(0)) return new Decimal(0);
  return realizedGains.times(new Decimal(config.capitalGainsRate));
}

/**
 * Computes daily tax obligations.
 *
 * Income tax is prorated daily: (annual tax / 365).
 * Capital gains tax is applied immediately on the day of realization.
 *
 * @param dailyIncome - Income earned this day (already in base currency)
 * @param dailyRealizedGains - Gains realized from asset sales this day
 * @param cumulativeAnnualIncome - Running total of income this year (for bracket placement)
 * @param config - Tax configuration
 * @returns TaxResult with income tax, capital gains tax, and total
 */
export function computeDailyTax(
  dailyIncome: Decimal,
  dailyRealizedGains: Decimal,
  cumulativeAnnualIncome: Decimal,
  config: TaxConfig,
): TaxResult {
  // Marginal income tax for today's income:
  // Tax on (cumulative + today) - Tax on (cumulative) = marginal tax for today
  const taxWithToday = computeProgressiveTax(cumulativeAnnualIncome.plus(dailyIncome), config);
  const taxWithoutToday = computeProgressiveTax(cumulativeAnnualIncome, config);
  const incomeTax = taxWithToday.minus(taxWithoutToday);

  const capitalGainsTax = computeCapitalGainsTax(dailyRealizedGains, config);

  return {
    incomeTax,
    capitalGainsTax,
    totalTax: incomeTax.plus(capitalGainsTax),
  };
}
