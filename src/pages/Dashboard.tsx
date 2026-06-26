import BriefingCard from "../components/dashboard/BriefingCard";
import RiskHeatmap from "../components/dashboard/RiskHeatmap";
import { useNavigate } from "react-router-dom";

export default function Dashboard({ briefing, tasks, onOrchestrate, orchestrating, setSelectedTaskId, setActiveTaskIdForTimer }: any) {
  const navigate = useNavigate();

  return (
    <>
      <BriefingCard
        briefing={briefing}
        onSelectTask={(id: string) => {
          setSelectedTaskId(id);
          navigate("/tasks");
        }}
        onLaunchTimer={(id: string, objective: string) => {
          setActiveTaskIdForTimer(id);
          navigate("/focus");
        }}
      />
      <RiskHeatmap
        tasks={tasks}
        onSelectTask={(id: string) => {
          setSelectedTaskId(id);
          navigate("/tasks");
        }}
        onOrchestrate={onOrchestrate}
        orchestrating={orchestrating}
      />
    </>
  );
}
