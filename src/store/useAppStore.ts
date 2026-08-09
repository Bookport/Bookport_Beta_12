import { create } from "zustand";
import { getTelegramInitData } from "../utils/telegramClient";

export interface FoodCacheItem {
  id: string;
  nameRu: string;
  nameEn: string;
  wfpbStatus: string;
  fdcId: number | null;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  fiber: number;
  water: number;
}

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
  id: string;
  type: string;
  activityType?: string;
  duration: number;
  durationSeconds?: number;
  dayIndex: number;
  timestamp: number;
  timeString: string;
}

export interface MeasurementEntry {
  dayIndex: number;
  weight: number | null;
  systolic: number | null;
  diastolic: number | null;
  timestamp: number;
  id?: string;
  timeString?: string;
  pulse?: number | null;
  tonus?: string;
  energy?: string;
  mood?: string;
  wellbeing?: string;
}

export interface DigestionEntry {
  dayIndex: number;
  type: string;
  note: string;
  timestamp: number;
  bristolType: number;
  comfort: string;
  symptoms: string[];
  timeString?: string;
  timeInterval?: string;
  id?: string;
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

export interface AppState {
  screen: Screen;
  foodCache: FoodCacheItem[];
  foodCacheLoading: boolean;
  userProfile: UserProfile;
  telegramUser: TelegramUser | null;
  isCalendarOpen: boolean;
  isOverlayOpen: boolean;
  isDigestionModalOpen: boolean;
  digestionModalDay?: number | null;
  selectedGraphDay: number;
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
  globalProgress: number;
  unshippedProgress: number;
  isGodMode: boolean;

  fetchFoodCache: () => Promise<void>;
  setScreen: (screen: Screen) => void;
  setUserProfile: (profile: UserProfile) => void;
  setTelegramUser: (user: TelegramUser | null) => void;
  setClickCount: (count: number) => void;
  setGlobalProgress: (count: number) => void;
  setUnshippedProgress: (count: number) => void;
  setCalendarOpen: (open: boolean) => void;
  setOverlayOpen: (open: boolean) => void;
  setDigestionModalOpen: (open: boolean, day?: number) => void;
  setSelectedGraphDay: (day: number) => void;
  setActiveNotification: (notif: AppNotification | null) => void;

  setWaterEntries: (entries: WaterEntry[]) => void;
  setSleepEntries: (entries: SleepEntry[]) => void;
  setMovementEntries: (entries: MovementEntry[]) => void;
  addMovementEntry: (entry: MovementEntry) => void;
  setMeasurementEntries: (entries: MeasurementEntry[]) => void;
  setDigestionEntries: (entries: DigestionEntry[]) => void;
  addDigestionEntry: (entry: DigestionEntry) => void;
  setRecipeState: (type: string, state: RecipeState) => void;
  setCalendarNotes: (notes: CalendarNotes) => void;
  setCourseStartTimestamp: (ts: number | null) => void;
  setIsGodMode: (v: boolean) => void;

  initApp: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  screen: "welcome",
  foodCache: [],
  foodCacheLoading: false,
  userProfile: {},
  telegramUser: null,
  isCalendarOpen: false,
  isOverlayOpen: false,
  isDigestionModalOpen: false,
  digestionModalDay: null,
  selectedGraphDay: 1,
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
  globalProgress: 0,
  unshippedProgress: 0,
  isGodMode: false,

  setScreen: (screen) => set({ screen }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  setTelegramUser: (user) => set({ telegramUser: user }),
  setClickCount: (count) => { set({ clickCount: count }); localStorage.setItem('wfpb_click_count', String(count)); },
  setGlobalProgress: (count) => set({ globalProgress: count }),
  setUnshippedProgress: (count) => set({ unshippedProgress: count }),
  setCalendarOpen: (open) => set({ isCalendarOpen: open }),
  setOverlayOpen: (open) => set({ isOverlayOpen: open }),
  setDigestionModalOpen: (open, day) => set({ isDigestionModalOpen: open, digestionModalDay: day || null }),
  setSelectedGraphDay: (day) => set({ selectedGraphDay: day }),
  setActiveNotification: (notif) => set({ activeNotification: notif }),

  setWaterEntries: (entries) => set({ waterEntries: entries }),
  setSleepEntries: (entries) => set({ sleepEntries: entries }),
  setMovementEntries: (entries) => set({ movementEntries: entries }),
  addMovementEntry: (entry) => set((s) => ({ movementEntries: [...s.movementEntries, entry] })),
  setMeasurementEntries: (entries) => set({ measurementEntries: entries }),
  setDigestionEntries: (entries) => set({ digestionEntries: entries }),
  addDigestionEntry: (entry) => set((s) => ({ digestionEntries: [...s.digestionEntries, entry] })),
  setRecipeState: (type, state) =>
    set((s) => ({ recipeStates: { ...s.recipeStates, [type]: state } })),
  setCalendarNotes: (notes) => set({ calendarNotes: notes }),
  setCourseStartTimestamp: (ts) => set({ courseStartTimestamp: ts }),
  setIsGodMode: (v) => set({ isGodMode: v }),

  fetchFoodCache: async () => {
    try {
      set({ foodCacheLoading: true });
      const resp = await fetch("/api/food", {
        headers: { "X-Telegram-Init-Data": getTelegramInitData() },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const items: FoodCacheItem[] = await resp.json();
      set({ foodCache: items, foodCacheLoading: false });
    } catch {
      set({ foodCacheLoading: false });
    }
  },

  initApp: async () => {
    try {
      const resp = await fetch("/api/user/profile", {
        headers: { "X-Telegram-Init-Data": getTelegramInitData() },
      });
      if (resp.ok) {
        const data = await resp.json();
        set({ userProfile: data, clickCount: data.clickCount || 0, globalProgress: data.globalProgress || 0 });
      }
    } catch {
      // Server not available — continue with empty profile
    }
  },
}));
