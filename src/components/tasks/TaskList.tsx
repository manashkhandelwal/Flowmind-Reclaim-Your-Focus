import React, { useState } from "react";
import { Plus, Trash2, Calendar, Clock, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Tag, PlusCircle, Circle, Save, RefreshCw } from "lucide-react";
import { Task, Subtask, TaskCategory, Priority, TaskStatus } from "../../types";
import { motion } from "motion/react";

interface TaskListProps {
  tasks: Task[];
  onSaveTask: (task: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  selectedTaskId?: string;
  onSelectTask: (taskId: string) => void;
}

export default function TaskList({ tasks, onSaveTask, onDeleteTask, selectedTaskId, onSelectTask }: TaskListProps) {
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);

  // New task form fields
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<TaskCategory>("project");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newDeadline, setNewDeadline] = useState(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [newMinutes, setNewMinutes] = useState(90);

  // For editing custom descriptions, deadlines, estimated effort
  const [effortMinutesDraft, setEffortMinutesDraft] = useState<string>("");
  const [newSubtaskTextMap, setNewSubtaskTextMap] = useState<Record<string, string>>({});

  React.useEffect(() => {
    const selectedTask = tasks.find(t => t.id === selectedTaskId);
    if (selectedTask) {
      setEffortMinutesDraft(String(selectedTask.estimatedMinutes));
    } else {
      setEffortMinutesDraft("");
    }
  }, [selectedTaskId, tasks]);

  const handleSubtaskToggle = (task: Task, subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map(st =>
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );
    onSaveTask({ id: task.id, subtasks: updatedSubtasks });
  };

  const handleAddSubtask = (task: Task) => {
    const text = newSubtaskTextMap[task.id] || "";
    if (!text.trim()) return;

    const newSt: Subtask = {
      id: "sub-manual-" + Math.random().toString(36).substr(2, 5),
      title: text.trim(),
      estimatedMinutes: Math.round(task.estimatedMinutes / Math.max(1, task.subtasks.length + 1)),
      done: false
    };

    onSaveTask({ id: task.id, subtasks: [...task.subtasks, newSt] });
    setNewSubtaskTextMap({ ...newSubtaskTextMap, [task.id]: "" });
  };

  const handleManualCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onSaveTask({
      title: newTitle.trim(),
      description: newDescription.trim(),
      category: newCategory,
      priority: newPriority,
      deadline: new Date(newDeadline).toISOString(),
      estimatedMinutes: Number(newMinutes) || 60,
      subtasks: [],
      status: "active"
    });

    // Reset form
    setNewTitle("");
    setNewDescription("");
    setNewCategory("project");
    setNewPriority("medium");
    setNewDeadline(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
    setNewMinutes(90);
    setIsCreating(false);
  };

  const handleSaveEffortMinutes = (task: Task) => {
    const val = Number(effortMinutesDraft);
    if (!isNaN(val) && val > 0) {
      onSaveTask({ id: task.id, estimatedMinutes: val });
    }
  };

  // Filter criteria
  const isCompletedTab = activeTab === "completed";
  const filtered = tasks.filter(t => {
    const matchesStatus = isCompletedTab ? t.status === "completed" : t.status !== "completed";
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || t.category === filterCategory;
    const matchesPriority = filterPriority === "all" || t.priority === filterPriority;
    return matchesStatus && matchesSearch && matchesCategory && matchesPriority;
  });

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case "critical": return "text-[#F04438] bg-[#F04438]/10 border-l-2 border-[#F04438]";
      case "high": return "text-[#F5A623] bg-[#F5A623]/10 border-l-2 border-[#F5A623]";
      case "medium": return "text-[#4F8EF7] bg-[#4F8EF7]/10 border-l-2 border-[#4F8EF7]";
      default: return "text-slate-400 bg-[#181C27] border-l-2 border-slate-700";
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="tasks-list-view">
      {/* Search columns & Task Lists (Left columns) */}
      <div className="xl:col-span-7 flex flex-col gap-4">
        <div className="border border-[#1E2330] rounded-xl bg-[#111318] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex bg-[#0A0B0F] p-1 rounded-lg border border-[#1E2330]">
              <button
                onClick={() => setActiveTab("active")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "active" ? "bg-[#181C27] text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Active Backlog
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "completed" ? "bg-[#181C27] text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Completed Tasks
              </button>
            </div>

            <button
              onClick={() => setIsCreating(!isCreating)}
              className="bg-[#4F8EF7] hover:bg-[#4F8EF7]/90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1"
            >
              <Plus size={14} />
              Add Obligation
            </button>
          </div>

          {/* Filtering row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Search obligations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#0A0B0F] border border-[#1E2330] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#4F8EF7]"
            />
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-[#0A0B0F] border border-[#1E2330] text-xs text-slate-400 rounded-lg p-2 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="project">Projects</option>
              <option value="assignment">Assignments</option>
              <option value="certification">Certifications</option>
              <option value="meeting">Meetings</option>
              <option value="bill">Bills</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-[#0A0B0F] border border-[#1E2330] text-xs text-slate-400 rounded-lg p-2 focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Collapsible Form for creation */}
        {isCreating && (
          <form onSubmit={handleManualCreate} className="border border-[#1E2330] rounded-xl bg-[#111318] p-5 space-y-4 animate-fadeIn">
            <h3 className="text-xs font-mono font-bold text-[#4F8EF4] uppercase tracking-wider">Log Custom Obligation</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-medium">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Branch Code Audit"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-[#0A0B0F] border border-[#1E2330] rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#4F8EF7]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-medium">Target Deadline *</label>
                <input
                  type="datetime-local"
                  required
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="bg-[#0A0B0F] border border-[#1E2330] rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#4F8EF7]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-medium">Activity Obligation Description</label>
              <textarea
                placeholder="Give descriptive notes derived from slack/email thread logs..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="bg-[#0A0B0F] border border-[#1E2330] rounded-lg p-2.5 text-xs text-slate-200 h-16 resize-none focus:outline-none focus:border-[#4F8EF7]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-medium">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
                  className="bg-[#0A0B0F] border border-[#1E2330] rounded-lg p-2 text-xs text-slate-400 focus:outline-none"
                >
                  <option value="project">Project</option>
                  <option value="assignment">Assignment</option>
                  <option value="certification">Certification</option>
                  <option value="meeting">Meeting</option>
                  <option value="bill">Bill</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-medium">Priority Grid</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as Priority)}
                  className="bg-[#0A0B0F] border border-[#1E2330] rounded-lg p-2 text-xs text-slate-400 focus:outline-none"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-medium">Effort Estimate (minutes)</label>
                <input
                  type="number"
                  placeholder="e.g. 120"
                  value={newMinutes}
                  onChange={(e) => setNewMinutes(Number(e.target.value))}
                  className="bg-[#0A0B0F] border border-[#1E2330] rounded-lg p-2 text-xs text-slate-250 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-xs text-slate-400 hover:text-white px-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#34C77B] hover:bg-[#34C77B]/95 text-[#0A0B0F] text-xs font-bold px-4 py-2 rounded-lg"
              >
                Deduct & Sync Task
              </button>
            </div>
          </form>
        )}

        {/* Dynamic Task cards list */}
        <div className="space-y-3" id="task-card-container">
          {filtered.length === 0 ? (
            <div className="h-48 border border-dashed border-[#1E2330] rounded-xl flex flex-col items-center justify-center text-slate-500">
              <span className="text-xs font-mono">Zero matching deliverables in this viewport.</span>
            </div>
          ) : (
            filtered.map(t => {
              const isSelected = selectedTaskId === t.id;
              const pendingSubtasks = t.subtasks.filter(s => !s.done).length;
              const completeSubtasks = t.subtasks.filter(s => s.done).length;
              const hasSubtasks = t.subtasks.length > 0;
              const hoursLeft = Math.round((new Date(t.deadline).getTime() - Date.now()) / (1000 * 60 * 60));
              const completionPercent = t.subtasks.length > 0
                ? Math.min(100, Math.max(0, Math.round((completeSubtasks / t.subtasks.length) * 100)))
                : (t.status === "completed" ? 100 : 0);

              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTask(t.id)}
                  className={`border rounded-xl p-4 transition-all cursor-pointer relative overflow-hidden bg-[#111318] hover:border-[#4F8EF7]/40 ${
                    isSelected ? "border-[#4F8EF7] shadow-lg shadow-[#4F8EF7]/5 bg-[#181C27]/50" : "border-[#1E2330]"
                  } ${t.riskLevel === "high_risk" && t.status !== "completed" ? "border-l-4 border-l-[#F04438]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {/* Check Complete State action */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSaveTask({ id: t.id, status: t.status === "completed" ? "active" : "completed" });
                        }}
                        className="mt-0.5 text-slate-500 hover:text-[#34C77B]"
                      >
                        {t.status === "completed" ? (
                          <CheckCircle2 size={16} className="text-[#34C77B] fill-current bg-[#0A0B0F] rounded-full" />
                        ) : (
                          <Circle size={16} />
                        )}
                      </button>

                      <div>
                        <h4 className={`text-sm font-semibold tracking-tight text-white ${t.status === "completed" ? "line-through text-slate-500" : ""}`}>
                          {t.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1 leading-relaxed mr-4">{t.description}</p>
                      </div>
                    </div>

                    {/* Risk Badge stats metrics */}
                    {t.status !== "completed" && (
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        t.riskLevel === "high_risk" ? "bg-[#F04438]/10 text-[#F04438]" :
                        t.riskLevel === "at_risk" ? "bg-[#F5A623]/10 text-[#F5A623]" :
                        "bg-[#34C77B]/10 text-[#34C77B]"
                      }`}>
                        risk:{t.riskScore}
                      </span>
                    )}
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="mt-3.5 space-y-1.5" id={`task-progress-${t.id}`}>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        {hasSubtasks ? "Subtask Completion" : "Status Progress"}
                      </span>
                      <div className="flex items-center gap-1">
                        {completionPercent === 100 && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 350, damping: 15 }}
                            className="text-[#34C77B] flex items-center justify-center shrink-0"
                          >
                            <CheckCircle2 size={11} className="fill-current bg-[#111318] rounded-full" />
                          </motion.span>
                        )}
                        <span className="font-bold text-slate-250">{completionPercent}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-[#0A0B0F] rounded-full overflow-hidden border border-[#1E2330]/50">
                      <motion.div
                        className={`h-full rounded-full ${
                          completionPercent === 100
                            ? "bg-[#34C77B]"
                            : t.riskLevel === "high_risk" && t.status !== "completed"
                              ? "bg-[#F04438]"
                              : t.riskLevel === "at_risk" && t.status !== "completed"
                                ? "bg-[#F5A623]"
                                : "bg-[#4F8EF7]"
                        }`}
                        initial={{ width: "0%" }}
                        animate={{ width: `${completionPercent}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Badges footer row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-[#1E2330]/40 font-mono text-[10px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-[#0A0B0F] p-1 px-2 rounded border border-[#1E2330]/50">
                        <Clock size={11} className="text-slate-400" />
                        <span>{t.estimatedMinutes}m est</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-[#0A0B0F] p-1 px-2 rounded border border-[#1E2330]/50">
                        <Calendar size={11} className="text-[#4F8EF7]" />
                        <span>
                          {hoursLeft < 0 ? "Overdue" : hoursLeft < 24 ? `${hoursLeft}h left` : `${Math.round(hoursLeft/24)}d left`}
                        </span>
                      </div>

                      {hasSubtasks && (
                        <div className="flex items-center gap-1">
                          <span>{completeSubtasks}/{t.subtasks.length} subtasks</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-[#0A0B0F] py-0.5 px-1.5 rounded text-slate-400 uppercase tracking-widest text-[8px] font-bold border border-[#1E2330]/40">
                        src: {t.source}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Task Details & Action Worksheet (Right columns - Expanded detail check) */}
      <div className="xl:col-span-5" id="task-worksheet-expanded">
        {(() => {
          const selectedTask = tasks.find(t => t.id === selectedTaskId);
          if (!selectedTask) {
            return (
              <div className="border border-[#1E2330] rounded-xl bg-[#111318] p-5 h-full flex flex-col items-center justify-center text-slate-500 min-h-[300px]">
                <PlusCircle size={24} className="text-slate-600 mb-2" />
                <p className="text-xs font-mono">Select any task obligation on the left to activate detail telemetry worksheet.</p>
              </div>
            );
          }

          const currentSubtaskText = newSubtaskTextMap[selectedTask.id] ?? "";

          return (
            <div className="border border-[#1E2330] rounded-xl bg-[#111318] p-5 space-y-5 sticky top-20" id="worksheet-right-box">
              {/* Header and categoricals */}
              <div className="flex items-start justify-between gap-3 border-b border-[#1E2330]/60 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-bold bg-[#181C27] text-slate-300 border border-[#1E2330] p-0.5 px-1.5 rounded uppercase">
                      {selectedTask.category}
                    </span>
                    <span className={`text-[9px] font-mono font-bold p-0.5 px-1.5 rounded uppercase ${
                      selectedTask.priority === "critical" ? "bg-[#F04438]/10 text-[#F04438]" :
                      selectedTask.priority === "high" ? "bg-[#F5A623]/10 text-[#F5A623]" :
                      "bg-[#4F8EF7]/10 text-[#4F8EF7]"
                    }`}>
                      {selectedTask.priority}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-2 tracking-tight leading-snug">{selectedTask.title}</h3>
                </div>

                <button
                  onClick={() => onDeleteTask(selectedTask.id)}
                  className="p-1 text-slate-500 hover:text-[#F04438] bg-[#0A0B0F]/45 rounded border border-[#1E2330] transition-all"
                  title="Archive/Drop Obligation"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Description box */}
              <div className="bg-[#0A0B0F]/55 rounded-lg border border-[#1E2330]/70 p-3">
                <span className="text-[10px] text-slate-500 font-mono block mb-1">ANALYSIS & BACKGROUND DATA</span>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedTask.description || "No metadata parsed."}</p>
              </div>

              {/* Adjust estimated effort */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">Estimated Focus Budget (minutes)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={effortMinutesDraft}
                    onChange={(e) => setEffortMinutesDraft(e.target.value)}
                    className="bg-[#0A0B0F] border border-[#1E2330] text-xs text-slate-200 rounded-lg p-2 w-24 focus:outline-none"
                  />
                  <button
                    onClick={() => handleSaveEffortMinutes(selectedTask)}
                    disabled={Number(effortMinutesDraft) === selectedTask.estimatedMinutes || !effortMinutesDraft || isNaN(Number(effortMinutesDraft))}
                    className="bg-[#181C27] hover:bg-[#1E2330] border border-[#1E2330] text-slate-300 text-xs px-3 py-2 rounded-lg flex items-center gap-1 transition-all disabled:opacity-40"
                  >
                    <Save size={12} />
                    Apply Focus Budget
                  </button>
                </div>
              </div>

              {/* Subtasks checklist */}
              <div className="space-y-3">
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">
                  Decomposed Action Milestones ({selectedTask.subtasks.filter(s => s.done).length}/{selectedTask.subtasks.length})
                </label>
                
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                  {selectedTask.subtasks.map(st => (
                    <div
                      key={st.id}
                      onClick={() => handleSubtaskToggle(selectedTask, st.id)}
                      className="flex items-center gap-2 bg-[#0A0B0F] p-2.5 rounded-lg border border-[#1E2330]/70 hover:border-slate-700 cursor-pointer transition-all"
                    >
                      <button className="text-slate-500">
                        {st.done ? (
                          <CheckCircle2 size={13} className="text-[#34C77B]" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-slate-500"></div>
                        )}
                      </button>
                      <span className={`text-xs ${st.done ? "line-through text-slate-500" : "text-slate-300"}`}>{st.title}</span>
                    </div>
                  ))}
                </div>

                {/* Quickly create a subtask inline */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Decompose further..."
                    value={currentSubtaskText}
                    onChange={(e) => setNewSubtaskTextMap({ ...newSubtaskTextMap, [selectedTask.id]: e.target.value })}
                    className="bg-[#0A0B0F] border border-[#1E2330] text-xs text-slate-200 rounded-lg p-2.5 flex-grow focus:outline-none focus:border-[#4F8EF7]"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSubtask(selectedTask)}
                    className="bg-[#4F8EF7] hover:bg-[#4F8EF7]/90 text-white rounded-lg p-2 px-3 flex items-center justify-center shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Scheduled Calendar Blocks inside task */}
              {selectedTask.scheduledBlocks && selectedTask.scheduledBlocks.length > 0 && (
                <div className="pt-3 border-t border-[#1E2330]/60 space-y-2">
                  <div className="text-[10px] text-slate-500 font-mono uppercase font-bold">Secured Calendar Allocations</div>
                  <div className="space-y-1">
                    {selectedTask.scheduledBlocks.map(b => (
                      <div key={b.id} className="bg-[#181C27]/60 border border-[#1E2330] rounded-lg p-2.5 flex items-center justify-between text-xs font-mono">
                        <div className="text-slate-300">{b.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(b.startTime).toLocaleDateString([], { month: "short", day: "numeric" })} at {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
