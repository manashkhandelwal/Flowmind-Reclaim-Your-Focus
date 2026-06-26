/**
 * calendar-sync.ts — Client-side Google Calendar helpers
 *
 * Thin wrappers around the existing /api/google-calendar Express routes.
 * Used by:
 *   - onboarding.ts    — create events for seed tasks on first login
 *   - useWorkspace.ts  — delete event when task is marked complete
 *                      — update event when task is rescheduled
 */

import { Task, ScheduleBlock } from "../types";

// ── Create a single Calendar event for a task ─────────────────────────────────

export interface CalendarEventResult {
  eventId: string;
  calendarId: string;
  status: "created" | "failed";
}

/**
 * Creates a single Google Calendar event for the given task.
 * Builds a ScheduleBlock from the task deadline and estimatedMinutes,
 * then calls the existing /api/google-calendar/sync endpoint.
 **/
export async function createCalendarEvent(
  googleToken: string,
  task: Task,
): Promise<CalendarEventResult> {
  try {
    const token =
      googleToken || localStorage.getItem("google_oauth_token") || "";
    if (!token) {
      console.warn("Calendar: No OAuth token available for event creation.");
      return { eventId: "", calendarId: "primary", status: "failed" };
    }

    // Build a focus block anchored to the task deadline
    const endTime = new Date(task.deadline);
    const startTime = new Date(
      endTime.getTime() - task.estimatedMinutes * 60 * 1000,
    );

    const block: ScheduleBlock = {
      id: task.id,
      taskId: task.id,
      title: `[FlowMind] ${task.title}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      objective: task.description || task.title,
      milestones: task.subtasks.slice(0, 3).map((s) => s.title),
      type: "focus",
    };

    const res = await fetch("/api/google-calendar/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks: [block], oauthToken: token }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Calendar: Sync API error:", txt);
      return { eventId: "", calendarId: "primary", status: "failed" };
    }

    const data = await res.json();
    const created = (data.events ?? [])[0];
    if (created?.syncedEventId) {
      return {
        eventId: created.syncedEventId,
        calendarId: "primary",
        status: "created",
      };
    }

    return { eventId: "", calendarId: "primary", status: "failed" };
  } catch (err) {
    console.error("Calendar: createCalendarEvent failed:", err);
    return { eventId: "", calendarId: "primary", status: "failed" };
  }
}

// ── Delete a single Calendar event ────────────────────────────────────────────

export async function deleteCalendarEvent(
  googleToken: string,
  eventId: string,
): Promise<boolean> {
  if (!eventId) return false;
  try {
    const token =
      googleToken || localStorage.getItem("google_oauth_token") || "";
    if (!token) return false;

    const res = await fetch(
      `/api/google-calendar/event/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oauthToken: token }),
      },
    );

    return res.ok;
  } catch (err) {
    console.error("Calendar: deleteCalendarEvent failed:", err);
    return false;
  }
}

// ── Update a single Calendar event ────────────────────────────────────────────

export async function updateCalendarEvent(
  googleToken: string,
  eventId: string,
  task: Task,
): Promise<boolean> {
  if (!eventId) return false;
  try {
    const token =
      googleToken || localStorage.getItem("google_oauth_token") || "";
    if (!token) return false;

    const endTime = new Date(task.deadline);
    const startTime = new Date(
      endTime.getTime() - task.estimatedMinutes * 60 * 1000,
    );

    const res = await fetch(
      `/api/google-calendar/event/${encodeURIComponent(eventId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oauthToken: token,
          summary: `[FlowMind] ${task.title}`,
          description: task.description || task.title,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      },
    );

    return res.ok;
  } catch (err) {
    console.error("Calendar: updateCalendarEvent failed:", err);
    return false;
  }
}
