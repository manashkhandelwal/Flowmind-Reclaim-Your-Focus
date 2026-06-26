import { Task, ScheduleBlock } from "../../src/types";
import { tasks, setTasks } from "../store";

interface SchedulerResult {
  scheduledCount: number;
  log: string;
  durationMs: number;
}

/**
 * Scheduler Agent
 *
 * Finds active, high-risk tasks with no scheduled blocks and auto-proposes
 * a 2-hour focus block for the next morning. The blocks are written directly
 * into the task's `scheduledBlocks` array in the store.
 *
 * Note: The dedicated `/api/ai/scheduler` route handles Gemini-powered
 * full-week scheduling. This agent handles the automatic "emergency" slot
 * that runs as part of the orchestration pipeline.
 */
export async function runSchedulerAgent(
  taskList: Task[],
): Promise<SchedulerResult> {
  const start = Date.now();
  let scheduledCount = 0;

  const updated = taskList.map((t) => {
    if (
      t.status === "active" &&
      t.scheduledBlocks.length === 0 &&
      (t.riskLevel === "high_risk" || t.priority === "critical")
    ) {
      const tomorrow9AM = new Date();
      tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
      tomorrow9AM.setHours(9, 0, 0, 0);
      const endSlot = new Date(tomorrow9AM.getTime() + 2 * 60 * 60 * 1000);

      const newBlock: ScheduleBlock = {
        id: `block-${Math.random().toString(36).slice(2, 7)}`,
        taskId: t.id,
        title: `[FlowMind Focus] ${t.title}`,
        startTime: tomorrow9AM.toISOString(),
        endTime: endSlot.toISOString(),
        objective: `Execute key subtasks for ${t.title}.`,
        milestones: t.subtasks.slice(0, 2).map((s) => s.title),
        type: "focus",
      };

      scheduledCount++;
      return { ...t, scheduledBlocks: [...t.scheduledBlocks, newBlock] };
    }
    return t;
  });

  setTasks(updated);

  const log =
    scheduledCount > 0
      ? `Scheduler Agent: Allocated ${scheduledCount} emergency focus block(s) for high-risk tasks.`
      : "Scheduler Agent: Time matrix optimized. No scheduling shortfalls requiring adjustments.";

  return { scheduledCount, log, durationMs: Date.now() - start };
}
