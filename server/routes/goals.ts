import { Router, Request, Response } from "express";
import { Goal } from "../../src/types";
import { goals, setGoals, pushGoal } from "../store";

const router = Router();

// ─── GET /api/goals ───────────────────────────────────────────────────────────

router.get("/", (_req: Request, res: Response) => {
  res.json(goals);
});

// ─── POST /api/goals (create or update) ──────────────────────────────────────

router.post("/", (req: Request, res: Response) => {
  const body = req.body as Partial<Goal>;

  if (!body.id) {
    // ── CREATE ──
    const newGoal: Goal = {
      id: `goal-${Math.random().toString(36).slice(2, 11)}`,
      title: body.title ?? "Untitled Milestone",
      description: body.description ?? "",
      targetDate:
        body.targetDate ??
        new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      roadmap: body.roadmap ?? "### Dynamic Roadmap\n1. Define milestones.",
      milestones: body.milestones ?? [],
      relatedTaskIds: body.relatedTaskIds ?? [],
    };
    pushGoal(newGoal);
    return res.status(201).json(newGoal);
  }

  // ── UPDATE ──
  const index = goals.findIndex((g) => g.id === body.id);
  if (index === -1) {
    return res.status(404).json({ error: "Goal not found." });
  }

  const updated = { ...goals[index], ...body } as Goal;
  const newList = [...goals];
  newList[index] = updated;
  setGoals(newList);

  return res.json(updated);
});

export default router;
