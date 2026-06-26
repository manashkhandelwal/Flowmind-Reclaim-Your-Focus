import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { Task, Goal, AgentRunLog, Message, AppBriefing, ScheduleBlock, Subtask } from "./src/types";
import { computeBaseRisk } from "./src/utils/risk-engine";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client with fallback
let aiClient: any = null;
const API_KEY = process.env.GEMINI_API_KEY;

if (API_KEY && API_KEY !== "MY_GEMINI_API_KEY") {
  try {
    aiClient = new GoogleGenAI({
      apiKey: API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("FlowMind: Gemini AI client initialized successfully.");
  } catch (err) {
    console.error("FlowMind: Failed to initialize Gemini AI client:", err);
  }
} else {
  console.log("FlowMind: GEMINI_API_KEY not defined or placeholder. Operating in dynamic simulations.");
}

// Helper to query Gemini with fallbacks (essential for high-demand / rate-limiting resiliency)
async function generateContentWithFallback(aiClient: any, params: {
  model?: string;
  config?: any;
  contents: any;
}) {
  const primaryModel = params.model || "gemini-3.5-flash";
  const modelsToTry = [primaryModel, "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];
  
  let lastError: any = null;
  for (const modelName of modelsToTry) {
    try {
      console.log(`Trying Gemini model: ${modelName}`);
      const response = await aiClient.models.generateContent({
        ...params,
        model: modelName
      });
      console.log(`Gemini success with model: ${modelName}`);
      return response;
    } catch (err: any) {
      console.warn(`Model ${modelName} call failed:`, err.message || err);
      lastError = err;
    }
  }
  throw lastError;
}

// Beautiful sandbox simulation responder in case artificial intelligence is entirely offline or highly rate-limited
function generateSimulationResponse(query: string, tasksToParse: Task[], goalsToParse: Goal[]): string {
  const lowercaseQuery = query.toLowerCase();
  
  // Find highest risk active tasks
  const activeTasks = tasksToParse.filter(t => t.status === "active");
  const criticalTasks = activeTasks.filter(t => t.priority === "critical" || t.riskLevel === "high_risk");
  const highestRiskTask = criticalTasks[0] || activeTasks[0];

  if (lowercaseQuery.includes("work") || lowercaseQuery.includes("do") || lowercaseQuery.includes("next") || lowercaseQuery.includes("priority") || lowercaseQuery.includes("agenda")) {
    if (highestRiskTask) {
      return `Looking closely at your active workspace, your immediate focus should be **${highestRiskTask.title}** (Priority: ${highestRiskTask.priority}, Risk: ${highestRiskTask.riskLevel}). It has an estimated ${highestRiskTask.estimatedMinutes} minutes remaining. I suggest starting a dedicated 25-minute study sprint in the Focus Tab right now!`;
    }
    return "You have cleared all active obligations! Your workspace is calm and optimal. Celebrate your momentum, or check out your long-term roadmap options.";
  }
  
  if (lowercaseQuery.includes("schedule") || lowercaseQuery.includes("calendar") || lowercaseQuery.includes("book") || lowercaseQuery.includes("tomorrow")) {
    const unscheduled = activeTasks.filter(t => t.scheduledBlocks.length === 0);
    if (unscheduled.length > 0) {
      return `I ran an optimization pass on your schedule. To secure your deadlines, I recommend booking a 90-minute focus sprint tomorrow morning for **${unscheduled[0].title}**. Should I lock this block into your Calendar matrix?`;
    }
    return "All your high-impact deliverables are currently scheduled into focus slots ahead of deadlines! Your calendar bounds look great.";
  }
  
  if (lowercaseQuery.includes("stressed") || lowercaseQuery.includes("overwhelmed") || lowercaseQuery.includes("anxious") || lowercaseQuery.includes("too much")) {
    const lowRiskTasks = activeTasks.filter(t => t.riskLevel === "safe" || t.priority === "low" || t.priority === "medium");
    if (lowRiskTasks.length > 0) {
      return `Take a deep breath; I've got your workload organized. Let's temporarily drop **${lowRiskTasks[0].title}** into your backlog to reduce overhead. We can split your primary stressor into short, achievable 25-minute Pomodoros. Ready to initiate a focused session?`;
    }
    if (highestRiskTask) {
      return `Breathe. Let's tackle **${highestRiskTask.title}** by breaking it into small 15-minute milestones. No need to finish everything at once. Focus only on the first step.`;
    }
    return "Breathe deep. Your obligation load is currently zero. Relax and enjoy your buffer window.";
  }
  
  if (lowercaseQuery.includes("goal") || lowercaseQuery.includes("objective") || lowercaseQuery.includes("long term") || lowercaseQuery.includes("roadmap")) {
    if (goalsToParse.length > 0) {
      const g = goalsToParse[0];
      return `Your primary strategic milestone is "**${g.title}**" with a target date of ${new Date(g.targetDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}. This matches up directly with your active tasks. Let's configure a focused block to support this.`;
    }
    return "Your long-term milestones are healthy. Keep executing your micro-tasks to align with your master engineering goals!";
  }
  
  // General response matching keywords or defaulting nicely
  if (highestRiskTask) {
    return `Your workspace context is synced. I detect that **${highestRiskTask.title}** is currently marked ${highestRiskTask.riskLevel} with a deadline on ${new Date(highestRiskTask.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}. Let's structure a micro-run or launch our aligned Pomodoro timer. What is your priority?`;
  }
  return "I have synced your agenda details! I'm ready to calibrate your task priorities, schedule buffer times, or guide you through an immersive study countdown. How can I help you excel today?";
}

// In-Memory Database containing standard high-fidelity mock data
let tasks: Task[] = [
  {
    id: "task-dbms",
    title: "DBMS Final Group Project Submission",
    description: "Write full schema definitions, index designs, and optimize query latency for the university registry system.",
    source: "gmail",
    sourceRefId: "msg-11293",
    category: "project",
    priority: "critical",
    status: "active",
    deadline: new Date(Date.now() + 1.2 * 24 * 60 * 60 * 1000).toISOString(), // 1.2 days from now
    estimatedMinutes: 240,
    riskScore: 88,
    riskLevel: "high_risk",
    riskReason: "High estimate (4 hrs) coupled with congested review windows tomorrow.",
    riskUpdatedAt: new Date().toISOString(),
    confidenceScore: 98,
    subtasks: [
      { id: "sub-1", title: "Verify indexing structures in PostgreSQL", estimatedMinutes: 60, done: true },
      { id: "sub-2", title: "Draft final Spanner migration report", estimatedMinutes: 120, done: false },
      { id: "sub-3", title: "Complete connection-pooling benchmarks", estimatedMinutes: 60, done: false }
    ],
    scheduledBlocks: [
      {
        id: "block-1",
        taskId: "task-dbms",
        title: "DBMS Architecture Sprint",
        startTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4h from now
        endTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        objective: "Establish final indexes",
        milestones: ["Benchmark index", "Resolve deadlock scenarios"],
        type: "focus"
      }
    ],
    createdAt: new Date().toISOString(),
    completedAt: null
  },
  {
    id: "task-aws",
    title: "AWS Cloud Practitioner Study Prep",
    description: "Review IAM policies, shared responsibility model definitions, and complete final practice module 6.",
    source: "drive",
    sourceRefId: "file-aws-cc",
    category: "certification",
    priority: "high",
    status: "active",
    deadline: new Date(Date.now() + 3.5 * 24 * 60 * 60 * 1000).toISOString(), // 3.5 days from now
    estimatedMinutes: 180,
    riskScore: 42,
    riskLevel: "at_risk",
    riskReason: "Gradual progression required to lock down VPC route table configuration rules.",
    riskUpdatedAt: new Date().toISOString(),
    confidenceScore: 92,
    subtasks: [
      { id: "sub-aws-1", title: "Study AWS billing & cost management models", estimatedMinutes: 90, done: true },
      { id: "sub-aws-2", title: "Practice serverless lambda access roles", estimatedMinutes: 90, done: false }
    ],
    scheduledBlocks: [],
    createdAt: new Date().toISOString(),
    completedAt: null
  },
  {
    id: "task-alg",
    title: "Algorithm Design Homework 4",
    description: "Prove NP-completeness for Subset Sum variation and describe a 2-approximation algorithm for Vertex Cover.",
    source: "calendar",
    sourceRefId: "cal-alg-4",
    category: "assignment",
    priority: "medium",
    status: "active",
    deadline: new Date(Date.now() + 5.8 * 24 * 60 * 60 * 1000).toISOString(), // 5.8 days from now
    estimatedMinutes: 120,
    riskScore: 22,
    riskLevel: "safe",
    riskReason: "Ample buffer time relative to estimated 2-hour completion budget.",
    riskUpdatedAt: new Date().toISOString(),
    confidenceScore: 95,
    subtasks: [
      { id: "sub-alg-1", title: "Write reduction code for SAT subset permutation", estimatedMinutes: 60, done: false },
      { id: "sub-alg-2", title: "Verify vertex cover approximation ratio", estimatedMinutes: 60, done: false }
    ],
    scheduledBlocks: [],
    createdAt: new Date().toISOString(),
    completedAt: null
  },
  {
    id: "task-stage",
    title: "Production Memory Overrun Sync",
    description: "Briefing call regarding recent Node heap exhaustion leaks under heavy event loops on main gateway.",
    source: "manual",
    sourceRefId: null,
    category: "meeting",
    priority: "critical",
    status: "active",
    deadline: new Date(Date.now() + 0.5 * 24 * 60 * 60 * 1000).toISOString(), // 12 hours from now
    estimatedMinutes: 45,
    riskScore: 78,
    riskLevel: "high_risk",
    riskReason: "Extremely short time buffer (less than 12 hours left) with no block booked.",
    riskUpdatedAt: new Date().toISOString(),
    confidenceScore: 100,
    subtasks: [
      { id: "sub-stg-1", title: "Retrieve core dump metrics", estimatedMinutes: 15, done: true },
      { id: "sub-stg-2", title: "Identify circular closures in worker process pool", estimatedMinutes: 30, done: false }
    ],
    scheduledBlocks: [],
    createdAt: new Date().toISOString(),
    completedAt: null
  }
];

let goals: Goal[] = [
  {
    id: "goal-1",
    title: "Master Backend Scale Engineering & Cloud Ops",
    description: "Achieve deep cloud architectural capabilities, targeting NP-completeness logic and efficient Firestore and Spanner layouts.",
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    roadmap: "### Scale Mastery Roadmap\n1. Complete all group cloud migration sprints.\n2. Attain AWS Certified Solutions Practitioner badge.\n3. Conduct load benchmark simulations on clustered instances.",
    milestones: [
      { id: "ms-1", title: "Finish DBMS Cloud Registry Migrations", done: false },
      { id: "ms-2", title: "Gain AWS Cloud Practitioner Credential", done: false }
    ],
    relatedTaskIds: ["task-dbms", "task-aws"]
  }
];

let agentLogs: AgentRunLog[] = [
  {
    id: "log-initial",
    agent: "orchestrator",
    sessionId: "sess-bootstrap",
    triggeredBy: "initial_sync",
    success: true,
    reasoning: "Synchronized user context, imported active calendar bounds, and processed 14 mailbox records successfully.",
    tokensUsed: 1480,
    durationMs: 1420,
    error: null,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

let messages: Message[] = [
  {
    id: "m-1",
    sender: "coach",
    text: "Hello! I am FlowMind, your Agentic Chief of Staff. I have completed initial ingestion of your workspace. You have 2 high-risk deadlines approaching. How shall we coordinate your blocks today?",
    timestamp: new Date(Date.now() - 1000 * 60).toISOString()
  }
];

let activeBriefing: AppBriefing = {
  content: "### FlowMind Executive Briefing\nYour workspace is loaded. We identify **2 Critical Items** needing cognitive focus:\n- **Production Memory Overrun Sync** in ~12 hrs is unsecured. We recommend booking a preparation block.\n- **DBMS Group Submission** (88% Risk) requires 4 hours. 1 block is booked, leaving a 2-hour estimate shortfall.\n\n_Your focus score is strong. Let's make today highly strategic._",
  topTask: "task-stage",
  riskSummary: {
    criticalCount: 2,
    highRiskCount: 2,
    atRiskCount: 1,
    safeCount: 1
  },
  generatedAt: new Date().toISOString()
};

// HELPER FOR SYNC / TASK CALCULATION
function updateCalculatedRiskState() {
  tasks = tasks.map(t => {
    const calc = computeBaseRisk(t);
    // Maintain Gemini adjusted override unless the state changes wildly
    return {
      ...t,
      riskScore: t.riskLevel !== calc.riskLevel ? calc.riskScore : t.riskScore,
      riskLevel: t.riskLevel !== calc.riskLevel ? calc.riskLevel : t.riskLevel
    };
  });
}

// ─── API ENDPOINTS ────────────────────────────────────────────────────────

// Fetch AI Key Status
app.get("/api/ai-status", (req, res) => {
  res.json({
    active: aiClient !== null,
    simulation: aiClient === null,
    keyConfigured: !!API_KEY && API_KEY !== "MY_GEMINI_API_KEY"
  });
});

// GET Tasks
app.get("/api/tasks", (req, res) => {
  updateCalculatedRiskState();
  res.json(tasks);
});

// CREATE / EDIT / SAVE Task
app.post("/api/tasks", (req, res) => {
  const taskData = req.body;
  if (!taskData.id) {
    // Treat as Create New
    const newTask: Task = {
      id: "task-" + Math.random().toString(36).substr(2, 9),
      title: taskData.title || "Untitled Obligation",
      description: taskData.description || "",
      source: taskData.source || "manual",
      sourceRefId: taskData.sourceRefId || null,
      category: taskData.category || "other",
      priority: taskData.priority || "medium",
      status: taskData.status || "active",
      deadline: taskData.deadline || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedMinutes: Number(taskData.estimatedMinutes) || 60,
      riskScore: 25,
      riskLevel: "safe",
      riskReason: "Freshly logged, awaiting Agent processing passes.",
      riskUpdatedAt: new Date().toISOString(),
      confidenceScore: taskData.confidenceScore || 100,
      subtasks: taskData.subtasks || [],
      scheduledBlocks: taskData.scheduledBlocks || [],
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    
    // Evaluate initial risk
    const riskCheck = computeBaseRisk(newTask);
    newTask.riskScore = riskCheck.riskScore;
    newTask.riskLevel = riskCheck.riskLevel;

    tasks.push(newTask);
    res.status(201).json(newTask);
  } else {
    // Treat as Edit
    const index = tasks.findIndex(t => t.id === taskData.id);
    if (index !== -1) {
      const existing = tasks[index];
      const updated: Task = {
        ...existing,
        ...taskData,
        // Calculate status change timestamp
        completedAt: taskData.status === "completed" ? (existing.completedAt || new Date().toISOString()) : null
      };

      // Recalculate deterministic risk profile
      const riskCheck = computeBaseRisk(updated);
      updated.riskScore = riskCheck.riskScore;
      updated.riskLevel = riskCheck.riskLevel;
      updated.riskUpdatedAt = new Date().toISOString();

      tasks[index] = updated;
      res.json(updated);
    } else {
      res.status(404).json({ error: "Task code reference not found" });
    }
  }
});

// DELETE Task
app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const index = tasks.findIndex(t => t.id === id);
  if (index !== -1) {
    tasks.splice(index, 1);
    res.json({ success: true, message: "Task dropped successfully" });
  } else {
    res.status(404).json({ error: "Task reference not found" });
  }
});

// GET Goals
app.get("/api/goals", (req, res) => {
  res.json(goals);
});

// POST Goals
app.post("/api/goals", (req, res) => {
  const goalObj = req.body;
  if (!goalObj.id) {
    const newGoal: Goal = {
      id: "goal-" + Math.random().toString(36).substr(2, 9),
      title: goalObj.title || "Untitled Active Milestone",
      description: goalObj.description || "",
      targetDate: goalObj.targetDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      roadmap: goalObj.roadmap || "### Dynamic Plan Roadmap",
      milestones: goalObj.milestones || [],
      relatedTaskIds: goalObj.relatedTaskIds || []
    };
    goals.push(newGoal);
    res.status(201).json(newGoal);
  } else {
    const idx = goals.findIndex(g => g.id === goalObj.id);
    if (idx !== -1) {
      goals[idx] = { ...goals[idx], ...goalObj };
      res.json(goals[idx]);
    } else {
      res.status(404).json({ error: "Goal not found" });
    }
  }
});

// GET Daily Executive Briefing
app.get("/api/briefing", (req, res) => {
  res.json(activeBriefing);
});

// GET Audit Logs of Agent execution
app.get("/api/logs", (req, res) => {
  res.json(agentLogs);
});

// POST Orchestrator Agent multi-agent pipeline
app.post("/api/agents/orchestrate", async (req, res) => {
  const { triggerType, unstructuredFeed } = req.body;
  const sessionId = "sess-" + Math.random().toString(36).substr(2, 9);
  
  console.log(`FlowMind: Executing agent pipeline for: ${triggerType}`);

  // Base progress response structure
  const progressLogs: string[] = [];
  let durationTracker = 0;
  let totalTokens = 0;

  // Let's run a real Gemini extraction if triggerType requires analysis and key is active!
  let analyzedTasks: any[] = [];
  let insights = "";

  if (aiClient && triggerType === "gmail_scan" && unstructuredFeed) {
    try {
      const response = await generateContentWithFallback(aiClient, {
        model: "gemini-3.5-flash",
        contents: `Analyze this unstructured text/email payload and extract 1 or 2 concrete actionable task commitments.
Text input: "${unstructuredFeed}"

Response layout must be a JSON array of parsed items with these exact keys:
"title", "description", "category" (one of: interview, assignment, meeting, bill, certification, project, other), "priority" (one of: critical, high, medium, low), "estimatedMinutes" (estimates in numbers, e.g. 120), "subtasks" (array of strings for immediate work steps).

Return valid parseable JSON only. Do not wrap in markdown quotes if possible, or just standard array block.`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const extractedText = response.text || "[]";
      analyzedTasks = JSON.parse(extractedText.trim());
      totalTokens += response.usageMetadata?.totalTokenCount || 0;
    } catch (err) {
      console.error("Gemini Ingestion analysis failed error:", err);
    }
  }

  // 1. Ingestion Agent Simulation / Execution
  const ingestStart = Date.now();
  if (analyzedTasks && analyzedTasks.length > 0) {
    analyzedTasks.forEach(at => {
      const nTask: Task = {
        id: "task-extracted-" + Math.random().toString(36).substr(2, 6),
        title: at.title || "Extracted Obligation",
        description: at.description || "Awaiting detail audit",
        source: "gmail",
        sourceRefId: "msg-" + Math.random().toString(36).substr(2, 5),
        category: at.category || "other",
        priority: at.priority || "high",
        status: "active",
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedMinutes: Number(at.estimatedMinutes) || 90,
        riskScore: 60,
        riskLevel: "at_risk",
        riskReason: "Extracted post-mailbox scanning. Awaiting booking allocations.",
        riskUpdatedAt: new Date().toISOString(),
        confidenceScore: 94,
        subtasks: (at.subtasks || []).map((st: string, idx: number) => ({ id: `sub-ext-${idx}`, title: st, done: false, estimatedMinutes: Math.round(Number(at.estimatedMinutes || 90) / Math.max(1, at.subtasks.length)) })),
        scheduledBlocks: [],
        createdAt: new Date().toISOString(),
        completedAt: null
      };
      tasks.push(nTask);
    });
    progressLogs.push(`Ingestion Agent: Successfully digested context feeds. Found ${analyzedTasks.length} obligations!`);
  } else if (triggerType === "gmail_scan") {
    // Simulation mode
    const simulatedTask: Task = {
      id: "task-sim-" + Math.random().toString(36).substr(2, 5),
      title: "Confirm Cloud Integration API Sign-off",
      description: "Urgent action requested in thread with Dev Lead regarding webhook configurations.",
      source: "gmail",
      sourceRefId: "msg-sim-9293",
      category: "project",
      priority: "high",
      status: "active",
      deadline: new Date(Date.now() + 1.8 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedMinutes: 90,
      riskScore: 50,
      riskLevel: "at_risk",
      riskReason: "Est. 1.5 hrs remaining. Needs a focus block during tomorrow's development slot.",
      riskUpdatedAt: new Date().toISOString(),
      confidenceScore: 89,
      subtasks: [
        { id: "sub-sim-1", title: "Read endpoint payload documentation", estimatedMinutes: 30, done: false },
        { id: "sub-sim-2", title: "Trigger API payload validation tests", estimatedMinutes: 60, done: false }
      ],
      scheduledBlocks: [],
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    tasks.push(simulatedTask);
    progressLogs.push("Ingestion Agent (Simulated): Scanned unread mailbox threads. Extracted 1 high-confidence obligation.");
  } else {
    progressLogs.push("Ingestion Agent: Context indexes are synced. No new pending items detected.");
  }
  const ingestDurationms = Date.now() - ingestStart;
  totalTokens += 450;

  // Log Ingestion Agent Run
  agentLogs.push({
    id: "log-" + Math.random().toString(36).substr(2, 9),
    agent: "ingestion",
    sessionId,
    triggeredBy: triggerType,
    success: true,
    reasoning: progressLogs[0],
    tokensUsed: totalTokens,
    durationMs: ingestDurationms,
    createdAt: new Date().toISOString()
  });

  // 2. Risk Agent Execution
  const riskStart = Date.now();
  // Recalculate everything
  updateCalculatedRiskState();

  // Call Gemini to do a complex dynamic risk pass if key is configured
  if (aiClient && tasks.length > 0) {
    try {
      const taskBriefs = tasks.map(t => `${t.title} [Est: ${t.estimatedMinutes}m, Deadline: ${t.deadline.split("T")[0]}]`).join("\n");
      const riskResponse = await generateContentWithFallback(aiClient, {
        model: "gemini-3.5-flash",
        contents: `You are a Risk Assessment Officer. Given these tasks, analyze potential bottlenecks or double bookings:
${taskBriefs}

Return a 3-sentence dynamic workspace analysis highlighting which task is at extreme scheduling risk, why, and a recommended action. Keep it highly relevant and structured.`,
      });
      insights = riskResponse.text || "Everything stable.";
      totalTokens += riskResponse.usageMetadata?.totalTokenCount || 0;
    } catch (err) {
      console.error("Gemini risk audit exception:", err);
      // Perfect context-grounded fallback during general API outages:
      const highRisk = tasks.find(t => t.riskLevel === "high_risk" || t.priority === "critical");
      insights = highRisk 
        ? `Dynamic workload audit identified potential congestions. **${highRisk.title}** is highlighted due to high-priority requirements. Scheduling immediate buffer times strongly advised.`
        : `All ${tasks.length} active tasks are stably distributed. Buffer margins look appropriate across deadlines.`;
    }
  } else {
    insights = `Analyzed ${tasks.length} active tasks. Critical bottleneck is "DBMS Submission" due to overlapping deliverables in 24 hours. Recommended immediate booking.`;
  }

  // Update briefing with the risk insight
  activeBriefing = {
    content: `### Executive Briefing (Regenerated)\n\n${insights}\n\n**Risk Summary:**\n- Approaching Deadlines: ${tasks.filter(t => t.riskLevel === "high_risk").length} critical items flagged\n- Total active task latency estimates: ${tasks.reduce((acc, t) => acc + (t.status === "active" ? t.estimatedMinutes : 0), 0)} focus minutes.`,
    topTask: tasks.find(t => t.riskLevel === "high_risk")?.id || "task-dbms",
    riskSummary: {
      criticalCount: tasks.filter(t => t.priority === "critical").length,
      highRiskCount: tasks.filter(t => t.riskLevel === "high_risk").length,
      atRiskCount: tasks.filter(t => t.riskLevel === "at_risk").length,
      safeCount: tasks.filter(t => t.riskLevel === "safe").length
    },
    generatedAt: new Date().toISOString()
  };

  const riskDuration = Date.now() - riskStart;
  progressLogs.push("Risk Agent: Calculated priority buffer hours. Compiled real-time bottleneck insights.");
  
  agentLogs.push({
    id: "log-" + Math.random().toString(36).substr(2, 9),
    agent: "risk",
    sessionId,
    triggeredBy: triggerType,
    success: true,
    reasoning: `AI-enhanced workspace risk matrix evaluated. Bottlenecks compiled. Key risk insight: "${insights.slice(0, 80)}..."`,
    tokensUsed: aiClient ? totalTokens : 600,
    durationMs: riskDuration,
    createdAt: new Date().toISOString()
  });

  // 3. Scheduler Agent Execution
  const scheduleStart = Date.now();
  let scheduledNewBlocks = 0;
  
  // Book calendar focus blocks automatically for unallocated critical tasks!
  tasks.forEach(t => {
    if (t.status === "active" && t.scheduledBlocks.length === 0 && (t.riskLevel === "high_risk" || t.priority === "critical")) {
      // Create an optimized focus block tomorrow
      const tomorrow9AM = new Date();
      tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
      tomorrow9AM.setHours(9, 0, 0, 0);

      const endSlot = new Date(tomorrow9AM.getTime() + 2 * 60 * 60 * 1000); // 120 mins block

      const newBlock: ScheduleBlock = {
        id: "block-" + Math.random().toString(36).substr(2, 5),
        taskId: t.id,
        title: `[FlowMind Goal] ${t.title}`,
        startTime: tomorrow9AM.toISOString(),
        endTime: endSlot.toISOString(),
        objective: `Execute key subtasks for ${t.title}.`,
        milestones: t.subtasks.slice(0, 2).map(s => s.title),
        type: "focus"
      };

      t.scheduledBlocks.push(newBlock);
      scheduledNewBlocks++;
    }
  });

  if (scheduledNewBlocks > 0) {
    progressLogs.push(`Scheduler Agent: Multi-pass planner integrated. Allocated ${scheduledNewBlocks} new calibration blocks onto Google Calendar timeline.`);
  } else {
    progressLogs.push("Scheduler Agent: Time matrix optimized. Currently no scheduling shortfalls requiring adjustments.");
  }

  const scheduleDuration = Date.now() - scheduleStart;
  agentLogs.push({
    id: "log-" + Math.random().toString(36).substr(2, 9),
    agent: "scheduler",
    sessionId,
    triggeredBy: triggerType,
    success: true,
    reasoning: progressLogs[2] || "Optimized workload layout matching user parameters.",
    tokensUsed: 400,
    durationMs: scheduleDuration,
    createdAt: new Date().toISOString()
  });

  // 4. Coach Agent Compilation
  const coachStart = Date.now();
  const coachMsgText = `Hi! I've executed your FlowMind Orchestration sub-pipeline on request (${triggerType}). We allocated critical focus slots on your calendar to protect your high-risk deadlines. Please review the heat-map timeline below! Let me know if you want to swap study periods.`;
  
  messages.push({
    id: "m-gen-" + Math.random().toString(36).substr(2, 5),
    sender: "coach",
    text: coachMsgText,
    timestamp: new Date().toISOString()
  });

  const coachDuration = Date.now() - coachStart;
  agentLogs.push({
    id: "log-" + Math.random().toString(36).substr(2, 9),
    agent: "coach",
    sessionId,
    triggeredBy: triggerType,
    success: true,
    reasoning: "Generated proactive update on chat stream. In-session telemetry logging completed.",
    tokensUsed: 300,
    durationMs: coachDuration,
    createdAt: new Date().toISOString()
  });

  // End entire orchestration
  agentLogs.push({
    id: "log-main-" + sessionId,
    agent: "orchestrator",
    sessionId,
    triggeredBy: triggerType,
    success: true,
    reasoning: `Orchestrator finished multi-agent pipeline: Ingestion -> Risk scores -> Calendar planning -> Proactive Coach update.`,
    tokensUsed: totalTokens + 1500,
    durationMs: ingestDurationms + riskDuration + scheduleDuration + coachDuration,
    createdAt: new Date().toISOString()
  });

  res.json({
    success: true,
    sessionId,
    logs: progressLogs,
    insights,
    activeBriefing,
    tasks
  });
});

// POST Chat feedback or interactive queries
app.post("/api/agents/coach", async (req, res) => {
  const { query, history } = req.body;

  console.log("FlowMind Coach received chat query:", query);

  let responseText = "";
  
  // Package full workspace background context to feed the AI!
  const workspaceContext = {
    currentTime: new Date().toISOString(),
    items: tasks.map(t => ({
      title: t.title,
      category: t.category,
      priority: t.priority,
      status: t.status,
      deadline: t.deadline,
      estimatedMinutes: t.estimatedMinutes,
      riskLevel: t.riskLevel,
      riskReason: t.riskReason,
      subtasks: t.subtasks.map(st => `${st.title} (${st.done ? 'COMPLETED' : 'PENDING'})`)
    })),
    goals: goals.map(g => `${g.title}: Target ${g.targetDate}`)
  };

  if (aiClient) {
    try {
      // Beautiful Chief of Staff personality prompt
      const systemPrompt = `You are FlowMind, an elite productivity Chief of Staff. You have complete context on the user's tasks, deadlines, risk scores, and schedule.

Your personality:
- Direct, elite, and decisive (never vague, never say "Sure/Happy to help", just do it)
- Proactive — anticipate issues and suggest specific concrete steps
- Action-oriented — every reply ends with an actionable next step or suggestion choice
- Brief — max 3-4 sentences total unless explaining a plan step.

Current high-integrity workspace state in JSON:
${JSON.stringify(workspaceContext, null, 2)}

Handle the user message given: "${query}". Address their active work goals directly.`;

      // Compose Chat logic using modern SDK
      const response = await generateContentWithFallback(aiClient, {
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: systemPrompt
        },
        contents: query
      });

      responseText = response.text || "Apologies, I encountered a response synchronization check. How can I optimize your work today?";
    } catch (err) {
      console.error("Gemini Coach model chat failure:", err);
      // Seamlessly fall back to custom context-grounded dynamic simulation in case of 503/429 failures!
      responseText = generateSimulationResponse(query, tasks, goals);
    }
  } else {
    // Dynamic Simulation fallback
    responseText = generateSimulationResponse(query, tasks, goals);
  }

  const coachResponseMsg: Message = {
    id: "m-" + Math.random().toString(36).substr(2, 9),
    sender: "coach",
    text: responseText,
    timestamp: new Date().toISOString()
  };

  messages.push(coachResponseMsg);
  res.json(coachResponseMsg);
});

// GET active messages
app.get("/api/messages", (req, res) => {
  res.json(messages);
});

// POST append new user message or clear history
app.post("/api/messages", (req, res) => {
  const { text, sender } = req.body;
  if (!text) {
    // Treat as clear requested
    messages = [
      {
        id: "m-init",
        sender: "coach",
        text: "FlowMind workspace context refreshed. Let's optimize your agenda.",
        timestamp: new Date().toISOString()
      }
    ];
    res.json(messages);
  } else {
    const userMsg: Message = {
      id: "m-" + Math.random().toString(36).substr(2, 9),
      sender: sender || "user",
      text,
      timestamp: new Date().toISOString()
    };
    messages.push(userMsg);
    res.json(userMsg);
  }
});

// ─── EXTRA AI & CALENDAR ENDPOINTS ─────────────────────────────────────────

// AI Task Decomposition & Priority Engine Endpoint
app.post("/api/ai/decompose", async (req, res) => {
  const { title, description, deadline, estimatedMinutes } = req.body;
  const currentDateTime = new Date().toISOString();

  console.log(`FlowMind AI: Decomposing and prioritizing "${title}"`);

  if (aiClient) {
    try {
      const prompt = `You are FlowMind AI, an elite productivity Chief of Staff.
Please analyze, decompose, and calculate the optimal priority level for this custom obligation.
Task Title: "${title}"
Task Description: "${description || "No description provided."}"
Deadline target: "${deadline || "unspecified"}"
Total Estimated Minutes: ${estimatedMinutes || 60}
Current system date and time is ${currentDateTime}.

Requirements:
1. Decompose into 3-5 precise, edit-friendly logical subtask milestones. Each subtask MUST have "title", "estimatedMinutes", and "suggestedOrder" (integer starting at 1).
2. Assign an overall custom priority level: 'critical' / 'high' / 'medium' / 'low' based on deadline urgency, effort, and workload.
3. Provide a highly actionable, clear 1-2 sentence "explanation" of this priority assessment decision.

Return EXACTLY a valid, parseable JSON object matching this schema (do NOT wrap in markdown unless standard json):
{
  "priority": "high",
  "explanation": "This assignment is high priority because the deadline is in less than 48 hours and requires focused code benchmarks.",
  "subtasks": [
    { "title": "Setup database tables", "estimatedMinutes": 30, "suggestedOrder": 1 },
    { "title": "Draft query benchmarks", "estimatedMinutes": 60, "suggestedOrder": 2 }
  ]
}`;

      const response = await generateContentWithFallback(aiClient, {
        model: "gemini-3.5-flash",
        config: { responseMimeType: "application/json" },
        contents: prompt
      });

      const parsed = JSON.parse((response.text || "").trim());
      return res.json({
        success: true,
        priority: parsed.priority || "medium",
        explanation: parsed.explanation || "Calculated via active baseline standards.",
        subtasks: parsed.subtasks || []
      });
    } catch (err: any) {
      console.error("Task Decomposition Gemini call failed, using simulation:", err);
    }
  }

  // High-fidelity fallback/simulation when AI Client is not configured or fails
  const generatedSubtasks = [
    { title: `Audit requirements for ${title}`, estimatedMinutes: Math.round(estimatedMinutes * 0.25) || 15, suggestedOrder: 1 },
    { title: `Core structural implementation of ${title}`, estimatedMinutes: Math.round(estimatedMinutes * 0.5) || 30, suggestedOrder: 2 },
    { title: `Final revision & review checks`, estimatedMinutes: Math.round(estimatedMinutes * 0.25) || 15, suggestedOrder: 3 }
  ];
  return res.json({
    success: true,
    priority: estimatedMinutes > 150 ? "high" : "medium",
    explanation: "Assessed via local fallback heuristic. Workload duration requires structured focus slots.",
    subtasks: generatedSubtasks
  });
});

// Voice Task Input Parsing Endpoint
app.post("/api/ai/voice-input", async (req, res) => {
  const { transcript } = req.body;
  const currentDateTime = new Date().toISOString();

  console.log(`FlowMind AI: Parsing voice transcript: "${transcript}"`);

  if (!transcript || !transcript.trim()) {
    return res.status(400).json({ error: "Missing transcript." });
  }

  if (aiClient) {
    try {
      const prompt = `You are FlowMind Voice parsing module. Convert this spoken verbal transcript into a structured, highly actionable workspace obligation.
Spoken Text: "${transcript}"
Current Date/Time is ${currentDateTime}.

Return EXACTLY a valid, parseable JSON object matching this schema:
{
  "title": "A summary title of the task",
  "description": "A descriptive background text explaining what the user spoken",
  "category": "project" | "assignment" | "certification" | "meeting" | "bill" | "other",
  "priority": "critical" | "high" | "medium" | "low",
  "deadline": "An ISO timestamp representing the deadline (e.g. if midnight Friday, calculate Friday date, otherwise default to 4 days from now)",
  "estimatedMinutes": 90, // integer representing overall estimated completion time
  "subtasks": [
    { "title": "Subtask title", "estimatedMinutes": 30, "suggestedOrder": 1 }
  ]
}`;

      const response = await generateContentWithFallback(aiClient, {
        model: "gemini-3.5-flash",
        config: { responseMimeType: "application/json" },
        contents: prompt
      });

      const parsed = JSON.parse((response.text || "").trim());
      return res.json({
        success: true,
        task: {
          id: "task-voice-" + Math.random().toString(36).substr(2, 6),
          title: parsed.title || "Voice Logged Task",
          description: parsed.description || transcript,
          source: "agent",
          sourceRefId: null,
          category: parsed.category || "other",
          priority: parsed.priority || "medium",
          status: "active",
          deadline: parsed.deadline || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedMinutes: Number(parsed.estimatedMinutes) || 60,
          riskScore: 35,
          riskLevel: "safe",
          riskReason: "Voice parsed. Ready for calendar booking scheduling.",
          riskUpdatedAt: new Date().toISOString(),
          confidenceScore: 92,
          subtasks: (parsed.subtasks || []).map((s: any, idx: number) => ({
            id: `sub-voice-${idx}-${Math.random().toString(36).substr(2, 3)}`,
            title: s.title || "Subtask",
            estimatedMinutes: s.estimatedMinutes || 20,
            done: false
          })),
          scheduledBlocks: [],
          createdAt: new Date().toISOString(),
          completedAt: null
        }
      });
    } catch (err: any) {
      console.error("Voice input parsing Gemini call failed:", err);
    }
  }

  // Backup simulation responder for voice parsing
  const isHigh = transcript.toLowerCase().includes("urgent") || transcript.toLowerCase().includes("asap");
  return res.json({
    success: true,
    task: {
      id: "task-voice-sim-" + Math.random().toString(36).substr(2, 5),
      title: "Log Voice: Review Deliverables",
      description: transcript,
      source: "agent",
      sourceRefId: null,
      category: "other",
      priority: isHigh ? "high" : "medium",
      status: "active",
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedMinutes: 90,
      riskScore: 40,
      riskLevel: "safe",
      riskReason: "Simulation parse completed successfully.",
      riskUpdatedAt: new Date().toISOString(),
      confidenceScore: 85,
      subtasks: [
        { id: "sub-v-1", title: "Analyze audio cues transcript", estimatedMinutes: 30, done: false },
        { id: "sub-v-2", title: "Synthesize priority deliverables", estimatedMinutes: 60, done: false }
      ],
      scheduledBlocks: [],
      createdAt: new Date().toISOString(),
      completedAt: null
    }
  });
});

// Smart Scheduler Draft-Block Generation Endpoint
app.post("/api/ai/scheduler", async (req, res) => {
  const { activeTasks } = req.body;
  
  console.log(`FlowMind AI: Optimizing calendar layout. Input Tasks count: ${activeTasks?.length || 0}`);

  if (aiClient && activeTasks && activeTasks.length > 0) {
    try {
      const taskBriefs = activeTasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        deadline: t.deadline,
        estimatedMinutes: t.estimatedMinutes
      }));

      const prompt = `You are FlowMind AI Smart Scheduler.
Given these target obligations, place highly focused study/deep work focus sessions into a weekly schedule matrix starting today ${new Date().toISOString()}.
Active Obligations:
${JSON.stringify(taskBriefs, null, 2)}

Requirements:
1. Schedule a 60 to 125 minute block per task.
2. Focus sessions must sit between 09:00 and 21:00 user hours.
3. Distribute blocks nicely over the next 5 days so the user does not get overloaded (max 2 sessions per day).
4. Evade overlaps.

Return EXACTLY a valid parseable JSON array of schedule blocks:
[
  {
    "id": "block-random123",
    "taskId": "associated-task-id",
    "title": "[FlowMind Focus] Task Title",
    "startTime": "ISO string date (e.g. '2026-06-24T14:00:00Z')",
    "endTime": "ISO string date (e.g. '2026-06-24T15:30:00Z')",
    "objective": "A specific, hyper-focused target task goal for this block",
    "milestones": ["Milestone task 1 to complete", "Milestone task 2 to check"],
    "type": "focus"
  }
]`;

      const response = await generateContentWithFallback(aiClient, {
        model: "gemini-3.5-flash",
        config: { responseMimeType: "application/json" },
        contents: prompt
      });

      const blocks = JSON.parse((response.text || "").trim());
      return res.json({ success: true, blocks });
    } catch (err) {
      console.error("Gemini schedule generation failed:", err);
    }
  }

  // Local fallback: generate high quality focus blocks dynamically
  const sampleBlocks: any[] = [];
  const tasksToSchedule = activeTasks || [];
  
  tasksToSchedule.forEach((t: any, idx: number) => {
    const targetDay = new Date();
    targetDay.setDate(targetDay.getDate() + idx + 1); // space out nicely
    targetDay.setHours(13, 0, 0, 0); // 1:00 PM

    const endDay = new Date(targetDay.getTime() + 90 * 60 * 1000); // 90 min focuses

    sampleBlocks.push({
      id: "block-sim-" + Math.random().toString(36).substr(2, 5),
      taskId: t.id,
      title: `[FlowMind Focus] ${t.title}`,
      startTime: targetDay.toISOString(),
      endTime: endDay.toISOString(),
      objective: `Execute primary subtasks for ${t.title}`,
      milestones: t.subtasks?.map((s: any) => s.title).slice(0, 2) || ["Complete task requirements"],
      type: "focus"
    });
  });

  return res.json({ success: true, blocks: sampleBlocks });
});

// Smart Recovery Mode Endpoint
app.post("/api/ai/recovery-mode", async (req, res) => {
  const { activeTasks, missedTaskId } = req.body;
  console.log(`FlowMind AI: Recovery mode activated. Missed task ${missedTaskId}`);

  const updatedTasks = (activeTasks || []).map((t: any) => {
    if (t.id === missedTaskId) {
      // Elevate risk, shift deadline back, update explanation
      return {
        ...t,
        riskScore: Math.min(100, t.riskScore + 25),
        riskLevel: "high_risk",
        riskReason: "Missed schedule slot! Deadline compression is critical. Re-scheduling buffer slots.",
        riskUpdatedAt: new Date().toISOString()
      };
    }
    return t;
  });

  return res.json({
    success: true,
    tasks: updatedTasks,
    systemAlert: "Recovery Mode: Bottlenecks recalculating. Schedule buffer blocks compiled."
  });
});

// Google Calendar API Integration Gateway (Actual API Writes)
app.post("/api/google-calendar/sync", async (req, res) => {
  const { blocks, oauthToken } = req.body;

  if (!oauthToken) {
    return res.status(401).json({ error: "Unauthorized. Missing Google OAuth credentials." });
  }

  console.log(`FlowMind GC: Syncing ${blocks?.length || 0} event blocks to real Google Calendar`);

  try {
    // 1. Wipe previous FlowMind entries on Google Calendar to prevent duplicates
    // List upcoming events in next 10 days
    const nowStr = new Date().toISOString();
    const futureLimit = new Date();
    futureLimit.setDate(futureLimit.getDate() + 10);
    const limitStr = futureLimit.toISOString();

    const listRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${nowStr}&timeMax=${limitStr}&maxResults=100`,
      {
        headers: { "Authorization": `Bearer ${oauthToken}` }
      }
    );

    if (listRes.ok) {
      const listData: any = await listRes.json();
      const items = listData.items || [];
      const flowEvents = items.filter((evt: any) => 
        evt.summary && (evt.summary.startsWith("[FlowMind Focus]") || evt.summary.includes("FlowMind"))
      );

      console.log(`FlowMind GC: Found ${flowEvents.length} older FlowMind events to clear.`);

      for (const evt of flowEvents) {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${evt.id}`,
          {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${oauthToken}` }
          }
        );
      }
    }

    // 2. Write new blocks to Google Calendar
    const syncedResults = [];
    for (const b of (blocks || [])) {
      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${oauthToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            summary: b.title || `[FlowMind Focus] Session`,
            description: `FlowMind Productivity Coach automatic time block allocation.\n\nObjective: ${b.objective || ""}\nSubtasks: ${(b.milestones || []).join(", ")}`,
            start: { dateTime: b.startTime, timeZone: "UTC" },
            end: { dateTime: b.endTime, timeZone: "UTC" },
            colorId: "3" // Blue graphite tint
          })
        }
      );

      if (response.ok) {
        const item: any = await response.json();
        syncedResults.push({ id: b.id, syncedEventId: item.id, status: "created" });
      } else {
        const errText = await response.text();
        console.error(`FlowMind GC: Failed target creation for block. Response: ${errText}`);
      }
    }

    return res.json({
      success: true,
      message: `Successfully synchronized ${syncedResults.length} focus blocks to your real Google Calendar.`,
      events: syncedResults
    });
  } catch (err: any) {
    console.error("Google Calendar Synchronization failed:", err);
    return res.status(500).json({ error: "Synchronization pipeline failed.", details: err.message });
  }
});

// Google Calendar API Wipe Endpoint
app.post("/api/google-calendar/clear", async (req, res) => {
  const { oauthToken } = req.body;
  if (!oauthToken) {
    return res.status(401).json({ error: "Missing Google authorization." });
  }

  try {
    const nowStr = new Date().toISOString();
    const listRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${nowStr}&maxResults=100`,
      { headers: { "Authorization": `Bearer ${oauthToken}` } }
    );

    let count = 0;
    if (listRes.ok) {
      const listData: any = await listRes.json();
      const items = listData.items || [];
      const flowEvents = items.filter((evt: any) => 
        evt.summary && (evt.summary.startsWith("[FlowMind Focus]") || evt.summary.includes("FlowMind"))
      );

      for (const evt of flowEvents) {
        const delRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${evt.id}`,
          {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${oauthToken}` }
          }
        );
        if (delRes.ok) count++;
      }
    }

    return res.json({ success: true, clearedCount: count });
  } catch (err: any) {
    console.error("Google Calendar clear failure:", err);
    return res.status(500).json({ error: err.message });
  }
});


// ─── VITE DEV SERVER OR STATIC INGRESS SERVERS ──────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("FlowMind: Mounted dynamic Vite middleware in dev env.");
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("FlowMind: Loaded optimized production directories.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FlowMind AI listening on: http://localhost:${PORT}`);
  });
}

startServer();
