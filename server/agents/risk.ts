import { Task, AppBriefing } from "../../src/types";
import { computeBaseRisk } from "../../src/utils/risk-engine";
import { aiClient, generateContentWithFallback } from "../gemini";
import { tasks, setTasks, setActiveBriefing, activeBriefing } from "../store";

interface RiskResult {
  insights: string;
  tokensUsed: number;
  durationMs: number;
  log: string;
}

/**
 * Risk Agent
 *
 * 1. Re-runs deterministic `computeBaseRisk` on every active task.
 * 2. Calls Gemini for a qualitative workspace risk narrative.
 * 3. Updates the active briefing document with the latest risk summary.
 */
export async function runRiskAgent(taskList: Task[]): Promise<RiskResult> {
  const start = Date.now();
  let tokensUsed = 0;
  let insights = "";

  // Step 1: Deterministic risk recalculation
  const recalculated = taskList.map((t) => {
    const calc = computeBaseRisk(t);
    return {
      ...t,
      riskScore: calc.riskScore,
      riskLevel: calc.riskLevel,
      riskUpdatedAt: new Date().toISOString(),
    } as Task;
  });
  setTasks(recalculated);

  // Step 2: Gemini qualitative analysis
  if (aiClient && recalculated.length > 0) {
    try {
      const taskBriefs = recalculated
        .map(
          (t) =>
            `${t.title} [Est: ${t.estimatedMinutes}m, Deadline: ${t.deadline.slice(0, 10)}, Risk: ${t.riskLevel}]`,
        )
        .join("\n");

      const response = await generateContentWithFallback({
        model: "gemini-2.5-flash",
        contents: `You are a Risk Assessment Officer reviewing this team's upcoming obligations.

Active tasks:
${taskBriefs}

Provide a 3-sentence workspace risk analysis: identify the single most critical scheduling risk, explain why, and recommend one specific immediate action. Be concrete and direct.`,
      });

      insights = response.text ?? "";
      tokensUsed += response.usageMetadata?.totalTokenCount ?? 0;
    } catch (err) {
      console.error("Risk Agent — Gemini call failed:", err);
      const top = recalculated.find(
        (t) => t.riskLevel === "high_risk" || t.priority === "critical",
      );
      insights = top
        ? `Workload audit identified potential congestion. **${top.title}** is at critical risk. Scheduling an immediate buffer block is strongly advised.`
        : `All ${recalculated.length} active tasks are stably distributed. Buffer margins look appropriate across current deadlines.`;
    }
  } else {
    insights = `Analyzed ${recalculated.length} active tasks. Deterministic risk scores recalculated. No AI narrative available in simulation mode.`;
  }

  // Step 3: Update the briefing document
  const currentTasks = recalculated;
  const updatedBriefing: AppBriefing = {
    content: `### Executive Briefing (Regenerated)\n\n${insights}\n\n**Risk Summary:**\n- Critical deadline items: ${currentTasks.filter((t) => t.riskLevel === "high_risk").length} flagged\n- Total active focus estimate: ${currentTasks.reduce((acc, t) => acc + (t.status === "active" ? t.estimatedMinutes : 0), 0)} minutes`,
    topTask:
      currentTasks.find((t) => t.riskLevel === "high_risk")?.id ??
      currentTasks[0]?.id ??
      "",
    riskSummary: {
      criticalCount: currentTasks.filter((t) => t.priority === "critical")
        .length,
      highRiskCount: currentTasks.filter((t) => t.riskLevel === "high_risk")
        .length,
      atRiskCount: currentTasks.filter((t) => t.riskLevel === "at_risk").length,
      safeCount: currentTasks.filter((t) => t.riskLevel === "safe").length,
    },
    generatedAt: new Date().toISOString(),
  };
  setActiveBriefing(updatedBriefing);

  const log =
    "Risk Agent: Recalculated priority buffer hours. Compiled real-time bottleneck insights.";
  return { insights, tokensUsed, durationMs: Date.now() - start, log };
}
