import React from "react";
import { Terminal, Shield, Sparkles, BrainCircuit, Play, CheckCircle2, Mic, MicOff, LogIn, LogOut, Loader2, Calendar } from "lucide-react";

interface HeaderProps {
  apiStatus: { active: boolean; simulation: boolean; keyConfigured: boolean } | null;
  orchestrating: boolean;
  onOrchestrate: (trigger: "initial_sync" | "gmail_scan" | "daily_briefing") => void;
  focusedTaskTitle?: string;
  focusModeActive: boolean;
  
  // New props for Firebase, OAuth & Voice Voice Input
  user: any | null;
  onGoogleSignIn: () => void;
  onDemoSignIn: () => void;
  onSignOut: () => void;
  audioListening: boolean;
  onToggleVoiceInput: () => void;
}

export default function Header({
  apiStatus,
  orchestrating,
  onOrchestrate,
  focusedTaskTitle,
  focusModeActive,
  user,
  onGoogleSignIn,
  onDemoSignIn,
  onSignOut,
  audioListening,
  onToggleVoiceInput
}: HeaderProps) {
  return (
    <header className="h-16 border-b border-[#1E2330] bg-[#111318]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40" id="fm-header">
      <div className="flex items-center gap-3">
        {focusModeActive ? (
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#F04438]"></span>
            </span>
            <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">Active Focus Session:</span>
            <span className="text-sm font-semibold text-slate-200 tracking-tight truncate max-w-[150px] sm:max-w-[240px]">
              {focusedTaskTitle || "Deep Work"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span className="bg-[#4F8EF7]/10 p-1.5 rounded-lg border border-[#4F8EF7]/20 text-[#4F8EF7]">
                <BrainCircuit size={16} className="sm:w-[18px] sm:h-[18px]" />
              </span>
              <span>FlowMind</span>
              <span className="hidden xs:inline text-[10px] sm:text-xs font-normal text-slate-400 font-mono tracking-normal bg-[#181C27] border border-[#1E2330] px-1.5 py-0.5 rounded">v2.5</span>
            </h1>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Dynamic Voice Recording Action Trigger */}
        <button
          onClick={onToggleVoiceInput}
          className={`flex items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
            audioListening
              ? "bg-[#F04438]/20 border-[#F04438] text-[#F04438] animate-pulse"
              : "bg-[#181C27] hover:bg-[#1E2330] border-[#1E2330] text-slate-300"
          }`}
          title={audioListening ? "Listening... Speak task context directly" : "Voice Input Task"}
          id="trigger-voice-dictation-btn"
        >
          {audioListening ? <MicOff size={15} /> : <Mic size={15} />}
        </button>

        {/* API Key configuration badge */}
        <div className="hidden md:flex items-center gap-2 py-1 px-2.5 rounded-full bg-[#181C27] border border-[#1E2330]">
          {orchestrating ? (
            <>
              <div className="h-2 w-2 rounded-full bg-[#7C6AF7] animate-pulse"></div>
              <span className="font-mono text-[10px] text-[#7C6AF7] font-semibold uppercase tracking-wider animate-pulse">Orchestrating...</span>
            </>
          ) : apiStatus?.active ? (
            <>
              <div className="h-2 w-2 rounded-full bg-[#34C77B]"></div>
              <span className="font-mono text-[10px] text-slate-300 font-semibold uppercase tracking-wider flex items-center gap-1">
                Gemini Active <Sparkles size={10} className="text-[#34C77B]" />
              </span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-[#F5A623]"></div>
              <span className="font-mono text-[10px] text-slate-400 font-medium uppercase tracking-wider animate-pulse">
                Simulation Sandbox Mode
              </span>
            </>
          )}
        </div>

        {/* Dynamic Google Oauth Authentication Controls */}
        <div className="flex items-center gap-2" id="header-auth-controls">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 py-1 pl-1 pr-2 rounded-full bg-[#111318] border border-[#1E2330]" title={user.email}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-[#4F8EF7]/10 text-[#4F8EF7] flex items-center justify-center font-mono font-bold text-xs">
                    {user.displayName ? user.displayName[0] : "U"}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-semibold text-slate-200 text-ellipsis max-w-[100px] truncate">
                  {user.displayName || "Active User"}
                </span>
                <span className="bg-[#34C77B]/10 text-[#34C77B] text-[8px] font-mono font-bold border border-[#34C77B]/20 py-0.5 px-1.5 rounded-full">
                  SYNCED
                </span>
              </div>
              <button
                onClick={onSignOut}
                className="p-2 bg-[#181C27] hover:bg-red-950/20 hover:text-red-400 hover:border-red-500/30 text-slate-400 border border-[#1E2330] rounded-xl transition-all"
                title="Sign Out Account"
                id="header-signout-btn"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onGoogleSignIn}
                className="flex items-center gap-1.5 bg-[#4F8EF7]/10 hover:bg-[#4F8EF7]/20 text-[#4F8EF7] font-semibold text-xs px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-[#4F8EF7]/20 transition-all cursor-pointer"
                id="header-signin-google-btn"
              >
                <LogIn size={13} />
                <span className="hidden sm:inline">Connect Google Dev</span>
              </button>
              
              <button
                onClick={onDemoSignIn}
                className="hidden sm:flex items-center gap-1 text-slate-400 bg-[#181C27] hover:bg-[#1E2330] hover:text-white border border-[#1E2330] text-[10px] px-2 py-1.5 rounded-xl transition-all"
                title="Mock iframe Sandbox Sign in"
                id="header-signin-demo-btn"
              >
                <span>Demo Bypass</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

