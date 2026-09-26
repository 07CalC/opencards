export type DbDeck = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  parentDeckId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeckCounts = {
  newCount: number;
  learningCount: number;
  dueCount: number;
};

export type PublicDeck = {
  id: string;
  name: string;
  description: string | null;
  parentDeckId: string | null;
  createdAt: string;
  updatedAt: string;
} & DeckCounts;

export type DeckTreeNode = PublicDeck & {
  children: DeckTreeNode[];
};

export type CreateDeckInput = {
  name: string;
  description?: string | null;
  parentDeckId?: string | null;
};

export type UpdateDeckInput = {
  name?: string;
  description?: string | null;
  parentDeckId?: string | null;
};

export class DeckError extends Error {}
export class DeckNotFoundError extends DeckError {}
export class InvalidDeckInputError extends DeckError {}

const DECK_COLUMNS = "id, ownerId, name, description, parentDeckId, createdAt, updatedAt";

export class DeckService {
  constructor(private db: D1Database) {}

  async list(ownerId: string): Promise<DbDeck[]> {
    const res = await this.db
      .prepare(`SELECT ${DECK_COLUMNS} FROM decks WHERE ownerId = ?1 ORDER BY name`)
      .bind(ownerId)
      .all<DbDeck>();
    return res.results;
  }

  /** Per-deck study counts from cards. `now` is unix seconds; must match the scheduler's `due` unit. */
  async countsByDeck(ownerId: string, now: number): Promise<Map<string, DeckCounts>> {
    const res = await this.db
      .prepare(
        `SELECT c.deckId AS deckId,
          SUM(CASE WHEN c.state = 'new' THEN 1 ELSE 0 END) AS newCount,
          SUM(CASE WHEN c.state IN ('learning', 'relearning') THEN 1 ELSE 0 END) AS learningCount,
          SUM(CASE WHEN c.state = 'review' AND c.due <= ?2 THEN 1 ELSE 0 END) AS dueCount
        FROM cards c
        JOIN decks d ON d.id = c.deckId
        WHERE d.ownerId = ?1 AND c.suspended = 0 AND c.buried = 0
        GROUP BY c.deckId`,
      )
      .bind(ownerId, now)
      .all<{ deckId: string; newCount: number; learningCount: number; dueCount: number }>();
    return new Map(res.results.map((r) => [r.deckId, { newCount: r.newCount, learningCount: r.learningCount, dueCount: r.dueCount }]));
  }

  async listWithCounts(ownerId: string, now: number = Math.floor(Date.now() / 1000)): Promise<PublicDeck[]> {
    const [decks, counts] = await Promise.all([this.list(ownerId), this.countsByDeck(ownerId, now)]);
    return decks.map((d) => DeckService.toPublicDeck(d, counts.get(d.id)));
  }

  async getWithCounts(
    ownerId: string,
    id: string,
    now: number = Math.floor(Date.now() / 1000),
  ): Promise<PublicDeck> {
    const deck = await this.db
      .prepare(`SELECT ${DECK_COLUMNS} FROM decks WHERE id = ?1 AND ownerId = ?2 LIMIT 1`)
      .bind(id, ownerId)
      .first<DbDeck>();
    if (!deck) throw new DeckNotFoundError("Deck not found");
    const counts = await this.countsByDeck(ownerId, now);
    return DeckService.toPublicDeck(deck, counts.get(deck.id));
  }

  async create(ownerId: string, input: CreateDeckInput): Promise<PublicDeck> {
    const name = input.name.trim();
    if (!name) throw new InvalidDeckInputError("Deck name is required");
    if (input.parentDeckId != null) await this.requireOwnedDeck(ownerId, input.parentDeckId);

    const deck = await this.db
      .prepare(
        `INSERT INTO decks (ownerId, name, description, parentDeckId) VALUES (?1, ?2, ?3, ?4) RETURNING ${DECK_COLUMNS}`,
      )
      .bind(ownerId, name, input.description ?? null, input.parentDeckId ?? null)
      .first<DbDeck>();
    if (!deck) throw new DeckError("Failed to create deck");
    return DeckService.toPublicDeck(deck);
  }

