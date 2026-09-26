CREATE TABLE IF NOT EXISTS noteType (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(6)))),
  ownerId TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'basic',
  css TEXT,
  ankiModelId TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_noteType_ownerId ON noteType (ownerId);
