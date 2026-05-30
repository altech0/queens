-- The global unique index on solution allows collisions across grid sizes
-- (a 5x5 solution string can match a row from a different grid size, causing
-- INSERT OR IGNORE to silently drop valid new puzzles).
-- Replace it with a composite unique index on (grid_size, stars, solution).
DROP INDEX IF EXISTS idx_puzzles_solution;
CREATE UNIQUE INDEX idx_puzzles_solution ON puzzles(grid_size, stars, solution);
