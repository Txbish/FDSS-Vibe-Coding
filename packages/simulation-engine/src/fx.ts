/**
 * Multi-currency exchange rate engine.
 *
 * Implements:
 * - RNG-based daily rate fluctuation from base rates
 * - Conversion at exact transaction time (per spec Section 2.1)
 * - Decimal.js precision for all conversions
 * - Conversion logging for precision audit (spec Section 5)
 *
 * Per spec: "Volatility Management: Support for daily fluctuating exchange rate tables."
 * Per spec: "Conversion must occur at the exact time of transaction realization."
 * Per spec: "Maintenance of floating-point integrity across high-frequency conversions."
 */
import Decimal from 'decimal.js';
import type {
  CurrencyCode,
  CurrencyConversionLog,
  ExchangeRate,
} from '@future-wallet/shared-types';
import type { DeterministicRNG } from './rng.js';

/**
 * Manages exchange rates with deterministic daily fluctuation.
 *
 * Maintains a cache of daily rates generated from base rates + RNG volatility.
 * Ensures identical seeds produce identical rate sequences.
 */
export class ExchangeRateEngine {
  private baseRates: Map<string, ExchangeRate>;
  private dailyRateCache: Map<string, Decimal>; // "day:FROM:TO" -> rate
  private conversionLog: CurrencyConversionLog[];

  constructor(exchangeRates: ExchangeRate[]) {
    this.baseRates = new Map();
    this.dailyRateCache = new Map();
    this.conversionLog = [];

    for (const rate of exchangeRates) {
      const key = `${rate.from}:${rate.to}`;
      this.baseRates.set(key, rate);
    }
  }

  /**
   * Gets the exchange rate for a given day with RNG-based volatility.
   *
   * Rate = baseRate * (1 + gaussian(0, volatility / sqrt(365)))
   * Cached per day to ensure consistent rates within the same day.
   */
  getDailyRate(from: CurrencyCode, to: CurrencyCode, day: number, rng: DeterministicRNG): Decimal {
    // Same currency — no conversion needed
    if (from === to) return new Decimal(1);

    const cacheKey = `${day}:${from}:${to}`;
    const cached = this.dailyRateCache.get(cacheKey);
    if (cached) return cached;

    // Try direct rate
    const directKey = `${from}:${to}`;
    const directRate = this.baseRates.get(directKey);
    if (directRate) {
      const rate = this.applyVolatility(directRate, rng);
      this.dailyRateCache.set(cacheKey, rate);

      // Cache inverse too
      const inverseKey = `${day}:${to}:${from}`;
      if (!this.dailyRateCache.has(inverseKey)) {
        this.dailyRateCache.set(inverseKey, new Decimal(1).div(rate));
      }

      return rate;
    }

    // Try inverse rate
    const inverseRateKey = `${to}:${from}`;
    const inverseRate = this.baseRates.get(inverseRateKey);
    if (inverseRate) {
      const fwdRate = this.applyVolatility(inverseRate, rng);
      const rate = new Decimal(1).div(fwdRate);
      this.dailyRateCache.set(cacheKey, rate);

      // Cache the forward direction too
      const fwdCacheKey = `${day}:${to}:${from}`;
      if (!this.dailyRateCache.has(fwdCacheKey)) {
        this.dailyRateCache.set(fwdCacheKey, fwdRate);
      }

      return rate;
    }

    // No rate available — cannot convert
    throw new Error(`No exchange rate available for ${from} -> ${to}`);
  }

  /**
   * Converts an amount from one currency to another using the day's rate.
   * Logs the conversion for precision audit.
   */
  convert(
    amount: Decimal,
    from: CurrencyCode,
    to: CurrencyCode,
    day: number,
    rng: DeterministicRNG,
    context: string,
  ): Decimal {
    if (from === to) return amount;

    const rate = this.getDailyRate(from, to, day, rng);
    const converted = amount.times(rate);

    // Log for precision audit
    this.conversionLog.push({
      day,
      from,
      to,
      originalAmount: amount.toNumber(),
      convertedAmount: converted.toNumber(),
      rateUsed: rate.toNumber(),
      context,
    });

    return converted;
  }

  /**
   * Returns the full conversion log for precision validation.
   */
  getConversionLog(): CurrencyConversionLog[] {
    return [...this.conversionLog];
  }

  /**
   * Clears the daily rate cache. Called between simulation runs
   * if rates should be regenerated (e.g., Monte Carlo with different seeds).
   */
  clearCache(): void {
    this.dailyRateCache.clear();
    this.conversionLog = [];
  }

  /**
   * Checks if a conversion is possible between two currencies.
   */
  hasRate(from: CurrencyCode, to: CurrencyCode): boolean {
    if (from === to) return true;
    return this.baseRates.has(`${from}:${to}`) || this.baseRates.has(`${to}:${from}`);
  }

  private applyVolatility(rate: ExchangeRate, rng: DeterministicRNG): Decimal {
    const baseRate = new Decimal(rate.rate);

    if (rate.volatility <= 0) {
      return baseRate;
    }

    // Daily fluctuation: gaussian noise scaled by annualized volatility
    const dailyVol = rate.volatility / Math.sqrt(365);
    const shock = rng.gaussian(0, dailyVol);
    // Ensure rate stays positive
    const factor = new Decimal(1 + shock);
    const adjustedRate = baseRate.times(Decimal.max(factor, new Decimal(0.01)));

    return adjustedRate;
  }
}
