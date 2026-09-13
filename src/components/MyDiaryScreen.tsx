import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, 
  Heart, 
  Pin, 
  Lock, 
  Clock, 
  Smile, 
  Award,  
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
  Scale,
  ShoppingBag,
  Info,
  Check,
  LockKeyhole,
  Moon,
  Sun,
  User,
  Search,
  ChevronLeft,
  X,
  MoreHorizontal
} from "lucide-react";
import BottomBar from "./BottomBar";
import DiaryHeader from "./diary/DiaryHeader";
import DiaryDayNavigator from "./diary/DiaryDayNavigator";
import type { DiaryNote } from "./diary/diary.types";
import { useAppStore } from "../store/useAppStore";
import { api } from "../utils/api";
import { addDays, formatTimeHM, toLocalDate } from "../shared/dates";
import { getUserTimeZone } from "../shared/timeZoneStore";
import { ANNA_RECIPE_METADATA } from "../services/annaRecipeMetadata";
import { getRecipeImagePath } from "../utils/recipeImageMapper";

// Load all recipe images for random daily photo
const recipeImages = Object.values(import.meta.glob("/src/assets/images/recipes/*.webp", { eager: true } as any)).map((mod: any) => mod.default as string);
type DayRecipeAnchor = {
  title: string;
  page: number;
  image: string;
};

// Список рецептов, у которых есть картинка, читаемое название и точная страница Книги.
const recipeAnchors: DayRecipeAnchor[] = ANNA_RECIPE_METADATA.reduce<DayRecipeAnchor[]>(
  (anchors, recipe) => {
    const image = getRecipeImagePath(recipe.displayName, recipe.technicalName);

    if (!image) {
      return anchors;
    }

    anchors.push({
      title: recipe.technicalName,
      page: recipe.page,
      image,
    });

    return anchors;
  },
  []
);

