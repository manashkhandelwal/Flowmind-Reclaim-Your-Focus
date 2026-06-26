import { GoogleGenAI } from "@google/genai";
import { Task, Goal } from "../src/types";

// ─── CLIENT INITIALIZATION ────────────────────────────────────────────────────

const API_KEY = process.env.GEMINI_API_KEY || "MY_GEMINI_API_KEY";

let _client: GoogleGenAI | null = null;

if (API_KEY && API_KEY !== "MY_GEMINI_API_KEY") {
  try {
    _client = new GoogleGenAI({
      apiKey: API_KEY,
      httpOptions: {
        headers: { "User-Agent": "flowmind-ai/1.0" },
      },
    });
    console.log("✅ FlowMind: Gemini AI client initialized.");
  } catch (err) {
    console.error("❌ FlowMind: Gemini client initialization failed:", err);
  }
} else {
  console.log(
    "⚠️  FlowMind: GEMINI_API_KEY not set — running in simulation mode.",
  );
}

export const aiClient = _client;
export const isAIActive = _client !== null;

// ─── MODEL NAMES ─────────────────────────────────────────────────────────────

/**
 * Ordered priority list of Gemini models to try on each request.
 * Falls back to lighter models if primary is rate-limited or unavailable.
 */
const MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-pro",
] as const;

// ─── CONTENT GENERATOR WITH FALLBACK ─────────────────────────────────────────

interface GenerateParams {
  model?: string;
  config?: Record<string, unknown>;
  contents: string;
}

/**
 * Tries Gemini models in priority order.
 * Returns the first successful response.
 * Throws the last error if all models fail.
 */
export async function generateContentWithFallback(
  params: GenerateParams,
): Promise<any> {
  if (!_client) {
    throw new Error("Gemini client is not initialized.");
  }

  const primary = params.model ?? MODEL_FALLBACK_CHAIN[0];
  const chain = [primary, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== primary)];

  let lastError: unknown;
  for (const modelName of chain) {
    try {
      console.log(`  ↳ Trying Gemini model: ${modelName}`);
      const response = await _client.models.generateContent({
        model: modelName,
        config: params.config,
        contents: params.contents,
      });
      console.log(`  ✓ Gemini succeeded with: ${modelName}`);
      return response;
    } catch (err: any) {
      console.warn(`  ✗ Model "${modelName}" failed: ${err?.message ?? err}`);
      lastError = err;
    }
  }

  throw lastError;
}

// ─── SIMULATION FALLBACK RESPONDER ────────────────────────────────────────────

/**
 * Context-aware simulation response when Gemini is unavailable.
 * Generates realistic-feeling replies based on actual task data.
 */
export function generateSimulationResponse(
  query: string,
  taskList: Task[],
  goalList: Goal[],
): string {
  const lower = query.toLowerCase();
  const active = taskList.filter((t) => t.status === "active");
  const critical = active.filter(
    (t) => t.priority === "critical" || t.riskLevel === "high_risk",
  );
  const topTask = critical[0] ?? active[0];

  if (
    lower.includes("work") ||
    lower.includes("next") ||
    lower.includes("priority") ||
    lower.includes("agenda") ||
    lower.includes("do")
  ) {
    if (topTask) {
      return `Looking at your active workspace, your immediate focus should be **${topTask.title}** (Priority: ${topTask.priority}, Risk: ${topTask.riskLevel}). Estimated ${topTask.estimatedMinutes} minutes remaining. I suggest starting a dedicated 25-minute sprint in the Focus tab right now!`;
    }
    return "You've cleared all active obligations! Your workspace is calm and optimal. Check your long-term roadmap for next steps.";
  }

  if (
    lower.includes("schedule") ||
    lower.includes("calendar") ||
    lower.includes("book") ||
    lower.includes("tomorrow")
  ) {
    const unscheduled = active.filter((t) => t.scheduledBlocks.length === 0);
    if (unscheduled.length > 0) {
      return `I ran an optimization pass on your schedule. To secure your deadlines, I recommend booking a 90-minute focus sprint tomorrow morning for **${unscheduled[0].title}**. Should I lock this block into your Calendar?`;
    }
    return "All your high-impact deliverables are currently scheduled into focus slots. Your calendar looks great!";
  }

  if (
    lower.includes("stressed") ||
    lower.includes("overwhelmed") ||
    lower.includes("anxious") ||
    lower.includes("too much")
  ) {
    const lowRisk = active.filter(
      (t) => t.riskLevel === "safe" || t.priority === "low",
    );
    if (lowRisk.length > 0) {
      return `Take a breath. Let's temporarily move **${lowRisk[0].title}** to your backlog. We can split your primary stressor into 25-minute Pomodoros. Ready to initiate a focused session?`;
    }
    if (topTask) {
      return `Breathe. Let's tackle **${topTask.title}** by breaking it into 15-minute milestones. Focus only on the first step.`;
    }
    return "Your obligation load is currently clear. Relax and enjoy your buffer window.";
  }

  if (
    lower.includes("goal") ||
    lower.includes("objective") ||
    lower.includes("long term") ||
    lower.includes("roadmap")
  ) {
    if (goalList.length > 0) {
      const g = goalList[0];
      return `Your primary strategic milestone is "**${g.title}**" with a target date of ${new Date(g.targetDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}. Let's configure a focused block to support this.`;
    }
    return "Your long-term milestones are healthy. Keep executing your micro-tasks to align with your master goals!";
  }

  if (topTask) {
    return `Your workspace context is synced. **${topTask.title}** is currently ${topTask.riskLevel} with a deadline on ${new Date(topTask.deadline).toLocaleDateString([], { month: "short", day: "numeric" })}. Want to launch a Pomodoro timer or generate a fresh schedule draft?`;
  }
  return "I have synced your agenda! I'm ready to calibrate task priorities, schedule buffer times, or guide you through a focused work session. How can I help you excel today?";
}
