-- Recreate users table without attest_key_id (D1 cannot drop UNIQUE columns directly)
CREATE TABLE users_new (
  id         TEXT PRIMARY KEY,
  api_token  TEXT UNIQUE NOT NULL,
  nickname   TEXT UNIQUE NOT NULL COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO users_new (id, api_token, nickname, created_at)
  SELECT id, api_token, nickname, created_at FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE INDEX idx_users_api_token ON users(api_token);
CREATE INDEX idx_users_nickname  ON users(nickname COLLATE NOCASE);
