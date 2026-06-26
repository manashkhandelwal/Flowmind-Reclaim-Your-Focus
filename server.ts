/**
 * FlowMind AI — Server Entry Point
 *
 * Responsibilities:
 *   1. Load environment variables
 *   2. Mount Express middleware
 *   3. Register API route modules
 *   4. Serve Vite (dev) or static build (prod)
 *
 * All business logic lives in:
 *   server/store.ts         — in-memory data store
 *   server/gemini.ts        — Gemini AI client
 *   server/agents/          — Ingestion, Risk, Scheduler, Coach agents
 *   server/routes/          — Express route modules
 */
import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
//import morgan from "morgan";

// ─── ROUTE MODULES ────────────────────────────────────────────────────────────
import statusRouter from "./server/routes/status";
import tasksRouter from "./server/routes/tasks";
import goalsRouter from "./server/routes/goals";
import messagesRouter from "./server/routes/messages";
import agentsRouter from "./server/routes/agents";
import aiRouter from "./server/routes/ai";
import calendarRouter from "./server/routes/calendar";

// ─── APP SETUP ────────────────────────────────────────────────────────────────

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
//app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── API ROUTES ───────────────────────────────────────────────────────────────

app.use("/api", statusRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/goals", goalsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/google-calendar", calendarRouter);

// ─── FRONTEND SERVING ─────────────────────────────────────────────────────────

async function startServer(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    // Development: Vite middleware for HMR
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("🔧 FlowMind: Vite dev middleware active.");
  } else {
    // Production: Serve compiled static assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("🚀 FlowMind: Serving production build.");
  }

  app.listen(PORT, () => {
    console.log(`\n✨ FlowMind AI listening on: http://localhost:${PORT}\n`);
  });
}

startServer().catch((err) => {
  console.error("Fatal: Server failed to start.", err);
  process.exit(1);
});
