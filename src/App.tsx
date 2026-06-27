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
import { useWorkspace } from "./hooks/useWorkspace";
import { useOrchestrator } from "./hooks/useOrchestrator";
import { useScheduler } from "./hooks/useScheduler";

export default function App() {
  // User Authenticated states
  const [user, setUser] = useState<any | null>(null);
  const [googleToken, setGoogleToken] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const workspace = useWorkspace();
  const orchestrator = useOrchestrator();
  const scheduler = useScheduler();

  // Load workspace whenever Firebase resolves auth (sign-in or page reload)
  useEffect(() => {
    workspace.loadWorkspace(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Speech and Voice recognition
  const [audioListening, setAudioListening] = useState<boolean>(false);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string>("");

  // App layouts navigation
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [activeTaskIdForTimer, setActiveTaskIdForTimer] = useState<string>("");

  // Custom Raw email/context popover trigger
  const [showDirectFeedPopover, setShowDirectFeedPopover] = useState(false);

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
        try {
          // Sync details to Firestore doc
          await saveUserToFirestore(currentUser.uid, {
            email: currentUser.email || "",
            displayName: currentUser.displayName || "",
            photoURL: currentUser.photoURL || "",
          });
        } catch (err) {
          console.error("Failed to save to Firestore:", err);
        }
      } else {
        setUser(null);
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

        rec.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setAudioListening(false);
          handleVoiceResult(text);
        };

        rec.onerror = (err: any) => {
          console.error("Speech recognition error:", err);
          setAudioListening(false);

          if (err.error === "not-allowed") {
            alert(
              "Microphone access blocked or secure context required.\n\n" +
              "To use speech input:\n" +
              "1. Grant microphone permission in your browser settings.\n" +
              "2. Ensure you are accessing the app over 'localhost' or a secure HTTPS connection.\n\n" +
              "Falling back to text simulation."
            );
          } else if (err.error === "network") {
            alert(
              "Speech recognition network error.\n\n" +
              "Google's speech recognition servers could not be reached. " +
              "This happens if you are offline, behind a strict firewall, or your browser's speech service is restricted.\n\n" +
              "Falling back to text simulation."
            );
          }

          // Trigger fallback prompt on any Speech Recognition error
          const mockResult = prompt(
            `Voice Input Fallback (Speech Error: ${err.error ?? "unknown"}): Type verbal task request:`,
            "schedule urgent DBMS performance audit pool limits Spanner by Friday at 6pm",
          );
          if (mockResult) {
            handleVoiceResult(mockResult);
          }
        };

        rec.onend = () => {
          setAudioListening(false);
        };
        setSpeechRecognition(rec);
      }
    }

    return () => unsubscribe();
  }, []);

  /* const handleLoadUserFirestoreData = async (uid: string) => {
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
*/
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
    }
  };

  const handleSignOut = async () => {
    try {
      // Clear logs first on backend to prevent re-fetching stale data during user sign-out render cycles
      await fetch("/api/logs/clear", { method: "POST" }).catch(console.error);
      workspace.setLogs([]);
      await signOut(auth);
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      setUser(null);
      setGoogleToken("");
      scheduler.setDraft({ blocks: null, alert: null });
      localStorage.removeItem("google_oauth_token");
    }
  };
  // ── REPLACE handleToggleVoiceInput + handleApplyVoiceTranscript with this ───

  const handleVoiceResult = (transcript: string) => {
    setVoiceTranscript(transcript); // Dashboard reads this and pre-fills its input
    setCurrentView("dashboard"); // snap the user to the right page if they aren't there
  };

  // Toggle Voice activation microphone
  const handleToggleVoiceInput = () => {
    if (!speechRecognition) {
      const mockResult = prompt(
        "Voice Input Simulation Sandbox: Type verbal task request (e.g. 'schedule urgent DBMS performance audit pool limits Spanner Friday at 5pm')",
        "schedule urgent DBMS performance audit pool limits Spanner by Friday at 6pm",
      );
      if (mockResult) {
        handleVoiceResult(mockResult);
      }
      return;
    }
    if (audioListening) {
      speechRecognition.stop();
    }
    // Attach one-shot result handler each time we start listening
    // so the transcript goes to handleVoiceResult, not anywhere else.
    speechRecognition.onresult = (event: any) => {
      const text: string = event.results[0][0].transcript;
      setAudioListening(false);
      handleVoiceResult(text);
    };

    try {
      speechRecognition.start();
    } catch {
      // Already started — stop and let onend reset audioListening
      speechRecognition.stop();
    }
  };

  const handleOrchestratePipeline = async (
    triggerType: "initial_sync" | "gmail_scan" | "daily_briefing",
    unstructuredFeed: string = "",
  ) => {
    await orchestrator.handleOrchestratePipeline(
      triggerType,
      unstructuredFeed,
      user,
      workspace.tasks,
      async () => {
        await workspace.loadWorkspace(user);
      }
    );
  };

  const handleSendCoachChat = async (query: string) => {
    await orchestrator.handleSendCoachChat(
      query,
      user,
      (msg) => workspace.setMessages((prev) => [...prev, msg]),
      async () => {
        await workspace.loadWorkspace(user);
      }
    );
  };

  function handleSubtaskToggleInTimer(task: Task, subtaskId: string) {
    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, done: !st.done } : st,
    );
    workspace.handleSaveTask({ id: task.id, subtasks: updatedSubtasks }, user);
  }

  const activeFocusTaskTitle = workspace.tasks.find(
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
                apiStatus={workspace.apiStatus}
                orchestrating={orchestrator.orchestration.running || scheduler.orchestrating}
                onOrchestrate={handleOrchestratePipeline}
                activeFocusTaskTitle={activeFocusTaskTitle}
                currentView={currentView}
                user={user}
                onGoogleSignIn={handleGoogleSignIn}
                onSignOut={handleSignOut}
                onViewChange={setCurrentView}
                logsCount={workspace.logs.length}
                tasksCount={workspace.tasks.filter((t) => t.status === "active").length}
                focusedTaskActive={
                  currentView === "focus" && activeTaskIdForTimer !== ""
                }
                messages={workspace.messages}
                onSendCoachChat={handleSendCoachChat}
                onClearHistory={() => workspace.handleClearHistory(user)}
              />
            }
          >
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  briefing={workspace.briefing}
                  tasks={workspace.tasks}
                  user={user}
                  onOrchestrate={handleOrchestratePipeline}
                  orchestrating={orchestrator.orchestration.running}
                  setSelectedTaskId={workspace.setSelectedTaskId}
                  setActiveTaskIdForTimer={setActiveTaskIdForTimer}
                  audioListening={audioListening}
                  onToggleVoiceInput={handleToggleVoiceInput}
                  voiceTranscript={voiceTranscript}
                  onVoiceTranscriptConsumed={() => setVoiceTranscript("")}
                />
              }
            />
            <Route
              path="/tasks"
              element={
                <Tasks
                  tasks={workspace.tasks}
                  onSaveTask={(changes) =>
                    workspace.handleSaveTask(changes, user)
                  }
                  onDeleteTask={(id) => workspace.handleDeleteTask(id, user)}
                  selectedTaskId={workspace.selectedTaskId}
                  onSelectTask={workspace.setSelectedTaskId}
                />
              }
            />
            <Route
              path="/scheduler"
              element={
                <Scheduler
                  tasks={workspace.tasks}
                  orchestrating={scheduler.orchestrating}
                  onOrchestrateSchedule={() => scheduler.handleGenerateScheduleDraft(workspace.tasks)}
                  draftAlert={scheduler.draft.alert}
                  schedulerDraft={scheduler.draft.blocks}
                  handleApproveScheduleDraft={() =>
                    scheduler.handleApproveScheduleDraft(
                      workspace.tasks,
                      googleToken,
                      user,
                      () => workspace.loadWorkspace(user)
                    )
                  }
                  setSchedulerDraft={(blocks: any) =>
                    scheduler.setDraft((prev) => ({ ...prev, blocks }))
                  }
                  setDraftAlert={(alert: any) =>
                    scheduler.setDraft((prev) => ({ ...prev, alert }))
                  }
                  handleTriggerRecoveryMode={(missedTaskId: string) =>
                    scheduler.handleTriggerRecoveryMode(
                      missedTaskId,
                      workspace.tasks,
                      user,
                      () => workspace.loadWorkspace(user)
                    )
                  }
                />
              }
            />
            <Route
              path="/focus"
              element={
                <Focus
                  tasks={workspace.tasks}
                  activeTaskIdForTimer={activeTaskIdForTimer}
                  setActiveTaskIdForTimer={setActiveTaskIdForTimer}
                  handleSubtaskToggleInTimer={handleSubtaskToggleInTimer}
                />
              }
            />
            <Route
              path="/briefing"
              element={<Briefing logs={workspace.logs} />}
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
