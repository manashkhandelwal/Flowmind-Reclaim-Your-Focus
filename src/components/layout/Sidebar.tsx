import React from "react";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Flame,
  FileText,
  Settings,
  UserCheck,
  ShieldClose,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
interface SidebarProps {
  logsCount: number;
  tasksCount: number;
  focusedTaskActive: boolean;
  user: any
}

export default function Sidebar({
  logsCount,
  tasksCount,
  focusedTaskActive,
  user
}: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Executive Desk", icon: LayoutDashboard },
    {
      id: "tasks",
      label: "Task Backlog",
      icon: CheckSquare,
      badge: tasksCount > 0 ? tasksCount : undefined,
    },
    { id: "scheduler", label: "Time Matrix", icon: Calendar },
    {
      id: "focus",
      label: "Focus Chamber",
      icon: Flame,
      isPulse: focusedTaskActive,
    },
    {
      id: "briefing",
      label: "Agent Run Logs",
      icon: FileText,
      badge: logsCount > 0 ? logsCount : undefined,
    },
  ];
  const initials = user.displayName
    .split(" ")
    .map(name => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <aside
      className="hidden md:flex w-64 border-r border-[#1E2330] bg-[#111318] flex-col justify-between h-[calc(100vh-4rem)] text-slate-350 sticky left-0 shrink-0"
      id="fm-sidebar"
    >
      <div className="p-4 flex flex-col gap-6">
        <div>
          <span className="font-mono text-[10px] text-slate-500 font-semibold uppercase tracking-widest block px-3">
            Core Workspace
          </span>
          <nav className="mt-2 flex flex-col gap-1" id="sidebar-nav">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.id === "dashboard"
                  ? location.pathname === "/" ||
                  location.pathname === "/dashboard"
                  : location.pathname === `/${item.id}`;
              return (
                <NavLink
                  key={item.id}
                  to={`/${item.id}`}
                  className={({ isActive }) =>
                    `w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group 
                  ${isActive
                      ? "bg-[#4F8EF7]/10 text-[#4F8EF7] border-l-2 border-[#4F8EF7]"
                      : "text-slate-400 hover:bg-[#181C27] hover:text-white"
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      size={16}
                      className={`${isActive
                        ? "text-[#4F8EF7]"
                        : "text-slate-400 group-hover:text-slate-200"
                        } ${item.isPulse ? "animate-pulse text-[#F04438]" : ""}`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="font-mono text-[10px] font-semibold bg-[#181C27] group-hover:bg-[#1E2330] text-slate-300 px-1.5 py-0.5 rounded border border-[#1E2330]">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Multi-Agent Orchestration Blueprint visual map */}
        <div className="border border-[#1E2330] rounded-xl bg-[#0A0B0F] p-3">
          <span className="font-mono text-[9px] text-[#7C6AF7] font-bold uppercase tracking-widest block mb-2">
            Active Multi-Agent Grid
          </span>

          <div className="flex flex-col gap-2 font-mono text-[11px] text-slate-400">
            <div className="flex items-center justify-between border-b border-[#1E2330]/50 pb-1.5">
              <span className="text-[#4F8EF7]">O_Orchestrator</span>
              <span className="text-[9px] px-1 bg-[#4F8EF7]/20 text-[#4F8EF7] rounded">
                Primary
              </span>
            </div>

            <div className="flex flex-col gap-1 pl-2">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#34C77B]"></div>
                <span>I_Ingestion (Active)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#34C77B]"></div>
                <span>R_RiskScore (Calculated)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#34C77B]"></div>
                <span>S_Scheduler (Syncing)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#34C77B]"></div>
                <span>C_Coach (Awaiting)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User settings panel profile */}
      <div className="p-4 border-t border-[#1E2330] bg-[#0A0B0F]/50">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-[#7C6AF7]/25 border border-[#7C6AF7]/40 flex items-center justify-center font-bold text-[#7C6AF7] font-mono text-xs">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">
              {user?.displayName}
            </p>
            <p className="text-[10px] text-slate-500 font-mono truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
