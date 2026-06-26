import { Task } from "../../src/types";
import { aiClient, generateContentWithFallback } from "../gemini";
import { tasks, pushTask } from "../store";

interface IngestionResult {
  newTasks: Task[];
  log: string;
  tokensUsed: number;
  durationMs: number;
}

/**
 * Ingestion Agent
 *
 * Parses unstructured text provided by user via Gemini and extracts
 * structured Task obligations. Falls back to a high-quality simulation task
 * when AI is offline or the triggerType is not `user_query`.
 */
export async function runIngestionAgent(
  triggerType: string,
  unstructuredFeed?: string,
): Promise<IngestionResult> {
  const start = Date.now();
  let tokensUsed = 0;
  let newTasks: Task[] = [];
  let log = "";

  let success = false;
  // Activate Gemini for both user_query AND gmail_scan when feed text is present
  if (
    aiClient &&
    (triggerType === "user_query" || triggerType === "gmail_scan") &&
    unstructuredFeed
  ) {
    try {
      const response = await generateContentWithFallback({
        model: "gemini-2.5-flash",
        contents: `Today's current date and time is: ${new Date().toISOString()} (use this to resolve relative date expressions like "this Friday", "tomorrow", "next Monday at 5pm", etc.).

Analyze this unstructured text/email payload and extract 1 or 2 concrete actionable task commitments.
Text input: "${unstructuredFeed}"

Response layout must be a JSON array of parsed items with these exact keys:
"title", "description", "category" (one of: interview, assignment, meeting, bill, certification, project, other), "priority" (one of: critical, high, medium, low), "estimatedMinutes" (integer, e.g. 120), "deadline" (ISO 8601 date string, e.g. "2026-06-29T18:00:00.000Z", representing the exact deadline date and time mentioned in the text), "subtasks" (array of strings for immediate work steps).

Return valid parseable JSON only — a bare JSON array, no markdown fences.`,
        config: { responseMimeType: "application/json" },
      });

      const extracted: any[] = JSON.parse((response.text ?? "[]").trim());
      tokensUsed += response.usageMetadata?.totalTokenCount ?? 0;

      newTasks = extracted.map((at: any) => {
        const subtaskCount = Math.max(1, (at.subtasks ?? []).length);
        const perSubtask = Math.round(
          (Number(at.estimatedMinutes) || 90) / subtaskCount,
        );
        const task: Task = {
          id: `task-extracted-${Math.random().toString(36).slice(2, 8)}`,
          title: at.title ?? "Extracted Obligation",
          description: at.description ?? "Awaiting detail audit",
          source: "gmail",
          sourceRefId: `msg-${Math.random().toString(36).slice(2, 7)}`,
          category: at.category ?? "other",
          priority: at.priority ?? "high",
          status: "active",
          deadline: at.deadline ? new Date(at.deadline).toISOString() : new Date(
            Date.now() + 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          estimatedMinutes: Number(at.estimatedMinutes) || 90,
          riskScore: 60,
          riskLevel: "at_risk",
          riskReason:
            "Extracted post-mailbox scanning. Awaiting calendar allocation.",
          riskUpdatedAt: new Date().toISOString(),
          confidenceScore: 94,
          subtasks: (at.subtasks ?? []).map((st: any, idx: number) => {
            let title = "Subtask Step";
            let subtaskEst = perSubtask;
            if (typeof st === "string") {
              title = st;
            } else if (st && typeof st === "object") {
              title = st.title || st.name || st.task || "Subtask Step";
              if (st.estimatedMinutes !== undefined) {
                subtaskEst = Number(st.estimatedMinutes) || perSubtask;
              }
            }
            const randomId = Math.random().toString(36).slice(2, 6);
            return {
              id: `sub-ext-${idx}-${randomId}`,
              title,
              done: false,
              estimatedMinutes: subtaskEst,
            };
          }),
          scheduledBlocks: [],
          createdAt: new Date().toISOString(),
          completedAt: null,
        };
        pushTask(task);
        return task;
      });

      log = `Ingestion Agent: Digested context feed. Extracted ${newTasks.length} obligation(s) via Gemini.`;
      success = true;
    } catch (err) {
      console.error("Ingestion Agent — Gemini call failed, falling back to simulation:", err);
    }
  }

  if (!success) {
    // Simulation fallback
    const isUrgent = unstructuredFeed?.toLowerCase().includes("urgent") || unstructuredFeed?.toLowerCase().includes("asap") || false;
    const taskTitle = unstructuredFeed ? "Review Extracted Context" : "Verify Workspace Integrity";
    const taskDesc = unstructuredFeed || "System triggered scheduled workspace verification scan.";
    
    // Attempt simple regex parse for days of the week in simulation fallback
    let simDeadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    if (unstructuredFeed) {
      const feedLower = unstructuredFeed.toLowerCase();
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const matchedDay = days.find(day => feedLower.includes(day));
      if (matchedDay) {
        const targetDayIdx = days.indexOf(matchedDay);
        const d = new Date();
        const currentDayIdx = d.getDay();
        const diff = (targetDayIdx - currentDayIdx + 7) % 7 || 7; // next week's day if same day
        d.setDate(d.getDate() + diff);
        // Default to 18:00 (6 PM) if Friday/weekdays, or check for specific hours
        d.setHours(18, 0, 0, 0);
        simDeadline = d.toISOString();
      }
    }

    const simTask: Task = {
      id: `task-extracted-sim-${Math.random().toString(36).slice(2, 8)}`,
      title: taskTitle,
      description: taskDesc,
      source: "gmail",
      sourceRefId: `msg-sim-${Math.random().toString(36).slice(2, 7)}`,
      category: "other",
      priority: isUrgent ? "high" : "medium",
      status: "active",
      deadline: simDeadline,
      estimatedMinutes: 90,
      riskScore: 35,
      riskLevel: "safe",
      riskReason: "Simulation ingestion complete — awaiting calendar allocation.",
      riskUpdatedAt: new Date().toISOString(),
      confidenceScore: 88,
      subtasks: [
        {
          id: `sub-ob-sim-${Math.random().toString(36).slice(2, 6)}-1`,
          title: "Audit extracted requirements specifications",
          done: false,
          estimatedMinutes: 30,
        },
        {
          id: `sub-ob-sim-${Math.random().toString(36).slice(2, 6)}-2`,
          title: "Decompose implementation milestones",
          done: false,
          estimatedMinutes: 60,
        }
      ],
      scheduledBlocks: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    
    pushTask(simTask);
    newTasks = [simTask];
    log = `Ingestion Agent (Simulation): Synthesized 1 workspace obligations from context feed.`;
  }

  return { newTasks, log, tokensUsed, durationMs: Date.now() - start };
}
