import React from "react";
import { Sparkles, ArrowRight, Compass, ShieldAlert, CheckCircle2, ChevronRight } from "lucide-react";
import { AppBriefing } from "../../types";

interface BriefingCardProps {
  briefing: AppBriefing | null;
  onSelectTask: (taskId: string) => void;
  onLaunchTimer: (taskId: string, objective: string) => void;
}

export default function BriefingCard({ briefing, onSelectTask, onLaunchTimer }: BriefingCardProps) {
  if (!briefing) return null;

  // Manual markdown layout parser for high-fidelity representation of Executive briefing text
  const formatBriefingText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      if (line.startsWith("###")) {
        return (
          <h4 key={idx} className="text-sm font-bold text-white mt-4 mb-2 tracking-tight flex items-center gap-2">
            <Sparkles size={14} className="text-[#4F8EF7]" />
            {line.replace("###", "").trim()}
          </h4>
        );
      }
      if (line.startsWith("-")) {
        return (
          <div key={idx} className="flex gap-2 text-slate-300 text-xs my-1 pl-1">
            <span className="text-[#4F8EF7] font-bold select-none">•</span>
            <span>{line.replace("-", "").trim()}</span>
          </div>
        );
      }
      return <p key={idx} className="text-slate-400 text-xs leading-relaxed my-1.5">{line}</p>;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-briefing-grid">
      {/* Daily Briefing core text */}
      <div className="lg:col-span-2 border border-[#1E2330] rounded-xl bg-[#111318] p-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#4F8EF7]/5 rounded-full blur-3xl pointer-events-none transition-all group-hover:bg-[#4F8EF7]/10"></div>
        
        <div className="flex items-center justify-between border-b border-[#1E2330]/60 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 rounded-md bg-[#4F8EF7]/10 text-[#4F8EF7] font-mono text-[10px] font-bold uppercase tracking-wider">
              FLOWMIND C_COACH AGENT
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Synced {new Date(briefing.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="space-y-1">
          {formatBriefingText(briefing.content)}
        </div>

        {briefing.topTask && (
          <div className="mt-5 pt-4 border-t border-[#1E2330]/50 flex flex-wrap items-center justify-between gap-3 bg-[#0A0B0F]/45 p-3 rounded-lg border border-[#1E2330]/30">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F04438]"></span>
              </span>
              <span className="text-xs text-slate-400 font-medium">Flagged Recommendation:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectTask(briefing.topTask)}
                className="text-xs font-semibold text-[#4F8EF7] hover:underline flex items-center gap-1"
              >
                Inspect Task
                <ChevronRight size={13} />
              </button>
              <button
                onClick={() => onLaunchTimer(briefing.topTask, "Prepare and lock down core deliverables")}
                className="bg-[#34C77B] hover:bg-[#34C77B]/90 text-[#0A0B0F] px-2.5 py-1 rounded-md text-[11px] font-bold transition-all"
              >
                Launch Focus Session
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metrics breakdown card */}
      <div className="border border-[#1E2330] rounded-xl bg-[#111318] p-5 flex flex-col justify-between" id="dashboard-stats-card">
        <div>
          <span className="font-mono text-[9px] text-slate-500 font-bold uppercase tracking-widest">
            Cognitive Risk Distribution
          </span>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="border border-[#1E2330]/85 rounded-lg bg-[#0A0B0F] p-3 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-medium font-sans">Critical Priority</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-[#F04438]">{briefing.riskSummary.criticalCount}</span>
                <span className="text-[10px] text-slate-500">active</span>
              </div>
            </div>

            <div className="border border-[#1E2330]/85 rounded-lg bg-[#0A0B0F] p-3 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-medium font-sans">High Risk Level</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-[#F5A623]">{briefing.riskSummary.highRiskCount}</span>
                <span className="text-[10px] text-slate-500">scoring</span>
              </div>
            </div>

            <div className="border border-[#1E2330]/85 rounded-lg bg-[#0A0B0F] p-3 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-medium font-sans font-sans">At Risk Sprints</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-[#7C6AF7]">{briefing.riskSummary.atRiskCount}</span>
                <span className="text-[10px] text-slate-500">threat</span>
              </div>
            </div>

            <div className="border border-[#1E2330]/85 rounded-lg bg-[#0A0B0F] p-3 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-medium font-sans font-sans">On Track Sprints</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-[#34C77B]">{briefing.riskSummary.safeCount}</span>
                <span className="text-[10px] text-slate-500">secure</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#1E2330]/50 mt-4">
          {(() => {
            const sum = briefing.riskSummary.criticalCount + briefing.riskSummary.highRiskCount + briefing.riskSummary.atRiskCount + briefing.riskSummary.safeCount;
            const healthScore = sum > 0 ? Math.round(((briefing.riskSummary.safeCount + briefing.riskSummary.atRiskCount * 0.5) / sum) * 100) : 100;
            const statusLabel = healthScore > 75 ? "STABLE" : healthScore > 45 ? "STRESSED" : "CRITICAL";
            const colorClass = healthScore > 75 ? "text-[#34C77B]" : healthScore > 45 ? "text-[#F5A623]" : "text-[#F04438]";
            return (
              <>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono">WORKSPACE HEALTH</span>
                  <span className={`font-mono font-bold ${colorClass}`}>{statusLabel} ({healthScore}%)</span>
                </div>
                <div className="h-1.5 w-full bg-[#181C27] rounded-full mt-2 overflow-hidden border border-[#1E2330]/60">
                  <div className="h-full bg-gradient-to-r from-[#F04438] via-[#F5A623] to-[#34C77B] rounded-full transition-all duration-500" style={{ width: `${healthScore}%` }}></div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
