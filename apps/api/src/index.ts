import { Hono } from "hono";
import { auth } from "./routes/auth";
import { decks } from "./routes/decks";

const app = new Hono<{ Bindings: CloudflareBindings }>();
const api = new Hono<{ Bindings: CloudflareBindings }>();

api.route("/auth", auth);
api.route("/decks", decks);

app.route("/api", api);

export default app;
