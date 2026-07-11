import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  Sparkles, 
  PlusCircle, 
  CheckCircle2, 
  FileText,
  MessageSquare
} from "lucide-react";
import BottomBar from "./BottomBar";
import CalendarButton from "./CalendarButton";
import BriefNoteBlock from "./BriefNoteBlock";
import IngredientsScreen from "./IngredientsScreen";
import wfpbRawIngredients from "../assets/images/wfpb_raw_ingredients_1780313792914.png";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { useAppStore } from "../store/useAppStore";
import { api } from "../utils/api";
import { clientLogger } from "../utils/clientLogger";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'neutral_thoughtful', intent: 'curiosity' }).src;

export interface FromWhatIsScreenProps {
  onBack?: () => void;
  dayNotes?: Record<number, { text: string; time: string; source?: string; tags?: string[]; isVoice?: boolean }[]>;
  setDayNotes?: React.Dispatch<React.SetStateAction<Record<number, { text: string; time: string; source?: string; tags?: string[]; isVoice?: boolean }[]>>>;
  currentDayIndex: number;
  screen?: string;
  onOpenCalendar?: () => void;
  onNavigateHome?: () => void;
  onNavigateDiary?: () => void;
  onNavigateProgress?: () => void;
  onConfirmRecipe: (ingredients: any[]) => void;
}

