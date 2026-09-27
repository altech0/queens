-- Which generator ("engine") made each puzzle, so several generators can coexist
-- and players can pick a style. The id is internal and never shown — display
-- names live in the API so they can change without an app release.
--
-- Every existing row was made by the capped-Voronoi v2 generator, so the default
-- labels the whole table correctly. A constant DEFAULT makes this metadata-only
-- in SQLite: no row rewrite, even at 30k rows.
--
-- NOT NULL matters here: the fetch handler filters on engine, and a NULL would
-- make the row unreachable (same trap as a NULL rand in 0020).
ALTER TABLE puzzles ADD COLUMN engine TEXT NOT NULL DEFAULT 'voronoi-v2';

-- Drives the random fetch once it filters by engine. Mirrors
-- idx_puzzles_grid_stars_rand (0020) with engine as the leading column, so the
-- handler keeps doing one index seek per request.
CREATE INDEX idx_puzzles_engine_grid_stars_rand ON puzzles(engine, grid_size, stars, rand);

-- Existing indexes are kept: a request without an engine param still uses
-- idx_puzzles_grid_stars_rand.

-- Same label on seed runs, so throughput can be compared per engine.
ALTER TABLE seed_runs ADD COLUMN engine TEXT NOT NULL DEFAULT 'voronoi-v2';
