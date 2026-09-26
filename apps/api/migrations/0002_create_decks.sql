CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(6)))),
  ownerId TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parentDeckId TEXT REFERENCES decks(id) ON DELETE CASCADE,
  ankiDeckId TEXT,
  ankiConfId TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_decks_ownerId ON decks (ownerId);
CREATE INDEX IF NOT EXISTS idx_decks_parentDeckId ON decks (parentDeckId);
