/**
 * onboarding.ts — First-login task seeding
 *
 * Called ONCE after Google sign-in when onboardingCompleted === false.
 * Creates the two welcome tasks in Firestore and schedules them in Google Calendar.
 * Marks onboardingCompleted = true after successful seeding.
 */

import { Task } from "../types";
import { saveTaskToFirestore, markOnboardingComplete } from "./firestore-sync";
import { createCalendarEvent } from "./calendar-sync";

// ── Onboarding task definitions ───────────────────────────────────────────────

function buildOnboardingTasks(userId: string): Task[] {
  const now = new Date();

  const task1: Task = {
    id: `task-onboard-welcome-${userId.slice(0, 6)}`,
    title: "Welcome to FlowMind",
    description:
      "Explore the dashboard and become familiar with your AI productivity workspace.",
    source: "manual",
    sourceRefId: null,
    category: "other",
    priority: "low",
    status: "active",
    deadline: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedMinutes: 10,
    riskScore: 5,
    riskLevel: "safe",
    riskReason: "Introductory onboarding task. No deadline pressure.",
    riskUpdatedAt: now.toISOString(),
    confidenceScore: 100,
    subtasks: [
      {
        id: "sub-ob-1",
        title: "Open the Dashboard tab",
        estimatedMinutes: 2,
        done: false,
      },
      {
        id: "sub-ob-2",
        title: "Review the Risk Heatmap",
        estimatedMinutes: 3,
        done: false,
      },
      {
        id: "sub-ob-3",
        title: "Try the AI Coach chat on the right",
        estimatedMinutes: 5,
        done: false,
      },
    ],
    scheduledBlocks: [],
    createdAt: now.toISOString(),
    completedAt: null,
    userId,
  };

  const task2: Task = {
    id: `task-onboard-plan-${userId.slice(0, 6)}`,
    title: "Create Your First AI Plan",
    description:
      "Paste an email, project description, or use voice input to generate your first execution plan.",
    source: "manual",
    sourceRefId: null,
    category: "other",
    priority: "medium",
    status: "active",
    deadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedMinutes: 20,
    riskScore: 8,
    riskLevel: "safe",
    riskReason: "Onboarding task — easy 20-minute walkthrough.",
    riskUpdatedAt: now.toISOString(),
    confidenceScore: 100,
    subtasks: [
      {
        id: "sub-ob-4",
        title: "Open the Ingest Deck on the Dashboard",
        estimatedMinutes: 5,
        done: false,
      },
      {
        id: "sub-ob-5",
        title: "Paste or type an email / task description",
        estimatedMinutes: 5,
        done: false,
      },
      {
        id: "sub-ob-6",
        title: "Click Extract & Orchestrate to run the AI pipeline",
        estimatedMinutes: 10,
        done: false,
      },
    ],
    scheduledBlocks: [],
    createdAt: now.toISOString(),
    completedAt: null,
    userId,
  };

  return [task1, task2];
}

// ── Main onboarding runner ────────────────────────────────────────────────────

/**
 * Seeds the two onboarding tasks for a new user.
 *
 * Flow:
 *   1. Build onboarding task objects.
 *   2. Save each to Firestore (via existing saveTaskToFirestore).
 *   3. Create a Google Calendar event for each (best-effort, won't block if it fails).
 *   4. If a calendarEventId was returned, update the Firestore doc to store it.
 *   5. Mark onboardingCompleted = true.
 *
 * @param uid         Firebase UID of the new user
 * @param googleToken OAuth access token for Google Calendar (may be empty — Calendar step is skipped gracefully)
 */
export async function runFirstLoginOnboarding(
  uid: string,
  googleToken: string,
): Promise<Task[]> {
  console.log("🎉 FlowMind: Running first-login onboarding for", uid);
  const tasks = buildOnboardingTasks(uid);

  for (const task of tasks) {
    // 1. Persist to Firestore
    await saveTaskToFirestore(uid, task);

    // 2. Create Calendar event (best-effort)
    if (googleToken) {
      const calResult = await createCalendarEvent(googleToken, task);
      if (calResult.status === "created" && calResult.eventId) {
        // 3. Store the Calendar event ID back on the task
        const withCalId: Task = {
          ...task,
          calendarEventId: calResult.eventId,
          calendarId: calResult.calendarId,
        };
        await saveTaskToFirestore(uid, withCalId);
        // Mutate local copy so returned array has correct IDs
        task.calendarEventId = calResult.eventId;
        task.calendarId = calResult.calendarId;
        console.log(
          `  ✓ Calendar event created for "${task.title}": ${calResult.eventId}`,
        );
      }
    } else {
      console.warn(
        "  ⚠ No Google token — skipping Calendar event for",
        task.title,
      );
    }
  }

  // 4. Mark onboarding complete
  await markOnboardingComplete(uid);
  console.log("✅ FlowMind: Onboarding complete.");
  return tasks;
}
