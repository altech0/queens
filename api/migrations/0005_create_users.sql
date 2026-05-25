CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  api_token     TEXT UNIQUE NOT NULL,
  attest_key_id TEXT UNIQUE NOT NULL,
  nickname      TEXT UNIQUE NOT NULL COLLATE NOCASE,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_api_token  ON users(api_token);
CREATE INDEX idx_users_attest_key ON users(attest_key_id);
CREATE INDEX idx_users_nickname   ON users(nickname COLLATE NOCASE);
