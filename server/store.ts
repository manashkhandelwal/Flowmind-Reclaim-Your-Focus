import { Task, Goal, AgentRunLog, Message, AppBriefing } from "../src/types";

// ─── SEED TASKS ──────────────────────────────────────────────────────────────

export const seedTasks: Task[] = [];

// ─── SEED GOALS ──────────────────────────────────────────────────────────────

export const seedGoals: Goal[] = [];

// ─── SEED LOGS ───────────────────────────────────────────────────────────────

export const seedLogs: AgentRunLog[] = [];

// ─── SEED MESSAGES ───────────────────────────────────────────────────────────

export const seedMessages: Message[] = [];

// ─── SEED BRIEFING ───────────────────────────────────────────────────────────

export const seedBriefing: AppBriefing = {
  content:
    "### FlowMind Executive Briefing\nYour workspace is initialized. No tasks analyzed yet. Use the simulator or manual entry to log obligations.",
  topTask: "",
  riskSummary: {
    criticalCount: 0,
    highRiskCount: 0,
    atRiskCount: 0,
    safeCount: 0,
  },
  generatedAt: new Date().toISOString(),
};

// ─── MUTABLE RUNTIME STORE ───────────────────────────────────────────────────

// Exported as mutable arrays so routes can mutate them directly.
// For a real production app this would be a database — Firestore in this case.
export let tasks: Task[] = [...seedTasks];
export let goals: Goal[] = [...seedGoals];
export let agentLogs: AgentRunLog[] = [...seedLogs];
export let messages: Message[] = [...seedMessages];
export let activeBriefing: AppBriefing = { ...seedBriefing };

// Setters — keeps mutation centralised and avoids direct import mutation issues
export function setTasks(updated: Task[]): void {
  tasks = updated;
}
export function setGoals(updated: Goal[]): void {
  goals = updated;
}
export function setAgentLogs(updated: AgentRunLog[]): void {
  agentLogs = updated;
}
export function setMessages(updated: Message[]): void {
  messages = updated;
}
export function setActiveBriefing(updated: AppBriefing): void {
  activeBriefing = updated;
}

// Append helpers
export function pushTask(task: Task): void {
  tasks.push(task);
}
export function pushGoal(goal: Goal): void {
  goals.push(goal);
}
export function pushLog(log: AgentRunLog): void {
  agentLogs.push(log);
}
export function pushMessage(msg: Message): void {
  messages.push(msg);
}
