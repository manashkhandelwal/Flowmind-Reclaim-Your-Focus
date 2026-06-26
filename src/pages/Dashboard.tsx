import BriefingCard from "../components/dashboard/BriefingCard";
import RiskHeatmap from "../components/dashboard/RiskHeatmap";
import { useNavigate } from "react-router-dom";
import { Mail, Mic, MicOff, ChevronRight } from "lucide-react";
import React from "react";
import { useState, useCallback, useEffect } from "react";
import { Task, AppBriefing } from "../types";

interface DashboardProps {
  briefing: AppBriefing | null;
  tasks: Task[];
  user: any | null;
  onOrchestrate: (trigger: "initial_sync" | "gmail_scan" | "daily_briefing", unstructuredFeed?: string) => Promise<void>;
  orchestrating: boolean;
  setSelectedTaskId: (id: string) => void;
  setActiveTaskIdForTimer: (id: string) => void;
  audioListening: boolean;
  onToggleVoiceInput: () => void;
  voiceTranscript: string; // ← NEW: pre-fill value from mic
  onVoiceTranscriptConsumed: () => void; // ← NEW: clears it in App after submit
}

export default function Dashboard({
  briefing,
  tasks,
  user,
  onOrchestrate,
  orchestrating,
  setSelectedTaskId,
  setActiveTaskIdForTimer,
  audioListening,
  onToggleVoiceInput,
  voiceTranscript,
  onVoiceTranscriptConsumed,
}: DashboardProps) {
  const navigate = useNavigate();
  const [unstructuredFeed, setUnstructuredFeed] = useState(
    "Subject: Urgent Registry Project deliverables shift\nHi Group, we have to finalize connection pooling limits for DBMS and draft the Spanner migration reports by this Friday at 18:00 UTC.",
  );

  // ── NEW: when voice transcript arrives, pre-fill the textarea and open the deck
  useEffect(() => {
    if (!voiceTranscript) return;
    setUnstructuredFeed(voiceTranscript);
  }, [voiceTranscript]);

  // ── Pipeline trigger ──────────────────────────────────────────────────────
  const triggerPipeline = useCallback(
    (trigger: "initial_sync" | "gmail_scan" | "daily_briefing") => {
      onOrchestrate(trigger, unstructuredFeed);
    },
    [onOrchestrate, unstructuredFeed],
  );

  return (
    <>
      {/* Ingestion Agent Test Panel */}
      <div className="border border-[#1E2330] rounded-xl bg-[#111318] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#4F8EF7]/10 text-[#4F8EF7] border border-[#4F8EF7]/20">
            <Mail size={16} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white tracking-tight">
              Test Ingestion Agent Parser
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Input raw emails or Slack text to watch FlowMind extract
              obligations.
            </p>
          </div>
        </div>

        {/* Voice input toggle */}
        <button
          onClick={onToggleVoiceInput}
          className={`flex items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
            audioListening
              ? "bg-[#F04438]/20 border-[#F04438] text-[#F04438] animate-pulse"
              : "bg-[#181C27] hover:bg-[#1E2330] border-[#1E2330] text-slate-300"
          }`}
          title={
            audioListening
              ? "Listening… Speak task context"
              : "Voice Input Task"
          }
          id="trigger-voice-dictation-btn"
        >
          {audioListening ? <MicOff size={15} /> : <Mic size={15} />}
        </button>
      </div>

      <div className="border border-[#1E2330] rounded-xl bg-[#111318] p-5 space-y-4 animate-fadeIn">
        <span className="font-mono text-[9px] text-[#4F8EF7] font-bold uppercase tracking-widest block">
          Unstructured Context Simulator
        </span>

        <textarea
          value={unstructuredFeed}
          onChange={(e) => setUnstructuredFeed(e.target.value)}
          rows={3}
          placeholder="Paste raw email, Slack thread, or any unstructured text..."
          className="w-full bg-[#0A0B0F] text-xs text-slate-200 border border-[#1E2330] rounded-lg p-2.5 focus:outline-none focus:border-[#4F8EF7] resize-none h-24 font-mono"
        />

        <div className="flex items-center justify-between gap-4">
          <span className="text-[10px] text-slate-500 font-mono">
            Simulates Google Workspace background sync.
          </span>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setUnstructuredFeed(
                  "Subject: Algorithm homework deadline\nHi team, NP-completeness homework 4 solutions are due this Sunday at midnight. Estimated 2.5 hours total.",
                )
              }
              className="text-[10px] font-mono font-semibold text-slate-400 hover:text-white px-2.5 py-1 bg-[#181C27] rounded border border-[#1E2330]"
              type="button"
            >
              Load Sample
            </button>
            <button
              onClick={() => {
                onVoiceTranscriptConsumed();
                triggerPipeline("gmail_scan");
              }}
              disabled={orchestrating}
              className="bg-[#34C77B] hover:bg-[#34C77B]/90 text-[#0A0B0F] text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-1 disabled:opacity-50"
            >
              Extract & Orchestrate
            </button>
          </div>
        </div>
      </div>

      <RiskHeatmap
        tasks={tasks}
        onSelectTask={(id: string) => {
          setSelectedTaskId(id);
          navigate("/tasks");
        }}
        onOrchestrate={onOrchestrate}
        orchestrating={orchestrating}
      />
      <BriefingCard
        briefing={briefing}
        onSelectTask={(id: string) => {
          setSelectedTaskId(id);
          navigate("/tasks");
        }}
        onLaunchTimer={(id: string, objective: string) => {
          setActiveTaskIdForTimer(id);
          navigate("/focus");
        }}
      />
    </>
  );
}
