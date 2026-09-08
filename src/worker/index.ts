import { Hono } from "hono";
import { health } from "./routes/health.ts";
import { stt } from "./routes/stt.ts";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.route("/health", health);
app.route("/stt", stt);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;
