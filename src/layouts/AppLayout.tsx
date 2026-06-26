import { Outlet } from "react-router-dom";
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import ChatInterface from "../components/assistant/ChatInterface";

export default function AppLayout({
  apiStatus,
  orchestrating,
  onOrchestrate,
  activeFocusTaskTitle,
  currentView,
  user,
  onGoogleSignIn,
  onDemoSignIn,
  onSignOut,
  audioListening,
  onToggleVoiceInput,
  onViewChange,
  logsCount,
  tasksCount,
  focusedTaskActive,
  messages,
  onSendCoachChat,
  onClearHistory,
}: any) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-flow-dark text-slate-100 font-sans" id="fm-app-viewport">
      <Header
        apiStatus={apiStatus}
        orchestrating={orchestrating}
        onOrchestrate={onOrchestrate}
        focusedTaskTitle={activeFocusTaskTitle}
        focusModeActive={currentView === "focus"}
        user={user}
        onGoogleSignIn={onGoogleSignIn}
        onDemoSignIn={onDemoSignIn}
        onSignOut={onSignOut}
        audioListening={audioListening}
        onToggleVoiceInput={onToggleVoiceInput}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={currentView}
          onViewChange={onViewChange}
          logsCount={logsCount}
          tasksCount={tasksCount}
          focusedTaskActive={focusedTaskActive}
        />
        <main className="flex-1 overflow-y-auto bg-flow-dark p-6 space-y-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-6">
            <Outlet />
          </div>
          <div className="xl:col-span-4" id="chat-side-overlay-grid">
            <ChatInterface
              messages={messages}
              onSendMessage={onSendCoachChat}
              onClearHistory={onClearHistory}
              apiStatus={apiStatus}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
