-- Per-combo puzzle totals, kept exact by triggers, so the dashboard reads a
-- handful of rows instead of counting every puzzles index entry on each load.

CREATE TABLE puzzle_counts (
  grid_size INTEGER NOT NULL,
  stars     INTEGER NOT NULL,
  n         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (grid_size, stars)
);

INSERT INTO puzzle_counts (grid_size, stars, n)
  SELECT grid_size, stars, COUNT(*) FROM puzzles GROUP BY grid_size, stars;

CREATE TRIGGER puzzle_counts_insert AFTER INSERT ON puzzles
BEGIN
  INSERT OR IGNORE INTO puzzle_counts (grid_size, stars, n) VALUES (NEW.grid_size, NEW.stars, 0);
  UPDATE puzzle_counts SET n = n + 1 WHERE grid_size = NEW.grid_size AND stars = NEW.stars;
END;

CREATE TRIGGER puzzle_counts_delete AFTER DELETE ON puzzles
BEGIN
  UPDATE puzzle_counts SET n = n - 1 WHERE grid_size = OLD.grid_size AND stars = OLD.stars;
END;

-- grid_size/stars never change in practice; covered so the counts stay exact regardless.
CREATE TRIGGER puzzle_counts_update AFTER UPDATE OF grid_size, stars ON puzzles
WHEN NEW.grid_size IS NOT OLD.grid_size OR NEW.stars IS NOT OLD.stars
BEGIN
  UPDATE puzzle_counts SET n = n - 1 WHERE grid_size = OLD.grid_size AND stars = OLD.stars;
  INSERT OR IGNORE INTO puzzle_counts (grid_size, stars, n) VALUES (NEW.grid_size, NEW.stars, 0);
  UPDATE puzzle_counts SET n = n + 1 WHERE grid_size = NEW.grid_size AND stars = NEW.stars;
END;
