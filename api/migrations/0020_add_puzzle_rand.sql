-- Random sort key for cheap random puzzle selection.
--
-- The fetch handler used ORDER BY RANDOM() LIMIT 1, which reads every matching
-- row on every request (~39k rows per 10x10 fetch). With a fixed random key
-- per puzzle it can instead seek `rand >= ?` on an index and read one row.

ALTER TABLE puzzles ADD COLUMN rand REAL;

-- random() is a signed 64-bit int; reduce mod 1e9 before abs() so it can never
-- overflow, then scale into [0, 1).
UPDATE puzzles SET rand = abs(random() % 1000000000) / 1000000000.0;

CREATE INDEX idx_puzzles_grid_stars_rand ON puzzles(grid_size, stars, rand);
CREATE INDEX idx_puzzles_rand ON puzzles(rand);

-- Any insert that doesn't set rand (seed scripts, ad-hoc SQL) gets one here.
-- A NULL rand would make the row unreachable by the seek.
CREATE TRIGGER puzzles_default_rand AFTER INSERT ON puzzles
WHEN NEW.rand IS NULL
BEGIN
  UPDATE puzzles SET rand = abs(random() % 1000000000) / 1000000000.0 WHERE rowid = NEW.rowid;
END;
