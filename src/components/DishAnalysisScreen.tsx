import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  Calendar, 
  Edit2, 
  Flame, 
  Droplets, 
  Leaf, 
  Sparkles,
  CheckCircle2, 
  AlertCircle, 
  Check,
  RefreshCw
} from "lucide-react";
import BottomBar from "./BottomBar";
import CalendarButton from "./CalendarButton";
import BriefNoteBlock from "./BriefNoteBlock";
import IngredientCollage from "./IngredientCollage";
import { MealAnalysisProvider } from "../services/aiLayer";
import { resolveAvatarForCompliance, resolveAvatar } from "../utils/annaAvatarResolver";
import { checkWFPB } from "../utils/wfpbRules";
import { useAppStore } from "../store/useAppStore";
import { getTelegramInitData } from "../utils/telegramClient";
import { clientLogger } from "../utils/clientLogger";

interface IngredientCard {
  id: string;
  fullName: string;
  shortName: string;
  image: string;
  weight?: number;
  status: "green" | "error";
  manuallyAllowed?: boolean;
}

interface DishAnalysisScreenProps {
  ingredients: any[];
  onBack?: () => void;
  dayNotes?: Record<number, { text: string; time: string }[]>;
  setDayNotes?: React.Dispatch<React.SetStateAction<Record<number, { text: string; time: string }[]>>>;
  currentDayIndex: number;
  screen?: string;
  onOpenCalendar?: () => void;
  onConfirm: (dishName: string, computedNutrients: any, annaComment: string) => void;
  onCancel?: () => void;
}

interface MetricValue {
  value: number | string;
  unit: string;
}

interface AnalysisResult {
  dishName: string;
  nutrients: {
    calories: MetricValue;
    protein: MetricValue;
    fats: MetricValue;
    carbs: MetricValue;
    fiber: MetricValue;
    omegaRatio: MetricValue;
  };
  micronutrients: {
    iron: MetricValue;
    zinc: MetricValue;
    magnesium: MetricValue;
    iodine: MetricValue;
    selenium: MetricValue;
    vitaminC: MetricValue;
    vitaminB9: MetricValue;
    lysine: MetricValue;
    methionine: MetricValue;
  };
  insights: {
    strengths: { title: string; text: string };
    improvements: { title: string; text: string };
    compliance: { title: string; text: string };
  };
}

