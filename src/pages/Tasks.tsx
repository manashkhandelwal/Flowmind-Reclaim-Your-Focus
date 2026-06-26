import TaskList from "../components/tasks/TaskList";

export default function Tasks({ tasks, onSaveTask, onDeleteTask, selectedTaskId, onSelectTask }: any) {
  return (
    <TaskList
      tasks={tasks}
      onSaveTask={onSaveTask}
      onDeleteTask={onDeleteTask}
      selectedTaskId={selectedTaskId}
      onSelectTask={onSelectTask}
    />
  );
}
