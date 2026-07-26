-- difficulty:       text label the app serves/filters on ('easy' | 'medium' | 'hard' ...)
-- difficulty_score: raw solver-derived signal (source of truth — re-bucket without re-solving)
-- Both nullable; existing rows start NULL and are backfilled. Computed per-size at generation.
ALTER TABLE puzzles ADD COLUMN difficulty TEXT;
ALTER TABLE puzzles ADD COLUMN difficulty_score INTEGER;
