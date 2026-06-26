import React, { useState, useEffect, useRef } from "react";
import { Send, Sparkles, ChevronUp, AlertCircle, X, BrainCircuit, RefreshCw, Layers } from "lucide-react";
import { Message } from "../../types";

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onClearHistory: () => void;
  apiStatus: { active: boolean; simulation: boolean; keyConfigured: boolean } | null;
}

export default function ChatInterface({ messages, onSendMessage, onClearHistory, apiStatus }: ChatInterfaceProps) {
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const quickChips = [
    { text: "What should I work on next?", q: "What should I work on next? Give a clear recommendation." },
    { text: "I feel stressed / overwhelmed", q: "I scale is high and feel totally stressed out. What is a reduced, manageable workload schedule?" },
    { text: "Book focus blocks on my day", q: "Can you review my active list and plan focus blocks for tomorrow?" },
    { text: "Check my goals", q: "How do today's deliverables support my primary long term objectives or goals?" }
  ];

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsTyping(true);
    onSendMessage(inputText);
    setInputText("");

    // Simulate short delays for responsiveness
    setTimeout(() => {
      setIsTyping(false);
    }, 1800);
  };

  const handleChipClick = (q: string) => {
    setIsTyping(true);
    onSendMessage(q);
    
    setTimeout(() => {
      setIsTyping(false);
    }, 1800);
  };

  return (
    <div className="flex flex-col h-full bg-[#111318] border border-[#1E2330] rounded-xl overflow-hidden" id="coach-asst-chat">
      {/* Dynamic Header */}
      <div className="p-3 bg-[#181C27] border-b border-[#1E2330] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit size={15} className="text-[#34C77B]" />
          <div>
            <span className="text-xs font-bold text-white block">FlowMind Executive Coach</span>
            <span className="text-[10px] text-[#34C77B] font-mono leading-none flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34C77B] animate-pulse"></span>
              Workspace Context Loaded
            </span>
          </div>
        </div>

        <button
          onClick={onClearHistory}
          className="text-[10px] font-mono font-bold text-slate-500 hover:text-[#F04438] bg-[#0A0B0F] p-1 px-2 rounded border border-[#1E2330]/80"
          title="Reset History"
        >
          Clear Grid
        </button>
      </div>

      {/* Bubble messages display */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#0A0B0F]/45"
        id="bubble-scroll-box"
      >
        {messages.map((m) => {
          const isCoach = m.sender === "coach";
          return (
            <div
              key={m.id}
              className={`flex flex-col max-w-[85%] ${isCoach ? "self-start" : "self-end ml-auto"}`}
            >
              <div
                className={`p-3 rounded-xl text-xs leading-relaxed ${
                  isCoach
                    ? "bg-[#181C27] text-slate-200 rounded-tl-none border border-[#1E2330]"
                    : "bg-[#4F8EF7]/15 text-white border border-[#4F8EF7]/20 rounded-tr-none"
                }`}
              >
                {/* Visual support for markdown formatting in response bubbles */}
                {m.text.includes("**") ? (
                  m.text.split("**").map((part, index) => 
                    index % 2 === 1 ? <strong key={index} className="text-white font-bold">{part}</strong> : part
                  )
                ) : m.text}
              </div>
              <span className={`text-[8px] font-mono text-slate-500 mt-1 ${isCoach ? "text-left" : "text-right"}`}>
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-1.5 bg-[#181C27] rounded-xl rounded-tl-none border border-[#1E2330] p-3 text-slate-400 text-xs w-[120px]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34C77B] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34C77B]"></span>
            </span>
            <span className="font-mono text-[10px] uppercase font-bold tracking-widest animate-pulse">Chief is thinking...</span>
          </div>
        )}
      </div>

      {/* Pre-packaged context prompt chips */}
      <div className="p-3 border-t border-[#1E2330] bg-[#111318]" id="chips-row">
        <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-1.5">Strategic Prompts Grid</label>
        <div className="flex flex-wrap gap-1.5">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(chip.q)}
              className="text-[10px] text-slate-400 hover:text-white bg-[#0A0B0F] border border-[#1E2330] hover:border-slate-800 p-1.5 rounded-lg text-left transition-all max-w-full"
            >
              {chip.text}
            </button>
          ))}
        </div>
      </div>

      {/* Input box form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#1E2330] bg-[#181C27]/50 flex gap-2">
        <input
          type="text"
          placeholder="Ask FlowMind... e.g. 'What is at extreme risk?'"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="bg-[#0A0B0F] text-xs text-slate-200 border border-[#1E2330] placeholder-slate-500 rounded-lg p-2.5 flex-grow focus:outline-none focus:border-[#4F8EF7]"
        />
        <button
          type="submit"
          className="bg-[#4F8EF7] hover:bg-[#4F8EF7]/95 text-white rounded-lg p-2.5 px-3 flex items-center justify-center transition-all"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
