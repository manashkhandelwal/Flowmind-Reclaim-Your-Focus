import { Router, Request, Response } from "express";
import { AgentRunLog, Task } from "../../src/types";
import * as store from "../store";
import { runIngestionAgent } from "../agents/ingestion";
import { runRiskAgent } from "../agents/risk";
import { runSchedulerAgent } from "../agents/scheduler";
import { runCoachAgent, emitPipelineNotification } from "../agents/coach";

const router = Router();

// ─── POST /api/agents/orchestrate ─────────────────────────────────────────────

router.post("/orchestrate", async (req: Request, res: Response) => {
  const { triggerType, unstructuredFeed, tasks: clientTasks } = req.body as {
    triggerType: "initial_sync" | "gmail_scan" | "daily_briefing";
    unstructuredFeed?: string;
    tasks?: Task[];
  };

  const sessionId = `sess-${Math.random().toString(36).slice(2, 11)}`;
  console.log(`\n🤖 FlowMind Orchestrator — Pipeline start [${triggerType}]`);

  // Initialize store tasks with current client tasks if provided
  if (clientTasks && Array.isArray(clientTasks)) {
    store.setTasks(clientTasks);
  }

  const progressLogs: string[] = [];
  let totalTokens = 0;

  // ── 1. Ingestion Agent ───────────────────────────────────────────────────────
  console.log("  → Running Ingestion Agent...");
  const ingestion = await runIngestionAgent(triggerType, unstructuredFeed);
  progressLogs.push(ingestion.log);
  totalTokens += ingestion.tokensUsed;

  store.pushLog({
    id: `log-${Math.random().toString(36).slice(2, 9)}`,
    agent: "ingestion",
    sessionId,
    triggeredBy: triggerType,
    success: true,
    reasoning: ingestion.log,
    tokensUsed: ingestion.tokensUsed,
    durationMs: ingestion.durationMs,
    createdAt: new Date().toISOString(),
  });

  // ── 2. Risk Agent ────────────────────────────────────────────────────────────
  console.log("  → Running Risk Agent...");
  const risk = await runRiskAgent(store.tasks);
  progressLogs.push(risk.log);
  totalTokens += risk.tokensUsed;

  store.pushLog({
    id: `log-${Math.random().toString(36).slice(2, 9)}`,
    agent: "risk",
    sessionId,
    triggeredBy: triggerType,
    success: true,
    reasoning: `Risk analysis: "${risk.insights.slice(0, 100)}..."`,
    tokensUsed: risk.tokensUsed,
    durationMs: risk.durationMs,
    createdAt: new Date().toISOString(),
  });

  // ── 3. Scheduler Agent ───────────────────────────────────────────────────────
  console.log("  → Running Scheduler Agent...");
  const scheduler = await runSchedulerAgent(store.tasks);
  progressLogs.push(scheduler.log);

  store.pushLog({
    id: `log-${Math.random().toString(36).slice(2, 9)}`,
    agent: "scheduler",
    sessionId,
    triggeredBy: triggerType,
    success: true,
    reasoning: scheduler.log,
    tokensUsed: 0,
    durationMs: scheduler.durationMs,
    createdAt: new Date().toISOString(),
  });

  // ── 4. Coach Agent — Pipeline Notification ───────────────────────────────────
  console.log("  → Coach Agent emitting notification...");
  const coachMsg = emitPipelineNotification(triggerType);
  const coachLog =
    "Coach Agent: Proactive pipeline update posted to chat stream.";
  progressLogs.push(coachLog);

  store.pushLog({
    id: `log-${Math.random().toString(36).slice(2, 9)}`,
    agent: "coach",
    sessionId,
    triggeredBy: triggerType,
    success: true,
    reasoning: coachLog,
    tokensUsed: 300,
    durationMs: 0,
    createdAt: new Date().toISOString(),
  });

  // ── 5. Orchestrator Summary Log ──────────────────────────────────────────────
  store.pushLog({
    id: `log-main-${sessionId}`,
    agent: "orchestrator",
    sessionId,
    triggeredBy: triggerType,
    success: true,
    reasoning: `Pipeline complete: Ingestion → Risk → Scheduler → Coach`,
    tokensUsed: totalTokens + 300,
    durationMs: ingestion.durationMs + risk.durationMs + scheduler.durationMs,
    createdAt: new Date().toISOString(),
  });

  console.log(
    `✅ FlowMind Orchestrator — Pipeline complete [${triggerType}]\n`,
  );

  res.json({
    success: true,
    sessionId,
    logs: progressLogs,
    insights: risk.insights,
    activeBriefing: store.activeBriefing,
    tasks: store.tasks,
    messages: store.messages,
  });
});

// ─── POST /api/agents/coach ───────────────────────────────────────────────────

router.post("/coach", async (req: Request, res: Response) => {
  const { query } = req.body as { query: string };

  if (!query?.trim()) {
    return res.status(400).json({ error: "Query is required." });
  }

  console.log(`💬 FlowMind Coach — Query: "${query.slice(0, 60)}..."`);
  const result = await runCoachAgent(query, store.tasks, store.goals);
  return res.json(result.message);
});

export default router;
