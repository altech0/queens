-- difficulty column was never populated — drop it
-- SQLite cannot DROP COLUMN directly on older versions, but D1 supports it
ALTER TABLE puzzles DROP COLUMN difficulty;

-- Delete puzzles from configs that no longer exist (5x5 1-star, 8x8 2-star)
DELETE FROM puzzles WHERE (grid_size = 5 AND stars = 1) OR (grid_size = 8 AND stars = 2);
