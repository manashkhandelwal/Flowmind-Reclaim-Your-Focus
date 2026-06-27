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
import fs from "fs";
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

// Set security headers to allow OAuth popups (Firebase Auth)
app.use((_req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});
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
    app.use(express.static(distPath, { index: false }));
    app.get("*", (_req, res) => {
      const htmlPath = path.join(distPath, "index.html");
      if (!fs.existsSync(htmlPath)) {
        return res.status(404).send("Not found");
      }
      let html = fs.readFileSync(htmlPath, "utf8");

      // Inject runtime environment variables securely
      const envVars = {
        VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY,
        VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID,
        VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID,
        VITE_FIRESTORE_DATABASE_ID: process.env.VITE_FIRESTORE_DATABASE_ID,
      };

      const scriptTag = `<script>window.ENV = ${JSON.stringify(envVars)};</script>`;
      html = html.replace("<head>", `<head>${scriptTag}`);
      res.send(html);
    });
    console.log("🚀 FlowMind: Serving production build with dynamic config injection.");
  }

  app.listen(PORT, () => {
    console.log(`\n✨ FlowMind AI listening on: http://localhost:${PORT}\n`);
  });
}

startServer().catch((err) => {
  console.error("Fatal: Server failed to start.", err);
  process.exit(1);
});
