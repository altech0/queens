CREATE TABLE IF NOT EXISTS puzzles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  size INTEGER NOT NULL,
  regions TEXT NOT NULL,
  solution TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
