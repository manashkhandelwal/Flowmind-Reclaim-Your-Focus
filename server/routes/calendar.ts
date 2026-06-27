import { Router, Request, Response } from "express";
import { ScheduleBlock } from "../../src/types";

const router = Router();

const FLOWMIND_EVENT_MARKER = "[FlowMind";

// ─── POST /api/google-calendar/sync ──────────────────────────────────────────

router.post("/sync", async (req: Request, res: Response) => {
  const { blocks, oauthToken } = req.body as {
    blocks?: ScheduleBlock[];
    oauthToken?: string;
  };

  if (!oauthToken) {
    return res.status(401).json({ error: "Missing Google OAuth credentials." });
  }

  if (oauthToken === "demo_token_active_bypass") {
    const mockSynced = (blocks ?? []).map((b) => ({
      id: b.id,
      syncedEventId: `mock-evt-${Math.random().toString(36).slice(2, 9)}`,
      status: "created",
    }));
    return res.json({
      success: true,
      message: `[Simulation Mode] Synchronized ${mockSynced.length} focus block(s).`,
      events: mockSynced,
    });
  }

  const blockList = blocks ?? [];
  console.log(`📆 Google Calendar Sync — Writing ${blockList.length} events`);

  try {
    // Step 1: Clear existing FlowMind events (prevent duplicates)
    const now = new Date().toISOString();
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const futureStr = future.toISOString();

    const listRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${futureStr}&maxResults=100`,
      { headers: { Authorization: `Bearer ${oauthToken}` } },
    );

    if (listRes.ok) {
      const listData: any = await listRes.json();
      const existing: any[] = listData.items ?? [];
      const flowEvents = existing.filter(
        (evt: any) =>
          typeof evt.summary === "string" &&
          evt.summary.includes(FLOWMIND_EVENT_MARKER),
      );

      console.log(`  ↳ Removing ${flowEvents.length} stale FlowMind events`);

      await Promise.allSettled(
        flowEvents.map((evt: any) =>
          fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${evt.id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${oauthToken}` },
            },
          ),
        ),
      );
    }

    // Step 2: Create new calendar events
    const syncedResults: Array<{
      id: string;
      syncedEventId: string;
      status: string;
    }> = [];

    for (const block of blockList) {
      const createRes = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${oauthToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: block.title ?? "[FlowMind Focus] Session",
            description: [
              "FlowMind Productivity Coach — automatic time block.",
              "",
              `Objective: ${block.objective ?? ""}`,
              `Milestones: ${(block.milestones ?? []).join(", ")}`,
            ].join("\n"),
            start: { dateTime: block.startTime, timeZone: "UTC" },
            end: { dateTime: block.endTime, timeZone: "UTC" },
            colorId: "3", // Sage green
          }),
        },
      );

      if (createRes.ok) {
        const item: any = await createRes.json();
        syncedResults.push({
          id: block.id,
          syncedEventId: item.id,
          status: "created",
        });
      } else {
        const errText = await createRes.text();
        console.error(
          `  ✗ Failed to create event for block ${block.id}:`,
          errText,
        );
      }
    }

    console.log(
      `  ✓ Synced ${syncedResults.length}/${blockList.length} events`,
    );

    return res.json({
      success: true,
      message: `Successfully synchronized ${syncedResults.length} focus block(s) to Google Calendar.`,
      events: syncedResults,
    });
  } catch (err: any) {
    console.error("Google Calendar sync error:", err);
    return res.status(500).json({
      error: "Calendar synchronization failed.",
      details: err?.message ?? "Unknown error",
    });
  }
});

// ─── POST /api/google-calendar/clear ─────────────────────────────────────────

