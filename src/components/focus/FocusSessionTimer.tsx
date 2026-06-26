import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Volume2, Music, CheckCircle2, Circle, Flame, Sparkles, BookOpen, Clock, AlertCircle } from "lucide-react";
import { Task, Subtask } from "../../types";

interface FocusSessionTimerProps {
  tasks: Task[];
  activeTaskId?: string;
  onSelectTaskId: (taskId: string) => void;
  onToggleSubtask: (task: Task, subtaskId: string) => void;
}

export default function FocusSessionTimer({ tasks, activeTaskId, onSelectTaskId, onToggleSubtask }: FocusSessionTimerProps) {
  const activeTask = tasks.find(t => t.id === activeTaskId);

  // Timer states
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [soundscape, setSoundscape] = useState<"none" | "rain" | "waves" | "noise">("none");
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Ref for timer
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Soundscape toggles
  const soundscapes = [
    { id: "none", label: "Mute Ambient", icon: Volume2 },
    { id: "rain", label: "Midnight Rain", icon: Music },
    { id: "waves", label: "Ocean Waves", icon: Music },
    { id: "noise", label: "Deep White Noise", icon: Music },
  ];

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (seconds === 0) {
          if (minutes === 0) {
            // Completed Pomodoro session
            setIsRunning(false);
            setSessionCompleted(true);
            if (intervalRef.current) clearInterval(intervalRef.current);
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, minutes, seconds]);

  const handleStartStop = () => {
    setIsRunning(!isRunning);
    setSessionCompleted(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setMinutes(25);
    setSeconds(0);
    setSessionCompleted(false);
  };

  const setTimerDuration = (m: number) => {
    setIsRunning(false);
    setMinutes(m);
    setSeconds(0);
    setSessionCompleted(false);
  };

  const getTimerProgressPercent = () => {
    const totalSecs = 25 * 60; // default baseline
    const currentSecs = (minutes * 60) + seconds;
    const progress = ((totalSecs - currentSecs) / totalSecs) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="focus-chamber-wrapper">
      {/* Immersive Countdown Orb & Controls (Left) */}
      <div className="lg:col-span-8 border border-[#1E2330] rounded-xl bg-[#111318] p-6 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Absolute ambient lights */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#7C6AF7]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full flex items-center justify-between border-b border-[#1E2330]/60 pb-3 mb-6 z-10">
          <span className="font-mono text-[9px] text-[#7C6AF7] font-bold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
            <Flame size={13} className="text-[#7C6AF7]" />
            FLOW_STATE ISOLATION CHAMBER
          </span>

          <div className="flex bg-[#0A0B0F] p-0.5 rounded-lg border border-[#1E2330] text-[10px]">
            <button onClick={() => setTimerDuration(5)} className="px-2 py-1 text-slate-400 hover:text-white font-mono rounded">5m</button>
            <button onClick={() => setTimerDuration(15)} className="px-2 py-1 text-slate-400 hover:text-white font-mono rounded">15m</button>
            <button onClick={() => setTimerDuration(25)} className="px-2 py-1 text-slate-400 hover:text-white font-mono rounded">25m</button>
            <button onClick={() => setTimerDuration(50)} className="px-3 py-1 text-slate-400 hover:text-white font-mono rounded">50m</button>
          </div>
        </div>

        {/* Task Obligation Selector selector dropdown */}
        <div className="w-full max-w-sm mb-6 z-10">
          <label className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block mb-2 text-center">
            Anchor Task Obligation
          </label>
          <select
            value={activeTaskId || ""}
            onChange={(e) => onSelectTaskId(e.target.value)}
            className="w-full bg-[#0A0B0F] border border-[#1E2330] hover:border-slate-700 text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none"
          >
            <option value="" disabled>-- Select Your Anchor Deliverable --</option>
            {tasks.filter(t => t.status !== "completed").map(t => (
              <option key={t.id} value={t.id}>
                [{t.priority.toUpperCase()}] {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* The countdown visual orb */}
        <div className="relative h-64 w-64 flex flex-col justify-center items-center rounded-full border border-[#1E2330]/80 bg-[#0A0B0F] shadow-inner mb-6 z-10">
          {isRunning && (
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#7C6AF7]/20 animate-spin" style={{ animationDuration: "12s" }}></div>
          )}

          <div className="text-5xl font-mono font-bold text-white tracking-widest pl-1">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>

          <div className="text-[10px] uppercase font-mono font-bold text-slate-500 tracking-widest mt-2">
            {isRunning ? "DEEP CONCENTRATION" : sessionCompleted ? "SESSION COMPLETED!" : "PAUSED"}
          </div>

          {/* Soundscape status badge indicator */}
          {soundscape !== "none" && (
            <div className="absolute bottom-6 flex items-center gap-1 bg-[#181C27] py-0.5 px-2 rounded-full border border-[#1E2330] text-[9px] font-mono text-slate-400">
              <Volume2 size={10} className="text-[#34C77B]" />
              <span>{soundscape} sound play</span>
            </div>
          )}
        </div>

        {/* Timer operations */}
        <div className="flex items-center gap-4 z-10">
          <button
            onClick={handleReset}
            className="p-3 rounded-full bg-[#181C27] hover:bg-[#1E2330] border border-[#1E2330] text-slate-400 hover:text-white transition-all shadow-md"
            title="Reset Countdown"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={handleStartStop}
            className={`p-4 px-8 rounded-full text-xs font-bold font-mono tracking-wider transition-all shadow-lg flex items-center gap-2 ${isRunning
                ? "bg-[#F04438] hover:bg-[#F04438]/90 text-white"
                : "bg-[#34C77B] hover:bg-[#34C77B]/95 text-[#0A0B0F]"
              }`}
          >
            {isRunning ? (
              <>
                <Pause size={14} className="fill-current" />
                PAUSE FOCUS
              </>
            ) : (
              <>
                <Play size={14} className="fill-current" />
                INITIATE ALIGNED CONCENTRATION
              </>
            )}
          </button>
        </div>



      </div>

      {/* Focus Sprints Milestones checks & AI Coaching instructions (Right) */}
      <div className="lg:col-span-4 space-y-6">
        {/* Selected target subtask bounds */}
        <div className="border border-[#1E2330] rounded-xl bg-[#111318] p-5">
          <span className="font-mono text-[9px] text-[#7C6AF7] font-bold uppercase tracking-widest block mb-4 border-b border-[#1E2330]/60 pb-2">
            Subtask Milestones
          </span>

          {!activeTask ? (
            <div className="text-center py-6 text-slate-500 font-mono text-xs">
              Configure an active anchor task on the left to track goals.
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="p-3 bg-[#0A0B0F] rounded-lg border border-[#1E2330] mb-4">
                <span className="text-[10px] text-[#4F8EF7] font-semibold font-mono block">Anchor Scope:</span>
                <span className="text-xs font-bold text-slate-200 block mt-1">{activeTask.title}</span>
              </div>

              {activeTask.subtasks.map(st => (
                <div
                  key={st.id}
                  onClick={() => onToggleSubtask(activeTask, st.id)}
                  className="flex items-center gap-2 bg-[#0A0B0F] p-3 rounded-lg border border-[#1E2330] hover:border-slate-700 cursor-pointer transition-all"
                >
                  <button className="text-slate-500 shrink-0">
                    {st.done ? (
                      <CheckCircle2 size={13} className="text-[#34C77B]" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-slate-500"></div>
                    )}
                  </button>
                  <span className={`text-xs truncate ${st.done ? "line-through text-slate-500" : "text-slate-200"}`}>
                    {st.title}
                  </span>
                </div>
              ))}

              {activeTask.subtasks.length === 0 && (
                <div className="p-4 bg-[#0A0B0F]/55 rounded border border-[#1E2330]/60 text-center text-slate-400 text-[11px] font-mono">
                  No core subtasks loaded. Standard pomodoro timer initialized.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Real-time coaching block */}
        <div className="border border-[#1E2330] rounded-xl bg-[#111318] p-5 space-y-4">
          <span className="font-mono text-[9px] text-[#34C77B] font-bold uppercase tracking-widest block border-b border-[#1E2335] pb-2">
            FlowMind Coach Advice
          </span>

          <div className="bg-[#0A0B0F] p-3 rounded-lg border border-l-2 border-l-[#34C77B] border-[#1E2330]">
            <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
              "When deep work begins, mute notifications. Take exactly 1 deeply aligned inhale before clicking Play. Focus solely on index formatting structures for the first 10 minutes. This creates neural momentum."
            </p>
          </div>

          <div className="flex gap-2">
            <span className="bg-[#181C27] text-slate-300 rounded p-1 px-1.5 font-mono text-[9px] border border-[#1E2330] flex items-center gap-1">
              <Clock size={10} />
              Interval: 25m
            </span>
            <span className="bg-[#181C27] text-[#34C77B] rounded p-1 px-1.5 font-mono text-[9px] border border-[#1E2330] flex items-center gap-1">
              <Sparkles size={10} />
              Goal: High Output
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
