import React from "react";
import { BrainCircuit, Sparkles, CheckCircle2, LayoutDashboard, Calendar, Mic, Flame, RefreshCw, GitBranch, Clock3, Activity, Bot, ShieldAlert, BarChart3, Workflow, CalendarClock } from "lucide-react";

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
      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl">
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
        <FeatureCard
          icon={<Flame className="text-[#EF4444]" />}
          title="Priority Heat Map"
          description="Visualize high-risk tasks with AI-powered urgency scores, helping you focus on what matters most before deadlines."
        />

        <FeatureCard
          icon={<RefreshCw className="text-[#F59E0B]" />}
          title="Smart Recovery Mode"
          description="Missed a deadline? FlowMind automatically restructures your schedule, reprioritizes pending work, and generates a recovery plan."
        />

        <FeatureCard
          icon={<GitBranch className="text-[#8B5CF6]" />}
          title="AI Task Decomposition"
          description="Large goals are automatically broken into intelligent subtasks with estimated durations, making complex projects easier to complete."
        />

        <FeatureCard
          icon={<BrainCircuit className="text-[#06B6D4]" />}
          title="Intelligent Risk Engine"
          description="Continuously analyzes deadlines, workload, and task dependencies to predict bottlenecks before they impact your productivity."
        />

        <FeatureCard
          icon={<Clock3 className="text-[#10B981]" />}
          title="Focus Chamber"
          description="Enter a distraction-free workspace with Pomodoro timers, progress tracking, and milestone completion designed for deep work."
        />

        <FeatureCard
          icon={<Activity className="text-[#EC4899]" />}
          title="AI Agent Activity Logs"
          description="Monitor every AI decision with detailed execution logs, response times, and token usage for complete transparency."
        />

        <FeatureCard
          icon={<Bot className="text-[#6366F1]" />}
          title="Multi-Agent Intelligence"
          description="Specialized AI agents collaborate to prioritize tasks, optimize schedules, assess risks, and provide proactive recommendations."
        />

        <FeatureCard
          icon={<Sparkles className="text-[#FACC15]" />}
          title="Daily AI Briefing"
          description="Receive a personalized executive summary each day with priorities, overdue tasks, risk alerts, and actionable insights."
        />

        <FeatureCard
          icon={<ShieldAlert className="text-[#DC2626]" />}
          title="Deadline Guardian"
          description="Detects approaching deadlines early and proactively recommends schedule adjustments to prevent last-minute workload spikes."
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
