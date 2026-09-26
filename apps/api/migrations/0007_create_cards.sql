CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(6)))),

  noteId TEXT REFERENCES notes(id) ON DELETE CASCADE,
  deckId TEXT REFERENCES decks(id) ON DELETE CASCADE,
  templateId TEXT REFERENCES cardTemplates(id) ON DELETE RESTRICT,

  ordinal INTEGER NOT NULL,
  clozeOrdinal INTEGER,

  state TEXT NOT NULL DEFAULT 'new',
  queue TEXT NOT NULL DEFAULT 'new',

  due INTEGER NOT NULL DEFAULT 0,
  interval INTEGER NOT NULL DEFAULT 0,

  ease INTEGER NOT NULL DEFAULT 250,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  left INTEGER NOT NULL DEFAULT 0,

  flags INTEGER NOT NULL DEFAULT 0,

  suspended BOOLEAN NOT NULL DEFAULT 0,
  buried BOOLEAN NOT NULL DEFAULT 0,

  ankiCardId TEXT,
  ankiMod INTEGER,
  ankiUsn INTEGER,

  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (noteId, templateId, ordinal),
  CHECK (state IN ('new', 'learning', 'review', 'relearning'))
);

CREATE INDEX IF NOT EXISTS idx_cards_noteId ON cards (noteId);
CREATE INDEX IF NOT EXISTS idx_cards_deckId ON cards (deckId);
CREATE INDEX idx_cards_due ON cards(deckId, due);
