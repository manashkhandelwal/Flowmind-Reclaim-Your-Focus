import { Outlet } from "react-router-dom";
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import ChatInterface from "../components/assistant/ChatInterface";
import MobileNav from "../components/layout/Mobilenav";

export default function AppLayout({
  apiStatus,
  orchestrating,
  onOrchestrate,
  activeFocusTaskTitle,
  currentView,
  user,
  onGoogleSignIn,

  onSignOut,
  audioListening,
  logsCount,
  tasksCount,
  focusedTaskActive,
  messages,
  onSendCoachChat,
  onClearHistory,
}: any) {
  return (
    <div
      className="flex flex-col h-screen overflow-hidden bg-flow-dark text-slate-100 font-sans"
      id="fm-app-viewport"
    >
      <Header
        apiStatus={apiStatus}
        orchestrating={orchestrating}
        onOrchestrate={onOrchestrate}
        focusedTaskTitle={activeFocusTaskTitle}
        focusModeActive={currentView === "focus"}
        user={user}
        onGoogleSignIn={onGoogleSignIn}
        onSignOut={onSignOut}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          logsCount={logsCount}
          tasksCount={tasksCount}
          focusedTaskActive={focusedTaskActive}
          user={user}
        />
        <main className="flex-1 overflow-y-auto xl:overflow-hidden bg-flow-dark p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-4rem)]">
          <div className="xl:col-span-8 xl:h-full xl:overflow-y-auto space-y-6 pr-1">
            <Outlet />
          </div>
          <div className="xl:col-span-4 xl:h-full flex flex-col overflow-hidden" id="chat-side-overlay-grid">
            <ChatInterface
              messages={messages}
              onSendMessage={onSendCoachChat}
              onClearHistory={onClearHistory}
              apiStatus={apiStatus}

            />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
