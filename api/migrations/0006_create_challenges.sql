CREATE TABLE challenges (
  id         TEXT PRIMARY KEY,
  nonce      TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  ip         TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_challenges_nonce ON challenges(nonce);
