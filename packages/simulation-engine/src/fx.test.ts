/**
 * Exchange rate engine tests — daily volatility, conversion, caching, audit logging.
 */
import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import { ExchangeRateEngine } from './fx.js';
import { DeterministicRNG } from './rng.js';
import type { ExchangeRate } from '@future-wallet/shared-types';

const BASE_RATES: ExchangeRate[] = [
  { from: 'USD', to: 'EUR', rate: 0.85, date: '2026-01-01', volatility: 0.1 },
  { from: 'USD', to: 'GBP', rate: 0.73, date: '2026-01-01', volatility: 0 },
  { from: 'EUR', to: 'JPY', rate: 157.5, date: '2026-01-01', volatility: 0.15 },
];

describe('ExchangeRateEngine', () => {
  describe('constructor and hasRate', () => {
    it('recognizes configured direct rates', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      expect(engine.hasRate('USD', 'EUR')).toBe(true);
      expect(engine.hasRate('USD', 'GBP')).toBe(true);
      expect(engine.hasRate('EUR', 'JPY')).toBe(true);
    });

    it('recognizes inverse rates', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      expect(engine.hasRate('EUR', 'USD')).toBe(true);
      expect(engine.hasRate('GBP', 'USD')).toBe(true);
    });

    it('returns true for same-currency conversion', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      expect(engine.hasRate('USD', 'USD')).toBe(true);
    });

    it('returns false for missing rates', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      expect(engine.hasRate('USD', 'BTC')).toBe(false);
      expect(engine.hasRate('GBP', 'JPY')).toBe(false);
    });
  });

  describe('getDailyRate', () => {
    it('returns 1 for same currency', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      const rng = new DeterministicRNG(42);
      const rate = engine.getDailyRate('USD', 'USD', 0, rng);
      expect(rate.toNumber()).toBe(1);
    });

    it('returns exact base rate when volatility is 0', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      const rng = new DeterministicRNG(42);
      // USD->GBP has volatility 0
      const rate = engine.getDailyRate('USD', 'GBP', 0, rng);
      expect(rate.toNumber()).toBe(0.73);
    });

    it('applies volatility to rates', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      const rng = new DeterministicRNG(42);
      // USD->EUR has volatility 0.1
      const rate = engine.getDailyRate('USD', 'EUR', 0, rng);
      // Should be close to 0.85 but not exactly 0.85
      expect(rate.toNumber()).not.toBe(0.85);
      // Should be within a reasonable range (±30% accounting for RNG extremes)
      expect(rate.toNumber()).toBeGreaterThan(0.5);
      expect(rate.toNumber()).toBeLessThan(1.2);
    });

    it('is deterministic — same seed, same day gives same rate', () => {
      const engine1 = new ExchangeRateEngine(BASE_RATES);
      const engine2 = new ExchangeRateEngine(BASE_RATES);
      const rng1 = new DeterministicRNG(42);
      const rng2 = new DeterministicRNG(42);

      const rate1 = engine1.getDailyRate('USD', 'EUR', 5, rng1);
      const rate2 = engine2.getDailyRate('USD', 'EUR', 5, rng2);
      expect(rate1.eq(rate2)).toBe(true);
    });

    it('caches rates for the same day', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      const rng = new DeterministicRNG(42);

      const rate1 = engine.getDailyRate('USD', 'EUR', 3, rng);
      const rate2 = engine.getDailyRate('USD', 'EUR', 3, rng);
      // Second call should return cached value (identical object)
      expect(rate1.eq(rate2)).toBe(true);
    });

    it('produces different rates for different days (when volatile)', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      const rng = new DeterministicRNG(42);

      const rateDay0 = engine.getDailyRate('USD', 'EUR', 0, rng);
      const rateDay1 = engine.getDailyRate('USD', 'EUR', 1, rng);
      // With volatility, different days should get different rates
      // (there's a vanishingly small chance they match, but practically never)
      expect(rateDay0.eq(rateDay1)).toBe(false);
    });

    it('resolves inverse rates correctly', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      const rng = new DeterministicRNG(42);

      const usdToEur = engine.getDailyRate('USD', 'EUR', 0, rng);
      // Get inverse from cache
      const eurToUsd = engine.getDailyRate('EUR', 'USD', 0, rng);

      // The product should be ~1 (inverse relationship)
      const product = usdToEur.times(eurToUsd);
      expect(product.toNumber()).toBeCloseTo(1, 10);
    });

    it('throws for unavailable conversion pair', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      const rng = new DeterministicRNG(42);

      expect(() => engine.getDailyRate('USD', 'BTC', 0, rng)).toThrow(
        'No exchange rate available for USD -> BTC',
      );
    });
  });

  describe('convert', () => {
    it('returns same amount for same currency', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      const rng = new DeterministicRNG(42);

      const result = engine.convert(new Decimal(100), 'USD', 'USD', 0, rng, 'test');
      expect(result.toNumber()).toBe(100);
    });

    it('converts using daily rate', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      const rng = new DeterministicRNG(42);

      // USD->GBP has no volatility, rate = 0.73
      const result = engine.convert(new Decimal(100), 'USD', 'GBP', 0, rng, 'test');
      expect(result.toNumber()).toBe(73);
    });

    it('logs conversions for audit', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      const rng = new DeterministicRNG(42);

      engine.convert(new Decimal(100), 'USD', 'GBP', 0, rng, 'income:Salary');

      const log = engine.getConversionLog();
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({
        day: 0,
        from: 'USD',
        to: 'GBP',
        originalAmount: 100,
        rateUsed: 0.73,
        context: 'income:Salary',
      });
      expect(log[0].convertedAmount).toBe(73);
    });

    it('does not log same-currency conversion', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      const rng = new DeterministicRNG(42);

      engine.convert(new Decimal(100), 'USD', 'USD', 0, rng, 'test');

      const log = engine.getConversionLog();
      expect(log).toHaveLength(0);
    });

    it('logs multiple conversions', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      const rng = new DeterministicRNG(42);

      engine.convert(new Decimal(100), 'USD', 'GBP', 0, rng, 'income:Salary');
      engine.convert(new Decimal(200), 'USD', 'EUR', 0, rng, 'expense:Rent');

      const log = engine.getConversionLog();
      expect(log).toHaveLength(2);
      expect(log[0].context).toBe('income:Salary');
      expect(log[1].context).toBe('expense:Rent');
    });
  });

  describe('clearCache', () => {
    it('clears rate cache and conversion log', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      const rng = new DeterministicRNG(42);

      engine.convert(new Decimal(100), 'USD', 'GBP', 0, rng, 'test');
      expect(engine.getConversionLog()).toHaveLength(1);

      engine.clearCache();
      expect(engine.getConversionLog()).toHaveLength(0);
    });

    it('generates fresh rates after cache clear', () => {
      const engine = new ExchangeRateEngine(BASE_RATES);
      const rng = new DeterministicRNG(42);

      const rate1 = engine.getDailyRate('USD', 'EUR', 0, rng);
      engine.clearCache();
      // After clearing, next getDailyRate for same day will generate a new rate
      // (different RNG state since we consumed some RNG values)
      const rate2 = engine.getDailyRate('USD', 'EUR', 0, rng);
      // These should be different because the RNG has advanced
      expect(rate1.eq(rate2)).toBe(false);
    });
  });

  describe('empty exchange rates', () => {
    it('handles empty rate list gracefully (same currency works)', () => {
      const engine = new ExchangeRateEngine([]);
      const rng = new DeterministicRNG(42);

      const result = engine.convert(new Decimal(100), 'USD', 'USD', 0, rng, 'test');
      expect(result.toNumber()).toBe(100);
    });

    it('throws for any cross-currency conversion with empty rates', () => {
      const engine = new ExchangeRateEngine([]);
      const rng = new DeterministicRNG(42);

      expect(() => engine.convert(new Decimal(100), 'USD', 'EUR', 0, rng, 'test')).toThrow(
        'No exchange rate available',
      );
    });
  });
});
