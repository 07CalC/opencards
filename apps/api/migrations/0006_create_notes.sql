

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(6)))),
  ownerId TEXT REFERENCES users(id) ON DELETE CASCADE,
  noteTypeId TEXT REFERENCES noteType(id) ON DELETE RESTRICT,
  
  fields JSON NOT NULL DEFAULT ('{}'),

  ankiNoteId TEXT,
  ankiGuid TEXT,

  ankiMod INTEGER,
  ankiUsn INTEGER,


  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_ownerId ON notes (ownerId);
CREATE INDEX IF NOT EXISTS idx_notes_noteTypeId ON notes (noteTypeId);


