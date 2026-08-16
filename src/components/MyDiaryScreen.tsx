import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, 
  Search, 
  Heart, 
  Pin, 
  Lock, 
  Clock, 
  Smile, 
  Award, 
  Mic, 
  MicOff, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  User, 
  Plus, 
  Bookmark, 
  BookOpen, 
  FolderOpen, 
  Sparkles, 
  Volume2, 
  Flame, 
  Eye, 
  Trash2,
  Droplet,
  Apple,
  Activity,
  Moon,
  Sun,
  Scale,
  ShoppingBag,
  Info,
  Check,
  CheckCircle2,
  LockKeyhole
} from "lucide-react";
import BottomBar from "./BottomBar";
import { useAppStore } from "../store/useAppStore";
import { NoteSpeechInputHelper } from "../utils/speechToText";
import { api } from "../utils/api";
import { ritualMatrix } from "../utils/ritualMatrix";
import { addDays, formatTimeHM, toLocalDate } from "../shared/dates";
import { getUserTimeZone } from "../shared/timeZoneStore";

// Load all recipe images for random daily photo
const recipeImages = Object.values(import.meta.glob("/src/assets/images/recipes/*.webp", { eager: true } as any)).map((mod: any) => mod.default as string);

// Compatible with the basic { text: string; time: string } type while supporting premium properties
export interface DiaryNote {
  id: string;               // Unique ID
  text: string;             // Entry text
  time: string;             // Hours:Minutes formatted string
  origin?: string;          // Module of origin: "water" | "food" | "movement" | "sleep" | "measurements" | "digestion" | "purchases" | "habits" | "recipes" | "thoughts"
  isVoice?: boolean;        // Voice dictation indicator
  isImportant?: boolean;    // Favorites system
  isPinned?: boolean;       // Anchored to the top
  sealedUntilDay?: number;  // Time Capsule cycle day (e.g. 15 or 28), 0 or undefined for normal cards
}

interface MyDiaryScreenProps {
  dayNotes: Record<number, { text: string; time: string; [key: string]: any }[]>;
  setDayNotes: React.Dispatch<React.SetStateAction<Record<number, { text: string; time: string; [key: string]: any }[]>>>;
  currentDayIndex: number;
  onBack?: () => void;
  currentName?: string;
  age?: number;
  height?: number;
  weight?: number;
  userGender?: "female" | "male";
  systolic?: number;
  diastolic?: number;
  setWeight?: React.Dispatch<React.SetStateAction<number>>;
  setSystolic?: React.Dispatch<React.SetStateAction<number>>;
  setDiastolic?: React.Dispatch<React.SetStateAction<number>>;
  onOpenCalendar?: () => void;
}

// Sparkle/Particle physics engine for the canvas bubble simulation
interface Bubble {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  speedX: number;
  opacity: number;
  color: string;
  wobbleSpeed: number;
  wobbleAmount: number;
  wobbleOffset: number;
  scaleSign: number;
}