export default function FromWhatIsScreen({
  currentDayIndex,
  onConfirmRecipe,
  onBack: propsOnBack,
  dayNotes: propsDayNotes,
  setDayNotes: propsSetDayNotes,
  screen: propsScreen,
  onOpenCalendar: propsOnOpenCalendar,
  onNavigateHome: propsOnNavigateHome,
  onNavigateDiary: propsOnNavigateDiary,
  onNavigateProgress: propsOnNavigateProgress,
}: FromWhatIsScreenProps) {
  const setScreen = useAppStore((s) => s.setScreen);
  const onBack = propsOnBack || (() => setScreen("my-day"));
  const dayNotes = propsDayNotes || {};
  const setDayNotes = propsSetDayNotes || (() => {});
  const screen = propsScreen || useAppStore((s) => s.screen);
  const onOpenCalendar = propsOnOpenCalendar || (() => {});
  const onNavigateHome = propsOnNavigateHome || (() => setScreen("my-day"));
  const onNavigateDiary = propsOnNavigateDiary || (() => setScreen("what-i-eat"));
  const onNavigateProgress = propsOnNavigateProgress || (() => setScreen("habits-twenty"));
  const [showNoteBlock, setShowNoteBlock] = useState(false);
  const [noteSavedOrSkipped, setNoteSavedOrSkipped] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSuccessBuilder, setIsSuccessBuilder] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).currentScreenContext = {
      screen_id: "from-what-is",
      screen_title: "Кулинарный конструктор «Из того, что есть»",
      current_day: currentDayIndex,
      current_status: isSuccessBuilder ? "Конструктор: рецепт успешно смоделирован!" : (showIngredients ? "Выбор ингредиентов для сборки блюда" : "Ожидание старта сборки рациона"),
      active_modal_or_overlay: showIngredients ? "Каталог ингредиентов" : null,
      user_input_values: {
        constructor_completed: isSuccessBuilder,
        selecting_components: showIngredients
      }
    };

    return () => {
      if ((window as any).currentScreenContext?.screen_id === "from-what-is") {
        delete (window as any).currentScreenContext;
      }
    };
  }, [currentDayIndex, isSuccessBuilder, showIngredients]);

  const handleSaveRecipeNote = (noteText: string, selectedTags: string[], isVoice: boolean) => {
    if (!noteText.trim() && selectedTags.length === 0) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    
    const newNote = {
      text: noteText.trim() || "Планирую блюдо из того, что есть в холодильнике 🍏",
      time: timeStr,
      source: "recipes",
      tags: selectedTags,
      isVoice
    };

    setDayNotes(prev => {
      const todayArr = prev[currentDayIndex] || [];
      return {
        ...prev,
        [currentDayIndex]: [newNote, ...todayArr]
      };
    });
    setNoteSavedOrSkipped(true);
    triggerToast("Заметка успешно сохранена в календарь дня! ✨");
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddIngredientsClick = () => {
    setShowIngredients(true);
  };

  if (showIngredients) {
    return (
      <IngredientsScreen 
        onBack={() => setShowIngredients(false)}
        onConfirm={(ingredients) => {
          if (onConfirmRecipe) {
            onConfirmRecipe(ingredients);
          }
        }}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#FAFAFA] min-h-[844px] relative" id="from-what-is-screen-root">
      
      {/* 1. SCROLLABLE SCREEN CONTENT CONTAINER */}
      <div className="flex-1 px-5 pt-3 pb-8 overflow-y-auto max-h-[720px]" id="from-what-is-scroll-container">
        
        {/* HEADER BAR */}
        <div className="flex justify-between items-center mb-6 relative z-10" id="from-what-is-header">
          <button 
            type="button" 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-text-sec hover:text-brand-green-pure active:scale-95 transition-all cursor-pointer"
            id="from-what-is-back-btn"
          >
            <ChevronLeft className="w-6 h-6 shrink-0" />
          </button>
          
          <h2 
            className="text-[17px] font-black text-text-dark tracking-tight"
            style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
          >
            Рецепты дня
          </h2>

          <CalendarButton 
            onClick={onOpenCalendar} 
            currentDayIndex={currentDayIndex} 
            dayNotes={dayNotes}
            screen={screen}
          />
        </div>

        {/* HERO TITLE & DETAILS */}
        <div className="text-left mb-6" id="from-what-is-hero-text">
          <motion.h1 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[28px] font-black text-text-dark leading-none tracking-tight mb-2"
            style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
          >
            Из того, что есть
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[15px] font-medium leading-snug text-text-sec"
            style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
          >
            Соберите сытное цельнорастительное блюдо из ингредиентов, которые уже есть у вас дома.
          </motion.p>
        </div>

        {/* MAIN VISUAL CARD - Raw premium whole ingredients photography */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="bg-white rounded-[28px] border border-gray-150/40 p-4.5 shadow-[0_10px_25px_-8px_rgba(43,49,55,0.04),_0_4px_12px_-4px_rgba(0,0,0,0.01)] mb-5 text-center flex flex-col items-center justify-center relative overflow-hidden"
          id="from-what-is-main-photo-card"
        >
          {/* Subtle soft gradient highlight background glow */}
          <div className="absolute inset-0 bg-radial-gradient(circle at center, rgba(22,181,81,0.02) 0%, transparent 70%) pointer-events-none" />

          {/* Premium realistic photo */}
          <div className="w-full h-[180px] rounded-24 overflow-hidden mb-4 bg-gray-50 flex items-center justify-center border border-gray-100">
            <img 
              src={wfpbRawIngredients} 
              alt="Ингредиенты WFPB" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover select-none"
              id="from-what-is-hero-img"
            />
          </div>

          <div className="text-left w-full px-1">
            <span className="text-[11px] font-extrabold text-brand-green-pure uppercase tracking-widest bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block mb-1.5 shadow-xs">
              Быстрый конструктор
            </span>
            <h3 
              className="text-[17px] font-bold text-text-dark tracking-tight leading-snug"
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
            >
              Ваш личный шеф-повар по запасам
            </h3>
          </div>
        </motion.div>

        {/* REPLICA ANNA - Mild warm wellness support comment */}
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-b from-[#F0FDF4] to-[#DCFCE7]/40 border border-emerald-100/60 rounded-[24px] p-4 text-left relative overflow-hidden mb-5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),_0_4px_12px_rgba(16,181,81,0.03)]"
          id="from-what-is-anna-comment-box"
        >
          <div className="flex gap-3 items-start relative z-10">
            {/* Small avatar icon for Anna */}
            <div className="relative shrink-0 select-none">
              <div className="w-[45px] h-[45px] rounded-full overflow-hidden shadow-[0_3px_8px_rgba(16,181,81,0.25)] border border-brand-green-mint/20 relative">
                <img
                  src={annaAvatarSrc}
                  alt="Анна — Советник WFPB"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-[12px] h-[12px] bg-[#10D150] rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              </span>
            </div>
            
            <div className="flex-1 flex flex-col gap-0.5">
              <div className="flex flex-col">
                <span 
                  className="text-[14px] font-black text-brand-green-dark leading-none"
                  style={{ fontFamily: '"Calibri", sans-serif' }}
                >
                  Анна
                </span>
                <span 
                  className="text-[10.5px] font-bold text-text-muted mt-0.5 leading-none"
                  style={{ fontFamily: '"Calibri", sans-serif' }}
                >
                  Советник WFPB
                </span>
              </div>
              <p 
                className="text-[13.5px] font-medium text-text-sec leading-relaxed"
                style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
              >
                «Даже из самого скромного набора цельных продуктов можно собрать сбалансированное и сытное блюдо. Мы проверим каждый ингредиент на пользу!»
              </p>
            </div>
          </div>
        </motion.div>

        {/* MAIN CTA BUTTON - Green, volumetric */}
        <motion.button
          type="button"
          onClick={handleAddIngredientsClick}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full volumetric-btn py-4 rounded-[22px] font-extrabold text-[16px] text-white flex items-center justify-center gap-2 select-none uppercase tracking-wider mb-5 border-t border-white/20 hover:brightness-105 active:brightness-95 cursor-pointer"
          id="from-what-is-cta-button"
        >
          <PlusCircle className="w-5 h-5 shrink-0" />
          <span style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>
            Добавить ингредиенты
          </span>
        </motion.button>

        {/* 4. NOTE TRIGGER SECTION */}
        <div className="mt-2 text-center" id="from-what-is-note-controller">
          {!showNoteBlock && (
            <button
              type="button"
              onClick={() => setShowNoteBlock(true)}
              className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl border border-dashed border-gray-250 text-[13px] font-bold text-text-sec hover:text-brand-green-pure hover:border-brand-green-pure/45 transition-colors cursor-pointer"
              id="from-what-is-add-note-btn"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Добавить заметку к рецепту</span>
            </button>
          )}

          {/* Collapsible/unfolded brief note block under request */}
          <AnimatePresence>
            {showNoteBlock && !noteSavedOrSkipped && (
              <div className="mt-1" id="from-what-is-brief-note-block-container">
                <BriefNoteBlock
                  moduleKey="recipes"
                  onSave={handleSaveRecipeNote}
                  onSkip={() => {
                    setNoteSavedOrSkipped(true);
                    triggerToast("Заметка пропущена");
                  }}
                />
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* TOAST POPUP NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-[92px] left-6 right-6 bg-slate-900/90 backdrop-blur-md px-4 py-3 rounded-[18px] text-white text-[13.5px] font-bold text-center border border-white/10 shadow-lg z-50 leading-snug"
            id="from-what-is-toast-overlay"
          >
            <span style={{ fontFamily: '"Calibri", sans-serif' }}>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STICKY BOTTOM TAB NAVIGATION BAR */}
      <div className="w-full shrink-0" id="from-what-is-bottom-bar-nav">
        <BottomBar 
          onHomeClick={onNavigateHome}
          onDiaryClick={onNavigateDiary}
          onAnalyticsClick={onNavigateProgress}
          activeTab="home"
        />
      </div>

    </div>
  );
}
