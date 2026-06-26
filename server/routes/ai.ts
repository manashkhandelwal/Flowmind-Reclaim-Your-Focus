import { Router, Request, Response } from "express";
import { Task, ScheduleBlock, Subtask } from "../../src/types";
import { aiClient, generateContentWithFallback } from "../gemini";
import { computeBaseRisk } from "../../src/utils/risk-engine";

const router = Router();

// ─── POST /api/ai/decompose ───────────────────────────────────────────────────
// AI Task Decomposition & Priority Engine

router.post("/decompose", async (req: Request, res: Response) => {
  const { title, description, deadline, estimatedMinutes } = req.body as {
    title: string;
    description?: string;
    deadline?: string;
    estimatedMinutes?: number;
  };

  if (!title?.trim()) {
    return res.status(400).json({ error: "Task title is required." });
  }

  console.log(`🧩 AI Decompose — "${title}"`);

  if (aiClient) {
    try {
      const prompt = `You are FlowMind AI, an elite productivity Chief of Staff.
Analyze, decompose, and calculate the optimal priority for this obligation.

Task Title: "${title}"
Task Description: "${description ?? "No description provided."}"
Deadline: "${deadline ?? "unspecified"}"
Estimated Minutes: ${estimatedMinutes ?? 60}
Current Date/Time: ${new Date().toISOString()}

Requirements:
1. Decompose into 3-5 precise, actionable subtask milestones. Each must have: "title", "estimatedMinutes" (integer), "suggestedOrder" (integer starting at 1).
2. Assign overall priority: 'critical' | 'high' | 'medium' | 'low' — based on deadline urgency, effort, and scope.
3. Provide a 1-2 sentence "explanation" of the priority decision.

Return ONLY a valid JSON object — no markdown:
{
  "priority": "high",
  "explanation": "Deadline is in 48 hours with significant coding effort required.",
  "subtasks": [
    { "title": "Setup database tables", "estimatedMinutes": 30, "suggestedOrder": 1 }
  ]
}`;

      const response = await generateContentWithFallback({
        model: "gemini-2.5-flash",
        config: { responseMimeType: "application/json" },
        contents: prompt,
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      return res.json({
        success: true,
        priority: parsed.priority ?? "medium",
        explanation: parsed.explanation ?? "Calculated via AI analysis.",
        subtasks: parsed.subtasks ?? [],
      });
    } catch (err: any) {
      console.error("AI Decompose — Gemini failed:", err?.message ?? err);
    }
  }

  // Deterministic fallback
  const mins = Number(estimatedMinutes) || 60;
  return res.json({
    success: true,
    priority: mins > 150 ? "high" : "medium",
    explanation:
      "Assessed via local heuristic. Workload requires structured focus slots.",
    subtasks: [
      {
        title: `Audit requirements for ${title}`,
        estimatedMinutes: Math.round(mins * 0.25) || 15,
        suggestedOrder: 1,
      },
      {
        title: `Core implementation of ${title}`,
        estimatedMinutes: Math.round(mins * 0.5) || 30,
        suggestedOrder: 2,
      },
      {
        title: "Final revision & review",
        estimatedMinutes: Math.round(mins * 0.25) || 15,
        suggestedOrder: 3,
      },
    ],
  });
});

// ─── POST /api/ai/voice-input ─────────────────────────────────────────────────
// Voice transcript → structured Task

router.post("/voice-input", async (req: Request, res: Response) => {
  const { transcript } = req.body as { transcript?: string };

  if (!transcript?.trim()) {
    return res.status(400).json({ error: "Transcript is required." });
  }

  console.log(`🎙️  AI Voice Parse — "${transcript.slice(0, 60)}..."`);

  if (aiClient) {
    try {
      const prompt = `You are FlowMind's voice parsing module. Convert this spoken transcript into a structured task obligation.
Spoken Text: "${transcript}"
Current Date/Time: ${new Date().toISOString()}

Return ONLY a valid JSON object:
{
  "title": "Summary title of the task",
  "description": "Descriptive background explaining what was said",
  "category": "project" | "assignment" | "certification" | "meeting" | "bill" | "other",
  "priority": "critical" | "high" | "medium" | "low",
  "deadline": "ISO timestamp (calculate from spoken date, default to 4 days from now)",
  "estimatedMinutes": 90,
  "subtasks": [
    { "title": "First step", "estimatedMinutes": 30, "suggestedOrder": 1 }
  ]
}`;

      const response = await generateContentWithFallback({
        model: "gemini-2.5-flash",
        config: { responseMimeType: "application/json" },
        contents: prompt,
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      const taskId = `task-voice-${Math.random().toString(36).slice(2, 8)}`;

      const newTask: Task = {
        id: taskId,
        title: parsed.title ?? "Voice Logged Task",
        description: parsed.description ?? transcript,
        source: "agent",
        sourceRefId: null,
        category: parsed.category ?? "other",
        priority: parsed.priority ?? "medium",
        status: "active",
        deadline:
          parsed.deadline ??
          new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedMinutes: Number(parsed.estimatedMinutes) || 60,
        riskScore: 35,
        riskLevel: "safe",
        riskReason: "Voice parsed — ready for calendar scheduling.",
        riskUpdatedAt: new Date().toISOString(),
        confidenceScore: 92,
        subtasks: (parsed.subtasks ?? []).map(
          (s: any, idx: number) =>
            ({
              id: `sub-voice-${idx}-${Math.random().toString(36).slice(2, 4)}`,
              title: s.title ?? "Subtask",
              estimatedMinutes: s.estimatedMinutes ?? 20,
              done: false,
            }) as Subtask,
        ),
        scheduledBlocks: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      };

      const risk = computeBaseRisk(newTask);
      newTask.riskScore = risk.riskScore;
      newTask.riskLevel = risk.riskLevel;

      return res.json({ success: true, task: newTask });
    } catch (err: any) {
      console.error("AI Voice Input — Gemini failed:", err?.message ?? err);
    }
  }

  // Simulation fallback
  const isUrgent =
    transcript.toLowerCase().includes("urgent") ||
    transcript.toLowerCase().includes("asap");

  return res.json({
    success: true,
    task: {
      id: `task-voice-sim-${Math.random().toString(36).slice(2, 7)}`,
      title: "Voice Task: Review Deliverables",
      description: transcript,
      source: "agent",
      sourceRefId: null,
      category: "other",
      priority: isUrgent ? "high" : "medium",
      status: "active",
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedMinutes: 90,
      riskScore: 40,
      riskLevel: "safe",
      riskReason: "Simulation parse completed.",
      riskUpdatedAt: new Date().toISOString(),
      confidenceScore: 85,
      subtasks: [
        {
          id: "sub-v-1",
          title: "Review audio cues transcript",
          estimatedMinutes: 30,
          done: false,
        },
        {
          id: "sub-v-2",
          title: "Synthesize priority deliverables",
          estimatedMinutes: 60,
          done: false,
        },
      ],
      scheduledBlocks: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
    } as Task,
  });
});

// ─── POST /api/ai/scheduler ───────────────────────────────────────────────────
// Full-week AI-powered focus block generation

router.post("/scheduler", async (req: Request, res: Response) => {
  const { activeTasks } = req.body as { activeTasks?: Task[] };
  const taskList = activeTasks ?? [];

  console.log(`📅 AI Scheduler — Optimizing ${taskList.length} tasks`);

  if (aiClient && taskList.length > 0) {
    try {
      const taskBriefs = taskList.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        deadline: t.deadline,
        estimatedMinutes: t.estimatedMinutes,
      }));

      const prompt = `You are FlowMind AI Smart Scheduler.
Place focused deep-work sessions into a weekly schedule starting ${new Date().toISOString()}.

Active Obligations:
${JSON.stringify(taskBriefs, null, 2)}

Rules:
1. Each block is 60–120 minutes.
2. Sessions only between 09:00 and 21:00 local time.
3. Max 2 sessions per day.
4. No time overlaps between blocks.
5. Prioritize high-risk and critical tasks first.

Return ONLY a valid JSON array of schedule blocks:
[
  {
    "id": "block-abc123",
    "taskId": "task-id-here",
    "title": "[FlowMind Focus] Task Title",
    "startTime": "2026-06-25T09:00:00Z",
    "endTime": "2026-06-25T10:30:00Z",
    "objective": "Specific target goal for this block",
    "milestones": ["Milestone 1", "Milestone 2"],
    "type": "focus"
  }
]`;

      const response = await generateContentWithFallback({
        model: "gemini-2.5-flash",
        config: { responseMimeType: "application/json" },
        contents: prompt,
      });

      const blocks: ScheduleBlock[] = JSON.parse(
        (response.text ?? "[]").trim(),
      );
      return res.json({ success: true, blocks });
    } catch (err: any) {
      console.error("AI Scheduler — Gemini failed:", err?.message ?? err);
    }
  }

  // Simulation: space tasks out over next 5 days at 1 PM each
  const simBlocks: ScheduleBlock[] = taskList.map((t, idx) => {
    const day = new Date();
    day.setDate(day.getDate() + idx + 1);
    day.setHours(13, 0, 0, 0);
    const end = new Date(day.getTime() + 90 * 60 * 1000);

    return {
      id: `block-sim-${Math.random().toString(36).slice(2, 7)}`,
      taskId: t.id,
      title: `[FlowMind Focus] ${t.title}`,
      startTime: day.toISOString(),
      endTime: end.toISOString(),
      objective: `Execute primary subtasks for ${t.title}`,
      milestones: t.subtasks?.map((s) => s.title).slice(0, 2) ?? [
        "Complete task requirements",
      ],
      type: "focus",
    } as ScheduleBlock;
  });

  return res.json({ success: true, blocks: simBlocks });
});

// ─── POST /api/ai/recovery-mode ───────────────────────────────────────────────
// Smart Recovery Mode — recalculate risk after a missed deadline

router.post("/recovery-mode", async (req: Request, res: Response) => {
  const { activeTasks, missedTaskId } = req.body as {
    activeTasks: Task[];
    missedTaskId: string;
  };

  if (!missedTaskId) {
    return res.status(400).json({ error: "missedTaskId is required." });
  }

  console.log(`⚠️  Smart Recovery — Missed task: ${missedTaskId}`);

  const updatedTasks: Task[] = (activeTasks ?? []).map((t) => {
    if (t.id === missedTaskId) {
      return {
        ...t,
        riskScore: Math.min(100, t.riskScore + 25),
        riskLevel: "high_risk",
        riskReason:
          "Missed schedule slot! Deadline compression is critical. Re-scheduling buffer slots immediately.",
        riskUpdatedAt: new Date().toISOString(),
      } as Task;
    }
    // Also re-evaluate adjacent tasks
    const recalc = computeBaseRisk(t);
    return { ...t, ...recalc, riskUpdatedAt: new Date().toISOString() } as Task;
  });

  return res.json({
    success: true,
    tasks: updatedTasks,
    systemAlert:
      "Recovery Mode: Risk recalculated. Schedule buffer blocks are being compiled. Review the Scheduler tab.",
  });
});

// ─── POST /api/ai/ingest-text ──────────────────────────────────────────────────
// Multi-task extraction from raw email / unstructured text
// Differs from /decompose (single task) and /voice-input (audio transcript)

router.post("/ingest-text", async (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };

  if (!text?.trim()) {
    return res.status(400).json({ error: "text is required." });
  }

  console.log(`📨 AI Ingest Text — parsing ${text.length} chars`);

  if (aiClient) {
    try {
      const prompt = `You are FlowMind's text ingestion module. Extract ALL distinct task obligations from the following unstructured text.
Text: """
${text}
"""

Current Date/Time: ${new Date().toISOString()}

Rules:
1. Extract every concrete obligation or deliverable mentioned.
2. Infer realistic deadlines from date mentions, or default to 3 days from now.
3. For each task, create 2–4 actionable subtasks.
4. Assign a risk-appropriate priority.

Return ONLY a valid JSON array (no markdown):
[
  {
    "title": "Concise task title",
    "description": "2-sentence context summary",
    "category": "project" | "assignment" | "meeting" | "bill" | "certification" | "other",
    "priority": "critical" | "high" | "medium" | "low",
    "deadline": "ISO 8601 timestamp",
    "estimatedMinutes": 90,
    "subtasks": ["Step one", "Step two", "Step three"]
  }
]`;

      const response = await generateContentWithFallback({
        model: "gemini-2.5-flash",
        config: { responseMimeType: "application/json" },
        contents: prompt,
      });

      const parsed: any[] = JSON.parse((response.text ?? "[]").trim());

      const tasks: Task[] = parsed.map((item: any) => {
        const subtaskTitles: string[] = item.subtasks ?? [];
        const perSub = Math.round(
          (Number(item.estimatedMinutes) || 60) /
            Math.max(1, subtaskTitles.length),
        );
        const task: Task = {
          id: `task-ingest-${Math.random().toString(36).slice(2, 9)}`,
          title: item.title ?? "Extracted Task",
          description: item.description ?? "",
          source: "user_query",
          sourceRefId: `ingest-${Math.random().toString(36).slice(2, 7)}`,
          category: item.category ?? "other",
          priority: item.priority ?? "medium",
          status: "active",
          deadline:
            item.deadline ?? new Date(Date.now() + 3 * 86400000).toISOString(),
          estimatedMinutes: Number(item.estimatedMinutes) || 60,
          riskScore: 50,
          riskLevel: "at_risk",
          riskReason: "Freshly extracted — pending calendar allocation.",
          riskUpdatedAt: new Date().toISOString(),
          confidenceScore: 92,
          subtasks: subtaskTitles.map((title: string, idx: number) => ({
            id: `sub-ingest-${Math.random().toString(36).slice(2, 6)}-${idx}`,
            title,
            estimatedMinutes: perSub,
            done: false,
          })),
          scheduledBlocks: [],
          createdAt: new Date().toISOString(),
          completedAt: null,
        };
        // Re-evaluate risk against deadline
        const risk = computeBaseRisk(task);
        task.riskScore = risk.riskScore;
        task.riskLevel = risk.riskLevel;
        return task;
      });

      return res.json({ success: true, tasks, count: tasks.length });
    } catch (err: any) {
      console.error("AI Ingest Text — Gemini failed:", err?.message ?? err);
    }
  }

  // Simulation fallback
  const simTask: Task = {
    id: `task-ingest-sim-${Math.random().toString(36).slice(2, 7)}`,
    title: "Review Extracted Deliverables",
    description: "FlowMind extracted obligations from the provided text input.",
    source: "user_query",
    sourceRefId: null,
    category: "other",
    priority: "medium",
    status: "active",
    deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
    estimatedMinutes: 60,
    riskScore: 40,
    riskLevel: "safe",
    riskReason: "Simulation parse — AI offline.",
    riskUpdatedAt: new Date().toISOString(),
    confidenceScore: 80,
    subtasks: [
      {
        id: "sub-is-1",
        title: "Review the extracted obligations",
        estimatedMinutes: 20,
        done: false,
      },
      {
        id: "sub-is-2",
        title: "Prioritize and assign deadlines",
        estimatedMinutes: 20,
        done: false,
      },
      {
        id: "sub-is-3",
        title: "Schedule focus blocks",
        estimatedMinutes: 20,
        done: false,
      },
    ],
    scheduledBlocks: [],
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  return res.json({ success: true, tasks: [simTask], count: 1 });
});

export default router;
