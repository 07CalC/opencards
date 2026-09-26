CREATE TABLE IF NOT EXISTS revlogs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(6)))),
  cardId TEXT REFERENCES cards(id) ON DELETE CASCADE,
  userId TEXT REFERENCES users(id) ON DELETE CASCADE,
  reviewedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  rating INTEGER NOT NULL,
  responseMs INTEGER NOT NULL, 
  prevState TEXT, 
  newState TEXT, 
  prevDue INTEGER,
  newDue INTEGER,
  prevEase INTEGER,
  newEase INTEGER,
  scheduler TEXT
);

CREATE INDEX idx_review_logs_card
    ON revlogs(cardId, reviewedAt);

CREATE INDEX idx_review_logs_user
    ON revlogs(userId, reviewedAt);
