import CalendarGrid from "../components/scheduler/CalendarGrid";
import { CheckCircle2, Check, AlertCircle } from "lucide-react";

export default function Scheduler({
  tasks,
  orchestrating,
  onOrchestrateSchedule,
  draftAlert,
  schedulerDraft,
  handleApproveScheduleDraft,
  setSchedulerDraft,
  setDraftAlert,
  handleTriggerRecoveryMode,
}: any) {
  return (
    <div className="space-y-6" id="scheduler-view-container">
      {/* Draft schedule banner notifications */}
      {draftAlert && (
        <div className="border border-[#34C77B]/30 bg-[#34C77B]/5 p-4 rounded-xl flex items-start gap-3 animate-fadeIn">
          <CheckCircle2 size={18} className="text-[#34C77B] shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-mono text-xs font-bold text-white uppercase tracking-wider block">FlowMind Schedule Drafting Alert</span>
            <p className="text-xs text-slate-300 mt-0.5">{draftAlert}</p>
            
            {schedulerDraft && schedulerDraft.length > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={handleApproveScheduleDraft}
                  className="bg-[#34C77B] hover:bg-[#34C77B]/90 text-[#0A0B0F] font-mono text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[#34C77B]/10 flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Check size={11} /> Confirm & Write Google Calendar Events
                </button>
                <button
                  onClick={() => {
                    setSchedulerDraft(null);
                    setDraftAlert(null);
                  }}
                  className="text-slate-400 hover:text-white font-mono text-[10px] px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Discard Plan
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual rendering of raw draft blocks */}
      {schedulerDraft && schedulerDraft.length > 0 && (
        <div className="border border-[#1E2330] rounded-xl bg-[#0A0B0F]/80 p-5 space-y-4 shadow-xl animate-fadeIn" id="schedule-draft-preview-deck">
          <div className="flex items-center justify-between border-b border-[#1E2330]/50 pb-3">
            <div className="flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4F8EF7]"></span>
              </div>
              <span className="font-mono text-xs text-slate-300 uppercase font-bold tracking-widest">
                AI Compiled Focus Blocks Draft Previews
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase bg-[#181C27] border border-[#1E2330] p-1 px-2 rounded">
              {schedulerDraft.length} Sessions drafted
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schedulerDraft.map((item: any, idindex: number) => (
              <div key={item.id || idindex} className="border border-dashed border-[#1E2330] rounded-xl p-3.5 bg-[#111318] space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-mono bg-blue-950/40 text-[#4F8EF7] border border-[#4F8EF7]/20 p-0.5 px-1.5 rounded font-bold uppercase">
                      {item.type || "focus"} block
                    </span>
                    <h5 className="text-xs font-bold text-white mt-1.5 leading-snug">{item.title}</h5>
                  </div>
                  <span className="text-slate-500 font-mono text-[9px]">Draft {idindex + 1}</span>
                </div>

                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                  Objective: {item.objective}
                </p>

                <div className="text-[10px] text-[#34C77B] font-mono bg-[#0A0B0F] p-2 rounded-lg border border-[#1E2330]/50 flex items-center justify-between gap-1">
                  <span>📅 {new Date(item.startTime).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
                  <span>⏱️ {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CalendarGrid
        tasks={tasks}
        onOrchestrateSchedule={onOrchestrateSchedule}
        orchestrating={orchestrating}
      />

      {/* Self-healing active Bottleneck Recovery Planner */}
      <div className="border border-[#1E2330] rounded-xl bg-[#111318] p-5 space-y-4" id="recovery-planner-matrix">
        <div>
          <h4 className="text-xs font-mono font-bold text-[#F04438] uppercase tracking-widest flex items-center gap-1.5">
            <AlertCircle size={13} className="animate-pulse" />
            AI Agentic Bottleneck Recovery Planner
          </h4>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            If you missed a previously scheduled deliverable, select it below. The multi-agent coordinator will recalculate deadline pressures, amplify risk scorecards, and compile a self-healing calibration calendar draft below.
          </p>
        </div>

        <div className="space-y-2 max-h-[140px] overflow-y-auto">
          {tasks.filter((t: any) => t.status === "active").length === 0 ? (
            <div className="text-xs text-slate-500 font-mono italic text-center p-4">No active obligations to calibrate.</div>
          ) : (
            tasks.filter((t: any) => t.status === "active").map((t: any) => (
              <div key={t.id} className="bg-[#0A0B0F] border border-[#1E2330] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 hover:border-red-950/40">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-white truncate block max-w-[340px]">{t.title}</span>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono">
                    <span>Risk Level: {t.riskLevel === "high_risk" ? "🔴 High" : t.riskLevel === "at_risk" ? "🟡 Mid" : "🟢 Low"}</span>
                    <span>•</span>
                    <span>Est: {t.estimatedMinutes}m</span>
                  </div>
                </div>

                <button
                  onClick={() => handleTriggerRecoveryMode(t.id)}
                  disabled={orchestrating}
                  className="text-[9px] font-mono font-bold bg-[#F04438]/10 text-[#F04438] hover:bg-[#F04438]/20 border border-[#F04438]/20 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-40"
                >
                  ⚠️ Trigger Recovery Session
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
