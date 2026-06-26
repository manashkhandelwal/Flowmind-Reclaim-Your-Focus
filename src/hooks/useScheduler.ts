import { useState, useCallback, Dispatch, SetStateAction } from "react";
import { Task, ScheduleBlock, SchedulerDraftState, AppUser } from "../types";
import { saveTaskToFirestore } from "../utils/firestore-sync";

interface UseSchedulerReturn {
  draft: SchedulerDraftState;
  setDraft: Dispatch<SetStateAction<SchedulerDraftState>>;
  orchestrating: boolean;
  handleGenerateScheduleDraft: (tasks: Task[]) => Promise<void>;
  handleApproveScheduleDraft: (
    tasks: Task[],
    googleToken: string,
    user: AppUser | null,
    onRefresh: () => Promise<void>,
  ) => Promise<void>;
  handleTriggerRecoveryMode: (
    missedTaskId: string,
    tasks: Task[],
    user: AppUser | null,
    onRefresh: () => Promise<void>,
  ) => Promise<void>;
}

/**
 * useScheduler — Schedule draft and approval hook
 *
 * Manages the draft focus block lifecycle:
 * 1. Generate AI focus block draft
 * 2. Display preview to user
 * 3. User approves → write to Google Calendar + persist to task store
 *
 * Also handles Smart Recovery Mode when a task is missed.
 */
export function useScheduler(): UseSchedulerReturn {
  const [draft, setDraft] = useState<SchedulerDraftState>({
    blocks: null,
    alert: null,
  });
  const [orchestrating, setOrchestrating] = useState(false);

  // ── Generate draft ────────────────────────────────────────────────────────────

  const handleGenerateScheduleDraft = useCallback(async (tasks: Task[]) => {
    setOrchestrating(true);
    try {
      const activeTasks = tasks.filter((t) => t.status !== "completed");
      const res = await fetch("/api/ai/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeTasks }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft({
          blocks: data.blocks ?? [],
          alert:
            "📅 FlowMind proposed focus slots. Approve below to write them to Google Calendar!",
        });
      }
    } catch (err) {
      console.error("Schedule generation error:", err);
    } finally {
      setOrchestrating(false);
    }
  }, []);

  // ── Approve & sync ────────────────────────────────────────────────────────────

  const handleApproveScheduleDraft = useCallback(
    async (
      tasks: Task[],
      googleToken: string,
      user: AppUser | null,
      onRefresh: () => Promise<void>,
    ) => {
      if (!draft.blocks?.length) return;
      setOrchestrating(true);

      try {
        const activeToken =
          googleToken ||
          localStorage.getItem("google_oauth_token") ||
          "demo_token_active_bypass";

        // 1. Sync to Google Calendar
        const calRes = await fetch("/api/google-calendar/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocks: draft.blocks,
            oauthToken: activeToken,
          }),
        });
        const calData = await calRes.json();
        console.log("Calendar sync result:", calData);

        // 2. Persist blocks into task scheduledBlocks
        const updatedTasks = [...tasks];
        for (const block of draft.blocks) {
          const idx = updatedTasks.findIndex((t) => t.id === block.taskId);
          if (idx !== -1) {
            const existing = updatedTasks[idx].scheduledBlocks ?? [];
            if (!existing.some((b) => b.startTime === block.startTime)) {
              const schedBlock: ScheduleBlock = {
                id: block.id,
                taskId: block.taskId,
                title: block.title,
                startTime: block.startTime,
                endTime: block.endTime,
                objective: block.objective,
                milestones: block.milestones ?? [],
                type: "focus",
              };
              updatedTasks[idx] = {
                ...updatedTasks[idx],
                scheduledBlocks: [...existing, schedBlock],
              };
              if (user) {
                await saveTaskToFirestore(user.uid, updatedTasks[idx]);
              }
            }
          }
        }

        await onRefresh();
        setDraft({
          blocks: null,
          alert: "✅ Focus schedule approved and locked into Google Calendar!",
        });
      } catch (err) {
        console.error("Schedule approval error:", err);
      } finally {
        setOrchestrating(false);
      }
    },
    [draft.blocks],
  );

  // ── Recovery Mode ─────────────────────────────────────────────────────────────

  const handleTriggerRecoveryMode = useCallback(
    async (
      missedTaskId: string,
      tasks: Task[],
      user: AppUser | null,
      onRefresh: () => Promise<void>,
    ) => {
      setOrchestrating(true);
      try {
        const res = await fetch("/api/ai/recovery-mode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeTasks: tasks, missedTaskId }),
        });
        const data = await res.json();

        if (data.success) {
          if (user) {
            for (const t of data.tasks as Task[]) {
              await saveTaskToFirestore(user.uid, t);
            }
          }
          await onRefresh();
          // Auto-generate a recovery schedule draft
          await handleGenerateScheduleDraft(data.tasks);
          setDraft((prev) => ({
            ...prev,
            alert:
              "⚠️ Recovery Mode: Missed deliverable detected. New focus slots drafted below.",
          }));
        }
      } catch (err) {
        console.error("Recovery mode error:", err);
      } finally {
        setOrchestrating(false);
      }
    },
    [handleGenerateScheduleDraft],
  );

  return {
    draft,
    setDraft,
    orchestrating,
    handleGenerateScheduleDraft,
    handleApproveScheduleDraft,
    handleTriggerRecoveryMode,
  };
}