export default function MyDiaryScreen({
  dayNotes,
  setDayNotes,
  currentDayIndex: initialDayIndex,
  onBack: propsOnBack,
  currentName: propsUserName = "",
  age = 28,
  height = 165,
  weight: propWeight = 50,
  userGender = "female",
  systolic: propSystolic = 120,
  diastolic: propDiastolic = 80,
  setWeight,
  setSystolic,
  setDiastolic,
  onOpenCalendar
}: MyDiaryScreenProps) {
  const setScreen = useAppStore((s) => s.setScreen);
  const onBack = propsOnBack || (() => setScreen("my-day"));
  const profile = useAppStore((s) => s.userProfile);
  const currentName = profile?.name || propsUserName || "";
  const currentWeight = profile?.weight ?? propWeight;
  const currentHeight = profile?.height ?? height;
  const currentSystolic = profile?.systolic ?? propSystolic;
  const currentDiastolic = profile?.diastolic ?? propDiastolic;
  // Navigation State
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(initialDayIndex || 1);

  // Night Mode State ("Выключить свет")
  const [isNightMode, setIsNightMode] = useState<boolean>(false);

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Interactive local states for inputs
  const [newNoteText, setNewNoteText] = useState<string>("");
  const [isSimulatingSpeech, setIsSimulatingSpeech] = useState<boolean>(false);
  const [speechIntervalId, setSpeechIntervalId] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("thoughts");

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearchBox, setShowSearchBox] = useState<boolean>(false);

  // Time Capsule selection overlay state
  const [capsuleTimerTargetId, setCapsuleTimerTargetId] = useState<string | null>(null);

  // Day Bookmarks ("Умные закладки дней")
  const [dayBookmarks, setDayBookmarks] = useState<Record<number, string>>({});

  // Day Mood state
  const [dayMoods, setDayMoods] = useState<Record<number, string>>({});

  // Cross-module derived entries from other tracking modules
  const [crossModuleEntries, setCrossModuleEntries] = useState<Record<number, DiaryNote[]>>({});
  const [dayDates, setDayDates] = useState<Record<number, string>>({});

  // Hook for Anna screen context awareness
  useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).currentScreenContext = {
      screen_id: "diary",
      screen_title: "Личный Дневник Осознанности",
      current_day: selectedDayIndex,
      active_tab: selectedCategory,
      current_status: showProfileModal ? "Сводка здоровья WFPB" : (isSimulatingSpeech ? "Запись аудиозаписи/мысли о рационе..." : "Ведение дневника WFPB-состояния"),
      active_modal_or_overlay: showProfileModal ? "Панель физиологических замеров" : null,
      userName: currentName,
      metrics: {
        weight_kg: currentWeight,
        blood_pressure: `${currentSystolic}/${currentDiastolic}`
      },
      user_input_values: {
        draft_note_text: newNoteText,
        is_recording_voice: isSimulatingSpeech,
        search_query: searchQuery
      }
    };

    return () => {
      if ((window as any).currentScreenContext?.screen_id === "diary") {
        delete (window as any).currentScreenContext;
      }
    };
  }, [selectedDayIndex, selectedCategory, showProfileModal, isSimulatingSpeech, currentName, currentWeight, currentSystolic, currentDiastolic, newNoteText, searchQuery]);

  // Ref to canvas for floating bubble particle effects
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulated Voice dictation quotes for premium coach feel
  const voiceSimulationQuotes = [
    "Чувствую потрясающий прилив сил сегодня. Утром выпила зелёный смузи на овсяном молоке.",
    "Норма воды выполнена уже к обеду, 7 стаканов позади. Настрой на день максимально продуктивный! 🌱",
    "Вечером погуляла по парку быстрым шагом около 45 минут. Суставы лёгкие, дыхание ровное, без соли в еде нет отёков.",
    "На обед приготовила запечённую тыкву с нутом и свежим шпинатом. Очень сытно и чисто растительный состав.",
    "Сон сегодня был глубоким, заснула в 22:30, проснулась без будильника. Микробиота довольна!"
  ];

  // Particle Bubble animation effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let bubbles: Bubble[] = [];

    // Resize container
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 420;
      canvas.height = canvas.parentElement?.clientHeight || 844;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Color choices based on theme
    const getBubbleColors = () => {
      if (isNightMode) {
        return [
          "rgba(127, 181, 150, 0.12)", // Night green
          "rgba(58, 75, 72, 0.2)",     // Soft night mint
          "rgba(199, 206, 200, 0.12)", // Silver mist
          "rgba(111, 120, 111, 0.1)"   // Muted charcoal
        ];
      } else {
        return [
          "rgba(47, 107, 69, 0.08)",    // Sage green
          "rgba(207, 232, 214, 0.25)",  // Mint glass
          "rgba(207, 227, 238, 0.28)",  // Cosmic blue
          "rgba(221, 214, 243, 0.22)",  // Lavender twilight
          "rgba(243, 226, 169, 0.24)"   // Sunny glow
        ];
      }
    };

    // Draw/Tick helper
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const colors = getBubbleColors();

      // Spawn bubbles near bottom input field (x is biased towards middle-bottom)
      if (bubbles.length < 15 && Math.random() < 0.02) {
        const radius = Math.random() * 12 + 4;
        const xMin = canvas.width * 0.15;
        const xMax = canvas.width * 0.85;
        bubbles.push({
          x: Math.random() * (xMax - xMin) + xMin,
          y: canvas.height + 20,
          radius,
          speedY: -(Math.random() * 0.6 + 0.3),
          speedX: (Math.random() - 0.5) * 0.3,
          opacity: Math.random() * 0.5 + 0.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          wobbleSpeed: Math.random() * 0.02 + 0.01,
          wobbleAmount: Math.random() * 1.5 + 0.5,
          wobbleOffset: Math.random() * 100,
          scaleSign: 1
        });
      }

      // Update and draw bubble list
      bubbles.forEach((b, idx) => {
        // Move upward
        b.y += b.speedY;
        
        // Wobble sinus oscillation
        b.wobbleOffset += b.wobbleSpeed;
        const xOffset = Math.sin(b.wobbleOffset) * b.wobbleAmount;
        b.x += b.speedX + xOffset * 0.05;

        // Draw bubble
        ctx.beginPath();
        const radGrad = ctx.createRadialGradient(
          b.x - b.radius * 0.2, b.y - b.radius * 0.2, b.radius * 0.1,
          b.x, b.y, b.radius
        );
        radGrad.addColorStop(0, "rgba(255, 255, 255, 0.4)");
        radGrad.addColorStop(0.3, b.color);
        radGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.fillStyle = radGrad;
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw simple microscopic glaze highlight on top left
        ctx.beginPath();
        ctx.strokeStyle = isNightMode ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1;
        ctx.arc(b.x, b.y, b.radius * 0.8, -Math.PI * 0.75, -Math.PI * 0.25);
        ctx.stroke();

        // Check bounds or pop
        if (b.y < -30 || b.x < -10 || b.x > canvas.width + 10) {
          bubbles.splice(idx, 1);
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isNightMode]);

  // Parse any note string content to auto-detect its module characteristics!
  const getNoteInfo = (rawText: string, customOrigin?: string, customVoice?: boolean): {
    origin: string;
    label: string;
    color: string;
    textColors: string;
    icon: any;
    formattedText: string;
    isVoiceDefault: boolean;
  } => {
    const text = rawText.toLowerCase();
    
    // Explicit or parsed properties
    let origin = customOrigin || "thoughts";
    let isVoiceDefault = !!customVoice;
    let label = "Дневник";
    let color = isNightMode ? "#2A3634" : "#FBFAF7"; 
    let textColors = isNightMode ? "text-[#F4F1EA]" : "text-[#243126]";
    let icon = BookOpen;
    let formattedText = rawText;

    // Detect module from prefix in the text or manual tag selection
    if (origin === "thoughts") {
      if (text.includes("пищеварение") || text.includes("🍃") || text.includes("кишечн")) {
        origin = "digestion";
      } else if (text.includes("вода") || text.includes("💧") || text.includes("выпила") || text.includes("стакан")) {
        origin = "water";
      } else if (text.includes("сон") || text.includes("🌙") || text.includes("спала") || text.includes("заснул")) {
        origin = "sleep";
      } else if (text.includes("активность") || text.includes("🏃") || text.includes("движение") || text.includes("прогулка") || text.includes("шаги")) {
        origin = "movement";
      } else if (text.includes("замер") || text.includes("⚖️") || text.includes("вес") || text.includes("давление")) {
        origin = "measurements";
      } else if (text.includes("завтрак") || text.includes("обед") || text.includes("ужин") || text.includes("перекус") || text.includes("еда") || text.includes("кушал") || text.includes("блюдо")) {
        origin = "food";
      } else if (text.includes("покупки") || text.includes("🛒") || text.includes("купила")) {
        origin = "purchases";
      } else if (text.includes("привычки") || text.includes("норма")) {
        origin = "habits";
      } else if (text.includes("книга") || text.includes("рецепт")) {
        origin = "recipes";
      }
    }

    // Clean brackets indicator like [Голос] if present in text
    if (text.includes("[голос]") || text.includes("🎤")) {
      isVoiceDefault = true;
      formattedText = formattedText.replace(/\[Голос\]/gi, "").replace(/🎤/gi, "").trim();
    }

    // Palette parameters according to exact request:
    // Basic firm green: #2F6B45. Mint accent: #CFE8D6. Blue accent: #CFE3EE. Peach accent: #F3D8C7. Lavender accent: #DDD6F3. Warm sun: #F3E2A9.
    switch (origin) {
      case "water":
        label = "Вода";
        color = isNightMode ? "#203A43" : "#CFE3EE"; // Soft light blue accent
        textColors = isNightMode ? "text-[#E2F1F8]" : "text-[#0277BD]";
        icon = Droplet;
        break;
      case "food":
        label = "Питание";
        color = isNightMode ? "#3E2723" : "#F3D8C7"; // Soft peach accent
        textColors = isNightMode ? "text-[#EFEBE9]" : "text-[#A73A15]";
        icon = Apple;
        break;
      case "movement":
        label = "Движение";
        color = isNightMode ? "#1B5E20" : "#CFE8D6"; // Soft mint/green accent
        textColors = isNightMode ? "text-[#E8F5E9]" : "text-[#1F5F34]";
        icon = Activity;
        break;
      case "sleep":
        label = "Сон";
        color = isNightMode ? "#311B92" : "#DDD6F3"; // Soft lavender/purple accent
        textColors = isNightMode ? "text-[#EDE7F6]" : "text-[#4A148C]";
        icon = Moon;
        break;
      case "measurements":
        label = "Замеры";
        color = isNightMode ? "#455A64" : "#E7E1D6"; // Soft warm slate
        textColors = isNightMode ? "text-[#ECEFF1]" : "text-[#37474F]";
        icon = Scale;
         break;
      case "digestion":
        label = "Пищеварение";
        color = isNightMode ? "#E65100" : "#F3E2A9"; // Warm solar sun accent
        textColors = isNightMode ? "text-[#FFF3E0]" : "text-[#E65100]";
        icon = Flame;
        break;
      case "purchases":
        label = "Покупки";
        color = isNightMode ? "#2E4F4F" : "#CFE8D6"; 
        textColors = isNightMode ? "text-[#EDF2F2]" : "text-[#114E4E]";
        icon = ShoppingBag;
        break;
      case "habits":
        label = "Привычки";
        color = isNightMode ? "#1B5E20" : "#CFE8D6";
        textColors = isNightMode ? "text-[#E8F5E9]" : "text-[#1B5E20]";
        icon = Award;
        break;
      case "recipes":
        label = "Рецепты";
        color = isNightMode ? "#3E2723" : "#F3D8C7";
        textColors = isNightMode ? "text-[#EFEBE9]" : "text-[#A73A15]";
        icon = BookOpen;
        break;
      default:
        label = "Мысли";
        color = isNightMode ? "#2A3634" : "#FBFAF7"; // Surfaces card / night cards
        textColors = isNightMode ? "text-[#F4F1EA]" : "text-[#243126]";
        icon = BookOpen;
    }

    return { origin, label, color, textColors, icon, formattedText, isVoiceDefault };
  };

  // Helpers to persist mood and bookmarks
  const handleToggleBookmark = (tag: string) => {
    let newBookmark = tag;
    setDayBookmarks(prev => {
      if (prev[selectedDayIndex] === tag) {
        newBookmark = "";
        const updated = { ...prev };
        delete updated[selectedDayIndex];
        return updated;
      }
      return { ...prev, [selectedDayIndex]: tag };
    });
    
    if (dayDates[selectedDayIndex]) {
      api("/api/metrics/daily", {
        method: "POST",
        body: {
          date: dayDates[selectedDayIndex],
          dayIndex: selectedDayIndex,
          dayBookmark: newBookmark || null,
        }
      }).catch(() => {});
    }
  };

  const handleSetDayMood = (label: string) => {
    setDayMoods(prev => ({ ...prev, [selectedDayIndex]: label }));
    if (dayDates[selectedDayIndex]) {
      api("/api/metrics/daily", {
        method: "POST",
        body: {
          date: dayDates[selectedDayIndex],
          dayIndex: selectedDayIndex,
          dayMood: label,
        }
      }).catch(() => {});
    }
  };

  // Safe fetch of current notes
  const getSelectedDayNotes = (): DiaryNote[] => {
    const rawList = dayNotes[selectedDayIndex] || [];
    return rawList.map((n, idx) => {
      const fallbackId = n.id || `diary-note-temp-${selectedDayIndex}-${idx}-${(n.time || "12-00").replace(":", "-")}-${(n.text || "").slice(0, 10).replace(/[^a-zA-Z0-9]/g, "")}`;
      return {
        id: fallbackId,
        text: n.text,
        time: n.time || "12:00",
        origin: n.origin || "thoughts",
        isVoice: !!n.isVoice,
        isImportant: !!n.isImportant,
        isPinned: !!n.isPinned,
        sealedUntilDay: n.sealedUntilDay || 0
      };
    });
  };

  // Save current notes list
  const saveSelectedDayNotes = (notes: DiaryNote[]) => {
    const serialized = notes.map(n => ({
      id: n.id,
      text: n.text,
      time: n.time,
      origin: n.origin,
      isVoice: n.isVoice,
      isImportant: n.isImportant,
      isPinned: n.isPinned,
      sealedUntilDay: n.sealedUntilDay
    }));

    const updated = { ...dayNotes, [selectedDayIndex]: serialized };
    setDayNotes(updated);
  };

  // Add normal or custom note
  const handleAddNote = (text: string, isFromVoice = false) => {
    if (!text.trim()) return;

    const timeStr = formatTimeHM(new Date().toISOString(), getUserTimeZone());

    const currentNotes = getSelectedDayNotes();
    const newNote: DiaryNote = {
      id: `diary-note-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
      text: text.trim(),
      time: timeStr,
      origin: selectedCategory,
      isVoice: isFromVoice,
      isImportant: false,
      isPinned: false
    };

    saveSelectedDayNotes([...currentNotes, newNote]);

    // Persist diary entry to the database (fire-and-forget), save server ID for future DELETE
    api("/api/diary", {
      method: "POST",
      body: {
        dayIndex: selectedDayIndex,
        note: text.trim(),
        time: timeStr,
        tags: [selectedCategory].filter(Boolean),
      },
    }).then((res: any) => {
      if (res?.id) {
        // Update local note id with server UUID for future operations
        saveSelectedDayNotes(getSelectedDayNotes().map(n =>
          n.id === newNote.id ? { ...n, id: res.id } : n
        ));
      }
    }).catch(() => {});
  };

  // Toggle favorite status
  const handleToggleFavoriteNote = (noteId: string) => {
    const notes = getSelectedDayNotes();
    const updated = notes.map(n => n.id === noteId ? { ...n, isImportant: !n.isImportant } : n);
    saveSelectedDayNotes(updated);
  };

  // Toggle pin status (allows only one note to be pinned simultaneously)
  const handleTogglePinNote = (noteId: string) => {
    const notes = getSelectedDayNotes();
    const updated = notes.map(n => {
      if (n.id === noteId) {
        return { ...n, isPinned: !n.isPinned };
      }
      return { ...n, isPinned: false }; // Clear other pins
    });
    saveSelectedDayNotes(updated);
  };

  // Time Capsule Seal Action
  const handleSealInCapsule = (noteId: string, sealUntil: number) => {
    const notes = getSelectedDayNotes();
    const updated = notes.map(n => n.id === noteId ? { ...n, sealedUntilDay: sealUntil } : n);
    saveSelectedDayNotes(updated);
    setCapsuleTimerTargetId(null);
  };

  // Delete note safely
  const handleDeleteNote = (noteId: string) => {
    const notes = getSelectedDayNotes();
    const updated = notes.filter(n => n.id !== noteId);
    saveSelectedDayNotes(updated);
    // Sync delete to DB (fire-and-forget) — server IDs are UUIDs stored in note.id
    api("/api/diary/" + encodeURIComponent(noteId), {
      method: "DELETE",
    }).catch(() => {});
  };

  // Voice Speech-to-Text Setup with Pointer Events
  const diarySpeechHelperRef = useRef(new NoteSpeechInputHelper());
  const diaryHoldingMicRef = useRef(false);

  useEffect(() => {
    return () => {
      diarySpeechHelperRef.current.release();
    };
  }, []);

  // Fetch cross-module data for the selected day
  useEffect(() => {
    let cancelled = false;
    api<any>(`/api/user/state-now?dayIndex=${selectedDayIndex}`).then(data => {
      if (cancelled) return;

      // Sync diary entries for this day from the server (complete per-day data)
      if (data.diary?.length > 0) {
        setDayNotes(prev => {
          const next = { ...prev };
          if (!next[selectedDayIndex]) next[selectedDayIndex] = [];
          for (const entry of data.diary) {
            const exists = next[selectedDayIndex].some((n: any) => n.id === entry.id);
            if (!exists) {
              next[selectedDayIndex] = [{
                id: entry.id,
                text: entry.note || '',
                time: entry.time || (entry.createdAt
                  ? formatTimeHM(entry.createdAt, getUserTimeZone())
                  : ''),
                origin: Array.isArray(entry.tags) ? entry.tags[0] : 'thoughts',
                isVoice: false,
                isImportant: false,
                isPinned: false,
              }, ...next[selectedDayIndex]];
            }
          }
          return next;
        });
      }

      // Sync dayMood and dayBookmark from daily metrics
      if (data.dailyMetric?.dayMood) {
        setDayMoods(prev => ({ ...prev, [selectedDayIndex]: data.dailyMetric.dayMood }));
      }
      if (data.dailyMetric?.dayBookmark) {
        setDayBookmarks(prev => ({ ...prev, [selectedDayIndex]: data.dailyMetric.dayBookmark }));
      }

      if (data.courseStartDate) {
        const tz = getUserTimeZone();
        const targetDate = addDays(toLocalDate(new Date(data.courseStartDate), tz), selectedDayIndex - 1);
        setDayDates(prev => ({ ...prev, [selectedDayIndex]: toLocalDate(targetDate, tz) }));
      }

      const entries: DiaryNote[] = [];

      // Parse water entries
      let waterArr: any[] = [];
      try {
        waterArr = typeof data.dailyMetric?.waterEntries === 'string'
          ? JSON.parse(data.dailyMetric.waterEntries)
          : (data.dailyMetric?.waterEntries || []);
      } catch {}
      waterArr.forEach((w: any, i: number) => {
        const ts = w.time || (w.timestamp ? new Date(w.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '');
        entries.push({
          id: `water-${w.timestamp || i}-${selectedDayIndex}`,
          text: `💧 Выпито ${w.amount} мл воды`,
          time: ts,
          origin: 'water',
        });
      });

      // Parse movement entries
      let movArr: any[] = [];
      try {
        movArr = typeof data.dailyMetric?.movementLog === 'string'
          ? JSON.parse(data.dailyMetric.movementLog)
          : (data.dailyMetric?.movementLog || []);
      } catch {}
      movArr.forEach((m: any, i: number) => {
        const type = m.activityType || m.type || 'Активность';
        const mins = Math.round((m.durationSeconds || m.duration || 0) / 60);
        const ts = m.timeString || m.time || (m.timestamp ? new Date(m.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '');
        entries.push({
          id: `movement-${m.timestamp || i}-${selectedDayIndex}`,
          text: `🏃 ${type} — ${mins} мин`,
          time: ts,
          origin: 'movement',
        });
      });

      // Parse digestion entries
      let digArr: any[] = [];
      try {
        digArr = typeof data.dailyMetric?.digestionLog === 'string'
          ? JSON.parse(data.dailyMetric.digestionLog)
          : (data.dailyMetric?.digestionLog || []);
      } catch {}
      digArr.forEach((d: any, i: number) => {
        const ts = d.timestamp ? new Date(d.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
        const comfortText = d.comfort === 'good' ? 'Комфортно' : d.comfort === 'medium' ? 'Средне' : d.comfort === 'bad' ? 'Дискомфорт' : '';
        const noteText = d.note ? `. ${d.note}` : '';
        entries.push({
          id: `digestion-${d.timestamp || i}-${selectedDayIndex}`,
          text: `🍃 Пищеварение: тип ${d.bristolType || '?'}${comfortText ? `, ${comfortText}` : ''}${noteText}`,
          time: ts,
          origin: 'digestion',
        });
      });

      // Parse measurement entries
      let measArr: any[] = [];
      try {
        measArr = typeof data.dailyMetric?.measurements === 'string'
          ? JSON.parse(data.dailyMetric.measurements)
          : (data.dailyMetric?.measurements || []);
      } catch {}
      measArr.forEach((m: any, i: number) => {
        const ts = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
        const parts: string[] = [];
        if (m.weight) parts.push(`Вес: ${m.weight} кг`);
        if (m.systolic && m.diastolic) parts.push(`Давление: ${m.systolic}/${m.diastolic}`);
        if (m.pulse) parts.push(`Пульс: ${m.pulse}`);
        if (m.energy) parts.push(`Энергия: ${m.energy}/5`);
        if (m.wellbeing) parts.push(`Самочувствие: ${m.wellbeing}/5`);
        entries.push({
          id: `measurement-${m.timestamp || i}-${selectedDayIndex}`,
          text: `⚖️ ${parts.join(', ')}`,
          time: ts,
          origin: 'measurements',
        });
      });

      // Sleep entry
      if (data.dailyMetric?.sleepMinutes > 0) {
        const h = Math.floor(data.dailyMetric.sleepMinutes / 60);
        const m = data.dailyMetric.sleepMinutes % 60;
        entries.push({
          id: `sleep-${selectedDayIndex}`,
          text: `🌙 Сон: ${h} ч ${m > 0 ? m + ' мин' : ''}`,
          time: '',
          origin: 'sleep',
        });
      }

      // Meal/food count entry
      if (data.dailyMetric?.mealCount > 0) {
        entries.push({
          id: `meals-${selectedDayIndex}`,
          text: `🥦 Приёмы пищи: ${data.dailyMetric.mealCount}`,
          time: '',
          origin: 'food',
        });
      }

      // Saved dishes for this day
      if (data.savedDishes?.length > 0) {
        (data.savedDishes as any[]).forEach((d: any, i: number) => {
          if (d.dayIndex !== selectedDayIndex) return;
          const calStr = d.calories ? ` (${d.calories} ккал)` : '';
          entries.push({
            id: `dish-${d.id || i}-${selectedDayIndex}`,
            text: `🥦 Приготовлено: ${d.name}${calStr}`,
            time: d.createdAt ? new Date(d.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '',
            origin: 'food',
          });
        });
      }

      // Daily ratings
      if (data.dailyRating) {
        const r = data.dailyRating;
        if (r.wellbeing && r.energy && r.lightness) {
          entries.push({
            id: `ratings-${selectedDayIndex}`,
            text: `💭 Самочувствие: ${r.wellbeing}/5 · Энергия: ${r.energy}/5 · Лёгкость: ${r.lightness}/5`,
            time: '',
            origin: 'thoughts',
          });
        }
      }

      setCrossModuleEntries(prev => ({ ...prev, [selectedDayIndex]: entries }));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [selectedDayIndex]);

  const handleDiaryMicStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    diaryHoldingMicRef.current = true;
    setIsSimulatingSpeech(true);

    diarySpeechHelperRef.current.bindSession(
      diaryHoldingMicRef,
      newNoteText,
      (newVal) => setNewNoteText(newVal),
      (state) => { setIsSimulatingSpeech(state === "listening"); },
    );
  };

  const handleDiaryMicEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    diaryHoldingMicRef.current = false;
    diarySpeechHelperRef.current.release();
    setIsSimulatingSpeech(false);
  };

  // Simple search filter implementation across all history (all days)
  const getSearchResults = () => {
    if (!searchQuery.trim()) return [];
    
    const results: { day: number; note: DiaryNote }[] = [];
    Object.entries(dayNotes).forEach(([dayStr, notesArr]) => {
      const dayNum = Number(dayStr);
      notesArr.forEach((n, idx) => {
        if (n.text.toLowerCase().includes(searchQuery.toLowerCase())) {
          const fallbackId = n.id || `diary-note-temp-${dayNum}-${idx}-${(n.time || "12-00").replace(":", "-")}-${(n.text || "").slice(0, 10).replace(/[^a-zA-Z0-9]/g, "")}`;
          results.push({
            day: dayNum,
            note: {
              id: fallbackId,
              text: n.text,
              time: n.time || "12:00",
              origin: n.origin || "thoughts",
              isVoice: !!n.isVoice,
              isImportant: !!n.isImportant,
              isPinned: !!n.isPinned,
              sealedUntilDay: n.sealedUntilDay || 0
            }
          });
        }
      });
    });
    return results;
  };

  // Night Mode Styles Configuration values
  // Light values
  // Background: #F7F4EE, Cards: #FBFAF7, Borders: #E7E1D6, Text main: #243126, Text sec: #6F786F, Green: #2F6B45
  // Night values
  // Background: #1F2A28, Cards: #2A3634, Text main: #F4F1EA, Text sec: #C7CEC8, Accent green: #7FB596
  const primaryBg = isNightMode ? "bg-[#1F2A28]" : "bg-[#F7F4EE]";
  const cardBg = isNightMode ? "bg-[#2A3634]" : "bg-[#FBFAF7]";
  const borderCol = isNightMode ? "border-[#2D3F3C]" : "border-[#E7E1D6]";
  const labelText = isNightMode ? "text-[#C7CEC8]" : "text-[#6F786F]";
  const bodyText = isNightMode ? "text-[#F4F1EA]" : "text-[#243126]";
  const brandGreen = isNightMode ? "text-[#7FB596]" : "text-[#2F6B45]";
  const brandGreenBg = isNightMode ? "bg-[#7FB596]/15" : "bg-[#2F6B45]/8";

  // Timeline entries (diary + cross-module)
  const allCurrentNotes = getSelectedDayNotes();
  const crossNotes = crossModuleEntries[selectedDayIndex] || [];
  const allTimelineNotes = [...allCurrentNotes, ...crossNotes].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return b.time.localeCompare(a.time);
  });
  const pinnedNote = allTimelineNotes.find(n => n.isPinned);
  const normalNotes = allTimelineNotes.filter(n => !n.isPinned);

  // Filter Favorite Only inside page if needed (local layout state)
  const [filterFavoritesOnly, setFilterFavoritesOnly] = useState<boolean>(false);
  const activeTimelineNotes = filterFavoritesOnly 
    ? normalNotes.filter(n => n.isImportant) 
    : normalNotes;

  // Evening Ritual Logic
  const ritualTimeStr = profile?.ritualTime || "21:00";
  const [ritualStatus, setRitualStatus] = useState<"waiting" | "active" | "completed">("waiting");
  const [annaResponses, setAnnaResponses] = useState({ qBody: "", qPsycho: "", qUnexpected: "" });
  const [ritualTimeLeft, setRitualTimeLeft] = useState<string>("");
  const [ritualAvatarImg, setRitualAvatarImg] = useState<string>("");
  const [showAnnaRitual, setShowAnnaRitual] = useState<boolean>(true);

  useEffect(() => {
    // Generate a stable random avatar for the waiting state from specific folders
    const allowedFolders = ["affirmation", "joy_and_support", "important_affirmation"];
    const folder = allowedFolders[Math.floor(Math.random() * allowedFolders.length)];
    const num = Math.floor(Math.random() * 6) + 1; // 1-6
    setRitualAvatarImg(`/anna/${folder}/${num}.png`);
  }, [selectedDayIndex]);

  useEffect(() => {
    let cancelled = false;
    // Check if already completed
    api<any>(`/api/evening-ritual?dayIndex=${selectedDayIndex}`).then(data => {
      if (cancelled) return;
      if (data && data.id) {
        setRitualStatus("completed");
        setAnnaResponses({
          qBody: data.answerBody || "",
          qPsycho: data.answerPsycho || "",
          qUnexpected: data.answerUnexpected || "",
        });
      } else {
        // Evaluate time if not completed
        const [hr, min] = ritualTimeStr.split(":").map(Number);
        
        const interval = setInterval(() => {
          if (cancelled) return;
          const now = new Date();
          const target = new Date();
          target.setHours(hr, min, 0, 0);

          if (now.getTime() >= target.getTime()) {
            setRitualStatus("active");
            setRitualTimeLeft("");
            clearInterval(interval);
          } else {
            setRitualStatus("waiting");
            const diffMs = target.getTime() - now.getTime();
            const h = Math.floor(diffMs / 3600000);
            const m = Math.floor((diffMs % 3600000) / 60000);
            const s = Math.floor((diffMs % 60000) / 1000);
            setRitualTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
          }
        }, 1000);
        return () => clearInterval(interval);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [selectedDayIndex, ritualTimeStr]);

  const currentRitualQuestions = ritualMatrix[selectedDayIndex] || ritualMatrix[1];

  const handleSaveAnnaRitual = () => {
    if (!annaResponses.qBody.trim() && !annaResponses.qPsycho.trim() && !annaResponses.qUnexpected.trim()) return;

    api("/api/evening-ritual", {
      method: "POST",
      body: {
        dayIndex: selectedDayIndex,
        answerBody: annaResponses.qBody.trim(),
        answerPsycho: annaResponses.qPsycho.trim(),
        answerUnexpected: annaResponses.qUnexpected.trim(),
      },
    }).then(() => {
      setRitualStatus("completed");
    }).catch(() => {});
  };

  // Dynamic Photo of the Day state
  const [dayPhotos, setDayPhotos] = useState<Record<number, string>>({});

  const handlePhotoSelect = () => {
    const random = recipeImages[Math.floor(Math.random() * recipeImages.length)];
    setDayPhotos(prev => ({ ...prev, [selectedDayIndex]: random }));
  };

  // Pick a random recipe image on mount or day change
  useEffect(() => {
    if (!dayPhotos[selectedDayIndex] && recipeImages.length > 0) {
      handlePhotoSelect();
    }
  }, [selectedDayIndex]);

  // Dynamically inject custom milestones/achievements in the timeline flow based on day
  const renderInjectedAchievements = (index: number) => {
    // Only inject at index 1 to keep timeline natural inside card list
    if (index !== 1) return null;

    const cards = [];
    if (selectedDayIndex >= 7) {
      cards.push(
        <motion.div 
          key="achievement-week"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-4 rounded-[24px] border ${borderCol} ${isNightMode ? 'bg-[#3A4B48]' : 'bg-[#CFE8D6]/40'} flex items-start gap-3.5 mb-4 shadow-sm`}
        >
          <div className="w-10 h-10 rounded-full bg-[#2F6B45]/15 flex items-center justify-center text-[18px] shrink-0 text-amber-500">
            🏆
          </div>
          <div className="flex-1 flex flex-col items-start text-left">
            <span className="text-[11px] font-black tracking-wider uppercase text-amber-600 font-sans leading-none">ДОСТИЖЕНИЕ ЦИКЛА</span>
            <span className={`text-[14px] font-bold ${bodyText} mt-1 font-sans`}>Неделя WFPB завершена!</span>
            <span className={`text-[12px] ${labelText} leading-normal mt-0.5`}>Ваш организм прошёл первый рубеж мягкой очистки артерий и адаптации рецепторов. Анна гордится вашей стойкостью! 💚</span>
          </div>
        </motion.div>
      );
    }

    if (selectedDayIndex >= 3) {
      cards.push(
        <motion.div 
          key="achievement-water"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-4 rounded-[24px] border ${borderCol} ${isNightMode ? 'bg-[#2E3C3A]' : 'bg-[#CFE3EE]/40'} flex items-start gap-3.5 mb-4 shadow-sm`}
        >
          <div className="w-10 h-10 rounded-full bg-[#0288D1]/15 flex items-center justify-center text-[18px] shrink-0 text-[#0288D1]">
            💧
          </div>
          <div className="flex-1 flex flex-col items-start text-left">
            <span className="text-[11px] font-black tracking-wider uppercase text-[#0288D1] font-sans leading-none">ГИДРАТАЦИЯ</span>
            <span className={`text-[14px] font-bold ${bodyText} mt-1 font-sans`}>Выполнен питьевой режим</span>
            <span className={`text-[12px] ${labelText} leading-normal mt-0.5`}>Несколько дней подряд вы выпиваете дневную норму чистой структурированной влаги. Микроциркуляция клеток значительно улучшилась!</span>
          </div>
        </motion.div>
      );
    }

    return cards.length > 0 ? (
      <div className="flex flex-col gap-3">
        {cards}
      </div>
    ) : null;
  };

  return (
    <div className={`flex-1 flex flex-col min-h-[828px] ${primaryBg} transition-colors duration-300 relative select-none overflow-hidden pb-4 rounded-[40px]`}>
      
      {/* Floating Canvas Particles Bubble Layer */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
      />

      {/* Primary Scrollable Scroll container */}
      <div className="flex-1 flex flex-col overflow-y-auto max-h-[720px] scrollbar-none z-20 px-4 pt-1 pb-24">
        
        {/* HEADER AREA */}
        <div className="flex justify-between items-center mb-4 mt-3">
          {/* USER NAME BAR (NATIVE PERSONAL MARKER) */}
          <div className="flex flex-col text-left">
            <span className={`text-[12px] font-black uppercase tracking-widest ${labelText} font-sans leading-none`}>ЛИЧНЫЙ ДНЕВНИК</span>
            <button 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-1.5 mt-1.5 bg-white/20 backdrop-blur-sm hover:bg-white/40 border border-slate-200/50 hover:border-slate-300 rounded-full px-3 py-1 text-left transition-all active:scale-95 outline-none cursor-pointer"
            >
              <User className={`w-4 h-4 ${brandGreen}`} />
              <span className={`text-[14px] sm:text-[15px] font-black leading-none ${bodyText} font-sans`}>
                {currentName || "Пользователь"}
              </span>
              <span className="text-[10px] text-slate-400">▼</span>
            </button>
          </div>

          {/* RIGHT ACTION BUTTONS */}
          <div className="flex gap-2">
            {/* SEARCH */}
            <button
              onClick={() => { setShowSearchBox(!showSearchBox); setSearchQuery(""); }}
              className={`w-9 h-9 rounded-full ${cardBg} border ${borderCol} flex items-center justify-center ${bodyText} hover:bg-slate-100/10 active:scale-90 transition-transform cursor-pointer outline-none`}
            >
              <Search className="w-4.5 h-4.5 stroke-[2.2]" />
            </button>

            {/* NIGHT MODE ("Выключить свет") */}
            <button
              onClick={() => setIsNightMode(!isNightMode)}
              title="Выключить свет"
              className={`w-9 h-9 rounded-full ${cardBg} border ${borderCol} flex items-center justify-center ${bodyText} hover:bg-slate-100/10 active:scale-90 transition-transform cursor-pointer outline-none`}
            >
              {isNightMode ? (
                <Sun className="w-4.5 h-4.5 text-amber-400 animate-spin" style={{ animationDuration: '20s' }} />
              ) : (
                <Moon className="w-4.5 h-4.5 text-slate-500" />
              )}
            </button>

            {/* EXIT TERMINAL HOME */}
            <button
              onClick={onBack}
              className={`w-9 h-9 rounded-full ${cardBg} border ${borderCol} flex items-center justify-center ${bodyText} hover:bg-emerald-50 active:scale-90 transition-all cursor-pointer font-bold outline-none`}
            >
              <X className="w-4.5 h-4.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* SEARCH BOX EXPANSION */}
        {showSearchBox && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3.5 rounded-[24px] border ${borderCol} ${cardBg} mb-4 flex flex-col text-left shadow-sm`}
          >
            <span className={`text-[11px] font-black uppercase tracking-wider ${labelText} font-sans`}>ПОИСК ПО ИСТОРИИ</span>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="энергия, сон, сахар, суп, вес..."
                className={`flex-1 text-[13.5px] font-bold p-2.5 rounded-xl border ${borderCol} bg-transparent ${bodyText} outline-none focus:ring-1 focus:ring-[#2F6B45]/50 font-sans`}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="px-3 bg-slate-100 rounded-xl text-slate-500 font-bold text-[12px]"
                >
                  Сбросить
                </button>
              )}
            </div>

            {/* SEARCH RESULTS */}
            {searchQuery.trim() && (
              <div className="mt-3.5 max-h-[180px] overflow-y-auto pr-1 flex flex-col gap-2">
                {getSearchResults().length > 0 ? (
                  getSearchResults().map((res, i) => {
                    const info = getNoteInfo(res.note.text, res.note.origin);
                    const IconComponent = info.icon;
                    return (
                      <div 
                        key={i} 
                        onClick={() => { setSelectedDayIndex(res.day); setShowSearchBox(false); }}
                        className={`p-2.5 rounded-xl border ${borderCol} bg-white/40 cursor-pointer hover:bg-white/80 active:scale-98 transition-all text-left flex items-start gap-2.5`}
                      >
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[11px] shrink-0">
                          {res.day}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                            <span>ДЕНЬ {res.day} • {res.note.time}</span>
                            <span>{info.label}</span>
                          </div>
                          <p className={`text-[12.5px] font-bold ${bodyText} mt-0.5 truncate font-sans`}>
                            {info.formattedText}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className={`text-[12px] ${labelText} italic font-medium`}>Ничего не найдено. Попробуйте поискать другие слова!</span>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* CYCLE DAYS NAVIGATION COMPONENT (1 to 28) */}
        <div className={`p-3.5 rounded-[28px] border ${borderCol} ${cardBg} mb-4 flex flex-col relative shadow-sm`}>
          <div className="flex justify-between items-center mb-2.5">
            <span className={`text-[11px] font-black uppercase tracking-wider ${labelText} font-sans`}>ДЕНЬ ЦИКЛА</span>
            <div className="flex gap-1.5">
              <button 
                onClick={() => setSelectedDayIndex(p => Math.max(1, p - 1))}
                className={`w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center ${bodyText}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setSelectedDayIndex(p => Math.min(28, p + 1))}
                className={`w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center ${bodyText}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Horizontal scroll list of days */}
          <div className="flex gap-2.5 overflow-x-auto pr-1 pb-1.5 scrollbar-none scroll-smooth">
            {Array.from({ length: 28 }, (_, i) => i + 1).map(day => {
              const isActive = day === selectedDayIndex;
              const hasNotesToday = dayNotes[day] && dayNotes[day].length > 0;
              const bookmark = dayBookmarks[day];

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDayIndex(day)}
                  className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0 border transition-all active:scale-95 cursor-pointer relative ${
                    isActive 
                      ? "bg-[#2F6B45] border-[#2F6B45] text-white shadow-md shadow-[#2F6B45]/15 font-black" 
                      : `${cardBg} ${borderCol} ${bodyText} font-bold hover:border-slate-400`
                  }`}
                >
                  <span className="text-[11px] uppercase tracking-tighter opacity-70 leading-none">Дн</span>
                  <span className="text-[14px] leading-tight font-sans mt-0.5">{day}</span>
                  
                  {/* Indicator for existing notes */}
                  {hasNotesToday && !isActive && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#16B551]" />
                  )}

                  {/* Bookmark badge */}
                  {bookmark && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] bg-amber-400 text-slate-950 px-1 rounded-full font-black scale-90 border border-white">
                      ★
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* SMART DAY BOOKMARKS & MOOD BAR */}
        <div className={`p-4 rounded-[28px] border ${borderCol} ${cardBg} mb-4 flex flex-col text-left shadow-sm`}>
          
          {/* Day Title and Smart Bookmarks */}
          <div className="flex flex-wrap justify-between items-start gap-2 mb-3.5">
            <div>
              <h2 className={`text-[21px] font-black text-slate-800 tracking-tight leading-none ${bodyText} font-sans`}>
                День {selectedDayIndex}
                {dayBookmarks[selectedDayIndex] && (
                  <span className="text-[12px] bg-amber-400/20 text-amber-700 font-bold px-2 py-0.5 rounded-full ml-2 inline-block font-sans lowercase shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] border border-amber-400/30">
                    🏷️ {dayBookmarks[selectedDayIndex]}
                  </span>
                )}
              </h2>
              <span className={`text-[11px] ${labelText} block mt-1.5 font-medium`}>Лента вашего здоровья за этот день цикла</span>
            </div>

            {/* Smart Day tagger pills */}
            <div className="flex flex-wrap gap-1">
              {["Победа", "Инсайт", "Важный", "Прорыв"].map(tag => {
                const isSelected = dayBookmarks[selectedDayIndex] === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => handleToggleBookmark(tag)}
                    className={`text-[10px] sm:text-[10.5px] font-black px-2.5 py-1 rounded-full border cursor-pointer transition-all active:scale-95 ${
                      isSelected 
                        ? "bg-amber-400 border-amber-400 text-slate-900 font-black shadow-sm"
                        : "bg-black/5 border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {tag === "Победа" ? "🏆 " : tag === "Инсайт" ? "💡 " : tag === "Важный" ? "⭐ " : "🚀 "}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`w-full h-px ${borderCol} mb-3.5`} />

          {/* DAY MOOD SELECTOR */}
          <div className="text-left flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <span className={`text-[11px] font-black uppercase tracking-wider ${labelText} font-sans`}>НАСТРОЕНИЕ ДНЯ</span>
              <span className={`text-[12px] font-medium text-[#16B551] block font-sans`}>
                Показатель: {dayMoods[selectedDayIndex] || "Не выбрано"}
              </span>
            </div>
            
            <div className="flex gap-1.5 py-0.5">
              {[
                { label: "Отлично", face: "😊" },
                { label: "Хорошо", face: "🙂" },
                { label: "Обычно", face: "😐" },
                { label: "Тяжело", face: "😔" },
                { label: "Очень тяжело", face: "😫" }
              ].map(item => {
                const isSelected = dayMoods[selectedDayIndex] === item.label;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleSetDayMood(item.label)}
                    title={item.label}
                    className={`w-8.5 h-8.5 rounded-full flex items-center justify-center text-[16px] border cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                      isSelected 
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/12"
                        : "bg-slate-50 border-slate-200/60"
                    }`}
                  >
                    {item.face}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* EMOTIONAL ANCHOR MEMORIES BLOCK (ВОСПОМИНАНИЯ) */}
        {(() => {
          // Find if there is a note from 7 days ago, or else Day 1 note, or show premium generic memory from Anna
          const daysAgoIndex = selectedDayIndex > 7 ? selectedDayIndex - 7 : 1;
          const memoryNotesList = dayNotes[daysAgoIndex] || [];
          const hasMemoryNote = memoryNotesList.length > 0;
          const memoryText = hasMemoryNote 
            ? memoryNotesList[0].text 
            : `«Начали 28-дневный WFPB цикл в полной боевой готовности. Убрали соль и сахар из рациона, заправились энергией зелени.»`;

          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-[28px] border ${borderCol} bg-gradient-to-tr ${isNightMode ? 'from-amber-950/20 to-[#2A3634]' : 'from-yellow-50/60 to-[#FBFAF7]'} text-left mb-4 shadow-sm relative overflow-hidden`}
            >
              {/* Soft decorative golden light */}
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-yellow-500/5 rounded-full blur-2xl" />

              <span className="text-[11px] font-black tracking-wider uppercase text-amber-600 font-sans leading-none flex items-center gap-1">
                ⏳ ВОСПОМИНАНИЕ • ДЕНЬ {daysAgoIndex}
              </span>
              
              <div className="flex gap-3.5 mt-2 font-serif select-text mt-2.5">
                <span className="text-[28px] text-amber-300 leading-none">“</span>
                <p className={`text-[13.5px] italic font-medium ${bodyText} leading-relaxed font-sans`}>
                  {memoryText}
                </p>
              </div>

              <div className="flex justify-between items-end mt-3 pt-2.5 border-t border-dashed border-slate-200/60">
                <div className="flex flex-col text-left">
                  <span className="text-[13.5px] text-amber-600 font-extrabold font-sans leading-none">Анна</span>
                  <span className="text-[10px] text-amber-500/80 font-bold mt-0.5 leading-none font-sans">Советник WFPB</span>
                </div>
                {!hasMemoryNote && <span className="text-[10px] text-slate-400 italic">Справочная запись</span>}
              </div>
            </motion.div>
          );
        })()}

        {/* TIME CAPSULE TIMER COUNTER INFO */}
        {allCurrentNotes.some(n => n.sealedUntilDay > 0) && (
          <div className={`p-3 rounded-2xl border ${borderCol} ${brandGreenBg} text-left mb-3.5 flex items-center gap-2.5 shadow-sm`}>
            <LockKeyhole className={`w-4.5 h-4.5 ${brandGreen}`} />
            <span className={`text-[12px] font-bold ${bodyText} leading-tight font-sans`}>
              В Дневнике бережно запечатана Капсула Времени. Она откроется на {allCurrentNotes.find(n => n.sealedUntilDay > 0)?.sealedUntilDay} дне вашего цикла WFPB!
            </span>
          </div>
        )}

        {/* TIMELINE ARCHIVE лента */}
        <div className="flex flex-col text-left mb-4 relative pl-3 border-l border-[#2F6B45]/20 gap-4 mt-1">
          
          {/* 1. PINNED ANCHOR CARD */}
          {pinnedNote && (
            <div className="relative -left-3.5 w-full">
              <div className="absolute top-3 left-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white" />
              <div className="pl-6">
                <div className={`p-4 rounded-[28px] border-2 border-amber-300 ${cardBg} shadow-lg shadow-amber-500/5 flex flex-col`}>
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 font-sans flex items-center gap-1.5 bg-amber-100/40 px-2.5 py-1 rounded-full">
                      <Pin className="w-3 h-3 text-amber-700 rotate-[45deg]" /> ЗАКРЕПЛЕННЫЙ ЯКОРЬ ДНЯ
                    </span>
                    <span className="text-[10px] text-slate-400 font-extrabold">{pinnedNote.time}</span>
                  </div>

                  <p className={`text-[14px] font-black ${bodyText} leading-relaxed font-sans select-text`}>
                    {pinnedNote.text}
                  </p>

                  <div className="flex justify-end gap-3 mt-3 pt-2.5 border-t border-slate-100">
                    <button 
                      onClick={() => handleTogglePinNote(pinnedNote.id)}
                      className="text-[12px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Открепить
                    </button>
                    <button 
                      onClick={() => handleToggleFavoriteNote(pinnedNote.id)}
                      className={`text-[12px] font-black flex items-center gap-1 ${pinnedNote.isImportant ? 'text-[#16B551]' : 'text-slate-400'}`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${pinnedNote.isImportant ? 'fill-current' : ''}`} /> Важно
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Filter Header */}
          <div className="flex justify-between items-center pr-1 mt-1 mb-2">
            <span className={`text-[11px] font-black uppercase tracking-wider ${labelText} font-sans`}>
              ХРОНИКА ДНЯ ({normalNotes.length})
            </span>
            
            <button
              onClick={() => setFilterFavoritesOnly(!filterFavoritesOnly)}
              className={`text-[11px] font-black px-2.5 py-1 rounded-full border cursor-pointer select-none transition-all ${
                filterFavoritesOnly 
                  ? "bg-[#2D6A4F] border-[#2D6A4F] text-white"
                  : "bg-black/5 border-slate-200 text-slate-600"
              }`}
            >
              ⭐ {filterFavoritesOnly ? "Только важные" : "Показать все"}
            </button>
          </div>

          {/* EMPTY STATE */}
          {activeTimelineNotes.length === 0 && (
            <div className={`p-8 rounded-[36px] border border-dashed ${borderCol} bg-white/20 text-center flex flex-col items-center justify-center my-2`}>
              <FolderOpen className="w-9 h-9 text-slate-300 mb-2.5" />
              <span className={`text-[14px] font-semibold text-slate-500 leading-tight block font-sans`}>
                Сегодня записей в этой категории пока нет
              </span>
              <span className="text-[12px] text-slate-400/80 leading-normal block max-w-xs mt-1 font-sans">
                Начните день с записи воды, питания, веса или напишите свои дзен-мысли в поле ниже! 🌱💚
              </span>
            </div>
          )}

          {/* 2. CHRONICS NORMAL CARDS */}
          {activeTimelineNotes.map((note, index) => {
            const info = getNoteInfo(note.text, note.origin, note.isVoice);
            const IconComponent = info.icon;
            const isSealed = note.sealedUntilDay > 0;

            return (
              <React.Fragment key={note.id}>
                <div className="relative -left-3.5 w-full">
                  
                  {/* Timeline point axis icon indicator */}
                  <div className={`absolute top-4 left-0 w-3 h-3 rounded-full border-2 border-white ${
                    info.origin === "water" ? "bg-sky-400" :
                    info.origin === "food" ? "bg-orange-400" :
                    info.origin === "movement" ? "bg-emerald-400" :
                    "bg-[#2F6B45]"
                  }`} />

                  <div className="pl-6">
                    <motion.div 
                      key={note.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-[28px] border ${borderCol} ${cardBg} hover:shadow-md transition-shadow relative flex flex-col text-left`}
                    >
                        {/* Note Module Pill Tag Header */}
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className="px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: info.color }}>
                              <IconComponent className={`w-3 h-3 ${info.textColors.split(" ")[0]}`} />
                              <span className={`text-[10px] font-black ${info.textColors} tracking-tight font-sans`}>
                                {info.label}
                              </span>
                            </div>
                            {note.isVoice && (
                              <span className="text-[9.5px] bg-slate-100 text-slate-500 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider font-sans ml-1">
                                🎤 Голос
                              </span>
                            )}
                          </div>
                        <span className="text-[11px] text-slate-400 font-extrabold">{note.time}</span>
                      </div>

                      {/* CARD CONTENT BODY WITH CAPSULE TIMING SUPPORT */}
                      {isSealed ? (
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center py-5 text-center mt-1">
                          <Lock className="w-7 h-7 text-amber-500 mb-1.5" />
                          <span className="text-[13px] font-bold text-slate-700 font-sans leading-tight">Запись бережно запечатана</span>
                          <span className="text-[11px] text-slate-400 mt-1 font-sans">
                            Раскроется на {note.sealedUntilDay}-й день цикла WFPB
                          </span>
                        </div>
                      ) : (
                        <p className={`text-[13.5px] font-bold ${bodyText} leading-relaxed font-sans whitespace-pre-wrap select-text`}>
                          {info.formattedText}
                        </p>
                      )}

                      {/* BOTTOM TOOL ACTIONS AREA */}
                      <div className={`flex justify-between items-center mt-3 pt-2.5 border-t ${borderCol}`}>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleToggleFavoriteNote(note.id)}
                            className={`p-1.5 rounded-full bg-slate-50/60 flex items-center justify-center hover:bg-slate-100 border ${borderCol}`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${note.isImportant ? 'fill-emerald-500 text-emerald-600' : 'text-slate-400'}`} />
                          </button>
                          
                          <button 
                            onClick={() => handleTogglePinNote(note.id)}
                            title="Закрепить как главную запись дня"
                            className={`p-1.5 rounded-full bg-slate-50/60 flex items-center justify-center hover:bg-slate-100 border ${borderCol}`}
                          >
                            <Pin className="w-3.5 h-3.5 text-slate-400" />
                          </button>

                          <button 
                            onClick={() => setCapsuleTimerTargetId(note.id)}
                            title="Запечатать в капсулу времени"
                            className={`p-1.5 rounded-full bg-slate-50/60 flex items-center justify-center hover:bg-slate-100 border ${borderCol}`}
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>

                        {/* DELETE TRIGGER */}
                        <button 
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 px-2.5 rounded-xl border border-rose-100 hover:bg-rose-50 text-[11px] font-bold text-rose-500 flex items-center gap-1 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Удалить
                        </button>
                      </div>

                    </motion.div>
                  </div>
                </div>

                {/* Dynamically Inject Milestones and Achievements on Timeline path */}
                {renderInjectedAchievements(index)}
              </React.Fragment>
            );
          })}

        </div>

        {/* PHOTO OF THE DAY WIDGET (ФОТО АНКЕР ДНЯ) */}
        <div className={`p-4 rounded-[28px] border ${borderCol} ${cardBg} text-left mb-4 shadow-sm`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[11px] font-black uppercase tracking-wider ${labelText} font-sans leading-none flex items-center gap-1.5`}>
              📸 ФОТО АНКЕР ДНЯ
            </span>
            <button
              onClick={handlePhotoSelect}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              🔄 Сменить
            </button>
          </div>
          
          {dayPhotos[selectedDayIndex] ? (
            <div className="rounded-2xl overflow-hidden">
              <img 
                src={dayPhotos[selectedDayIndex]} 
                alt="Визуальный анкер дня" 
                className="w-full h-44 object-cover" 
              />
            </div>
          ) : (
            <div className="h-28 rounded-2xl bg-slate-100 flex items-center justify-center">
              <span className="text-[12px] text-slate-400 font-medium">Загрузка...</span>
            </div>
          )}
        </div>

        {/* ANNA'S EVENING RITUAL (ВЕЧЕРНИЙ РИТУАЛ АННЫ) */}
        {showAnnaRitual && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-4 rounded-[32px] border ${borderCol} ${cardBg} text-left mb-6 shadow-md relative`}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-black tracking-wider uppercase text-emerald-600 font-sans leading-none flex items-center gap-1">
                ⭐ ВЕЧЕРНИЙ РИТУАЛ С АННОЙ
              </span>
              <button 
                onClick={() => setShowAnnaRitual(false)}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 font-sans"
              >
                Закрыть
              </button>
            </div>

            {ritualStatus === "waiting" && (
              <div className="flex flex-col items-center justify-center py-4">
                {ritualAvatarImg && (
                  <img src={ritualAvatarImg} className="w-16 h-16 rounded-full mb-3 shadow-md" alt="Анна" />
                )}
                <span className={`text-[14px] font-bold ${bodyText} font-sans mb-1`}>Ритуал откроется в {ritualTimeStr}</span>
                <span className="text-[24px] font-black text-emerald-600 font-sans tracking-widest">{ritualTimeLeft}</span>
                <span className={`text-[11px] text-slate-400 mt-2 text-center max-w-[200px] leading-tight`}>Анна готовит персональные вопросы для {selectedDayIndex}-го дня</span>
              </div>
            )}

            {ritualStatus === "active" && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col text-left">
                  <label className={`text-[12px] font-bold ${brandGreen} mb-1.5 font-sans leading-tight`}>Тело: {currentRitualQuestions.q_body}</label>
                  <textarea 
                    value={annaResponses.qBody} 
                    onChange={(e) => setAnnaResponses(p => ({ ...p, qBody: e.target.value }))}
                    placeholder="Напишите ответ..."
                    rows={2}
                    className={`text-[13px] font-bold p-3 rounded-xl border ${borderCol} bg-transparent ${bodyText} outline-none placeholder:text-slate-300 font-sans resize-none`}
                  />
                </div>

                <div className="flex flex-col text-left">
                  <label className={`text-[12px] font-bold ${brandGreen} mb-1.5 font-sans leading-tight`}>Психология: {currentRitualQuestions.q_psycho}</label>
                  <textarea 
                    value={annaResponses.qPsycho} 
                    onChange={(e) => setAnnaResponses(p => ({ ...p, qPsycho: e.target.value }))}
                    placeholder="Напишите ответ..."
                    rows={2}
                    className={`text-[13px] font-bold p-3 rounded-xl border ${borderCol} bg-transparent ${bodyText} outline-none placeholder:text-slate-300 font-sans resize-none`}
                  />
                </div>

                <div className="flex flex-col text-left">
                  <label className={`text-[12px] font-bold ${brandGreen} mb-1.5 font-sans leading-tight`}>Инсайт: {currentRitualQuestions.q_unexpected}</label>
                  <textarea 
                    value={annaResponses.qUnexpected} 
                    onChange={(e) => setAnnaResponses(p => ({ ...p, qUnexpected: e.target.value }))}
                    placeholder="Напишите ответ..."
                    rows={2}
                    className={`text-[13px] font-bold p-3 rounded-xl border ${borderCol} bg-transparent ${bodyText} outline-none placeholder:text-slate-300 font-sans resize-none`}
                  />
                </div>

                <button 
                  onClick={handleSaveAnnaRitual}
                  disabled={!annaResponses.qBody.trim() && !annaResponses.qPsycho.trim() && !annaResponses.qUnexpected.trim()}
                  className="w-full py-3 bg-[#2F6B45] text-white rounded-2xl text-[13px] font-black hover:bg-emerald-700 transition-all font-sans tracking-tight disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                >
                  Записать ответы в Дневник
                </button>
              </div>
            )}

            {ritualStatus === "completed" && (
              <div className="flex flex-col py-2">
                <div className="flex items-center gap-2 mb-4 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-[13px] font-black font-sans">Ритуал успешно завершён</span>
                </div>
                
                {annaResponses.qBody && (
                  <div className="mb-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Тело</span>
                    <p className={`text-[12.5px] ${bodyText} font-medium leading-tight`}>{annaResponses.qBody}</p>
                  </div>
                )}
                {annaResponses.qPsycho && (
                  <div className="mb-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Психология</span>
                    <p className={`text-[12.5px] ${bodyText} font-medium leading-tight`}>{annaResponses.qPsycho}</p>
                  </div>
                )}
                {annaResponses.qUnexpected && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Инсайт</span>
                    <p className={`text-[12.5px] ${bodyText} font-medium leading-tight`}>{annaResponses.qUnexpected}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

      </div>

      {/* INPUT FIELD CONTAINER - FIXED AREA AT BOTTOM OF SCROLLVIEW */}
      <div className={`absolute bottom-0 inset-x-0 p-3.5 bg-gradient-to-t ${isNightMode ? 'from-[#1F2A28] via-[#1F2A28]/95 to-transparent' : 'from-[#F7F4EE] via-[#F7F4EE]/95 to-transparent'} z-40 border-t border-dashed ${borderCol} flex flex-col gap-2.5 rounded-b-[40px]`}>
        
        {/* Module Category Selection indicators */}
        <div className="flex gap-2 overflow-x-auto pb-1 items-center scrollbar-thin" style={{ WebkitOverflowScrolling: "touch" }}>
          <span className={`text-[10px] uppercase font-black tracking-widest ${labelText} mr-1 font-sans leading-none shrink-0`}>Раздел:</span>
          {[
            { id: "thoughts", label: "Мысли", emo: "💭" },
            { id: "water", label: "Вода", emo: "💧" },
            { id: "food", label: "Питание", emo: "🥦" },
            { id: "movement", label: "Движение", emo: "🏃" },
            { id: "sleep", label: "Сон", emo: "🌙" },
            { id: "measurements", label: "Замеры", emo: "⚖️" },
            { id: "digestion", label: "Пищеварение", emo: "🍃" }
          ].map(cat => {
            const isSel = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 shrink-0 transition-all focus:outline-none ${
                  isSel 
                    ? "bg-[#2F6B45] text-white shadow-sm font-black"
                    : "bg-black/5 text-[#6F786F]"
                }`}
              >
                <span>{cat.emo}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Input Bar Form */}
        <div className="flex items-center gap-3 relative">
          
          {/* Typing/Speech Input field */}
          <div className="flex-1 relative flex items-center">
            
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder={isSimulatingSpeech ? "Диктую голосом... 🎙️" : "Напишите, что хочется сохранить"}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddNote(newNoteText);
                  setNewNoteText("");
                }
              }}
              className={`w-full text-[13.5px] font-bold pr-11 pl-4 py-3 rounded-2xl border ${borderCol} ${cardBg} ${bodyText} outline-none focus:ring-1 focus:ring-[#2F6B45]/60 transition-all placeholder:text-slate-400 max-h-12 overflow-y-auto scrollbar-none shadow-inner font-sans`}
            />

            {/* Clean Microphone voice button with continuous recognition on hold */}
            <button
              onPointerDown={handleDiaryMicStart}
              onPointerUp={handleDiaryMicEnd}
              onPointerCancel={handleDiaryMicEnd}
              className={`absolute right-2.5 w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all select-none touch-none cursor-pointer ${
                isSimulatingSpeech 
                  ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/15 scale-105" 
                  : "bg-slate-50 hover:bg-slate-100/50 text-slate-400"
              }`}
              title="Надиктовать (Удерживайте для записи)"
            >
              {isSimulatingSpeech ? <Mic className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-slate-400" />}
            </button>
          </div>

          {/* Send text button */}
          <button
            onClick={() => { handleAddNote(newNoteText); setNewNoteText(""); }}
            disabled={!newNoteText.trim() && !isSimulatingSpeech}
            className="w-11 h-11 bg-[#2F6B45] hover:bg-emerald-700 text-white font-black rounded-full shadow-lg shadow-[#2F6B45]/20 flex items-center justify-center transition-transform outline-none cursor-pointer disabled:opacity-40 select-none active:scale-95 shrink-0"
          >
            <Plus className="w-5.5 h-5.5 stroke-[2.8]" />
          </button>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 3. TIME CAPSULE CHOICE SELECTION LIST DIALOG MODAL MAP */}
      {capsuleTimerTargetId && (
        <AnimatePresence>
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark blur backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900"
              onClick={() => setCapsuleTimerTargetId(null)}
            />

            {/* Centered Dialog card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-[280px] p-5 rounded-[32px] border ${borderCol} ${cardBg} shadow-2xl relative text-center z-10 max-h-[85dvh] overflow-y-auto overscroll-contain`}
            >
              <div className="w-11 h-11 rounded-full bg-amber-400/10 flex items-center justify-center text-[18px] mx-auto text-amber-500 mb-3">
                🔒
              </div>
              <h3 className={`text-[16px] font-black ${bodyText} font-sans`}>Капсула времени</h3>
              <p className={`text-[11.5px] ${labelText} mt-1.5 leading-relaxed font-sans`}>
                Выберите день WFPB цикла, до начертания которого эта запись останется бережно запечатана:
              </p>

              <div className="flex flex-col gap-2 mt-4">
                {[
                  { label: "Запечатать до Дня 7", day: 7 },
                  { label: "Запечатать до Дня 14", day: 14 },
                  { label: "Запечатать до Дня 21", day: 21 },
                  { label: "До конца цикла (День 28)", day: 28 }
                ].map(item => (
                  <button
                    key={item.day}
                    onClick={() => handleSealInCapsule(capsuleTimerTargetId, item.day)}
                    className="w-full py-2 bg-slate-50 border border-slate-200/60 hover:bg-slate-100 rounded-xl text-[12.5px] font-bold text-slate-700 active:scale-98 transition-all font-sans"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCapsuleTimerTargetId(null)}
                className="text-[11.5px] font-extrabold text-rose-500 block mx-auto mt-3.5 font-sans"
              >
                Отмена
              </button>
            </motion.div>
          </div>
        </AnimatePresence>
      )}

      {/* ========================================================= */}
      {/* 4. USER DYNAMIC ACTUAL STATISTICS MODAL DISPLAY */}
      {showProfileModal && (
        <AnimatePresence>
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            {/* Blurry dark lock */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F172A]"
              onClick={() => setShowProfileModal(false)}
            />

            {/* Cozy detailed modal layout */}
            <motion.div 
              initial={{ opacity: 0, y: 15, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.96 }}
              className={`w-full max-w-[325px] p-5 rounded-[36px] border ${borderCol} ${cardBg} shadow-2xl relative text-left z-10 flex flex-col justify-start max-h-[85dvh] overflow-y-auto overscroll-contain`}
            >
              {/* Header Title with dismiss cross */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-1.5 text-left">
                  <User className={`w-5 h-5 ${brandGreen}`} />
                  <h3 className={`text-[17px] font-black ${bodyText} font-sans tracking-tight`}>Сводка здоровья WFPB</h3>
                </div>
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className={`w-full h-px ${borderCol} mb-3.5`} />

              {/* Static read-only fields */}
              <div className="flex flex-col gap-3.5 text-left mb-5">
                
                {/* Username */}
                <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 text-[12.5px] leading-snug">
                  <span className={`text-[10px] font-black uppercase text-slate-400 font-sans block mb-0.5`}>ИМЯ ПОЛЬЗОВАТЕЛЯ</span>
                  <p className={`font-black ${bodyText} font-sans`}>{currentName || "Пользователь"}</p>
                </div>

                {/* Weight & Height */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 text-[12.5px]">
                    <span className="text-[10px] font-black uppercase text-slate-400 font-sans block mb-0.5">ВЕС (кг)</span>
                    <p className={`font-black font-sans ${bodyText} text-[14px] mt-0.5`}>{currentWeight}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 text-[12.5px]">
                    <span className="text-[10px] font-black uppercase text-slate-400 font-sans block mb-0.5">РОСТ (см)</span>
                    <p className={`font-black ${bodyText} font-sans mt-0.5`}>{currentHeight} см</p>
                  </div>
                </div>

                {/* Blood pressure */}
                <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100 text-[12.5px]">
                  <span className="text-[10px] font-black uppercase text-slate-400 font-sans block mb-1">АРТЕРИАЛЬНОЕ ДАВЛЕНИЕ (мм)</span>
                  <p className={`font-black ${bodyText} font-sans text-[14px]`}>{currentSystolic}/{currentDiastolic} мм</p>
                </div>

                {/* Info snippet */}
                <div className="p-3 rounded-2xl bg-emerald-50/45 border border-emerald-100 text-[11.5px] leading-relaxed text-slate-600 flex gap-2">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="font-medium font-sans">
                    Показатели автоматически учитываются ассистентом Анной для адаптации WFPB вех и водных балансов.
                  </p>
                </div>

              </div>

              {/* Only Закрыть button */}
              <div className="flex gap-2.5 mt-auto">
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[12.5px] font-black text-slate-500 font-sans tracking-tight text-center transition-colors"
                >
                  Закрыть
                </button>
              </div>

            </motion.div>
          </div>
        </AnimatePresence>
      )}

    </div>
  );
}
