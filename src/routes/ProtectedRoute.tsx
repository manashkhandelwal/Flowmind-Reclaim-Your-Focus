import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ user, authLoading }: { user: any; authLoading: boolean }) {
  if (authLoading) {
    return (
      <div className="h-screen bg-[#0A0B0F] flex items-center justify-center text-slate-500 font-mono">
        Initializing FlowMind Engine...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
