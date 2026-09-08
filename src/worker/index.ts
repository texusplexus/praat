import { Hono } from "hono";
import { health } from "./routes/health.ts";
import { scenarios } from "./routes/scenarios.ts";
import { stt } from "./routes/stt.ts";
import { tutor } from "./routes/tutor.ts";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.route("/health", health);
app.route("/stt", stt);
app.route("/scenarios", scenarios);
app.route("/tutor", tutor);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;
