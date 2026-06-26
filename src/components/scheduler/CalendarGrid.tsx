import React from "react";
import { Calendar, Clock, AlertTriangle, Play, Sparkles, RefreshCw, FileText, CheckCircle } from "lucide-react";
import { Task, ScheduleBlock } from "../../types";

interface CalendarGridProps {
  tasks: Task[];
  onOrchestrateSchedule: () => void;
  orchestrating: boolean;
}

export default function CalendarGrid({ tasks, onOrchestrateSchedule, orchestrating }: CalendarGridProps) {
  // Extract all scheduled blocks from active tasks
  const scheduledBlocks = tasks.reduce((acc: (ScheduleBlock & { taskTitle: string; taskCategory: string; taskPriority: string })[], t) => {
    if (t.scheduledBlocks && t.scheduledBlocks.length > 0) {
      t.scheduledBlocks.forEach(b => {
        acc.push({
          ...b,
          taskTitle: t.title,
          taskCategory: t.category,
          taskPriority: t.priority
        });
      });
    }
    return acc;
  }, []);

  // Sort by start time
  scheduledBlocks.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Generate simple next-7-days timeline grids
  const days = Array.from({ length: 5 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + idx);
    return d;
  });

  const getPriorityColorBorder = (p: string) => {
    switch (p) {
      case "critical": return "border-l-4 border-l-[#F04438] bg-[#F04438]/5";
      case "high": return "border-l-4 border-l-[#F5A623] bg-[#F5A623]/5";
      default: return "border-l-4 border-l-[#4F8EF7] bg-[#4F8EF7]/5";
    }
  };

  return (
    <div className="space-y-6" id="calendar-matrix-wrapper">
      <div className="border border-[#1E2330] rounded-xl bg-[#111318] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1E2330]/60 pb-4 mb-5">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Calendar size={15} className="text-[#4F8EF7]" />
              Secured Time Matrix Blocks (Google Sync)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Time-slots allocated to guarantee deliverables are completed ahead of deadlines.</p>
          </div>

          <button
            onClick={onOrchestrateSchedule}
            disabled={orchestrating}
            className="flex items-center gap-2 bg-[#4F8EF7] hover:bg-[#4F8EF7]/90 text-white font-mono text-[10px] px-3.5 py-2 rounded-lg border border-[#4F8EF7]/10 font-bold transition-all disabled:opacity-40"
          >
            <Sparkles size={12} className={orchestrating ? "animate-spin" : ""} />
            Auto-Schedule Focus Blocks
          </button>
        </div>

        {scheduledBlocks.length === 0 ? (
          <div className="border border-dashed border-[#1E2330] rounded-xl p-8 text-center" id="calendar-empty-state">
            <Calendar size={32} className="text-slate-600 mx-auto mb-2 animate-pulse" />
            <span className="font-mono text-xs text-slate-500 block">No focus slots scheduled in this viewport window.</span>
            <button
              onClick={onOrchestrateSchedule}
              className="mt-3 text-xs text-[#4F8EF7] font-semibold hover:underline bg-[#4F8EF7]/5 px-3 py-1.5 rounded border border-[#4F8EF7]/10"
            >
              Run Scheduler Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="calendar-schedule-grid">
            {/* Timeline sequence (Left columns of calendar module) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest pl-1 mb-2">Booked Sessions Timeline</div>
              
              <div className="space-y-2.5">
                {scheduledBlocks.map((block) => (
                  <div
                    key={block.id}
                    className={`border border-[#1E2330] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-4 transition-all bg-[#0A0B0F]/65 hover:border-slate-700 ${getPriorityColorBorder(block.taskPriority)}`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 rounded-lg bg-[#111318] border border-[#1E2330]/50 h-10 w-10 flex flex-col justify-center items-center shrink-0">
                        <Clock size={15} className="text-[#4F8EF7]" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate max-w-[280px]">{block.title}</span>
                          <span className="text-[8px] font-mono font-bold bg-[#181C27] text-slate-400 border border-[#1E2330] p-0.5 px-1.5 rounded uppercase shrink-0">
                            {block.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#4F8EF7] mt-0.5 truncate">{block.taskTitle}</p>
                        <p className="text-[10px] text-slate-400 font-sans mt-1">Goal: {block.objective}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400 shrink-0 bg-[#111318] border border-[#1E2330] px-2.5 py-1.5 rounded-lg">
                      <Clock size={11} className="text-slate-500" />
                      <span>
                        {new Date(block.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(block.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-slate-600">|</span>
                      <span className="text-[#34C77B] font-semibold">
                        {new Date(block.startTime).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Constraints & Settings sidebar (Right columns of calendar module) */}
            <div className="lg:col-span-4 border-l border-[#1E2330]/40 pl-0 lg:pl-6 space-y-4">
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest block">Scheduling Constrains</span>
              
              <div className="space-y-3 font-sans text-xs text-slate-350">
                <div className="bg-[#0A0B0F] rounded-lg p-3 border border-[#1E2330]">
                  <span className="block font-mono text-[9px] text-[#7C6AF7] font-bold uppercase">Daily Work Ratio</span>
                  <div className="flex items-center justify-between text-white font-mono mt-1 font-semibold">
                    <span>09:00 - 22:00</span>
                    <span className="text-[10px] text-slate-400">13 hrs max</span>
                  </div>
                </div>

                <div className="bg-[#0A0B0F] rounded-lg p-3 border border-[#1E2330]">
                  <span className="block font-mono text-[9px] text-[#34C77B] font-bold uppercase">Work-Slices Bounds</span>
                  <div className="flex items-center justify-between text-white font-mono mt-1 font-semibold">
                    <span>Max 2 Hrs Focus</span>
                    <span className="text-[10px] text-slate-400">Pomodoros rules</span>
                  </div>
                </div>

                <div className="bg-[#0A0B0F] rounded-lg p-3 border border-[#1E2330]">
                  <span className="block font-mono text-[9px] text-[#F5A623] font-bold uppercase">Break Buffer Slices</span>
                  <div className="flex items-center justify-between text-white font-mono mt-1 font-semibold">
                    <span>30 Minutes Bounds</span>
                    <span className="text-[10px] text-slate-400">Recovery padding</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1E2330]/40">
                  <div className="p-3.5 bg-gradient-to-br from-[#7C6AF7]/5 to-[#4F8EF7]/5 rounded-xl border border-[#7C6AF7]/10 space-y-2">
                    <span className="font-mono text-[9px] font-bold text-[#7C6AF7] uppercase block">AI Calibration Notes</span>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      "I inserted focus slots into your calendar for critical tasks (DBMS & production sync) while protecting your 30-minute breaks to optimize memory consolidation buffers."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
