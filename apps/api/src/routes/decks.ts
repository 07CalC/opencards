import { Hono } from "hono";
import { type AppEnv, requireAuth } from "../middleware/require-auth";
import { DeckNotFoundError, DeckService, InvalidDeckInputError } from "../services/decks";

export const decks = new Hono<AppEnv>();

decks.use(requireAuth);

decks.get("/", async (c) => {
  const service = new DeckService(c.env.DB);
  const rows = await service.listWithCounts(c.get("user").id);
  return c.json({ decks: DeckService.toTree(rows) });
});

decks.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.name !== "string") {
    return c.json({ error: "Deck name is required" }, 400);
  }
  if (body.parentDeckId !== undefined && body.parentDeckId !== null && typeof body.parentDeckId !== "string") {
    return c.json({ error: "parentDeckId must be a deck id or null" }, 400);
  }
  if (body.description !== undefined && body.description !== null && typeof body.description !== "string") {
    return c.json({ error: "description must be a string or null" }, 400);
  }

  try {
    const deck = await new DeckService(c.env.DB).create(c.get("user").id, {
      name: body.name,
      description: body.description ?? null,
      parentDeckId: body.parentDeckId ?? null,
    });
    return c.json({ deck }, 201);
  } catch (err) {
    if (err instanceof DeckNotFoundError) return c.json({ error: err.message }, 404);
    if (err instanceof InvalidDeckInputError) return c.json({ error: err.message }, 400);
    throw err;
  }
});

decks.get("/:id", async (c) => {
  try {
    const deck = await new DeckService(c.env.DB).getWithCounts(c.get("user").id, c.req.param("id"));
    return c.json({ deck });
  } catch (err) {
    if (err instanceof DeckNotFoundError) return c.json({ error: err.message }, 404);
    throw err;
  }
});

decks.patch("/:id", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") return c.json({ error: "Invalid request body" }, 400);
  if (body.name !== undefined && typeof body.name !== "string") {
    return c.json({ error: "name must be a string" }, 400);
  }
  if (body.parentDeckId !== undefined && body.parentDeckId !== null && typeof body.parentDeckId !== "string") {
    return c.json({ error: "parentDeckId must be a deck id or null" }, 400);
  }
  if (body.description !== undefined && body.description !== null && typeof body.description !== "string") {
    return c.json({ error: "description must be a string or null" }, 400);
  }

  try {
    const deck = await new DeckService(c.env.DB).update(c.get("user").id, c.req.param("id"), {
      name: body.name,
      description: body.description,
      parentDeckId: body.parentDeckId,
    });
    return c.json({ deck });
  } catch (err) {
    if (err instanceof DeckNotFoundError) return c.json({ error: err.message }, 404);
    if (err instanceof InvalidDeckInputError) return c.json({ error: err.message }, 400);
    throw err;
  }
});

decks.delete("/:id", async (c) => {
  try {
    await new DeckService(c.env.DB).remove(c.get("user").id, c.req.param("id"));
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof DeckNotFoundError) return c.json({ error: err.message }, 404);
    throw err;
  }
});
