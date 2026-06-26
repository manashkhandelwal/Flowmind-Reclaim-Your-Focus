import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  BrainCircuit,
  Sparkles,
  CheckSquare,
  Trash2,
  Calendar,
  ShieldCheck,
  HelpCircle,
  Activity,
  Play,
  ListCollapse,
  MessageSquareDot,
  Mail,
  CheckCircle2,
  ChevronRight,
  LayoutDashboard,
  Flame,
  FileText,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  Task,
  Goal,
  AgentRunLog,
  Message,
  AppBriefing,
  FocusSession,
  ScheduleBlock,
} from "./types";
import { computeBaseRisk } from "./utils/risk-engine";

// Sub-components
import Header from "./components/layout/Header";
import LandingPage from "./components/layout/LandingPage";
import Sidebar from "./components/layout/Sidebar";
import ChatInterface from "./components/assistant/ChatInterface";

// Layouts and Routes
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./routes/ProtectedRoute";

// Pages
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Scheduler from "./pages/Scheduler";
import Focus from "./pages/Focus";
import Briefing from "./pages/Briefing";

// Firebase integrations
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "./lib/firebase";
import { GoogleAuthProvider } from "firebase/auth";
import {
  saveUserToFirestore,
  fetchTasksFromFirestore,
  saveTaskToFirestore,
  deleteTaskFromFirestore,
  fetchGoalsFromFirestore,
  saveGoalToFirestore,
  fetchMessagesFromFirestore,
  saveMessageToFirestore,
  clearConversationsInFirestore,
} from "./utils/firestore-sync";

