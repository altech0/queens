CREATE TABLE seed_runs (
  id          TEXT PRIMARY KEY,
  grid_size   INTEGER NOT NULL,
  stars       INTEGER NOT NULL,
  attempts    INTEGER NOT NULL,
  generated   INTEGER NOT NULL,
  duplicates  INTEGER NOT NULL,
  inserted    INTEGER NOT NULL,
  started_at  TEXT NOT NULL,
  finished_at TEXT NOT NULL
);

CREATE INDEX idx_seed_runs_grid_stars ON seed_runs (grid_size, stars);
CREATE INDEX idx_seed_runs_started_at ON seed_runs (started_at);
