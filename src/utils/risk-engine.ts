import { Task } from '../types';

export function computeBaseRisk(task: Task): { riskScore: number; riskLevel: 'safe' | 'at_risk' | 'high_risk' } {
  if (task.status === 'completed') {
    return { riskScore: 0, riskLevel: 'safe' };
  }

  const deadlineTime = new Date(task.deadline).getTime();
  const hoursLeft = (deadlineTime - Date.now()) / (1000 * 60 * 60);
  const effortHours = task.estimatedMinutes / 60;

  const completedRatio = task.subtasks.length > 0 
    ? task.subtasks.filter(s => s.done).length / task.subtasks.length
    : 0;
  
  const remainingEffort = effortHours * (1 - completedRatio);
  const bufferRatio = remainingEffort > 0 ? hoursLeft / Math.max(remainingEffort, 0.5) : hoursLeft;

  let riskScore = 0;
  
  if (hoursLeft < 0) {
    riskScore = 100;
  } else if (bufferRatio <= 0) {
    riskScore = 100;
  } else if (bufferRatio < 1.2) {
    riskScore = Math.min(95, Math.round(85 + (1.2 - bufferRatio) * 50));
  } else if (bufferRatio < 2) {
    riskScore = Math.round(60 + (2 - bufferRatio) * 31);
  } else if (bufferRatio < 4) {
    riskScore = Math.round(30 + (4 - bufferRatio) * 15);
  } else {
    riskScore = Math.max(5, Math.round(30 - bufferRatio * 2));
  }

  let riskLevel: 'safe' | 'at_risk' | 'high_risk' = 'safe';
  if (riskScore >= 75 || hoursLeft < 24) {
    riskLevel = 'high_risk';
  } else if (riskScore >= 40) {
    riskLevel = 'at_risk';
  }

  return { riskScore, riskLevel };
}
