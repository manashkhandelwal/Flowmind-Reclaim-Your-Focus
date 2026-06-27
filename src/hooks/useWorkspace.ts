import { useState, useCallback, Dispatch, SetStateAction } from "react";
import {
  Task,
  Goal,
  AgentRunLog,
  Message,
  AppBriefing,
  ApiStatus,
  AppUser,
} from "../types";
import {
  fetchTasksFromFirestore,
  fetchGoalsFromFirestore,
  fetchMessagesFromFirestore,
  saveTaskToFirestore,
  deleteTaskFromFirestore,
  saveGoalToFirestore,
  saveMessageToFirestore,
  clearConversationsInFirestore,
  getUserOnboardingStatus,
} from "../utils/firestore-sync";
import { runFirstLoginOnboarding } from "../utils/onboarding";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "../utils/calendar-sync";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type WorkspaceError = {
  source: string;
  message: string;
  timestamp: string;
};

export interface UseWorkspaceReturn {
  // Entity state
  tasks: Task[];
  goals: Goal[];
  messages: Message[];
  logs: AgentRunLog[];
  briefing: AppBriefing | null;
  apiStatus: ApiStatus | null;
  selectedTaskId: string;

  // Loading / error state
  loading: boolean;
  errors: WorkspaceError[];

  // Setters exposed for optimistic updates in App.tsx
  setTasks: Dispatch<SetStateAction<Task[]>>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setLogs: Dispatch<SetStateAction<AgentRunLog[]>>;
  setSelectedTaskId: (id: string) => void;

