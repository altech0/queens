-- Re-key puzzle_counts (0021) by engine, so the dashboard and the /catalogue
-- endpoint can report per-style totals without counting index entries.
--
-- Order matters. The three triggers are dropped FIRST: a trigger follows the
-- table it was created against through a rename, so recreating the table with
-- the triggers still attached leaves them pointing at puzzle_counts_old.
DROP TRIGGER puzzle_counts_insert;
DROP TRIGGER puzzle_counts_delete;
DROP TRIGGER puzzle_counts_update;

ALTER TABLE puzzle_counts RENAME TO puzzle_counts_old;

CREATE TABLE puzzle_counts (
  engine    TEXT NOT NULL,
  grid_size INTEGER NOT NULL,
  stars     INTEGER NOT NULL,
  n         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (engine, grid_size, stars)
);

-- Recount from puzzles rather than copying the old totals: the old table had no
-- engine, and after 0022 every row carries one, so this is exact either way.
INSERT INTO puzzle_counts (engine, grid_size, stars, n)
  SELECT engine, grid_size, stars, COUNT(*) FROM puzzles GROUP BY engine, grid_size, stars;

DROP TABLE puzzle_counts_old;

CREATE TRIGGER puzzle_counts_insert AFTER INSERT ON puzzles
BEGIN
  INSERT OR IGNORE INTO puzzle_counts (engine, grid_size, stars, n) VALUES (NEW.engine, NEW.grid_size, NEW.stars, 0);
  UPDATE puzzle_counts SET n = n + 1 WHERE engine = NEW.engine AND grid_size = NEW.grid_size AND stars = NEW.stars;
END;

CREATE TRIGGER puzzle_counts_delete AFTER DELETE ON puzzles
BEGIN
  UPDATE puzzle_counts SET n = n - 1 WHERE engine = OLD.engine AND grid_size = OLD.grid_size AND stars = OLD.stars;
END;

-- engine belongs in both the column list and the WHEN clause. Without it a
-- relabel (e.g. after a solver rewrite) moves the row but not the count, and
-- the totals drift silently.
CREATE TRIGGER puzzle_counts_update AFTER UPDATE OF grid_size, stars, engine ON puzzles
WHEN NEW.grid_size IS NOT OLD.grid_size OR NEW.stars IS NOT OLD.stars OR NEW.engine IS NOT OLD.engine
BEGIN
  UPDATE puzzle_counts SET n = n - 1 WHERE engine = OLD.engine AND grid_size = OLD.grid_size AND stars = OLD.stars;
  INSERT OR IGNORE INTO puzzle_counts (engine, grid_size, stars, n) VALUES (NEW.engine, NEW.grid_size, NEW.stars, 0);
  UPDATE puzzle_counts SET n = n + 1 WHERE engine = NEW.engine AND grid_size = NEW.grid_size AND stars = NEW.stars;
END;

-- A combo drained to zero leaves an n = 0 row (the delete trigger decrements, it
-- does not delete). Readers must filter WHERE n > 0 rather than assume the row
-- is absent.
