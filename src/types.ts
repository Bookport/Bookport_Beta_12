export interface HabitItem {
  id: string;
  name: string;
  icon: string;
  maxCircles: number;
  checkedCircles: number;
}

export interface HabitsState {
  nutrition: HabitItem[];
  lifestyle: HabitItem[];
}
