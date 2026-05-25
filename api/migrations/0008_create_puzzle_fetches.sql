CREATE TABLE IF NOT EXISTS puzzle_fetches (
  api_token TEXT NOT NULL,
  date      TEXT NOT NULL,
  count     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (api_token, date)
);
