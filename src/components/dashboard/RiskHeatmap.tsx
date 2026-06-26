import React from "react";
import { ShieldAlert, AlertTriangle, CheckCircle2, RefreshCw, Layers, Calendar, ChevronRight } from "lucide-react";
import { Task } from "../../types";

interface RiskHeatmapProps {
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
  onOrchestrate: (trigger: "gmail_scan") => void;
  orchestrating: boolean;
}

export default function RiskHeatmap({ tasks, onSelectTask, onOrchestrate, orchestrating }: RiskHeatmapProps) {
  const activeTasks = tasks.filter(t => t.status === "active");

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high_risk": return "text-[#F04438] bg-[#F04438]/10 border-[#F04438]/20";
      case "at_risk": return "text-[#F5A623] bg-[#F5A623]/10 border-[#F5A623]/20";
      default: return "text-[#34C77B] bg-[#34C77B]/10 border-[#34C77B]/20";
    }
  };

  const getUrgencyMetricLabel = (deadlineStr: string) => {
    const hoursLeft = (new Date(deadlineStr).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft < 0) return "Overdue";
    if (hoursLeft < 24) return `${Math.round(hoursLeft)} hrs left`;
    return `${Math.round(hoursLeft / 24)} days left`;
  };

  return (
    <div className="space-y-6" id="dashboard-heatmap-section">
      {/* Risk Grid & Visual heatmap representation */}
      <div className="border border-[#1E2330] rounded-xl bg-[#111318] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1E2330]/60 pb-3 mb-5">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldAlert size={15} className="text-[#F04438]" />
              Threat-Level Matrix Projections (AI-Scored)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Calculated based on estimated effort vs. real-time deadline buffers.</p>
          </div>
          
          <button
            onClick={() => onOrchestrate("gmail_scan")}
            disabled={orchestrating}
            className="flex items-center gap-1.5 bg-[#181C27] hover:bg-[#1E2330] text-slate-300 font-mono text-[10px] px-2.5 py-1.5 rounded-lg border border-[#1E2330]/90 transition-all font-semibold"
          >
            <RefreshCw size={11} className={orchestrating ? "animate-spin" : ""} />
            Re-Score Matrix
          </button>
        </div>

        {/* 2D Heatmap Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="heatmap-dimension-parent">
          {/* High risk cluster column */}
          <div className="border border-red-500/10 rounded-xl bg-red-500/[0.01] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#1E2330]/50">
              <span className="font-mono text-[10px] text-[#F04438] font-bold tracking-widest flex items-center gap-1.5">
                <ShieldAlert size={12} />
                CRITICAL ZONE (R_SCORE &gt; 70)
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-[#111318] px-1.5 rounded">
                {activeTasks.filter(t => t.riskLevel === "high_risk").length} tasks
              </span>
            </div>

            <div className="space-y-2 flex-grow overflow-y-auto max-h-[280px]">
              {activeTasks.filter(t => t.riskLevel === "high_risk").length === 0 ? (
                <div className="h-24 flex items-center justify-center border border-dashed border-[#1E2330] rounded-lg text-slate-500 text-xs font-mono">
                  No immediate threats.
                </div>
              ) : (
                activeTasks.filter(t => t.riskLevel === "high_risk").map(task => (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task.id)}
                    className="border border-[#1E2330] hover:border-[#F04438]/50 rounded-lg bg-[#0A0B0F] p-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-200 line-clamp-1 group-hover:text-[#4F8EF7]">{task.title}</span>
                      <span className="text-[9px] font-mono text-[#F04438] bg-[#F04438]/10 px-1.5 font-bold rounded shrink-0">
                        R_{task.riskScore}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{task.riskReason}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1E2330]/40 font-mono text-[9px] text-slate-500">
                      <span>{getUrgencyMetricLabel(task.deadline)}</span>
                      <span className="text-slate-400 font-semibold uppercase">{task.category}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* At risk cluster column */}
          <div className="border border-amber-500/10 rounded-xl bg-amber-500/[0.01] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#1E2330]/50">
              <span className="font-mono text-[10px] text-[#F5A623] font-bold tracking-widest flex items-center gap-1.5">
                <AlertTriangle size={12} />
                WARNING ZONE (R_SCORE 40-70)
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-[#111318] px-1.5 rounded">
                {activeTasks.filter(t => t.riskLevel === "at_risk").length} tasks
              </span>
            </div>

            <div className="space-y-2 flex-grow overflow-y-auto max-h-[280px]">
              {activeTasks.filter(t => t.riskLevel === "at_risk").length === 0 ? (
                <div className="h-24 flex items-center justify-center border border-dashed border-[#1E2330] rounded-lg text-slate-500 text-xs font-mono">
                  All items buffered.
                </div>
              ) : (
                activeTasks.filter(t => t.riskLevel === "at_risk").map(task => (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task.id)}
                    className="border border-[#1E2330] hover:border-[#F5A623]/50 rounded-lg bg-[#0A0B0F] p-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-200 line-clamp-1 group-hover:text-[#4F8EF7]">{task.title}</span>
                      <span className="text-[9px] font-mono text-[#F5A623] bg-[#F5A623]/10 px-1.5 font-bold rounded shrink-0">
                        R_{task.riskScore}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{task.riskReason}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1E2330]/40 font-mono text-[9px] text-slate-500">
                      <span>{getUrgencyMetricLabel(task.deadline)}</span>
                      <span className="text-slate-400 font-semibold uppercase">{task.category}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Safe cluster column */}
          <div className="border border-green-500/10 rounded-xl bg-green-500/[0.01] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#1E2330]/50">
              <span className="font-mono text-[10px] text-[#34C77B] font-bold tracking-widest flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                BUFFERED ZONE (R_SCORE &lt; 40)
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-[#111318] px-1.5 rounded">
                {activeTasks.filter(t => t.riskLevel === "safe").length} tasks
              </span>
            </div>

            <div className="space-y-2 flex-grow overflow-y-auto max-h-[280px]">
              {activeTasks.filter(t => t.riskLevel === "safe").length === 0 ? (
                <div className="h-24 flex items-center justify-center border border-dashed border-[#1E2330] rounded-lg text-slate-500 text-xs font-mono">
                  No shielded tasks.
                </div>
              ) : (
                activeTasks.filter(t => t.riskLevel === "safe").map(task => (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task.id)}
                    className="border border-[#1E2330] hover:border-[#34C77B]/50 rounded-lg bg-[#0A0B0F] p-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-200 line-clamp-1 group-hover:text-[#4F8EF7]">{task.title}</span>
                      <span className="text-[9px] font-mono text-[#34C77B] bg-[#34C77B]/10 px-1.5 font-bold rounded shrink-0">
                        R_{task.riskScore}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{task.riskReason}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1E2330]/40 font-mono text-[9px] text-slate-500">
                      <span>{getUrgencyMetricLabel(task.deadline)}</span>
                      <span className="text-slate-400 font-semibold uppercase">{task.category}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Recommendation Cards */}
      <div id="strategic-cards-deck">
        <span className="font-mono text-[10px] text-[#7C6AF7] font-bold uppercase tracking-widest block mb-3">
          Proactive Corrections Deck
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="border border-[#1E2330] rounded-xl bg-[#111318] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#4F8EF7] font-mono text-[10px] font-bold uppercase">
                <Layers size={13} />
                DEFERRAL ROUTING
              </div>
              <h4 className="text-xs font-bold text-white mt-1.5 tracking-tight">Postpone Algorithm Homework</h4>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Risk score is extremely low (R_22) with 5.8 days left. Freeing these 2 hours buffers tomorrow's critical group DBMS submission timeline.
              </p>
            </div>
            <button
              onClick={() => onSelectTask("task-alg")}
              className="mt-3 text-left font-mono text-[10px] font-bold text-[#4F8EF7] hover:underline flex items-center gap-1 shrink-0"
            >
              Re-schedule deadlines <ChevronRight size={10} />
            </button>
          </div>

          <div className="border border-[#1E2330] rounded-xl bg-[#111318] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#34C77B] font-mono text-[10px] font-bold uppercase">
                <Calendar size={13} />
                CALENDAR SHIELD
              </div>
              <h4 className="text-xs font-bold text-white mt-1.5 tracking-tight">Lock Production Overrun prep block</h4>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                This meeting is logged 12 hours from now with zero prep slots on your timeline. AI suggests allocating a 25-minute study window.
              </p>
            </div>
            <button
              onClick={() => onSelectTask("task-stage")}
              className="mt-3 text-left font-mono text-[10px] font-bold text-[#34C77B] hover:underline flex items-center gap-1 shrink-0"
            >
              Configure focus block <ChevronRight size={10} />
            </button>
          </div>

          <div className="border border-[#1E2330] rounded-xl bg-[#111318] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#7C6AF7] font-mono text-[10px] font-bold uppercase">
                <AlertTriangle size={13} />
                DECOMPOSITION
              </div>
              <h4 className="text-xs font-bold text-white mt-1.5 tracking-tight">Breakdown AWS Practitioner VPC rules</h4>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                The estimate is listed as 3 hours. Dividing into short, daily 45-minute drills reduces cognitive stress of double-load spikes.
              </p>
            </div>
            <button
              onClick={() => onSelectTask("task-aws")}
              className="mt-3 text-left font-mono text-[10px] font-bold text-[#7C6AF7] hover:underline flex items-center gap-1 shrink-0"
            >
              Deconstruct subtasks <ChevronRight size={10} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
