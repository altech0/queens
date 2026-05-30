CREATE TABLE puzzle_serves (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  puzzle_id  TEXT NOT NULL REFERENCES puzzles(id),
  served_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_puzzle_serves_served_at ON puzzle_serves(served_at);
CREATE INDEX idx_puzzle_serves_user_id   ON puzzle_serves(user_id);
