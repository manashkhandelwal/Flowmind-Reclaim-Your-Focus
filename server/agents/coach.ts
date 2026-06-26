import { Message } from "../../src/types";
import { Task, Goal } from "../../src/types";
import {
  aiClient,
  generateContentWithFallback,
  generateSimulationResponse,
} from "../gemini";
import { pushMessage } from "../store";

interface CoachChatResult {
  message: Message;
  tokensUsed: number;
  durationMs: number;
}

interface WorkspaceContext {
  currentTime: string;
  items: Array<{
    title: string;
    category: string;
    priority: string;
    status: string;
    deadline: string;
    estimatedMinutes: number;
    riskLevel: string;
    riskReason: string;
    subtasks: string[];
  }>;
  goals: string[];
}

/**
 * Coach Agent — Interactive AI Chief of Staff
 *
 * Receives a user chat query, enriches it with full workspace context,
 * and calls Gemini with a Chief of Staff persona. Falls back gracefully
 * to the simulation responder when AI is offline.
 */
export async function runCoachAgent(
  query: string,
  taskList: Task[],
  goalList: Goal[],
): Promise<CoachChatResult> {
  const start = Date.now();
  let tokensUsed = 0;
  let responseText = "";

  const workspaceContext: WorkspaceContext = {
    currentTime: new Date().toISOString(),
    items: taskList.map((t) => ({
      title: t.title,
      category: t.category,
      priority: t.priority,
      status: t.status,
      deadline: t.deadline,
      estimatedMinutes: t.estimatedMinutes,
      riskLevel: t.riskLevel,
      riskReason: t.riskReason,
      subtasks: t.subtasks.map(
        (st) => `${st.title} (${st.done ? "DONE" : "PENDING"})`,
      ),
    })),
    goals: goalList.map((g) => `${g.title}: Target ${g.targetDate}`),
  };

  if (aiClient) {
    try {
      const systemPrompt = `You are FlowMind, an elite productivity Chief of Staff. You have complete context on the user's tasks, deadlines, risk scores, and schedule.

Your personality:
- Direct, decisive, never vague — skip "Sure!" or "Happy to help"
- Proactive — anticipate issues before users ask
- Action-oriented — every reply ends with a concrete next step or choice
- Concise — maximum 3-4 sentences unless laying out a step-by-step plan

Current workspace state:
${JSON.stringify(workspaceContext, null, 2)}

User message: "${query}"
Respond directly and helpfully based on their workspace.`;

      const response = await generateContentWithFallback({
        model: "gemini-2.5-flash",
        config: { systemInstruction: systemPrompt },
        contents: query,
      });

      responseText =
        response.text ??
        "I encountered a sync issue. Let me recalibrate — what is your most pressing obligation right now?";
      tokensUsed += response.usageMetadata?.totalTokenCount ?? 0;
    } catch (err) {
      console.error("Coach Agent — Gemini call failed:", err);
      responseText = generateSimulationResponse(query, taskList, goalList);
    }
  } else {
    responseText = generateSimulationResponse(query, taskList, goalList);
  }

  const msg: Message = {
    id: `m-${Math.random().toString(36).slice(2, 11)}`,
    sender: "coach",
    text: responseText,
    timestamp: new Date().toISOString(),
  };

  pushMessage(msg);

  return { message: msg, tokensUsed, durationMs: Date.now() - start };
}

/**
 * Coach Agent — Pipeline notification
 *
 * Called at the end of each orchestration run to post a proactive
 * update message in the chat thread.
 */
export function emitPipelineNotification(triggerType: string): Message {
  const text = `I've executed your FlowMind orchestration pipeline (trigger:'user_query'). Critical focus slots have been allocated on your calendar to protect high-risk deadlines. Review the heat-map timeline and let me know if you want to swap any study periods.`;

  const msg: Message = {
    id: `m-pipeline-${Math.random().toString(36).slice(2, 7)}`,
    sender: "coach",
    text,
    timestamp: new Date().toISOString(),
  };

  pushMessage(msg);
  return msg;
}
