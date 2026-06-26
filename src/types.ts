export type TaskCategory =
  | "interview"
  | "assignment"
  | "meeting"
  | "bill"
  | "certification"
  | "project"
  | "other";
export type Priority = "critical" | "high" | "medium" | "low";
export type TaskStatus = "active" | "completed" | "backlog";

export interface Subtask {
  id: string;
  title: string;
  estimatedMinutes: number;
  done: boolean;
}

export interface ScheduleBlock {
  id: string;
  taskId: string;
  title: string;
  startTime: string;
  endTime: string;
  objective: string;
  milestones: string[];
  type: "focus" | "review" | "preparation" | "buffer";
}

export interface Task {
  id: string;
  title: string;
  description: string;
  source: "gmail" | "calendar" | "drive" | "manual" | "agent" | "user_query";
  sourceRefId: string | null;
  category: TaskCategory;
  priority: Priority;
  status: TaskStatus;
  deadline: string;
  estimatedMinutes: number;
  riskScore: number;
  riskLevel: "safe" | "at_risk" | "high_risk";
  riskReason: string;
  riskUpdatedAt: string;
  confidenceScore: number;
  subtasks: Subtask[];
  scheduledBlocks: ScheduleBlock[];
  createdAt: string;
  completedAt: string | null;
  userId?: string;
  /** Google Calendar event ID — set after a Calendar sync so future saves update rather than recreate */
  calendarEventId?: string;
  /** Google Calendar ID (usually "primary") */
  calendarId?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  roadmap: string;
  milestones: { id: string; title: string; done: boolean }[];
  relatedTaskIds: string[];
}

export type AgentType =
  | "orchestrator"
  | "ingestion"
  | "risk"
  | "scheduler"
  | "coach";

export type OrchestratorTriggerType =
  | "initial_sync"
  | "gmail_scan"
  | "task_change"
  | "daily_briefing";

export interface AgentRunLog {
  id: string;
  agent: AgentType;
  sessionId: string;
  triggeredBy: string;
  success: boolean;
  reasoning: string;
  tokensUsed: number;
  durationMs: number;
  error?: string | null;
  createdAt: string;
}

export interface AppBriefing {
  content: string;
  topTask: string;
  riskSummary: {
    criticalCount: number;
    highRiskCount: number;
    atRiskCount: number;
    safeCount: number;
  };
  generatedAt: string;
}

export interface Message {
  id: string;
  sender: "user" | "coach";
  text: string;
  timestamp: string;
}

export interface FocusSession {
  taskId: string;
  objective: string;
  status: "active" | "completed" | "paused" | "abandoned";
  startTime: string;
  durationMinutes: number;
  elapsedSeconds: number;
}
export interface ApiStatus {
  active: boolean;
  simulation: boolean;
  keyConfigured: boolean;
}
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  /** True after first-login onboarding has completed. Mirrors the Firestore field. */
  onboardingCompleted: boolean;
}

export interface OrchestrationState {
  running: boolean;
  step: string;
  completedLogs: string[];
}

export interface SchedulerDraftState {
  blocks: ScheduleBlock[] | null;
  alert: string | null;
}
