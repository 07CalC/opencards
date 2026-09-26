import { Hono } from "hono";
import { auth } from "./routes/auth";

const app = new Hono<{ Bindings: CloudflareBindings }>();
const api = new Hono<{ Bindings: CloudflareBindings }>();

api.route("/auth", auth);

app.route("/api", api);

export default app;
