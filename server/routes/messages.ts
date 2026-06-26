import { Router, Request, Response } from "express";
import { Message } from "../../src/types";
import { messages, setMessages, pushMessage } from "../store";

const router = Router();

// ─── GET /api/messages ────────────────────────────────────────────────────────

router.get("/", (_req: Request, res: Response) => {
  res.json(messages);
});

// ─── POST /api/messages ───────────────────────────────────────────────────────
// If `text` is omitted, treats request as a clear/reset command.

router.post("/", (req: Request, res: Response) => {
  const { text, sender } = req.body as { text?: string; sender?: string };

  if (!text) {
    // Clear history — reset to a single welcome message
    const welcome: Message = {
      id: "m-init",
      sender: "coach",
      text: "FlowMind workspace context refreshed. Let's optimize your agenda.",
      timestamp: new Date().toISOString(),
    };
    setMessages([welcome]);
    return res.json(messages);
  }

  const userMsg: Message = {
    id: `m-${Math.random().toString(36).slice(2, 11)}`,
    sender: (sender as "user" | "coach") ?? "user",
    text,
    timestamp: new Date().toISOString(),
  };

  pushMessage(userMsg);
  return res.json(userMsg);
});

export default router;
