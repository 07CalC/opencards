
CREATE TABLE IF NOT EXISTS cardTemplates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(6)))),
  noteTypeId TEXT REFERENCES noteType(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  frontTemplate TEXT NOT NULL,
  backTemplate TEXT NOT NULL,
  ankiTemplateId TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (noteTypeId, name),
  UNIQUE (noteTypeId, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_cardTemplates_noteTypeId ON cardTemplates (noteTypeId);
