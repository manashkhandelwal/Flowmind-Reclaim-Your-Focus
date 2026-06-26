import { Router, Request, Response } from "express";
import { Task } from "../../src/types";
import { computeBaseRisk } from "../../src/utils/risk-engine";
import { tasks, setTasks, pushTask } from "../store";

const router = Router();

// ─── GET /api/tasks ───────────────────────────────────────────────────────────

router.get("/", (_req: Request, res: Response) => {
  // Recalculate deterministic risk before serving
  const recalc = tasks.map((t) => {
    const calc = computeBaseRisk(t);
    return {
      ...t,
      riskScore: calc.riskScore,
      riskLevel: calc.riskLevel,
    } as Task;
  });
  setTasks(recalc);
  res.json(tasks);
});

// ─── POST /api/tasks (create or update) ──────────────────────────────────────

router.post("/", (req: Request, res: Response) => {
  const body = req.body as Partial<Task>;

  if (!body.id) {
    // ── CREATE ──
    const newTask: Task = {
      id: `task-${Math.random().toString(36).slice(2, 11)}`,
      title: body.title ?? "Untitled Obligation",
      description: body.description ?? "",
      source: body.source ?? "manual",
      sourceRefId: body.sourceRefId ?? null,
      category: body.category ?? "other",
      priority: body.priority ?? "medium",
      status: body.status ?? "active",
      deadline:
        body.deadline ??
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedMinutes: Number(body.estimatedMinutes) || 60,
      riskScore: 25,
      riskLevel: "safe",
      riskReason: "Freshly logged — awaiting agent processing.",
      riskUpdatedAt: new Date().toISOString(),
      confidenceScore: body.confidenceScore ?? 100,
      subtasks: body.subtasks ?? [],
      scheduledBlocks: body.scheduledBlocks ?? [],
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    // Run initial risk evaluation
    const risk = computeBaseRisk(newTask);
    newTask.riskScore = risk.riskScore;
    newTask.riskLevel = risk.riskLevel;

    pushTask(newTask);
    return res.status(201).json(newTask);
  }

  // ── UPDATE ──
  const index = tasks.findIndex((t) => t.id === body.id);
  if (index === -1) {
    return res.status(404).json({ error: "Task not found." });
  }

  const existing = tasks[index];
  const updated: Task = {
    ...existing,
    ...body,
    completedAt:
      body.status === "completed"
        ? (existing.completedAt ?? new Date().toISOString())
        : null,
  };

  const risk = computeBaseRisk(updated);
  updated.riskScore = risk.riskScore;
  updated.riskLevel = risk.riskLevel;
  updated.riskUpdatedAt = new Date().toISOString();

  const newList = [...tasks];
  newList[index] = updated;
  setTasks(newList);

  return res.json(updated);
});

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────

router.delete("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Task not found." });
  }

  const newList = [...tasks];
  newList.splice(index, 1);
  setTasks(newList);

  return res.json({ success: true, message: "Task deleted successfully." });
});

export default router;