router.post("/clear", async (req: Request, res: Response) => {
  const { oauthToken } = req.body as { oauthToken?: string };

  if (!oauthToken) {
    return res.status(401).json({ error: "Missing Google authorization." });
  }

  if (oauthToken === "demo_token_active_bypass") {
    return res.json({ success: true, clearedCount: 5 });
  }

  console.log("📆 Google Calendar — Clearing FlowMind events");

  try {
    const now = new Date().toISOString();
    const listRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=100`,
      { headers: { Authorization: `Bearer ${oauthToken}` } },
    );

    let clearedCount = 0;

    if (listRes.ok) {
      const listData: any = await listRes.json();
      const items: any[] = listData.items ?? [];
      const flowEvents = items.filter(
        (evt: any) =>
          typeof evt.summary === "string" &&
          evt.summary.includes(FLOWMIND_EVENT_MARKER),
      );

      const results = await Promise.allSettled(
        flowEvents.map((evt: any) =>
          fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${evt.id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${oauthToken}` },
            },
          ),
        ),
      );

      clearedCount = results.filter((r) => r.status === "fulfilled").length;
    }

    return res.json({ success: true, clearedCount });
  } catch (err: any) {
    console.error("Google Calendar clear error:", err);
    return res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

// ─── DELETE /api/google-calendar/event/:eventId ───────────────────────────────
// Deletes a single Calendar event by ID (used when a task is completed)

router.delete("/event/:eventId", async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const { oauthToken } = req.body as { oauthToken?: string };

  const token = oauthToken || req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Missing Google authorization." });
  }
  if (!eventId) {
    return res.status(400).json({ error: "eventId is required." });
  }

  if (token === "demo_token_active_bypass") {
    return res.json({ success: true, eventId });
  }

  console.log(`📆 Google Calendar — Deleting event: ${eventId}`);

  try {
    const delRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (delRes.status === 204 || delRes.status === 200) {
      return res.json({ success: true, eventId });
    }

    // 404 means it's already gone — treat as success
    if (delRes.status === 404) {
      return res.json({
        success: true,
        eventId,
        note: "Event not found (already deleted)",
      });
    }

    const txt = await delRes.text();
    console.error(`  ✗ Calendar delete failed (${delRes.status}):`, txt);
    return res.status(delRes.status).json({ error: txt });
  } catch (err: any) {
    console.error("Google Calendar delete error:", err);
    return res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

// ─── PATCH /api/google-calendar/event/:eventId ────────────────────────────────
// Updates summary, description, and timing of a single existing event

router.patch("/event/:eventId", async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const { oauthToken, summary, description, startTime, endTime } = req.body as {
    oauthToken?: string;
    summary?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
  };

  if (!oauthToken) {
    return res.status(401).json({ error: "Missing Google authorization." });
  }
  if (!eventId) {
    return res.status(400).json({ error: "eventId is required." });
  }

  if (oauthToken === "demo_token_active_bypass") {
    return res.json({
      success: true,
      event: {
        id: eventId,
        summary: summary || "Focus Block",
        description: description || "",
        start: { dateTime: startTime },
        end: { dateTime: endTime },
      },
    });
  }

  console.log(`📆 Google Calendar — Patching event: ${eventId}`);

  try {
    const body: Record<string, unknown> = {};
    if (summary) body.summary = summary;
    if (description) body.description = description;
    if (startTime) body.start = { dateTime: startTime, timeZone: "UTC" };
    if (endTime) body.end = { dateTime: endTime, timeZone: "UTC" };

    const patchRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${oauthToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (patchRes.ok) {
      const updated = await patchRes.json();
      return res.json({ success: true, event: updated });
    }

    if (patchRes.status === 404 || patchRes.status === 410) {
      console.log(`📆 Google Calendar — Event ${eventId} was deleted or not found (status ${patchRes.status}).`);
      return res.status(patchRes.status).json({ success: false, error: "Event deleted or not found" });
    }

    const txt = await patchRes.text();
    console.error(`  ✗ Calendar patch failed (${patchRes.status}):`, txt);
    return res.status(patchRes.status).json({ error: txt });
  } catch (err: any) {
    console.error("Google Calendar patch error:", err);
    return res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

export default router;