  async update(ownerId: string, id: string, patch: UpdateDeckInput): Promise<PublicDeck> {
    const existing = await this.db
      .prepare(`SELECT ${DECK_COLUMNS} FROM decks WHERE id = ?1 AND ownerId = ?2 LIMIT 1`)
      .bind(id, ownerId)
      .first<DbDeck>();
    if (!existing) throw new DeckNotFoundError("Deck not found");

    if (patch.parentDeckId !== undefined) {
      if (patch.parentDeckId === id) throw new InvalidDeckInputError("A deck cannot be its own parent");
      if (patch.parentDeckId !== null) {
        await this.requireOwnedDeck(ownerId, patch.parentDeckId);
        await this.assertNoCycle(ownerId, id, patch.parentDeckId);
      }
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new InvalidDeckInputError("Deck name cannot be empty");
      sets.push("name = ?" + (values.length + 1));
      values.push(name);
    }
    if (patch.description !== undefined) {
      sets.push("description = ?" + (values.length + 1));
      values.push(patch.description);
    }
    if (patch.parentDeckId !== undefined) {
      sets.push("parentDeckId = ?" + (values.length + 1));
      values.push(patch.parentDeckId);
    }
    if (sets.length === 0) throw new InvalidDeckInputError("Nothing to update");
    sets.push("updatedAt = CURRENT_TIMESTAMP");

    const deck = await this.db
      .prepare(`UPDATE decks SET ${sets.join(", ")} WHERE id = ?${values.length + 1} RETURNING ${DECK_COLUMNS}`)
      .bind(...values, id)
      .first<DbDeck>();
    if (!deck) throw new DeckError("Failed to update deck");
    return DeckService.toPublicDeck(deck);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    // NOTE: child decks and cards cascade via FK; notes survive without their cards.
    const res = await this.db
      .prepare("DELETE FROM decks WHERE id = ?1 AND ownerId = ?2")
      .bind(id, ownerId)
      .run();
    if (res.meta.changes === 0) throw new DeckNotFoundError("Deck not found");
  }

  private async requireOwnedDeck(ownerId: string, id: string): Promise<void> {
    const deck = await this.db
      .prepare("SELECT id FROM decks WHERE id = ?1 AND ownerId = ?2 LIMIT 1")
      .bind(id, ownerId)
      .first<{ id: string }>();
    if (!deck) throw new DeckNotFoundError("Parent deck not found");
  }

  private async assertNoCycle(ownerId: string, deckId: string, newParentId: string): Promise<void> {
    let current: string | null = newParentId;
    while (current !== null) {
      if (current === deckId) throw new InvalidDeckInputError("A deck cannot be moved under its own descendant");
      const row: { parentDeckId: string | null } | null = await this.db
        .prepare("SELECT parentDeckId FROM decks WHERE id = ?1 AND ownerId = ?2 LIMIT 1")
        .bind(current, ownerId)
        .first();
      current = row?.parentDeckId ?? null;
    }
  }

  private static toPublicDeck(deck: DbDeck, counts?: DeckCounts): PublicDeck {
    return {
      id: deck.id,
      name: deck.name,
      description: deck.description,
      parentDeckId: deck.parentDeckId,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
      newCount: counts?.newCount ?? 0,
      learningCount: counts?.learningCount ?? 0,
      dueCount: counts?.dueCount ?? 0,
    };
  }

  static toTree(rows: PublicDeck[]): DeckTreeNode[] {
    const byId = new Map<string, DeckTreeNode>(rows.map((d) => [d.id, { ...d, children: [] }]));
    const roots: DeckTreeNode[] = [];
    for (const node of byId.values()) {
      const parent = node.parentDeckId ? byId.get(node.parentDeckId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    const byName = (a: DeckTreeNode, b: DeckTreeNode) => a.name.localeCompare(b.name);
    for (const node of byId.values()) node.children.sort(byName);
    roots.sort(byName);
    return roots;
  }
}