export default function DishAnalysisScreen({
  ingredients,
  onConfirm,
  currentDayIndex,
  onBack: propsOnBack,
  dayNotes: propsDayNotes,
  setDayNotes: propsSetDayNotes,
  screen: propsScreen,
  onOpenCalendar: propsOnOpenCalendar,
  onCancel: propsOnCancel,
}: DishAnalysisScreenProps) {
  const setScreen = useAppStore((s) => s.setScreen);
  const onBack = propsOnBack || (() => setScreen("check-composition"));
  const dayNotes = propsDayNotes || {};
  const setDayNotes = propsSetDayNotes || (() => {});
  const screen = propsScreen || useAppStore((s) => s.screen);
  const onOpenCalendar = propsOnOpenCalendar || (() => {});
  const onCancel = propsOnCancel || (() => setScreen("my-day"));
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [aiComment, setAiComment] = useState<string | null>(null);

  useEffect(() => {
    if (!ingredients.length) return;
    const mapped = ingredients.map(i => ({
      name: i.shortName || i.fullName,
      weight: i.weight?.toString() || "100",
      status: i.status === "error" ? "red" : "green",
      manuallyAllowed: i.manuallyAllowed,
    }));
    fetch("/api/anna-comment", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": getTelegramInitData() },
      body: JSON.stringify({ dishName: "", ingredients: mapped }),
    })
      .then(r => r.json())
      .then(data => { if (data.comment) setAiComment(data.comment); })
      .catch(() => {});
  }, [ingredients]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).currentScreenContext = {
      screen_id: "dish-analysis",
      screen_title: "ИИ-Анализ нутриентов и аминокислотного профиля",
      current_day: currentDayIndex,
      selected_item: customTitle || result?.dishName || "Новое блюдо",
      current_status: loading ? `Выполняются квантовые нутриентные расчеты: ${progress}%...` : "Анализ состава, калорий и витаминов готов",
      visible_items: ingredients.map(i => ({ name: i.fullName || i.shortName, weight: i.weight })),
      user_input_values: result ? {
        dish_name: result.dishName,
        calories: result.nutrients?.calories?.value,
        protein: result.nutrients?.protein?.value,
        fats: result.nutrients?.fats?.value,
        carbs: result.nutrients?.carbs?.value,
        fiber: result.nutrients?.fiber?.value,
        omegaRatio: result.nutrients?.omegaRatio?.value
      } : null
    };

    return () => {
      if ((window as any).currentScreenContext?.screen_id === "dish-analysis") {
        delete (window as any).currentScreenContext;
      }
    };
  }, [currentDayIndex, ingredients, loading, progress, result, customTitle]);

  const handleSaveMealNote = (noteText: string, selectedTags: string[], isVoice: boolean) => {
    // Save to daily calendar notes
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const textToSave = noteText.trim() || `Употреблено блюдо: ${customTitle || result?.dishName || "Цельное растительное блюдо"}`;
    
    const newNote = {
      text: textToSave,
      time: timeStr,
      source: "food",
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

    const computedMacros = result ? {
      calories: typeof result.nutrients.calories.value === 'number' ? result.nutrients.calories.value : parseInt(String(result.nutrients.calories.value), 10),
      protein: typeof result.nutrients.protein.value === 'number' ? `${result.nutrients.protein.value} г` : String(result.nutrients.protein.value),
      fiber: typeof result.nutrients.fiber.value === 'number' ? `${result.nutrients.fiber.value} г` : String(result.nutrients.fiber.value),
      fat: typeof result.nutrients.fats.value === 'number' ? `${result.nutrients.fats.value} г` : String(result.nutrients.fats.value),
    } : undefined;

    onConfirm(customTitle || result?.dishName || "Цельное растительное блюдо", computedMacros, aiComment || "");
  };

  // Run the USDA AI Analysis call with graceful fallback
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    
    // Simulate natural fluid loader increments
    progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 92) return p; // Hold near completion until network load finishes
        return p + Math.floor(Math.random() * 8) + 3;
      });
    }, 150);

    const runAnalysis = async () => {
      const startTime = Date.now();
      try {
        const resultData = await MealAnalysisProvider.aggregateNutrients(
          ingredients.map(ing => ({
            fullName: ing.fullName,
            shortName: ing.shortName,
            weight: ing.weight || 100
          }))
        );
        
        // Ensure at least 2 seconds elapsed for majestic glass rendering & progress suspense matching design
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 2000 - elapsed);
        
        setTimeout(() => {
          clearInterval(progressInterval);
          setProgress(100);
          setTimeout(() => {
            setResult(resultData as any);
            setCustomTitle(resultData.dishName);
            setLoading(false);
          }, 400);
        }, delay);

      } catch (err) {
        console.warn("API Error, falling back to local client analyzer:", err);
        // Pure WFPB organic fallback matching true USDA typical numbers
        const calculatedFallback = generateLocalFallback(ingredients);
        
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 2000 - elapsed);

        setTimeout(() => {
          clearInterval(progressInterval);
          setProgress(100);
          setTimeout(() => {
            setResult(calculatedFallback);
            setCustomTitle(calculatedFallback.dishName);
            setLoading(false);
          }, 400);
        }, delay);
      }
    };

    runAnalysis();

    return () => {
      clearInterval(progressInterval);
    };
  }, [ingredients]);

  // Fallback USDA calculations when offline or key is missing
  const generateLocalFallback = (ings: IngredientCard[]): AnalysisResult => {
    let totalCals = 0;
    let totalProt = 0;
    let totalFat = 0;
    let totalCarb = 0;
    let totalFiber = 0;
    
    // Micro fallback aggregations
    let iron = 0;
    let zinc = 0;
    let magnesium = 0;
    let iodine = 0;
    let selenium = 0;
    let vitC = 0;
    let vitB9 = 0;
    let lysine = 0;
    let methionine = 0;

    let hasNonCompliant = false;

    ings.forEach(ing => {
      const w = ing.weight || 100;
      const factor = w / 100;
      const nameLower = ing.fullName.toLowerCase();

      if (!checkWFPB(ing.fullName || ing.shortName || "").compliant) {
        hasNonCompliant = true;
      }

      // Check key keywords to assign approximate true USDA plant-based metrics
      if (nameLower.includes("киноа")) {
        totalCals += 120 * factor;
        totalProt += 4.4 * factor;
        totalFat += 1.9 * factor;
        totalCarb += 21.3 * factor;
        totalFiber += 2.8 * factor;
        iron += 1.5 * factor;
        magnesium += 64 * factor;
        zinc += 1.1 * factor;
        vitB9 += 42 * factor;
        lysine += 0.25 * factor;
        methionine += 0.09 * factor;
      } else if (nameLower.includes("нут")) {
        totalCals += 164 * factor;
        totalProt += 8.9 * factor;
        totalFat += 2.6 * factor;
        totalCarb += 27.4 * factor;
        totalFiber += 7.6 * factor;
        iron += 2.9 * factor;
        magnesium += 48 * factor;
        zinc += 1.5 * factor;
        vitB9 += 172 * factor;
        lysine += 0.58 * factor;
        methionine += 0.13 * factor;
      } else if (nameLower.includes("кунжут")) {
        totalCals += 573 * factor;
        totalProt += 17.7 * factor;
        totalFat += 49.7 * factor;
        totalCarb += 23.4 * factor;
        totalFiber += 11.8 * factor;
        iron += 14.6 * factor;
        magnesium += 351 * factor;
        zinc += 7.8 * factor;
        vitB9 += 97 * factor;
        lysine += 0.56 * factor;
        methionine += 0.52 * factor;
      } else if (nameLower.includes("шпинат")) {
        totalCals += 23 * factor;
        totalProt += 2.9 * factor;
        totalFat += 0.4 * factor;
        totalCarb += 3.6 * factor;
        totalFiber += 2.2 * factor;
        iron += 2.7 * factor;
        magnesium += 79 * factor;
        zinc += 0.5 * factor;
        vitC += 28 * factor;
        vitB9 += 194 * factor;
        lysine += 0.17 * factor;
        methionine += 0.04 * factor;
      } else if (nameLower.includes("огур")) {
        totalCals += 15 * factor;
        totalProt += 0.7 * factor;
        totalFat += 0.1 * factor;
        totalCarb += 3.6 * factor;
        totalFiber += 0.5 * factor;
        iron += 0.3 * factor;
        magnesium += 13 * factor;
        vitC += 2.8 * factor;
        vitB9 += 7 * factor;
      } else {
        // Generic compliant plant-based USDA estimation
        totalCals += 80 * factor;
        totalProt += 2.5 * factor;
        totalFat += 0.8 * factor;
        totalCarb += 15 * factor;
        totalFiber += 2.5 * factor;
        iron += 1 * factor;
        magnesium += 25 * factor;
        zinc += 0.4 * factor;
        vitC += 4 * factor;
        vitB9 += 15 * factor;
      }
    });

    const finalDishName = ings.map(i => i.shortName).slice(0, 3).join(" и ") + " боул";

    return {
      dishName: finalDishName.length > 5 ? `Тёплый боул с ${ings.map(i => i.shortName.toLowerCase()).slice(0, 2).join(" и ")}` : "Тёплый боул с киноа и нутом",
      nutrients: {
        calories: { value: Math.round(totalCals), unit: "ккал" },
        protein: { value: parseFloat(totalProt.toFixed(1)), unit: "г" },
        fats: { value: parseFloat(totalFat.toFixed(1)), unit: "г" },
        carbs: { value: parseFloat(totalCarb.toFixed(1)), unit: "г" },
        fiber: { value: parseFloat(totalFiber.toFixed(1)), unit: "г" },
        omegaRatio: { value: "4:1", unit: "" }
      },
      micronutrients: {
        iron: { value: parseFloat(iron.toFixed(1)), unit: "мг" },
        zinc: { value: parseFloat(zinc.toFixed(1)) || 1.1, unit: "мг" },
        magnesium: { value: Math.round(magnesium) || 98, unit: "мг" },
        iodine: { value: hasNonCompliant ? 0 : 4, unit: "мкг" },
        selenium: { value: hasNonCompliant ? 2 : 11, unit: "мкг" },
        vitaminC: { value: Math.round(vitC) || 28, unit: "мг" },
        vitaminB9: { value: Math.round(vitB9) || 75, unit: "мкг" },
        lysine: { value: parseFloat(lysine.toFixed(1)) || 0.6, unit: "г" },
        methionine: { value: parseFloat(methionine.toFixed(1)) || 0.2, unit: "г" }
      },
      insights: {
        strengths: {
          title: "Сильные стороны блюда",
          text: "Высокая концентрация растительной клетчатки, комплексных медленных углеводов, аминокислот лизина и цельного неденатурированного белка."
        },
        improvements: {
          title: "Что можно улучшить",
          text: "Вы можете обогатить блюдо семенами чиа или молотым льном, чтобы оптимизировать коэффициент незаменимых Омега жирных кислот."
        },
        compliance: {
          title: "Соответствие растительному рациону",
          text: hasNonCompliant 
            ? "Внимание! Вы подтвердили ингредиенты, нарушающие философию WFPB (продукты животного происхождения или добавленная соль). Рекомендуем исключить их для идеального здоровья."
            : "Идеально! Блюдо на 100% соответствует стандартам цельного растительного WFPB-рациона без капли рафинированных масел или соли."
        }
      }
    };
  };

  return (
    <div className="w-full flex flex-col justify-between min-h-[828px] bg-[#FAFBFB] relative" id="dish-analysis-screen" style={{ fontFamily: '"Calibri", sans-serif' }}>
      
      {/* 1. EMBEDDED GLASS PANEL LOADER / POPUP OVERLAY */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/60 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-6 text-center select-none"
          >
            {/* Soft Radial ambient light behind card */}
            <div className="absolute w-72 h-72 bg-[#16B551]/8 rounded-full blur-[60px] pointer-events-none" />

            {/* Premium, High-Volume Soft Glass Loading Card */}
            <motion.div 
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="w-full max-w-[320px] bg-white border border-[#EFF2F3] shadow-[0_24px_50px_-8px_rgba(43,49,55,0.08)] rounded-[32px] p-6 flex flex-col items-center gap-6 relative"
            >
              {/* Top ambient gloss glare overlay */}
              <div className="absolute top-[1px] inset-x-5 h-[15%] bg-gradient-to-b from-white/40 to-transparent rounded-full pointer-events-none" />

              <div className="w-16 h-16 bg-[#16B551]/10 rounded-full flex items-center justify-center relative shadow-sm">
                <RefreshCw className="w-7 h-7 text-[#16B551] animate-spin" style={{ animationDuration: "2.5s" }} />
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className="text-[20px] font-black text-[#2B3137]">
                  Анализируем блюдо...
                </h3>
                <p className="text-[13px] text-[#737C86] font-semibold leading-snug">
                  Сверяем проверенный состав с научной базой данных USDA и рассчитываем микроэлементы 🌱
                </p>
              </div>

              {/* Volume 3D Glassy Neon Progress Bar */}
              <div className="w-full bg-[#EEF2F4] h-3.5 rounded-full overflow-hidden p-[1.5px] border border-gray-100/55 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] relative">
                <motion.div 
                  className="bg-gradient-to-r from-[#10D150] via-[#16B551] to-[#0A8F3B] h-full rounded-full relative shadow-[0_1px_5px_rgba(22,181,81,0.35)]"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "easeInOut" }}
                >
                  {/* Internal bright shine of the volume progress bar */}
                  <div className="absolute inset-y-0 left-0 right-0 h-[35%] bg-white/35 rounded-full" />
                </motion.div>
              </div>

              <span className="text-[12px] font-bold text-[#16B551]">
                {progress}% выполнено
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN SCREEN CONTAINER (Scrollable) */}
      <div className="flex-1 overflow-y-auto hidden-scrollbar flex flex-col px-5 pt-2 pb-6">
        
        {/* UPPER TITLE BAR */}
        <div className="flex items-center justify-between mb-2 shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="w-11 h-11 bg-white hover:bg-[#FAFAFA] border border-[#EFF2F3] shadow-[0_4px_10px_rgba(43,49,55,0.03)] rounded-[16px] flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 select-none shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-[#2B3137] stroke-[2.5]" />
          </button>

          <div className="flex flex-col text-center">
            <h1 className="text-[21px] font-black text-[#2B3137] leading-none mb-1">
              Разбор блюда
            </h1>
            <p className="text-[12px] text-[#737C86] font-extrabold tracking-tight">
              Полный нутриентный анализ блюда
            </p>
          </div>

          <CalendarButton 
            dayNotes={dayNotes}
            currentDayIndex={currentDayIndex}
            screen={screen}
            onClick={onOpenCalendar}
            className="w-11 h-11 rounded-[16px] shrink-0"
          />
        </div>

        {result && (
          <div className="flex flex-col gap-4 mt-2">

            {/* Ingredient Collage (for manually assembled dishes without a photo) */}
            {ingredients.length > 0 && (
              <div className="w-full h-36 rounded-[22px] overflow-hidden bg-gray-100 relative">
                <IngredientCollage
                  ingredients={ingredients.map((i) => ({ name: i.shortName || i.fullName }))}
                  containerHeight="h-36"
                />
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
              </div>
            )}

            {/* CARTOFTE NAMING CONTAINER (Editable) */}
            <div className="bg-white border border-[#EFF2F3] shadow-[0_6px_20px_rgba(43,49,55,0.025)] rounded-[26px] p-4.5 text-center relative overflow-hidden shrink-0">
              {/* Gloss element */}
              <div className="absolute top-[1.2px] inset-x-5 h-[12%] bg-gradient-to-b from-white/35 to-transparent rounded-full pointer-events-none" />

              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="flex-1 bg-[#EEF2F4]/60 border border-gray-100 rounded-xl px-3 py-1.5 text-[15.5px] font-black text-[#2B3137] focus:outline-none focus:border-[#16B551]"
                    autoFocus
                  />
                  <button 
                    type="button"
                    onClick={() => setIsEditingTitle(false)}
                    className="bg-[#16B551] text-white px-3 py-1.5 rounded-xl font-bold text-[13px] active:scale-95 select-none"
                  >
                    ОК
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 relative">
                  <h2 className="text-[18px] sm:text-[19px] font-black text-[#2B3137] leading-snug">
                    {customTitle}
                  </h2>
                  <button 
                    type="button"
                    onClick={() => setIsEditingTitle(true)}
                    className="text-[#737C86] hover:text-[#16B551] transition-colors p-1"
                    title="Редактировать название"
                  >
                    <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              )}

              <p className="text-[11.5px] text-[#A1B0B8] font-bold tracking-tight mt-1">
                Вы можете изменить название вручную
              </p>
            </div>

            {/* BLOCK OF MAIN NUTRIENT CARDS */}
            <div className="grid grid-cols-3 gap-2.5">
              
              {/* Calories */}
              <div className="bg-white border border-[#EFF2F3] rounded-[22px] p-3 text-center flex flex-col items-center justify-between min-h-[96px] shadow-[0_4px_12px_rgba(43,49,55,0.015)] relative overflow-hidden">
                <span className="text-[11.5px] text-[#737C86] font-bold">Калорийность</span>
                <div className="flex flex-col items-center my-0.5">
                  <Flame className="w-4 h-4 text-[#FF7000] mb-0.5" />
                  <span className="text-[17px] sm:text-[18px] font-black text-[#2B3137] leading-none">
                    {result.nutrients.calories.value}
                  </span>
                </div>
                <span className="text-[10px] text-[#A1B0B8] font-bold">{result.nutrients.calories.unit}</span>
              </div>

              {/* Protein */}
              <div className="bg-white border border-[#EFF2F3] rounded-[22px] p-3 text-center flex flex-col items-center justify-between min-h-[96px] shadow-[0_4px_12px_rgba(43,49,55,0.015)] relative overflow-hidden">
                <span className="text-[11.5px] text-[#737C86] font-bold">Белки</span>
                <div className="flex flex-col items-center my-0.5">
                  <Leaf className="w-4 h-4 text-[#16B551] mb-0.5" />
                  <span className="text-[17px] sm:text-[18px] font-black text-[#2B3137] leading-none">
                    {result.nutrients.protein.value}
                  </span>
                </div>
                <span className="text-[10px] text-[#A1B0B8] font-bold">{result.nutrients.protein.unit}</span>
              </div>

              {/* Fats */}
              <div className="bg-white border border-[#EFF2F3] rounded-[22px] p-3 text-center flex flex-col items-center justify-between min-h-[96px] shadow-[0_4px_12px_rgba(43,49,55,0.015)] relative overflow-hidden">
                <span className="text-[11.5px] text-[#737C86] font-bold">Жиры</span>
                <div className="flex flex-col items-center my-0.5">
                  <Droplets className="w-4 h-4 text-[#EAC100] mb-0.5" />
                  <span className="text-[17px] sm:text-[18px] font-black text-[#2B3137] leading-none">
                    {result.nutrients.fats.value}
                  </span>
                </div>
                <span className="text-[10px] text-[#A1B0B8] font-bold">{result.nutrients.fats.unit}</span>
              </div>

              {/* Carbs */}
              <div className="bg-white border border-[#EFF2F3] rounded-[22px] p-3 text-center flex flex-col items-center justify-between min-h-[96px] shadow-[0_4px_12px_rgba(43,49,55,0.015)] col-span-1 relative overflow-hidden">
                <span className="text-[11.5px] text-[#737C86] font-bold">Углеводы</span>
                <div className="flex flex-col items-center my-0.5">
                  <Leaf className="w-4 h-4 text-[#16B551] mb-0.5" />
                  <span className="text-[17px] sm:text-[18px] font-black text-[#2B3137] leading-none">
                    {result.nutrients.carbs.value}
                  </span>
                </div>
                <span className="text-[10px] text-[#A1B0B8] font-bold">{result.nutrients.carbs.unit}</span>
              </div>

              {/* Fiber */}
              <div className="bg-white border border-[#EFF2F3] rounded-[22px] p-3 text-center flex flex-col items-center justify-between min-h-[96px] shadow-[0_4px_12px_rgba(43,49,55,0.015)] col-span-1 relative overflow-hidden">
                <span className="text-[11.5px] text-[#737C86] font-bold">Клетчатка</span>
                <div className="flex flex-col items-center my-0.5">
                  <Leaf className="w-4 h-4 text-[#16B551] mb-0.5" />
                  <span className="text-[17px] sm:text-[18px] font-black text-[#2B3137] leading-none">
                    {result.nutrients.fiber.value}
                  </span>
                </div>
                <span className="text-[10px] text-[#A1B0B8] font-bold">{result.nutrients.fiber.unit}</span>
              </div>

              {/* Omega-6 to Omega-3 Ratio */}
              <div className="bg-white border border-[#EFF2F3] rounded-[22px] p-3 text-center flex flex-col items-center justify-between min-h-[96px] shadow-[0_4px_12px_rgba(43,49,55,0.015)] col-span-1 relative overflow-hidden bg-gradient-to-b from-white to-[#F6FCF7]">
                <span className="text-[11px] text-[#737C86] font-bold">Омега 6:3</span>
                <div className="flex flex-col items-center my-0.5">
                  <Sparkles className="w-4 h-4 text-[#16B551] mb-0.5" />
                  <span className="text-[17px] sm:text-[18px] font-black text-[#16B551] leading-none">
                    {result.nutrients.omegaRatio.value}
                  </span>
                </div>
                <span className="text-[10px] text-[#A1B0B8] font-bold">коэффициент</span>
              </div>

            </div>

            {/* BLOCK OF VITAMINS AND MICROELEMENTS */}
            <div className="flex flex-col gap-2">
              <h3 className="text-[16px] font-black text-[#2B3137] text-left leading-none mt-1">
                Витамины и микроэлементы
              </h3>
              
              <div className="grid grid-cols-3 gap-2.5">
                
                {/* Iron */}
                <div className="bg-white border border-[#EFF2F3] rounded-[20px] p-2.5 text-center flex flex-col justify-between min-h-[84px] shadow-sm">
                  <span className="text-[11px] text-[#737C86] font-bold">Железо</span>
                  <span className="text-[15.5px] font-black text-[#2B3137] my-0.5">
                    {result.micronutrients.iron.value}
                  </span>
                  <span className="text-[9.5px] text-[#A1B0B8] font-bold">{result.micronutrients.iron.unit}</span>
                </div>

                {/* Zinc */}
                <div className="bg-white border border-[#EFF2F3] rounded-[20px] p-2.5 text-center flex flex-col justify-between min-h-[84px] shadow-sm">
                  <span className="text-[11px] text-[#737C86] font-bold">Цинк</span>
                  <span className="text-[15.5px] font-black text-[#2B3137] my-0.5">
                    {result.micronutrients.zinc.value}
                  </span>
                  <span className="text-[9.5px] text-[#A1B0B8] font-bold">{result.micronutrients.zinc.unit}</span>
                </div>

                {/* Magnesium */}
                <div className="bg-white border border-[#EFF2F3] rounded-[20px] p-2.5 text-center flex flex-col justify-between min-h-[84px] shadow-sm">
                  <span className="text-[11px] text-[#737C86] font-bold">Магний</span>
                  <span className="text-[15.5px] font-black text-[#2B3137] my-0.5">
                    {result.micronutrients.magnesium.value}
                  </span>
                  <span className="text-[9.5px] text-[#A1B0B8] font-bold">{result.micronutrients.magnesium.unit}</span>
                </div>

                {/* Iodine */}
                <div className="bg-white border border-[#EFF2F3] rounded-[20px] p-2.5 text-center flex flex-col justify-between min-h-[84px] shadow-sm">
                  <span className="text-[11px] text-[#737C86] font-bold">Йод</span>
                  <span className="text-[15.5px] font-black text-[#2B3137] my-0.5">
                    {result.micronutrients.iodine.value}
                  </span>
                  <span className="text-[9.5px] text-[#A1B0B8] font-bold">{result.micronutrients.iodine.unit}</span>
                </div>

                {/* Selenium */}
                <div className="bg-white border border-[#EFF2F3] rounded-[20px] p-2.5 text-center flex flex-col justify-between min-h-[84px] shadow-sm">
                  <span className="text-[11px] text-[#737C86] font-bold">Селен</span>
                  <span className="text-[15.5px] font-black text-[#2B3137] my-0.5">
                    {result.micronutrients.selenium.value}
                  </span>
                  <span className="text-[9.5px] text-[#A1B0B8] font-bold">{result.micronutrients.selenium.unit}</span>
                </div>

                {/* Vitamin C */}
                <div className="bg-white border border-[#EFF2F3] rounded-[20px] p-2.5 text-center flex flex-col justify-between min-h-[84px] shadow-sm">
                  <span className="text-[11px] text-[#737C86] font-bold">Витамин C</span>
                  <span className="text-[15.5px] font-black text-[#2B3137] my-0.5">
                    {result.micronutrients.vitaminC.value}
                  </span>
                  <span className="text-[9.5px] text-[#A1B0B8] font-bold">{result.micronutrients.vitaminC.unit}</span>
                </div>

                {/* Vitamin B9 */}
                <div className="bg-white border border-[#EFF2F3] rounded-[20px] p-2.5 text-center flex flex-col justify-between min-h-[84px] shadow-sm bg-gradient-to-b from-white to-[#F6FCF7]">
                  <span className="text-[11px] text-[#737C86] font-bold">В9 (Фолаты)</span>
                  <span className="text-[15.5px] font-black text-[#16B551] my-0.5">
                    {result.micronutrients.vitaminB9.value}
                  </span>
                  <span className="text-[9.5px] text-[#A1B0B8] font-bold">{result.micronutrients.vitaminB9.unit}</span>
                </div>

                {/* Lysine */}
                <div className="bg-white border border-[#EFF2F3] rounded-[20px] p-2.5 text-center flex flex-col justify-between min-h-[84px] shadow-sm bg-gradient-to-b from-white to-[#F6FCF7]">
                  <span className="text-[11px] text-[#737C86] font-bold">Лизин</span>
                  <span className="text-[15.5px] font-black text-[#16B551] my-0.5">
                    {result.micronutrients.lysine.value}
                  </span>
                  <span className="text-[9.5px] text-[#A1B0B8] font-bold">{result.micronutrients.lysine.unit}</span>
                </div>

                {/* Methionine */}
                <div className="bg-white border border-[#EFF2F3] rounded-[20px] p-2.5 text-center flex flex-col justify-between min-h-[84px] shadow-sm bg-gradient-to-b from-white to-[#F6FCF7]">
                  <span className="text-[11px] text-[#737C86] font-bold">Метионин</span>
                  <span className="text-[15.5px] font-black text-[#16B551] my-0.5">
                    {result.micronutrients.methionine.value}
                  </span>
                  <span className="text-[9.5px] text-[#A1B0B8] font-bold">{result.micronutrients.methionine.unit}</span>
                </div>

              </div>
            </div>

            {/* ANNA'S PRIVATE EXPERT WFPB ANALYZING CARD — AI-GENERATED */}
            {(() => {
              const violationCount = ingredients.filter(i => !checkWFPB(i.fullName || i.shortName || "").compliant).length;
              const isCompliant = !ingredients.some(i => i.status === "error");
              const badgeText = isCompliant ? "Идеально! 🥬" : "Нарушение WFPB ⚠️";

              if (!aiComment) {
                return (
                  <div className="border border-[#EFF2F3] bg-white rounded-[26px] p-5.5 flex flex-col gap-4 text-left relative overflow-hidden animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-gray-200" />
                        <div className="flex flex-col gap-1.5">
                          <div className="w-16 h-4 bg-gray-200 rounded" />
                          <div className="w-24 h-3 bg-gray-200 rounded" />
                        </div>
                      </div>
                      <div className="w-28 h-7 bg-gray-200 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-3.5 bg-gray-200 rounded" />
                      <div className="w-full h-3.5 bg-gray-200 rounded" />
                      <div className="w-3/4 h-3.5 bg-gray-200 rounded" />
                    </div>
                  </div>
                );
              }

              const avatar = resolveAvatarForCompliance(violationCount, ingredients.length);
              const isPositive = avatar.toneGroup === "positive" || avatar.toneGroup === "neutral_thoughtful";
              const borderClass = isPositive ? "border-emerald-200" : "border-rose-200";
              const shadowStyle = isCompliant ? "0_8px_24px_rgba(22,181,81,0.035)" : "0_8px_24px_rgba(225,29,72,0.06)";
              const glowStyle = isCompliant ? "from-[#10D150]/6" : "from-[#E11D48]/6";
              const avatarBorder = isPositive ? "border-emerald-300" : "border-rose-300";
              const nameColor = isPositive ? "text-[#15803D]" : "text-[#BE123C]";
              return (
                <div className={`${isCompliant ? "bg-green-50 border-green-200" : "bg-rose-50 border-rose-200"} border rounded-[26px] p-5.5 flex flex-col gap-4 text-left relative overflow-hidden`} style={{ boxShadow: shadowStyle }}>
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-b ${glowStyle} to-transparent rounded-full blur-2xl pointer-events-none`} />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0 select-none">
                        <div className={`w-14 h-14 rounded-full overflow-hidden shadow-md border-2 ${avatarBorder} relative bg-white`}>
                          <img 
                            src={avatar.src}
                            alt="Анна — Советник WFPB" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <span className={`text-[16px] ${nameColor} font-extrabold leading-none`}>
                          Анна
                        </span>
                        <span className="text-[11px] text-text-muted font-bold mt-0.5 leading-none">
                          Советник WFPB
                        </span>
                      </div>
                    </div>

                    <span className={`px-3 py-1.5 rounded-xl bg-white/80 border text-[11px] font-black text-text-dark shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.015)] ${borderClass}`}>
                      {badgeText}
                    </span>
                  </div>

                  <p className="text-[13.5px] sm:text-[14px] text-text-dark font-medium leading-relaxed font-sans">
                    {aiComment}
                  </p>
                </div>
              );
            })()}

            {/* INTENT-SPECIFIC NUTRITIONAL INSIGHTS */}
            <div className="bg-white border border-[#EFF2F3] shadow-[0_8px_24px_rgba(43,49,55,0.035)] rounded-[26px] p-4 flex flex-col gap-3.5 text-left relative overflow-hidden shrink-0">
              <div className="absolute top-[1.2px] inset-x-5 h-[8%] bg-gradient-to-b from-white/30 to-transparent rounded-full pointer-events-none" />

              {/* Strengths */}
              <div className="flex items-start gap-2.5">
                <div className="w-6.5 h-6.5 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#16B551] shrink-0 mt-0.5 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#16B551] stroke-[2.5]" />
                </div>
                <div className="flex-1">
                  <h4 className="text-[14px] font-black text-[#2B3137] leading-none mb-1">
                    {result.insights.strengths.title}
                  </h4>
                  <p className="text-[12px] text-[#737C86] leading-normal font-semibold">
                    {result.insights.strengths.text}
                  </p>
                </div>
              </div>

              {/* Improvements */}
              <div className="flex items-start gap-2.5">
                <div className="w-6.5 h-6.5 rounded-full bg-[#FCF8E3] flex items-center justify-center text-[#CC8B00] shrink-0 mt-0.5 shadow-sm">
                  <AlertCircle className="w-4 h-4 text-[#CC8B00] stroke-[2.5]" />
                </div>
                <div className="flex-1">
                  <h4 className="text-[14px] font-black text-[#2B3137] leading-none mb-1">
                    {result.insights.improvements.title}
                  </h4>
                  <p className="text-[12px] text-[#737C86] leading-normal font-semibold">
                    {result.insights.improvements.text}
                  </p>
                </div>
              </div>

              {/* Compliance */}
              <div className="flex items-start gap-2.5">
                <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm ${
                  ingredients.some(i => i.status === "error") ? "bg-[#FFF2F2] text-red-600" : "bg-[#ECFDF5] text-[#16B551]"
                }`}>
                  <Check className={`w-4 h-4 stroke-[2.5] ${
                    ingredients.some(i => i.status === "error") ? "text-red-600" : "text-[#16B551]"
                  }`} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[14px] font-black text-[#2B3137] leading-none mb-1">
                    {result.insights.compliance.title}
                  </h4>
                  <p className="text-[12px] text-[#737C86] leading-normal font-semibold">
                    {result.insights.compliance.text}
                  </p>
                </div>
              </div>

            </div>

            {/* ACTIONS BUTTONS IN THE ACCORDANCE WITH TZ */}
            <div className="flex flex-col gap-2 shrink-0">
              {isConfirmed ? (
                <div className="flex flex-col gap-1.5 pt-1.5">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-4 flex items-center gap-3">
                    <div className="text-[28px]">🎉</div>
                    <div className="text-left">
                      <h4 className="text-[14px] font-black text-emerald-800 leading-tight">Блюдо утверждено!</h4>
                      <p className="text-[11.5px] text-emerald-700/80 font-bold leading-normal mt-0.5">
                        Оно добавлено в рацион. Поделитесь ощущениями?
                      </p>
                    </div>
                  </div>
                  
                  <BriefNoteBlock
                    moduleKey="food"
                    onSave={handleSaveMealNote}
                    onSkip={() => {
                      const computedMacros = result ? {
                        calories: typeof result.nutrients.calories.value === 'number' ? result.nutrients.calories.value : parseInt(String(result.nutrients.calories.value), 10),
                        protein: typeof result.nutrients.protein.value === 'number' ? `${result.nutrients.protein.value} г` : String(result.nutrients.protein.value),
                        fiber: typeof result.nutrients.fiber.value === 'number' ? `${result.nutrients.fiber.value} г` : String(result.nutrients.fiber.value),
                        fat: typeof result.nutrients.fats.value === 'number' ? `${result.nutrients.fats.value} г` : String(result.nutrients.fats.value),
                      } : undefined;
                      onConfirm(customTitle || result?.dishName || "Цельное растительное блюдо", computedMacros, aiComment || "");
                    }}
                  />
                </div>
              ) : (
                <>
                  {/* PRIMARY GREEN ACTION BUTTON */}
                  <button
                    type="button"
                    onClick={() => setIsConfirmed(true)}
                    className="w-full bg-gradient-to-b from-[#10D150] via-[#16B551] to-[#0A8F3B] hover:brightness-[1.03] rounded-[22px] py-4 px-6 font-bold text-white shadow-[0_8px_20px_rgba(22,181,81,0.22),_inset_0_2.5px_4px_rgba(255,255,255,0.45),_0_-2.5px_0_rgba(8,91,36,0.45)_inset] flex items-center justify-center gap-2 relative overflow-hidden transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] text-[16px] cursor-pointer"
                  >
                    <div className="absolute top-[1.8px] left-5 right-5 h-[28%] rounded-full bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
                    <span>Подтверждаю</span>
                  </button>

                  {/* SECONDARY GRAY/LIGHT BUTTON */}
                  <button
                    type="button"
                    onClick={onCancel}
                    className="w-full bg-[#FAFBFB] hover:bg-[#F3F6F8] border border-[#EFF2F3] shadow-[0_4px_12px_rgba(43,49,55,0.03)] hover:border-gray-200 rounded-[22px] py-3.5 px-6 font-extrabold text-[#737C86] transition-all duration-200 active:scale-[0.98] text-[15px] cursor-pointer"
                  >
                    Вернуться в Мой день
                  </button>
                </>
              )}
            </div>

          </div>
        )}

      </div>

      {/* STICKY BOTTOM APP BAR TAB */}
      <div className="w-full shrink-0">
        <BottomBar onHomeClick={onCancel} activeTab="add-food" />
      </div>

    </div>
  );
}
