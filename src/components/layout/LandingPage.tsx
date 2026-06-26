import React from "react";
import { BrainCircuit, Sparkles, CheckCircle2, LayoutDashboard, Calendar, Mic } from "lucide-react";

interface LandingPageProps {
  onLogin: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#0A0B0F] text-slate-100 font-sans flex flex-col items-center justify-center p-6">
      {/* Hero Section */}
      <div className="max-w-4xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4F8EF7]/10 border border-[#4F8EF7]/20 text-[#4F8EF7] text-xs font-bold uppercase tracking-widest">
          <BrainCircuit size={14} />
          <span>AI-Powered Executive Productivity</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-white">
          FlowMind: Reclaim Your <span className="text-[#4F8EF7]">Focus</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          The autonomous orchestration engine that understands your obligations, prioritizes your day, and integrates seamlessly with your tools.
        </p>
        <button
          onClick={onLogin}
          className="bg-[#4F8EF7] hover:bg-[#4F8EF7]/90 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-[#4F8EF7]/20 transition-all text-lg"
        >
          Sign In to Access Your Workspace
        </button>
      </div>

      {/* Features Grid */}
      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl">
        <FeatureCard 
          icon={<LayoutDashboard className="text-[#4F8EF7]" />}
          title="Executive Dashboard"
          description="A centralized view of your risk levels, priorities, and daily briefing at a glance."
        />
        <FeatureCard 
          icon={<Calendar className="text-[#34C77B]" />}
          title="Smart Scheduler"
          description="AI-generated focus sessions integrated directly into your Google Calendar."
        />
        <FeatureCard 
          icon={<Mic className="text-[#7C6AF7]" />}
          title="Voice-to-Task"
          description="Speak your obligations and watch FlowMind structure them into actionable milestones."
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-[#111318] border border-[#1E2330] p-6 rounded-2xl hover:border-slate-700 transition-all space-y-3">
      <div className="p-3 bg-[#0A0B0F] rounded-lg border border-[#1E2330] inline-block">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}
