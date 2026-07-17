import { create } from "zustand";

export type Screen =
  | "welcome" | "my-page"
  | "digestion" | "my-day" | "habits-twenty" | "what-i-eat"
  | "check-composition" | "dish-analysis" | "my-dishes"
  | "from-what-is" | "book-recipes" | "purchases" | "diary"
  | "anna" | "state-now" | "settings" | "rewards" | "club";

export interface UserProfile {
  name?: string;
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
  systolic?: number;
  diastolic?: number;
  initialAge?: number;
  initialHeight?: number;
  initialWeight?: number;
  initialSystolic?: number;
  initialDiastolic?: number;
  hasSavedSettings?: boolean;
  ritualTime?: string;
  currentDayIndex?: number;
  chronicConditions?: string[];
  healthGoals?: string[];
}

export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
}

export interface WaterEntry {
  timestamp: number;
  amount: number;
  time: string;
  dayIndex: number;
}

export interface SleepEntry {
  sleepTime: string;
  wakeTime: string;
  duration: number;
  dayIndex: number;
  timestamp: number;
}

export interface MovementEntry {
  type: string;
  duration: number;
  dayIndex: number;
  timestamp: number;
}

export interface MeasurementEntry {
  dayIndex: number;
  weight: number;
  systolic: number;
  diastolic: number;
  timestamp: number;
}

export interface DigestionEntry {
  dayIndex: number;
  type: string;
  note: string;
  timestamp: number;
}

export interface RecipeState {
  done: Record<string, boolean>;
  hidden: Record<string, boolean>;
}

export interface CalendarNotes {
  [dayIndex: number]: string[];
}

export interface AppNotification {
  type: string;
  title: string;
  body: string;
  annaPhrase: string;
  colorClass: string;
  iconType: "water" | "sleep" | "measurements" | "habits" | "summary" | "tip";
}

interface AppState {
  screen: Screen;
  deviceId: string | null;
  userProfile: UserProfile;
  telegramUser: TelegramUser | null;
  isCalendarOpen: boolean;
  isOverlayOpen: boolean;
  activeNotification: AppNotification | null;

  waterEntries: WaterEntry[];
  sleepEntries: SleepEntry[];
  movementEntries: MovementEntry[];
  measurementEntries: MeasurementEntry[];
  digestionEntries: DigestionEntry[];

  recipeStates: Record<string, RecipeState>;
  calendarNotes: CalendarNotes;

  courseStartTimestamp: number | null;
  clickCount: number;
  isGodMode: boolean;

  setScreen: (screen: Screen) => void;
  setDeviceId: (id: string) => void;
  setUserProfile: (profile: UserProfile) => void;
  setTelegramUser: (user: TelegramUser | null) => void;
  setClickCount: (count: number) => void;
  setCalendarOpen: (open: boolean) => void;
  setOverlayOpen: (open: boolean) => void;
  setActiveNotification: (notif: AppNotification | null) => void;

  setWaterEntries: (entries: WaterEntry[]) => void;
  setSleepEntries: (entries: SleepEntry[]) => void;
  setMovementEntries: (entries: MovementEntry[]) => void;
  setMeasurementEntries: (entries: MeasurementEntry[]) => void;
  setDigestionEntries: (entries: DigestionEntry[]) => void;
  setRecipeState: (type: string, state: RecipeState) => void;
  setCalendarNotes: (notes: CalendarNotes) => void;
  setCourseStartTimestamp: (ts: number | null) => void;
  setIsGodMode: (v: boolean) => void;

  initApp: () => Promise<void>;
}

const DEVICE_ID_KEY = "wfpb_device_id_v2";

function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

export const useAppStore = create<AppState>((set, get) => ({
  screen: "welcome",
  deviceId: null,
  userProfile: {},
  telegramUser: null,
  isCalendarOpen: false,
  isOverlayOpen: false,
  activeNotification: null,
  waterEntries: [],
  sleepEntries: [],
  movementEntries: [],
  measurementEntries: [],
  digestionEntries: [],
  recipeStates: {},
  calendarNotes: {},
  courseStartTimestamp: null,
  clickCount: 0,
  isGodMode: false,

  setScreen: (screen) => set({ screen }),
  setDeviceId: (id) => set({ deviceId: id }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  setTelegramUser: (user) => set({ telegramUser: user }),
  setClickCount: (count) => { set({ clickCount: count }); localStorage.setItem('wfpb_click_count', String(count)); },
  setCalendarOpen: (open) => set({ isCalendarOpen: open }),
  setOverlayOpen: (open) => set({ isOverlayOpen: open }),
  setActiveNotification: (notif) => set({ activeNotification: notif }),

  setWaterEntries: (entries) => set({ waterEntries: entries }),
  setSleepEntries: (entries) => set({ sleepEntries: entries }),
  setMovementEntries: (entries) => set({ movementEntries: entries }),
  setMeasurementEntries: (entries) => set({ measurementEntries: entries }),
  setDigestionEntries: (entries) => set({ digestionEntries: entries }),
  setRecipeState: (type, state) =>
    set((s) => ({ recipeStates: { ...s.recipeStates, [type]: state } })),
  setCalendarNotes: (notes) => set({ calendarNotes: notes }),
  setCourseStartTimestamp: (ts) => set({ courseStartTimestamp: ts }),
  setIsGodMode: (v) => set({ isGodMode: v }),

  initApp: async () => {
    const deviceId = getOrCreateDeviceId();
    set({ deviceId });

    try {
      const resp = await fetch("/api/user/profile", {
        headers: { "X-Device-Id": deviceId },
      });
      if (resp.ok) {
        const data = await resp.json();
        set({ userProfile: data, clickCount: data.clickCount || 0 });
      }
    } catch {
      // Server not available — continue with empty profile
    }
  },
}));