export default function App() {
  // Key state variables
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<AgentRunLog[]>([]);
  const [briefing, setBriefing] = useState<AppBriefing | null>(null);
  const [apiStatus, setApiStatus] = useState<{
    active: boolean;
    simulation: boolean;
    keyConfigured: boolean;
  } | null>(null);

  // User Authenticated states
  const [user, setUser] = useState<any | null>(null);
  const [googleToken, setGoogleToken] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Speech and Voice recognition
  const [audioListening, setAudioListening] = useState<boolean>(false);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);

  // Workstation schedule drafting and alerts
  const [schedulerDraft, setSchedulerDraft] = useState<any[] | null>(null);
  const [draftAlert, setDraftAlert] = useState<string | null>(null);

  // App layouts navigation
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [activeTaskIdForTimer, setActiveTaskIdForTimer] = useState<string>("");

  // Loading animation triggers
  const [orchestrating, setOrchestrating] = useState(false);
  const [orchestrationStep, setOrchestrationStep] = useState<string>("");
  const [selectedOrchestratedLogs, setSelectedOrchestratedLogs] = useState<
    string[]
  >([]);

  // Custom Raw email/context popover trigger
  const [showDirectFeedPopover, setShowDirectFeedPopover] = useState(false);
  const [unstructuredTextFeed, setUnstructuredTextFeed] = useState(
    "Subject: Urgent Registry Project deliverables shift\nHi Group, we have to finalize connection pooling limits for DBMS and draft the Spanner migration reports by this Friday at 18:00 UTC. Ensure performance benchmarks are logged.",
  );

  // Setup Firebase and OAuth status listeners on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("google_oauth_token");
    if (savedToken) {
      setGoogleToken(savedToken);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthLoading(true);
      if (currentUser) {
        setUser(currentUser);
        // Sync details to Firestore doc
        await saveUserToFirestore(currentUser.uid, {
          email: currentUser.email || "",
          displayName: currentUser.displayName || "",
          photoURL: currentUser.photoURL || "",
        });
        await handleLoadUserFirestoreData(currentUser.uid);
      } else {
        setUser(null);
        await fetchWorkspaceData();
      }
      setAuthLoading(false);
    });

    // Voice recognition hook setup
    if (typeof window !== "undefined") {
      const SpeechClass =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechClass) {
        const rec = new SpeechClass();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";

        rec.onstart = () => {
          setAudioListening(true);
        };

        rec.onresult = async (event: any) => {
          const text = event.results[0][0].transcript;
          setAudioListening(false);
          await handleApplyVoiceTranscript(text);
        };

        rec.onerror = (err: any) => {
          console.error("Speech recognition error:", err);
          setAudioListening(false);
        };

        rec.onend = () => {
          setAudioListening(false);
        };
        setSpeechRecognition(rec);
      }
    }

    return () => unsubscribe();
  }, []);

  const handleLoadUserFirestoreData = async (uid: string) => {
    try {
      const liveTasks = await fetchTasksFromFirestore(uid);
      const liveGoals = await fetchGoalsFromFirestore(uid);
      const liveMessages = await fetchMessagesFromFirestore(uid);

      if (liveTasks.length > 0) setTasks(liveTasks);
      if (liveGoals.length > 0) setGoals(liveGoals);
      if (liveMessages.length > 0) setMessages(liveMessages);

      const briefRes = await fetch("/api/briefing");
      const briefData = await briefRes.json();
      setBriefing(briefData);

      const apiRes = await fetch("/api/ai-status");
      const apiData = await apiRes.json();
      setApiStatus(apiData);

      const logRes = await fetch("/api/logs");
      const logData = await logRes.json();
      setLogs(logData);

      if (liveTasks.length > 0) {
        setSelectedTaskId(liveTasks[0].id);
        setActiveTaskIdForTimer(liveTasks[0].id);
      }
    } catch (err) {
      console.error("Error pulling Firestore user workspace:", err);
    }
  };

  const fetchWorkspaceData = async () => {
    try {
      const [tskRes, goalRes, msgRes, briefRes, apiRes, logRes] =
        await Promise.all([
          fetch("/api/tasks"),
          fetch("/api/goals"),
          fetch("/api/messages"),
          fetch("/api/briefing"),
          fetch("/api/ai-status"),
          fetch("/api/logs"),
        ]);

      const tskData = await tskRes.json();
      const goalData = await goalRes.json();
      const msgData = await msgRes.json();
      const briefData = await briefRes.json();
      const apiData = await apiRes.json();
      const logData = await logRes.json();

      setTasks(tskData);
      setGoals(goalData);
      setMessages(msgData);
      setBriefing(briefData);
      setApiStatus(apiData);
      setLogs(logData);

      // Default active select task references
      if (tskData && tskData.length > 0) {
        setSelectedTaskId(tskData[0].id);
        setActiveTaskIdForTimer(tskData[0].id);
      }
    } catch (err) {
      console.error("Failed to process local app server fetch calls:", err);
    }
  };

  // Google OAuth Auth Actions
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        setGoogleToken(token);
        localStorage.setItem("google_oauth_token", token);
      }
    } catch (err: any) {
      console.error(
        "Google Auth popup failed, rendering Sim Bypass popup:",
        err,
      );
      handleDemoSignIn();
    }
  };

  const handleDemoSignIn = async () => {
    const demoProfile = {
      uid: "demouser-peak-99",
      email: "manashkhandelwal171@gmail.com",
      displayName: "Demo Executive Supervisor",
      photoURL:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    };
    setUser(demoProfile);
    setGoogleToken("demo_token_active_bypass");
    localStorage.setItem("google_oauth_token", "demo_token_active_bypass");
    await handleLoadUserFirestoreData("demouser-peak-99");
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    setGoogleToken("");
    localStorage.removeItem("google_oauth_token");
    setSchedulerDraft(null);
    setDraftAlert(null);
    await fetchWorkspaceData();
  };

  // Toggle Voice activation microphone
  const handleToggleVoiceInput = () => {
    if (!speechRecognition) {
      const mockResult = prompt(
        "Voice Input Simulation Sandbox: Type verbal task request (e.g. 'schedule urgent DBMS performance audit pool limits Spanner Friday at 5pm')",
        "schedule urgent DBMS performance audit pool limits Spanner by Friday at 6pm",
      );
      if (mockResult) {
        handleApplyVoiceTranscript(mockResult);
      }
      return;
    }
    if (audioListening) {
      speechRecognition.stop();
    } else {
      try {
        speechRecognition.start();
      } catch (err) {
        speechRecognition.stop();
      }
    }
  };

  const handleApplyVoiceTranscript = async (transcript: string) => {
    setOrchestrating(true);
    setOrchestrationStep(
      "Awaiting Voice-Parse Natural Language semantic parsing...",
    );
    try {
      const res = await fetch("/api/ai/voice-input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        const parsedTask = data.task;
        if (user) {
          parsedTask.userId = user.uid;
          await saveTaskToFirestore(user.uid, parsedTask);
          await handleLoadUserFirestoreData(user.uid);
        } else {
          setTasks((prev) => [parsedTask, ...prev]);
        }
        setSelectedTaskId(parsedTask.id);
        setCurrentView("tasks");

        // Dynamic Coach Speech bubble
        const coachNotice: Message = {
          id: "m-speech-" + Math.random().toString(36).substr(2, 6),
          sender: "coach",
          text: `🎙️ **FlowMind parsed your vocal command!** Created Task: **"${parsedTask.title}"**.\n\n* **Estimated Time:** ${parsedTask.estimatedMinutes} minutes.\n* **Decomposed Milestones:** Generated ${parsedTask.subtasks.length} structural milestones.\n* **Target Deadline:** ${new Date(parsedTask.deadline).toLocaleDateString()}.\n\nGo to Scheduler tab and run **Auto-Schedule Focus Blocks** to sync slots with your calendar!`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, coachNotice]);
        if (user) await saveMessageToFirestore(user.uid, coachNotice);
      }
    } catch (err) {
      console.error("Error running voice parsing tool:", err);
    } finally {
      setOrchestrating(false);
      setOrchestrationStep("");
    }
  };

  // Compile AI Focus schedule draft preview
  const handleGenerateScheduleDraft = async () => {
    setOrchestrating(true);
    setOrchestrationStep(
      "AI Schedulers optimizing Pomodoro cycles & constraint buffers...",
    );
    try {
      const activeList = tasks.filter((t) => t.status !== "completed");
      const res = await fetch("/api/ai/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeTasks: activeList }),
      });
      const data = await res.json();
      if (data.success) {
        setSchedulerDraft(data.blocks || []);
        setDraftAlert(
          "📅 FlowMind proposed focus slots. Click Apprehend & Integrate below to secure them!",
        );
      }
    } catch (err) {
      console.error("Failed to generate schedule blocks:", err);
    } finally {
      setOrchestrating(false);
      setOrchestrationStep("");
    }
  };

  // Accept schedule draft and write real Google Calendar Events
  const handleApproveScheduleDraft = async () => {
    if (!schedulerDraft || schedulerDraft.length === 0) return;

    setOrchestrating(true);
    setOrchestrationStep(
      "Publishing focus sessions to your real Google Calendar...",
    );
    try {
      const activeToken =
        googleToken ||
        localStorage.getItem("google_oauth_token") ||
        "demo_token_active_bypass";

      // 1. Sync calendar events on Google
      const calRes = await fetch("/api/google-calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: schedulerDraft,
          oauthToken: activeToken,
        }),
      });
      const calData = await calRes.json();
      console.log("Calendar sync output:", calData);

      // 2. Put blocks inside local task metadata
      const updatedTasksList = [...tasks];
      for (const block of schedulerDraft) {
        const associatedIdx = updatedTasksList.findIndex(
          (t) => t.id === block.taskId,
        );
        if (associatedIdx !== -1) {
          const currentBlocks =
            updatedTasksList[associatedIdx].scheduledBlocks || [];
          if (!currentBlocks.some((b) => b.startTime === block.startTime)) {
            const updatedBlocks = [
              ...currentBlocks,
              {
                id: block.id,
                title: block.title,
                startTime: block.startTime,
                endTime: block.endTime,
                objective: block.objective,
                milestones: block.milestones || [],
                type: "focus",
              },
            ];
            updatedTasksList[associatedIdx].scheduledBlocks = updatedBlocks;
            if (user) {
              await saveTaskToFirestore(
                user.uid,
                updatedTasksList[associatedIdx],
              );
            }
          }
        }
      }

      if (user) {
        await handleLoadUserFirestoreData(user.uid);
      } else {
        setTasks(updatedTasksList);
      }

      setSchedulerDraft(null);
      setDraftAlert(
        "✓ Focus schedule approved, synchronized, and locked into Google Calendar!",
      );
    } catch (err) {
      console.error("Failed to commit schedule draft:", err);
    } finally {
      setOrchestrating(false);
      setOrchestrationStep("");
    }
  };

  // Smart Recovery Mode re-scheduling
  const handleTriggerRecoveryMode = async (missedTaskId: string) => {
    setOrchestrating(true);
    setOrchestrationStep(
      "AI Recovery routing new focus slots & inflating warning indicators...",
    );
    try {
      const res = await fetch("/api/ai/recovery-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeTasks: tasks, missedTaskId }),
      });
      const data = await res.json();
      if (data.success) {
        if (user) {
          for (const updatedTask of data.tasks) {
            await saveTaskToFirestore(user.uid, updatedTask);
          }
          await handleLoadUserFirestoreData(user.uid);
        } else {
          setTasks(data.tasks);
        }

        // Auto compile a fresh draft Schedule to shift around components!
        await handleGenerateScheduleDraft();
        setDraftAlert(
          "⚠️ Bottleneck Adjusted! Missed deliverables detected. Review new focus slots draft below.",
        );
      }
    } catch (err) {
      console.error("Recovery Mode script check failed:", err);
    } finally {
      setOrchestrating(false);
      setOrchestrationStep("");
    }
  };

  const handleOrchestratePipeline = async (
    triggerType: "initial_sync" | "gmail_scan" | "daily_briefing",
  ) => {
    setOrchestrating(true);
    setSelectedOrchestratedLogs([]);

    // Simulate interactive multi-agent timing stages
    setOrchestrationStep(
      "Active: Orchestrator grouping multi-agent context binds...",
    );
    await new Promise((resolve) => setTimeout(resolve, 800));

    setOrchestrationStep(
      "O_Orchestrator invoking I_Ingestion Agent: Extracting structured obligations...",
    );
    await new Promise((resolve) => setTimeout(resolve, 900));

    setOrchestrationStep(
      "I_Ingestion analysis complete. Spawning R_Risk Agent: Multi-pass deadline buffer matrix evaluations...",
    );
    await new Promise((resolve) => setTimeout(resolve, 800));

    setOrchestrationStep(
      "R_Risk calculations applied. Invoking S_Scheduler Agent: Allocating calendar focus blocks...",
    );
    await new Promise((resolve) => setTimeout(resolve, 900));

    setOrchestrationStep(
      "S_Scheduler locked calendar blocks. Invoking C_Coach: Re-evaluating dynamic executive briefing content...",
    );
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const reqBody: any = { triggerType };
      if (triggerType === "gmail_scan" && unstructuredTextFeed) {
        reqBody.unstructuredFeed = unstructuredTextFeed;
      }

      const res = await fetch("/api/agents/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedOrchestratedLogs(data.logs || []);

        // Refresh master states
        if (user) {
          await handleLoadUserFirestoreData(user.uid);
        } else {
          await fetchWorkspaceData();
        }
      }
    } catch (err) {
      console.error("Orchestrator agent pipeline failure:", err);
    } finally {
      setOrchestrating(false);
      setOrchestrationStep("");
    }
  };

  const handleSendCoachChat = async (query: string) => {
    // Append user query locally
    const userMsg: Message = {
      id: "user-" + Math.random().toString(36).substr(2, 6),
      sender: "user",
      text: query,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    if (user) await saveMessageToFirestore(user.uid, userMsg);

    // Fast-append User prompt on server in background
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: query, sender: "user" }),
    });

    try {
      const resp = await fetch("/api/agents/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, history: [] }),
      });

      const reply = await resp.json();
      setMessages((prev) => [...prev, reply]);
      if (user) await saveMessageToFirestore(user.uid, reply);

      // Refresh audit logs
      const logRes = await fetch("/api/logs");
      const logsData = await logRes.json();
      setLogs(logsData);
    } catch (err) {
      console.error("Coach message dispatch check failed:", err);
    }
  };

  const handleSaveTask = async (taskChanges: Partial<Task>) => {
    let finalTaskChanges = { ...taskChanges };

    // If it's a completely NEW manual task, automatically trigger AI Task Decomposition and Prioritizer!
    if (!taskChanges.id && taskChanges.title) {
      setOrchestrating(true);
      setOrchestrationStep(
        "AI Priority Engine: Decomposing subtasks and assessing urgency levels...",
      );
      try {
        const decompRes = await fetch("/api/ai/decompose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: taskChanges.title,
            description: taskChanges.description || "",
            deadline: taskChanges.deadline,
            estimatedMinutes: taskChanges.estimatedMinutes || 60,
          }),
        });
        const decomp = await decompRes.json();
        if (decomp.success) {
          finalTaskChanges.priority = decomp.priority;
          finalTaskChanges.riskReason = decomp.explanation;
          finalTaskChanges.subtasks = decomp.subtasks.map(
            (st: any, sIdx: number) => ({
              id: `sub-decomp-${sIdx}-${Math.random().toString(36).substr(2, 4)}`,
              title: st.title,
              estimatedMinutes: st.estimatedMinutes || 20,
              done: false,
            }),
          );
        }
      } catch (err) {
        console.error("AI Decomposition failed, using local defaults:", err);
      } finally {
        setOrchestrating(false);
        setOrchestrationStep("");
      }
    }

    try {
      if (user) {
        const activeItem: Task = {
          id:
            finalTaskChanges.id ||
            "task-" + Math.random().toString(36).substr(2, 9),
          title: finalTaskChanges.title || "Untitled Goal",
          description: finalTaskChanges.description || "",
          source: finalTaskChanges.source || "manual",
          sourceRefId: finalTaskChanges.sourceRefId || null,
          category: finalTaskChanges.category || "project",
          priority: finalTaskChanges.priority || "medium",
          status: finalTaskChanges.status || "active",
          deadline:
            finalTaskChanges.deadline ||
            new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedMinutes: Number(finalTaskChanges.estimatedMinutes) || 60,
          riskScore: finalTaskChanges.riskScore || 30,
          riskLevel: finalTaskChanges.riskLevel || "safe",
          riskReason: finalTaskChanges.riskReason || "Formulated manually.",
          riskUpdatedAt: new Date().toISOString(),
          confidenceScore: finalTaskChanges.confidenceScore || 90,
          subtasks: finalTaskChanges.subtasks || [],
          scheduledBlocks: finalTaskChanges.scheduledBlocks || [],
          createdAt: finalTaskChanges.createdAt || new Date().toISOString(),
          completedAt: finalTaskChanges.completedAt || null,
          userId: user.uid,
        };
        await saveTaskToFirestore(user.uid, activeItem);
        await handleLoadUserFirestoreData(user.uid);
      } else {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalTaskChanges),
        });
        await fetchWorkspaceData();
      }
    } catch (err) {
      console.error("Failed to save task obligation:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      if (user) {
        await deleteTaskFromFirestore(taskId);
        await handleLoadUserFirestoreData(user.uid);
      } else {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (data.success) {
          const remaining = tasks.filter((t) => t.id !== taskId);
          if (remaining.length > 0) {
            setSelectedTaskId(remaining[0].id);
          } else {
            setSelectedTaskId("");
          }
          await fetchWorkspaceData();
        }
      }
    } catch (err) {
      console.error("Failed to drop task reference:", err);
    }
  };

  const handleClearHistory = async () => {
    try {
      if (user) {
        await clearConversationsInFirestore(user.uid);
        setMessages([
          {
            id: "m-init",
            sender: "coach",
            text: "Your FlowMind workspace logs were refreshed successfully. Let's start prioritizing.",
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}), // clear request signal
        });
        const freshMsgs = await res.json();
        setMessages(freshMsgs);
      }
    } catch (err) {
      console.error("Failed to clear conversational logs:", err);
    }
  };

  const activeFocusTaskTitle = tasks.find(
    (t) => t.id === activeTaskIdForTimer,
  )?.title;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LandingPage onLogin={handleGoogleSignIn} />
            )
          }
        />
        <Route
          element={<ProtectedRoute user={user} authLoading={authLoading} />}
        >
          <Route
            element={
              <AppLayout
                apiStatus={apiStatus}
                orchestrating={orchestrating}
                onOrchestrate={handleOrchestratePipeline}
                activeFocusTaskTitle={activeFocusTaskTitle}
                currentView={currentView}
                user={user}
                onGoogleSignIn={handleGoogleSignIn}
                onDemoSignIn={handleDemoSignIn}
                onSignOut={handleSignOut}
                audioListening={audioListening}
                onToggleVoiceInput={handleToggleVoiceInput}
                onViewChange={setCurrentView}
                logsCount={logs.length}
                tasksCount={tasks.filter((t) => t.status === "active").length}
                focusedTaskActive={
                  currentView === "focus" && activeTaskIdForTimer !== ""
                }
                messages={messages}
                onSendCoachChat={handleSendCoachChat}
                onClearHistory={handleClearHistory}
              />
            }
          >
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  briefing={briefing}
                  tasks={tasks}
                  onOrchestrate={handleOrchestratePipeline}
                  orchestrating={orchestrating}
                  setSelectedTaskId={setSelectedTaskId}
                  setActiveTaskIdForTimer={setActiveTaskIdForTimer}
                />
              }
            />
            <Route
              path="/tasks"
              element={
                <Tasks
                  tasks={tasks}
                  onSaveTask={handleSaveTask}
                  onDeleteTask={handleDeleteTask}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={setSelectedTaskId}
                />
              }
            />
            <Route
              path="/calendar"
              element={
                <Scheduler
                  tasks={tasks}
                  orchestrating={orchestrating}
                  onOrchestrateSchedule={handleGenerateScheduleDraft}
                  draftAlert={draftAlert}
                  schedulerDraft={schedulerDraft}
                  handleApproveScheduleDraft={handleApproveScheduleDraft}
                  setSchedulerDraft={setSchedulerDraft}
                  setDraftAlert={setDraftAlert}
                  handleTriggerRecoveryMode={handleTriggerRecoveryMode}
                />
              }
            />
            <Route
              path="/focus"
              element={
                <Focus
                  tasks={tasks}
                  activeTaskIdForTimer={activeTaskIdForTimer}
                  setActiveTaskIdForTimer={setActiveTaskIdForTimer}
                  handleSubtaskToggleInTimer={handleSubtaskToggleInTimer}
                />
              }
            />
            <Route path="/briefing" element={<Briefing logs={logs} />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );

  // Quick state handler inside workspace App component to synchronize checklist tickdowns
  function handleSubtaskToggleInTimer(task: Task, subtaskId: string) {
    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, done: !st.done } : st,
    );
    handleSaveTask({ id: task.id, subtasks: updatedSubtasks });
  }
}
