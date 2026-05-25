-- Drop legacy v1 puzzles table
DROP TABLE IF EXISTS puzzles;

-- Drop v2 table (will be recreated as puzzles with code column)
DROP TABLE IF EXISTS puzzles_v2;

-- Create unified puzzles table with code column
CREATE TABLE puzzles (
  id TEXT PRIMARY KEY,
  grid_size INTEGER NOT NULL,
  stars INTEGER NOT NULL,
  regions TEXT NOT NULL,
  solution TEXT NOT NULL,
  difficulty TEXT,
  code INTEGER UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
