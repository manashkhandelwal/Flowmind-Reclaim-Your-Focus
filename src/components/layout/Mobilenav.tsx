import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Flame,
  FileText,
} from "lucide-react";

const mobileNavDefs = [
  { path: "/dashboard", label: "Desk", icon: LayoutDashboard },
  { path: "/tasks", label: "Backlog", icon: CheckSquare },
  { path: "/scheduler", label: "Time", icon: Calendar },
  { path: "/focus", label: "Focus", icon: Flame },
  { path: "/briefing", label: "Logs", icon: FileText },
];

export default function MobileNav() {
  return (
    <div
      className="md:hidden bg-[#111318] border-t border-[#1E2330] py-2 px-2 flex items-center justify-around z-40 shrink-0"
      id="fm-mobile-nav"
    >
      {mobileNavDefs.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            id={`mobile-nav-item-${item.path.slice(1)}`}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-all ${
                isActive ? "text-[#4F8EF7]" : "text-slate-400 hover:text-slate-200"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  className={isActive ? "text-[#4F8EF7]" : "text-slate-400"}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </div>
  );
}

