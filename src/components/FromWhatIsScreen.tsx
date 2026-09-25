import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  ChevronLeft, 
  Sparkles, 
  CheckCircle2, 
  MessageSquare
} from "lucide-react";
import BottomBar from "./BottomBar";
import IngredientsScreen from "./IngredientsScreen";
import fromWhatIsHeroImage from "../assets/images/icone/7.webp";
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
  onNavigateHome: propsOnNavigateHome,
  onNavigateDiary: propsOnNavigateDiary,
  onNavigateProgress: propsOnNavigateProgress,
}: FromWhatIsScreenProps) {
  const setScreen = useAppStore((s) => s.setScreen);
  const onBack = propsOnBack || (() => setScreen("my-day"));
  const onNavigateHome = propsOnNavigateHome || (() => setScreen("my-day"));
  const onNavigateDiary = propsOnNavigateDiary || (() => setScreen("what-i-eat"));
  const onNavigateProgress = propsOnNavigateProgress || (() => setScreen("habits-twenty"));
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
    <div className="flex-1 flex flex-col justify-between bg-[#FAFAFA] min-h-0 relative" id="from-what-is-screen-root">
      
      {/* 1. SCROLLABLE SCREEN CONTENT CONTAINER */}
      <div className="flex-1 min-h-0 px-5 pt-3 pb-8 overflow-y-auto no-scrollbar" id="from-what-is-scroll-container">
        
        {/* HEADER BAR */}
        <div className="relative flex items-center mb-6 z-10" id="from-what-is-header">
          <button 
            type="button" 
            onClick={onBack}
            className="relative z-10 w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-text-sec hover:text-brand-green-pure active:scale-95 transition-all cursor-pointer"
            id="from-what-is-back-btn"
          >
            <ChevronLeft className="w-6 h-6 shrink-0" />
          </button>
          
          <h2 
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap text-[17px] font-black text-text-dark tracking-tight"
            style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
          >
            Рецепты дня
          </h2>
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

        {/* MAIN VISUAL - Raw premium whole ingredients photography */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-5 text-center flex flex-col items-center justify-center"
          id="from-what-is-main-photo-card"
        >
          {/* Premium realistic photo */}
          <div className="w-full h-[180px] overflow-hidden mb-4">
            <img 
              src={fromWhatIsHeroImage}
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

        {/* MAIN CTA BUTTON - Flat pastel */}
        <button
          type="button"
          onClick={handleAddIngredientsClick}
          className="w-[min(320px,calc(100%-48px))] mx-auto h-[54px] rounded-[16px] bg-[#BFE8CD] text-[#4B5560] border-none shadow-[0_4px_0_#B8C0C7] active:translate-y-[3px] active:shadow-[0_1px_0_#B8C0C7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B5560]/40 font-extrabold text-[16px] flex items-center justify-center select-none transition-all cursor-pointer mb-5"
          id="from-what-is-cta-button"
        >
          <span style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>
            Добавить ингредиенты
          </span>
        </button>

      </div>

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
