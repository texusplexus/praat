import { Hono } from "hono";
import { getScenario, listScenarios } from "../lib/scenarios.ts";

const summary = ({ id, mode, title, role, opening }: ReturnType<typeof listScenarios>[number]) => ({
  id,
  mode,
  title,
  role,
  opening,
});

export const scenarios = new Hono()
  .get("/", (c) => c.json(listScenarios().map(summary)))
  .get("/:id", (c) => {
    const scenario = getScenario(c.req.param("id"));
    return scenario ? c.json(summary(scenario)) : c.json({ error: "Unknown scenario" }, 404);
  });