  // Data operations — all accept the live user object so App.tsx
  // never needs to maintain its own load/save logic.
  loadWorkspace: (user: AppUser | null) => Promise<void>;
  handleSaveTask: (
    changes: Partial<Task>,
    user: AppUser | null,
  ) => Promise<void>;
  handleDeleteTask: (taskId: string, user: AppUser | null) => Promise<void>;
  handleSaveGoal: (goal: Partial<Goal>, user: AppUser | null) => Promise<void>;
  handleSendMessage: (
    text: string,
    sender: "user" | "coach",
    user: AppUser | null,
  ) => Promise<void>;
  handleClearHistory: (user: AppUser | null) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build a structured error entry for the errors array. */
function buildError(source: string, err: unknown): WorkspaceError {
  return {
    source,
    message: err instanceof Error ? err.message : String(err),
    timestamp: new Date().toISOString(),
  };
}

/** Fetch the three API-only endpoints that have no Firestore equivalent. */
async function fetchSharedApiData(): Promise<{
  briefing: AppBriefing;
  apiStatus: ApiStatus;
  logs: AgentRunLog[];
}> {
  const [bRes, aRes, lRes] = await Promise.all([
    fetch("/api/briefing"),
    fetch("/api/ai-status"),
    fetch("/api/logs"),
  ]);
  const [bData, aData, lData] = await Promise.all([
    bRes.json(),
    aRes.json(),
    lRes.json(),
  ]);
  return { briefing: bData, apiStatus: aData, logs: lData };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useWorkspace — single source of truth for all workspace entity state.
 *
 * Rules:
 *  1. App.tsx owns NO entity state of its own — it reads everything from here.
 *  2. All Firestore / API mutations live here; App.tsx only calls the handlers.
 *  3. Every async operation is wrapped in try/catch; errors accumulate in the
 *     `errors` array so the UI can surface them without crashing.
 */
export function useWorkspace(): UseWorkspaceReturn {
  // ── Entity state ─────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<AgentRunLog[]>([]);
  const [briefing, setBriefing] = useState<AppBriefing | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  // ── Meta state ───────────────────────────────────────────────────────────
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<WorkspaceError[]>([]);

  const pushError = useCallback((source: string, err: unknown) => {
    const entry = buildError(source, err);
    console.error(`[useWorkspace] ${entry.source}:`, entry.message);
    setErrors((prev) => [...prev.slice(-19), entry]); // keep last 20
  }, []);

  // ── Private loaders ──────────────────────────────────────────────────────

  /**
   * Fetches ALL data from the Express API (anonymous / no-auth path).
   * This is the ONLY place the anonymous fetch waterfall lives.
   */
  const fetchApiData = useCallback(async () => {
    const [tRes, gRes, mRes, bRes, aRes, lRes] = await Promise.all([
      fetch("/api/tasks"),
      fetch("/api/goals"),
      fetch("/api/messages"),
      fetch("/api/briefing"),
      fetch("/api/ai-status"),
      fetch("/api/logs"),
    ]);

    const [tData, gData, mData, bData, aData, lData] = await Promise.all([
      tRes.json(),
      gRes.json(),
      mRes.json(),
      bRes.json(),
      aRes.json(),
      lRes.json(),
    ]);

    setTasks(tData ?? []);
    setGoals(gData ?? []);
    setMessages(mData ?? []);
    setBriefing(bData ?? null);
    setApiStatus(aData ?? null);
    setLogs(lData ?? []);

    if (tData?.length > 0) {
      setSelectedTaskId((prev) => {
        const stillExists = tData.some((t: any) => t.id === prev);
        return stillExists ? prev : tData[0].id;
      });
    }
  }, []);

  /**
   * Fetches entity data from Firestore (authenticated path).
   * Shared endpoints (briefing, status, logs) are still hit via REST.
   * This is the ONLY place the Firestore fetch waterfall lives.
   */
  const fetchFirestoreData = useCallback(async (uid: string) => {
    const [liveTasks, liveGoals, liveMessages, shared] = await Promise.all([
      fetchTasksFromFirestore(uid),
      fetchGoalsFromFirestore(uid),
      fetchMessagesFromFirestore(uid),
      fetchSharedApiData(),
    ]);

    // Only overwrite state when Firestore actually returned data,
    // so a brand-new user doesn't wipe any seeded defaults.
    if (liveTasks.length > 0) {
      setTasks(liveTasks);
      setSelectedTaskId((prev) => {
        const stillExists = liveTasks.some((t: any) => t.id === prev);
        return stillExists ? prev : liveTasks[0].id;
      });
    }
    if (liveGoals.length > 0) setGoals(liveGoals);
    if (liveMessages.length > 0) setMessages(liveMessages);

    setBriefing(shared.briefing ?? null);
    setApiStatus(shared.apiStatus ?? null);
    setLogs(shared.logs ?? []);
  }, []);

  // ── Public load entry point ──────────────────────────────────────────────

  /**
   * Called once from App.tsx's `useEffect([user])`.
   * Routing logic lives here — App.tsx does NOT branch on user state for data.
   */
  const loadWorkspace = useCallback(
    async (user: AppUser | null) => {
      setLoading(true);
      try {
        if (user) {
          const onboardingCompleted = await getUserOnboardingStatus(user.uid);
          if (!onboardingCompleted) {
            const token = localStorage.getItem("google_oauth_token") || "demo_token_active_bypass";
            await runFirstLoginOnboarding(user.uid, token);
          }
          await fetchFirestoreData(user.uid);
        } else {
          await fetchApiData();
        }
      } catch (err) {
        pushError("loadWorkspace", err);
      } finally {
        setLoading(false);
      }
    },
    [fetchApiData, fetchFirestoreData, pushError],
  );

  // ── Task mutations ───────────────────────────────────────────────────────

  const handleSaveTask = useCallback(
    async (changes: Partial<Task>, user: AppUser | null) => {
      try {
        if (user) {
          // Pull existing doc so we can preserve fields not in `changes`
          const allTasks = await fetchTasksFromFirestore(user.uid);
          const existing = allTasks.find((t) => t.id === changes.id);

          const full: Task = {
            id: changes.id ?? `task-${Math.random().toString(36).slice(2, 9)}`,
            title: changes.title ?? existing?.title ?? "Untitled",
            description: changes.description ?? existing?.description ?? "",
            source: changes.source ?? existing?.source ?? "manual",
            sourceRefId: changes.sourceRefId ?? existing?.sourceRefId ?? null,
            category: changes.category ?? existing?.category ?? "other",
            priority: changes.priority ?? existing?.priority ?? "medium",
            status: changes.status ?? existing?.status ?? "active",
            deadline:
              changes.deadline ??
              existing?.deadline ??
              new Date(Date.now() + 3 * 86_400_000).toISOString(),
            estimatedMinutes:
              changes.estimatedMinutes !== undefined
                ? Number(changes.estimatedMinutes)
                : existing?.estimatedMinutes !== undefined
                ? existing.estimatedMinutes
                : 60,
            riskScore: changes.riskScore ?? existing?.riskScore ?? 30,
            riskLevel: changes.riskLevel ?? existing?.riskLevel ?? "safe",
            riskReason: changes.riskReason ?? existing?.riskReason ?? "Manually created.",
            riskUpdatedAt: new Date().toISOString(),
            confidenceScore: changes.confidenceScore ?? existing?.confidenceScore ?? 90,
            subtasks: changes.subtasks ?? existing?.subtasks ?? [],
            scheduledBlocks: changes.scheduledBlocks ?? existing?.scheduledBlocks ?? [],
            createdAt: changes.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
            completedAt: changes.completedAt ?? existing?.completedAt ?? null,
            userId: user.uid,
            // Preserve calendar linkage from the existing Firestore doc
            calendarEventId:
              changes.calendarEventId ?? existing?.calendarEventId,
            calendarId: changes.calendarId ?? existing?.calendarId,
          };

          // Calendar lifecycle
          const token = localStorage.getItem("google_oauth_token") || "demo_token_active_bypass";
          if (token) {
            if (full.status === "completed" && full.calendarEventId) {
              await deleteCalendarEvent(token, full.calendarEventId);
              full.calendarEventId = undefined;
              full.calendarId = undefined;
            } else if (
              full.calendarEventId &&
              existing?.deadline &&
              full.deadline !== existing.deadline
            ) {
              const success = await updateCalendarEvent(token, full.calendarEventId, full);
              if (!success) {
                full.calendarEventId = undefined;
                full.calendarId = undefined;
              }
            } else if (!full.calendarEventId && full.status !== "completed") {
              const calResult = await createCalendarEvent(token, full);
              if (calResult.status === "created") {
                full.calendarEventId = calResult.eventId;
                full.calendarId = calResult.calendarId;
              }
            }
          }

          await saveTaskToFirestore(user.uid, full);
          await fetchFirestoreData(user.uid);
        } else {
          await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(changes),
          });
          await fetchApiData();
        }
      } catch (err) {
        pushError("handleSaveTask", err);
      }
    },
    [fetchApiData, fetchFirestoreData, pushError],
  );

