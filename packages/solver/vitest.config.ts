import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The reference sweep runs the tier-4 look-ahead, which costs seconds per
    // 10x10 board. Generous enough for the sampled sweep, tight enough that a
    // performance regression fails instead of hanging CI. The opt-in full
    // sweep (SOLVER_FULL_SWEEP=1) needs more; raise it for that run only.
    testTimeout: process.env.SOLVER_FULL_SWEEP === '1' ? 900_000 : 120_000,
  },
})
