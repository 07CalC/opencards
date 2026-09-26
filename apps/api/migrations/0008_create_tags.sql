CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(6)))),
  ownerId TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (ownerId, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_ownerId ON tags (ownerId);