// Approved module thumbnails
import waterThumb from "../assets/images/water/stat_record_crown.webp";
import sleepThumb from "../assets/images/slipping/6.webp";
import movementThumb from "../assets/images/movement/markers/vsego vremeny.webp";
import foodThumb from "../assets/images/keysustem/4.webp";
import measurementsThumb from "../assets/images/measurements/icon_progress.webp";
import digestionThumb from "../assets/images/icone/gkt.webp";
import thoughtsThumb from "../assets/images/icone/misli.webp";



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
  const [selectedCategory, setSelectedCategory] = useState<string>("thoughts");
  const composerHints: Record<string, string> = {
    thoughts: "Какая мысль или чувство важно сохранить?",
    water: "Как сегодня складывается ваш водный баланс?",
    food: "Что было важного в сегодняшнем питании?",
    movement: "Как сегодня двигалось ваше тело?",
    sleep: "Как сон повлиял на ваше самочувствие?",
    measurements: "Какие изменения вы заметили?",
    digestion: "Как чувствует себя пищеварение?",
  };

  const composerHint =
    composerHints[selectedCategory] ?? composerHints.thoughts;
  
  // Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearchBox, setShowSearchBox] = useState<boolean>(false);

  // Time Capsule selection overlay state
  const [capsuleTimerTargetId, setCapsuleTimerTargetId] = useState<string | null>(null);

  // Timeline event menu state
  const [menuOpenNoteId, setMenuOpenNoteId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // Day Bookmarks ("Умные закладки дней")
  const [dayBookmarks, setDayBookmarks] = useState<Record<number, string>>({});

  // Day Mood state
  const [dayMoods, setDayMoods] = useState<Record<number, string>>({});

  // Cross-module derived entries from other tracking modules
  const [crossModuleEntries, setCrossModuleEntries] = useState<Record<number, DiaryNote[]>>({});
  const [hiddenTimelineEventIds, setHiddenTimelineEventIds] = useState<string[]>([]);
  const [dayDates, setDayDates] = useState<Record<number, string>>({});

  // Hook for Anna screen context awareness
  useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).currentScreenContext = {
      screen_id: "diary",
      screen_title: "Личный Дневник Осознанности",
      current_day: selectedDayIndex,
      active_tab: selectedCategory,
      current_status: showProfileModal ? "Сводка здоровья WFPB" : "Ведение дневника WFPB-состояния",      active_modal_or_overlay: showProfileModal ? "Панель физиологических замеров" : null,
      userName: currentName,
      metrics: {
        weight_kg: currentWeight,
        blood_pressure: `${currentSystolic}/${currentDiastolic}`
      },
      user_input_values: {
        draft_note_text: newNoteText,
        is_recording_voice: false,        
		search_query: searchQuery
      }
    };

    return () => {
      if ((window as any).currentScreenContext?.screen_id === "diary") {
        delete (window as any).currentScreenContext;
      }
    };
  }, [selectedDayIndex, selectedCategory, showProfileModal, currentName, currentWeight, currentSystolic, currentDiastolic, newNoteText, searchQuery]);
  // Ref to canvas for floating bubble particle effects
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = noteTextareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 124)}px`;
  }, [newNoteText]);
  const categoryScrollRef = useRef<HTMLDivElement | null>(null);

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

  // Module metadata mapping for Timeline redesign
  const getModuleMetadata = (origin: string): {
    cardBg: string;
    nodeColor: string;
    thumbSrc: string;
  } => {
    switch (origin) {
      case "water":
        return { cardBg: "#EBF5FB", nodeColor: "#159FE5", thumbSrc: waterThumb };
      case "sleep":
        return { cardBg: "#F3EEFF", nodeColor: "#8B6FD6", thumbSrc: sleepThumb };
      case "movement":
        return { cardBg: "#FFF0E5", nodeColor: "#E68A4A", thumbSrc: movementThumb };
      case "food":
        return { cardBg: "#EAF5E1", nodeColor: "#5E9E58", thumbSrc: foodThumb };
      case "measurements":
        return { cardBg: "#FDE6E9", nodeColor: "#D9738A", thumbSrc: measurementsThumb };
      case "digestion":
        return { cardBg: "#FFF6E5", nodeColor: "#D89A2B", thumbSrc: digestionThumb };
      case "purchases":
      case "habits":
      case "recipes":
      case "thoughts":
      default:
        return { cardBg: "#F4F6F8", nodeColor: "#6F8999", thumbSrc: thoughtsThumb };
    }
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
        setDayNotes((prev) => ({
          ...prev,
          [selectedDayIndex]: (prev[selectedDayIndex] ?? []).map((note) =>
            note.id === newNote.id ? { ...note, id: res.id } : note
          ),
        }));
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

    // Hide a Timeline card permanently in Diary only.
  const handleDeleteNote = (noteId: string) => {
    const confirmed = window.confirm(
      "Удалить эту плашку из дневника навсегда?\n\nИсходные данные в других модулях не изменятся."
    );

    if (!confirmed) return;

    setHiddenTimelineEventIds((currentIds) =>
      currentIds.includes(noteId) ? currentIds : [...currentIds, noteId]
    );

    api("/api/diary/hidden-events", {
      method: "POST",
      body: { eventId: noteId },
    }).catch(() => {
      setHiddenTimelineEventIds((currentIds) =>
        currentIds.filter((id) => id !== noteId)
      );
    });
  };

  // Timeline event menu handlers
  const handleOpenMenu = (noteId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setMenuOpenNoteId(noteId);
    setMenuPosition({ x: rect.right, y: rect.top });
  };

  const handleCloseMenu = () => {
    setMenuOpenNoteId(null);
    setMenuPosition(null);
  };

  const handleMenuAction = (action: string, noteId: string) => {
    handleCloseMenu();
    switch (action) {
      case "pin":
        handleTogglePinNote(noteId);
        break;
      case "favorite":
        handleToggleFavoriteNote(noteId);
        break;
      case "capsule":
        setCapsuleTimerTargetId(noteId);
        break;
      case "delete":
        handleDeleteNote(noteId);
        break;
    }
  };

    useEffect(() => {
    let cancelled = false;

    api("/api/diary/hidden-events")
      .then((data) => {
        if (cancelled) return;

        const eventIds = Array.isArray(data?.eventIds) ? data.eventIds : [];
        setHiddenTimelineEventIds(eventIds);
      })
      .catch(() => {
        if (!cancelled) {
          setHiddenTimelineEventIds([]);
        }
      });

    return () => {
      cancelled = true;
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
          text: `Выпито ${w.amount} мл воды`,
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
          text: `${type} — ${mins} мин`,
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
          text: `Пищеварение: тип ${d.bristolType || '?'}${comfortText ? `, ${comfortText}` : ''}${noteText}`,
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
          text: `${parts.join(', ')}`,
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
          text: `Сон: ${h} ч ${m > 0 ? m + ' мин' : ''}`,
          time: '',
          origin: 'sleep',
        });
      }

      // Meal/food count entry
      if (data.dailyMetric?.mealCount > 0) {
        entries.push({
          id: `meals-${selectedDayIndex}`,
          text: `Приёмы пищи: ${data.dailyMetric.mealCount}`,
          time: '',
          origin: 'food',
        });
      }

      // Daily ratings
      if (data.dailyRating) {
        const r = data.dailyRating;
        if (r.wellbeing && r.energy && r.lightness) {
          entries.push({
            id: `ratings-${selectedDayIndex}`,
            text: `Самочувствие: ${r.wellbeing}/5 · Энергия: ${r.energy}/5 · Лёгкость: ${r.lightness}/5`,
            time: '',
            origin: 'thoughts',
          });
        }
      }

      setCrossModuleEntries(prev => ({ ...prev, [selectedDayIndex]: entries }));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [selectedDayIndex]);

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
  const allTimelineNotes = [...allCurrentNotes, ...crossNotes]
  .filter((note) => !hiddenTimelineEventIds.includes(note.id))
  .sort((a, b) => {
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

  // Якорь рецепта для текущего дня: название, страница и картинка.
  const [dayRecipeAnchors, setDayRecipeAnchors] =
    useState<Record<number, DayRecipeAnchor>>({});

  const handlePhotoSelect = () => {
    if (recipeAnchors.length === 0) return;

    setDayRecipeAnchors((current) => {
      const currentAnchor = current[selectedDayIndex];
      const alternatives = recipeAnchors.filter(
        (anchor) => anchor.image !== currentAnchor?.image
      );
      const pool = alternatives.length > 0 ? alternatives : recipeAnchors;
      const nextAnchor = pool[Math.floor(Math.random() * pool.length)];

      return {
        ...current,
        [selectedDayIndex]: nextAnchor,
      };
    });
  };

  // При первом открытии дня выбираем якорь рецепта, если его ещё нет.
  useEffect(() => {
    if (dayRecipeAnchors[selectedDayIndex] || recipeAnchors.length === 0) {
      return;
    }

    const nextAnchor =
      recipeAnchors[Math.floor(Math.random() * recipeAnchors.length)];

    setDayRecipeAnchors((current) => ({
      ...current,
      [selectedDayIndex]: nextAnchor,
    }));
  }, [selectedDayIndex, dayRecipeAnchors]);

  return (
    <div className={`flex-1 flex flex-col min-h-[828px] ${isNightMode ? primaryBg : "bg-[linear-gradient(to_bottom,#FFFDFC_0%,#FFF9F4_18%,#FFF4EC_48%,#FDF7F1_100%)]"} transition-colors duration-300 relative select-none overflow-hidden pb-4 rounded-b-[40px] pt-5`}>
      
      {/* Floating Canvas Particles Bubble Layer */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
      />

      {/* Diary Header Component */}
      <DiaryHeader
        onBack={onBack}
        onToggleProfileModal={() => setShowProfileModal(true)}
        onToggleSearch={() => { setShowSearchBox(!showSearchBox); setSearchQuery(""); }}
        onToggleNightMode={() => setIsNightMode(!isNightMode)}
        currentName={currentName || "Пользователь"}
        isNightMode={isNightMode}
      />

      {/* SEARCH BOX EXPANSION */}
      {showSearchBox && (
        <div 
          className={`p-3.5 rounded-[24px] border ${borderCol} ${cardBg} mb-[18px] flex flex-col text-left shadow-sm mx-4`}
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
        </div>
      )}

      {!showSearchBox && <div className="h-[18px]" />}

      {/* Primary Scrollable Scroll container */}
      <div className="flex-1 flex flex-col overflow-y-auto max-h-[720px] scrollbar-none z-20 px-4 pt-1 pb-24">

        {/* CYCLE DAYS NAVIGATION COMPONENT (1 to 28) */}
        <div className="mb-5">
          <DiaryDayNavigator
            selectedDayIndex={selectedDayIndex}
            minDay={1}
            maxDay={28}
            hasNotesByDay={Object.keys(dayNotes).reduce((acc, dayStr) => {
              const day = Number(dayStr);
              acc[day] = !!(dayNotes[day] && dayNotes[day].length > 0);
              return acc;
            }, {} as Record<number, boolean>)}
            bookmarkByDay={dayBookmarks}
            onSelectDay={setSelectedDayIndex}
            isNightMode={isNightMode}
          />
        </div>

       

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

          {/* 2. CHRONICS NORMAL CARDS - COMPACT TIMELINE */}
          {activeTimelineNotes.map((note, index) => {
            const info = getNoteInfo(note.text, note.origin, note.isVoice);
            const isSealed = note.sealedUntilDay > 0;
            const moduleMeta = getModuleMetadata(note.origin || "thoughts");

            return (
              <React.Fragment key={note.id}>
                <div className="flex items-start gap-4 mb-4">
                  {/* Timeline vertical line and node */}
                  <div className="flex flex-col items-center">
                    {index === 0 && (
                      <div 
                        className="w-[2px] bg-[#D9E1DA]"
                        style={{ height: "8px" }}
                      />
                    )}
                    <div 
                      className="w-4 h-4 rounded-full ring-[3px] ring-white flex-shrink-0"
                      style={{ backgroundColor: moduleMeta.nodeColor }}
                    />
                    {index === activeTimelineNotes.length - 1 ? (
                      <div 
                        className="w-[2px] bg-[#D9E1DA]"
                        style={{ height: "8px" }}
                      />
                    ) : (
                      <div 
                        className="w-[2px] bg-[#D9E1DA] flex-1"
                        style={{ minHeight: "16px" }}
                      />
                    )}
                  </div>

                  {/* Event card */}
                  <div className="flex-1 min-w-0">
                    <motion.div 
                      key={note.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`py-[6px] px-3 rounded-[22px] relative flex items-center gap-[10px]`}
                      style={{ 
                        backgroundColor: moduleMeta.cardBg,
                        boxShadow: "0 2px 8px rgba(68,83,74,0.06)"
                      }}
                    >
                      {/* Thumbnail */}
                      <img 
                        src={moduleMeta.thumbSrc}
                        alt=""
                        className="w-9 h-9 flex-none shrink-0 object-contain"
                      />
                      
                      {/* Summary text - takes available space */}
                      <p className="flex-1 min-w-0 break-words whitespace-pre-wrap text-[16px] font-normal leading-snug text-[#243126]">
                        {info.formattedText}
                      </p>
                      
                      {/* Right column: ⋯ button and timestamp stacked */}
                      <div className="flex flex-col items-end gap-0.5 flex-none shrink-0">
                        {/* More menu button at top-right */}
                        <button
                          onClick={(e) => handleOpenMenu(note.id, e)}
                          aria-label="Действия с записью"
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-[#53625A] transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        {/* Timestamp directly under ⋯, aligned to its right edge */}
                        <span className="text-[12px] font-normal text-[#7A94A4]">
                          {note.time}
                        </span>
                      </div>

                      {/* Sealed overlay */}
                      {isSealed && (
                        <div className="absolute inset-0 rounded-[22px] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center px-3 text-center">
                          <Lock className="w-5 h-5 text-amber-500 mb-1" />
                          <span className="text-[12px] font-normal text-slate-700 font-sans leading-tight">
                            Запись бережно запечатана
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 font-sans">
                            Раскроется на {note.sealedUntilDay}-й день цикла WFPB
                          </span>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>

               
              </React.Fragment>
            );
          })}

        </div>

                {/* Timeline event menu dropdown */}
        {menuOpenNoteId && menuPosition && (
          <div 
            className="fixed z-50 bg-white rounded-2xl shadow-lg border border-slate-200 py-2 min-w-[200px]"
            style={{ 
              top: menuPosition.y, 
              left: Math.min(menuPosition.x, window.innerWidth - 220) 
            }}
          >
            <button
              onClick={() => handleMenuAction("delete", menuOpenNoteId)}
              className="w-full px-4 py-2.5 text-left text-[14px] font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Удалить
            </button>
          </div>
        )}

        {/* Click outside to close menu */}
        {menuOpenNoteId && (
          <div 
            className="fixed inset-0 z-40"
            onClick={handleCloseMenu}
          />
        )}

        {/* PHOTO OF THE DAY WIDGET (ФОТО АНКЕР ДНЯ) */}
        <div className="mb-4">
          {dayRecipeAnchors[selectedDayIndex] ? (
            <div className="relative h-52 overflow-hidden rounded-[22px] shadow-sm">
              <img
                src={dayRecipeAnchors[selectedDayIndex].image}
                alt={dayRecipeAnchors[selectedDayIndex].title}
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Нижний градиент и подпись рецепта */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 px-4 pb-3.5 text-left">
                <p className="line-clamp-2 text-[18px] font-semibold leading-snug text-white font-sans">
                  {dayRecipeAnchors[selectedDayIndex].title}
                </p>
                <p className="mt-0.5 text-[15px] font-medium text-white/75 font-sans">
                  стр. {dayRecipeAnchors[selectedDayIndex].page}
                </p>
              </div>

              {/* Кнопка смены фото поверх карточки */}
              <button
                type="button"
                onClick={handlePhotoSelect}
                className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-[12px] font-medium text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/30 active:scale-95 font-sans"
              >
                Сменить
              </button>
            </div>
          ) : (
            <div className="h-52 rounded-[22px] bg-slate-100 flex items-center justify-center shadow-sm">
              <span className="text-[12px] text-slate-400 font-medium font-sans">
                Загрузка...
              </span>
            </div>
          )}
        </div>

      </div>

      {/* INPUT FIELD CONTAINER - FIXED AREA AT BOTTOM OF SCROLLVIEW */}
      <div
        className={`absolute bottom-4 inset-x-0 px-3.5 pt-3.5 pb-3.9 bg-gradient-to-t ${
          isNightMode
            ? "from-[#1F2A28]/98 via-[#1F2A28]/94 to-[#1F2A28]/72"
            : "from-[#F7F4EE]/98 via-[#F7F4EE]/94 to-[#F7F4EE]/72"
        } z-40 flex flex-col gap-2.5 rounded-b-[40px] border-t ${borderCol} shadow-[0_-8px_24px_rgba(68,83,74,0.06)] backdrop-blur-md`}
      >
        {/* Module Category Selection indicators */}
        <div
          className="flex gap-2.5 overflow-x-auto pb-1 items-center scrollbar-none"
          style={{ WebkitOverflowScrolling: "touch" }}
          onWheel={(event) => {
            const container = event.currentTarget;

            if (container.scrollWidth <= container.clientWidth) {
              return;
            }

            const maxScrollLeft =
              container.scrollWidth - container.clientWidth;

            if (
              (event.deltaY < 0 && container.scrollLeft <= 0) ||
              (event.deltaY > 0 && container.scrollLeft >= maxScrollLeft)
            ) {
              return;
            }

            event.preventDefault();
            container.scrollLeft += event.deltaY;
          }}
        >
          {[
            { id: "thoughts", label: "Мысли" },
            { id: "water", label: "Вода" },
            { id: "food", label: "Питание" },
            { id: "movement", label: "Движение" },
            { id: "sleep", label: "Сон" },
            { id: "measurements", label: "Замеры" },
            { id: "digestion", label: "Пищеварение" },
          ].map((cat) => {
            const isSel = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold leading-none transition-all focus:outline-none active:scale-95 ${
                  isSel
                    ? "border-[#B9DCC4] bg-[#CFE8D6] text-[#1F5F34] shadow-sm"
                    : isNightMode
                      ? "border-[#3D504C] bg-[#2A3634] text-[#C7CEC8] hover:bg-[#34433F]"
                      : "border-[#E7E1D6] bg-[#FBFAF7] text-[#53625A] hover:bg-white"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

                {/* Input Bar Form */}
        <div className="relative">
          <textarea
            ref={noteTextareaRef}
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Напишите, что хочется сохранить"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddNote(newNoteText);
                setNewNoteText("");
              }
            }}
            className={`w-full min-h-[44px] max-h-[124px] resize-none overflow-y-auto scrollbar-none rounded-2xl border ${borderCol} ${cardBg} ${bodyText} py-3 pl-4 pr-14 text-[13.5px] font-bold leading-5 outline-none shadow-inner transition-all placeholder:text-slate-400 focus:ring-1 focus:ring-[#2F6B45]/60 font-sans`}
          />

          <button
            type="button"
            onClick={() => {
              handleAddNote(newNoteText);
              setNewNoteText("");
            }}
            disabled={!newNoteText.trim()}
            aria-label="Добавить заметку"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#2F6B45] text-white shadow-md shadow-[#2F6B45]/20 transition-all hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4 stroke-[2.8]" />
          </button>
        </div>

        <p
          className={`-mt-1 px-2 text-center text-[14px] font-medium leading-snug font-sans ${
            isNightMode ? "text-[#AEBBB5]" : "text-[#7A8A80]"
          }`}
        >
          {composerHint}
        </p>
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
