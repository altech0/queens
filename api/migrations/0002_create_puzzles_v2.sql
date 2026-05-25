CREATE TABLE IF NOT EXISTS puzzles_v2 (
  id TEXT PRIMARY KEY,
  grid_size INTEGER NOT NULL,
  stars INTEGER NOT NULL,
  regions TEXT NOT NULL,
  solution TEXT NOT NULL,
  difficulty TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
