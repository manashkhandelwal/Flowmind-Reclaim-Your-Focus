import { Router, Request, Response } from "express";
import { isAIActive, aiClient } from "../gemini";
import * as store from "../store";

const router = Router();

// ─── GET /api/ai-status ───────────────────────────────────────────────────────

router.get("/ai-status", (_req: Request, res: Response) => {
  res.json({
    active: isAIActive,
    simulation: !isAIActive,
    keyConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// ─── GET /api/briefing ────────────────────────────────────────────────────────

router.get("/briefing", (_req: Request, res: Response) => {
  res.json(store.activeBriefing);
});

// ─── GET /api/logs ────────────────────────────────────────────────────────────

router.get("/logs", (_req: Request, res: Response) => {
  // Return most recent logs first
  res.json([...store.agentLogs].reverse());
});

// ─── POST /api/logs/clear ────────────────────────────────────────────────────

router.post("/logs/clear", (_req: Request, res: Response) => {
  store.setAgentLogs([]);
  res.json({ success: true, message: "Logs cleared." });
});

export default router;
