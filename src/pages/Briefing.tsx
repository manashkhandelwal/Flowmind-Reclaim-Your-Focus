import { Activity } from "lucide-react";

export default function Briefing({ logs }: any) {
  return (
    <div className="border border-[#1E2330] rounded-xl bg-[#111318] p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-[#1E2330]/65 pb-3">
        <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
          <Activity size={15} className="text-[#7C6AF7]" />
          Multi-Agent Telemetry Audit Runs
        </h3>
        <span className="font-mono text-xs text-slate-500">
          Total audit traces: {logs.length}
        </span>
      </div>

      <div className="space-y-2.5 max-h-[480px] overflow-y-auto">
        {logs.map((log: any) => (
          <div
            key={log.id}
            className="bg-[#0A0B0F] border border-[#1E2330] rounded-lg p-3.5 space-y-2 text-xs font-mono"
          >
            <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="bg-[#181C27] text-slate-300 font-bold px-2 py-0.5 rounded border border-[#1E2330] uppercase text-[9px]">
                  {log.agent}
                </span>
                <span className="text-[#34C77B] font-semibold">SUCCESS: {String(log.success)}</span>
              </div>
              <span className="text-slate-500">
                {new Date(log.createdAt).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString()}
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed text-[11px] font-sans pl-1 border-l-2 border-l-slate-700">
              {log.reasoning}
            </p>

            <div className="flex items-center gap-4 text-slate-500 text-[9px] pt-1 border-t border-[#1E2330]/30">
              <span>TOKENS: {log.tokensUsed}</span>
              <span>LATENCY: {log.durationMs}ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