  const handleDeleteTask = useCallback(
    async (taskId: string, user: AppUser | null) => {
      try {
        if (user) {
          const allTasks = await fetchTasksFromFirestore(user.uid);
          const task = allTasks.find((t) => t.id === taskId);
          if (task?.calendarEventId) {
            const token = localStorage.getItem("google_oauth_token") ?? "";
            await deleteCalendarEvent(token, task.calendarEventId);
          }
          await deleteTaskFromFirestore(taskId);
          await fetchFirestoreData(user.uid);
        } else {
          await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
          await fetchApiData();
        }
      } catch (err) {
        pushError("handleDeleteTask", err);
      }
    },
    [fetchApiData, fetchFirestoreData, pushError],
  );

  // ── Goal mutations ───────────────────────────────────────────────────────

  const handleSaveGoal = useCallback(
    async (goal: Partial<Goal>, user: AppUser | null) => {
      try {
        if (user) {
          const full: Goal = {
            id: goal.id ?? `goal-${Math.random().toString(36).slice(2, 9)}`,
            title: goal.title ?? "Untitled Goal",
            description: goal.description ?? "",
            targetDate:
              goal.targetDate ??
              new Date(Date.now() + 15 * 86_400_000).toISOString(),
            roadmap: goal.roadmap ?? "",
            milestones: goal.milestones ?? [],
            relatedTaskIds: goal.relatedTaskIds ?? [],
          };
          await saveGoalToFirestore(user.uid, full);
          await fetchFirestoreData(user.uid);
        } else {
          await fetch("/api/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(goal),
          });
          await fetchApiData();
        }
      } catch (err) {
        pushError("handleSaveGoal", err);
      }
    },
    [fetchApiData, fetchFirestoreData, pushError],
  );

  // ── Message mutations ────────────────────────────────────────────────────

  const handleSendMessage = useCallback(
    async (text: string, sender: "user" | "coach", user: AppUser | null) => {
      const msg: Message = {
        id: `m-${Math.random().toString(36).slice(2, 9)}`,
        sender,
        text,
        timestamp: new Date().toISOString(),
      };

      // Optimistic update — show in UI immediately
      setMessages((prev) => [...prev, msg]);

      try {
        if (user) {
          await saveMessageToFirestore(user.uid, msg);
        } else {
          await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, sender }),
          });
        }
      } catch (err) {
        pushError("handleSendMessage", err);
      }
    },
    [pushError],
  );

  const handleClearHistory = useCallback(
    async (user: AppUser | null) => {
      try {
        if (user) {
          await clearConversationsInFirestore(user.uid);
        }
      } catch (err) {
        pushError("handleClearHistory", err);
      } finally {
        // Always reset local state, even if Firestore clear failed
        const welcome: Message = {
          id: "m-init",
          sender: "coach",
          text: "FlowMind workspace refreshed. Let's optimize your agenda.",
          timestamp: new Date().toISOString(),
        };
        setMessages([welcome]);
      }
    },
    [pushError],
  );

  return {
    tasks,
    goals,
    messages,
    logs,
    briefing,
    apiStatus,
    selectedTaskId,
    loading,
    errors,
    setTasks,
    setMessages,
    setLogs,
    setSelectedTaskId,
    loadWorkspace,
    handleSaveTask,
    handleDeleteTask,
    handleSaveGoal,
    handleSendMessage,
    handleClearHistory,
  };
}
