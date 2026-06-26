import FocusSessionTimer from "../components/focus/FocusSessionTimer";

export default function Focus({ tasks, activeTaskIdForTimer, setActiveTaskIdForTimer, handleSubtaskToggleInTimer }: any) {
  return (
    <FocusSessionTimer
      tasks={tasks}
      activeTaskId={activeTaskIdForTimer}
      onSelectTaskId={setActiveTaskIdForTimer}
      onToggleSubtask={handleSubtaskToggleInTimer}
    />
  );
}
