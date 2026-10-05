import type { CatalogueStyle } from './types'

/**
 * What puzzle styles the API has, and which sizes exist for each.
 *
 * Drives the style and size pickers so a new generator needs no web deploy —
 * the same contract the iOS app follows (app/queens/PuzzleCatalogue.swift).
 */

/** The engine every pre-styles puzzle was made by, and the API's default. */
export const DEFAULT_ENGINE = 'voronoi-v2'

/**
 * What the picker offers when `/catalogue` is unavailable — an older API with no
 * such endpoint, or a network failure. Mirrors the pre-styles web app: Original
 * only, with the sizes it used to hardcode.
 *
 * `count` is 1 purely to mark the combo as present; nothing displays it.
 */
export const FALLBACK_STYLES: CatalogueStyle[] = [{
  engine: DEFAULT_ENGINE,
  name: 'Original',
  description: 'Balanced regions that grow evenly from the centre out.',
  sizes: [
    { size: 5,  stars: 1, count: 1, difficulties: {} },
    { size: 6,  stars: 1, count: 1, difficulties: {} },
    { size: 8,  stars: 1, count: 1, difficulties: {} },
    { size: 10, stars: 2, count: 1, difficulties: {} },
  ],
}]

export function styleFor(styles: CatalogueStyle[], engine: string): CatalogueStyle | undefined {
  return styles.find(s => s.engine === engine)
}

/**
 * Stars for a size within a style. The old hardcoded CONFIGS map could not
 * express this: 9×9 exists only for the new styles, and a size's star count is
 * a property of the style, not of the size alone.
 */
export function starsFor(styles: CatalogueStyle[], engine: string, size: number): number | undefined {
  return styleFor(styles, engine)?.sizes.find(s => s.size === size)?.stars
}

/** Difficulty buckets in display order, matching the API's ALLOWED_DIFFICULTIES. */
export const ALL_DIFFICULTIES = ['easy', 'medium', 'hard', 'very_hard'] as const

export function difficultyLabel(d: string): string {
  switch (d) {
    case 'easy':      return 'Easy'
    case 'medium':    return 'Medium'
    case 'hard':      return 'Hard'
    case 'very_hard': return 'Very Hard'
    default:          return d
  }
}

/**
 * Which difficulties actually have puzzles for this style and size, in display
 * order. Tangled boards are nearly all `hard`, so offering the full set would
 * mean a 404 on the others.
 */
export function availableDifficulties(styles: CatalogueStyle[], engine: string, size: number): string[] {
  const counts = styleFor(styles, engine)?.sizes.find(s => s.size === size)?.difficulties ?? {}
  return ALL_DIFFICULTIES.filter(d => (counts[d] ?? 0) > 0)
}
