import { Hono } from "hono";
import { health } from "./routes/health.ts";

type Bindings = Env;

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

app.route("/health", health);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
