/**
 * Seeded PRNG wrapper for deterministic simulation.
 * Uses seedrandom to guarantee bit-exact identical outputs for identical seeds.
 *
 * IMPORTANT: Never use Math.random() in the simulation — always use this.
 */
import seedrandom from 'seedrandom';

export class DeterministicRNG {
  private rng: seedrandom.PRNG;

  constructor(seed: number) {
    this.rng = seedrandom(seed.toString());
  }

  /** Returns a deterministic float in [0, 1) */
  next(): number {
    return this.rng();
  }

  /** Returns a deterministic float in [min, max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Returns a deterministic gaussian-ish value (Box-Muller) */
  gaussian(mean = 0, stddev = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stddev;
  }
}
