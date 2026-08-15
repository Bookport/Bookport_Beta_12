import { MovementEntry } from "../store/useAppStore";

export const getMovementMinutes = (entries: MovementEntry[]): number => {
  const totalSeconds = entries.reduce(
    (sum, entry) => sum + (entry.duration || entry.durationSeconds || 0),
    0
  );
  return Math.round(totalSeconds / 60);
};

export const getMovementGoal = (): number => 30;