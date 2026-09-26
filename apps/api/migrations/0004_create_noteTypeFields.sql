CREATE TABLE IF NOT EXISTS noteTypeFields (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(6)))),
  noteTypeId TEXT REFERENCES noteType(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  font TEXT,
  fontSize INTEGER,
  sticky BOOLEAN NOT NULL DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (noteTypeId, name),
  UNIQUE (noteTypeId, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_noteTypeFields_noteTypeId ON noteTypeFields (noteTypeId);
