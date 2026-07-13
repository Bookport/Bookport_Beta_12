import React, { useState } from "react";
import { motion } from "motion/react";
import { Calendar, AlertCircle, HeartPulse, Activity, Droplets, Check, ChevronRight, ChevronLeft, Flame, MousePointerClick, ArrowUp, Droplet, Hourglass, Flower2, Shield, BatteryLow, Brain, Wind, Heart, Layers, Link, Waves, CloudRain, Moon, ShieldCheck, Sprout, Scale, Zap, Ban, Leaf, Clock, ArrowDown, ShieldAlert, Sparkles, Smile, CloudLightning, Cookie, Sun } from "lucide-react";
import BottomBar from "./BottomBar";
import CalendarButton from "./CalendarButton";
import { AIServiceLayer } from "../services/aiLayer";
import { useAppStore } from "../store/useAppStore";

interface MyPageScreenProps {
  onBack: () => void;
  onOpenMyDay: () => void;
  dayNotes: Record<number, { text: string; time: string }[]>;
  currentDayIndex: number;
  screen: string;
  onOpenCalendar: () => void;
  startingWeight?: number;
  height?: number;
  systolic?: number;
  diastolic?: number;
  selectedGoals?: string[];
  selectedChronic?: string[];
}

interface GoalType {
  id: string;
  name: string;
  progress: number; // percentage from 0 to 100
  color: string; // gradient CSS string
  checked: boolean;
  bubbleColor: string;
  glowColor: string;
}

function getGlowColor(gradientColor: string): string {
  const viaMatch = gradientColor.match(/via-\[#([A-Fa-f0-9]{6})\]/);
  if (viaMatch) {
    return `#${viaMatch[1]}`;
  }
  const fromMatch = gradientColor.match(/from-\[#([A-Fa-f0-9]{6})\]/);
  if (fromMatch) {
    return `#${fromMatch[1]}`;
  }
  return "#10B551"; // fallback emerald green
}

const ALL_GOALS_METADATA: Record<string, { name: string; progress: number; color: string; checked: boolean; bubbleColor: string }> = {
  improve_digestion: { 
    name: "Улучшить пищеварение", 
    progress: 75, 
    color: "from-[#10B551] via-[#14C85A] to-[#0A8F3B]", 
    checked: true,
    bubbleColor: "bg-emerald-200"
  },
  lose_weight: { 
    name: "Снизить вес", 
    progress: 60, 
    color: "from-[#F59E0B] via-[#FBBF24] to-[#D97706]", 
    checked: false,
    bubbleColor: "bg-amber-100"
  },
  increase_energy: { 
    name: "Повысить энергию", 
    progress: 55, 
    color: "from-[#3B82F6] via-[#60A5FA] to-[#1D4ED8]", 
    checked: false,
    bubbleColor: "bg-blue-100"
  },
  normalize_sleep: { 
    name: "Нормализовать сон", 
    progress: 48, 
    color: "from-[#A855F7] via-[#C084FC] to-[#7E22CE]", 
    checked: false,
    bubbleColor: "bg-purple-200"
  },
  reduce_sugar_cravings: { 
    name: "Уменьшить тягу к сладкому", 
    progress: 42, 
    color: "from-[#EF4444] via-[#F87171] to-[#B91C1C]", 
    checked: false,
    bubbleColor: "bg-red-200"
  },
  plant_diet: { 
    name: "Перейти на растительное питание", 
    progress: 82, 
    color: "from-[#0D9488] via-[#14B8A6] to-[#115E59]", 
    checked: true,
    bubbleColor: "bg-green-100"
  },
  regular_stool: { name: "Наладить регулярный стул", progress: 50, color: "from-[#0EA5E9] via-[#38BDF8] to-[#0284C7]", checked: false, bubbleColor: "bg-sky-100" },
  lower_pressure: { name: "Снизить давление", progress: 65, color: "from-[#701A75] via-[#D946EF] to-[#4A044E]", checked: false, bubbleColor: "bg-red-100" },
  stabilize_sugar: { name: "Стабилизировать сахар", progress: 58, color: "from-[#D946EF] via-[#FF007F] to-[#701A75]", checked: false, bubbleColor: "bg-blue-100" },
  lower_cholesterol: { name: "Снизить холестерин", progress: 44, color: "from-[#E11D48] via-[#FDA4AF] to-[#9F1239]", checked: false, bubbleColor: "bg-rose-100" },
  reduce_inflammation: { name: "Снизить воспаление", progress: 40, color: "from-[#16A34A] via-[#4ADE80] to-[#15803D]", checked: false, bubbleColor: "bg-emerald-100" },
  improve_skin: { name: "Улучшить состояние кожи", progress: 70, color: "from-[#D946EF] via-[#F472B6] to-[#C084FC]", checked: false, bubbleColor: "bg-pink-100" },
  improve_mood: { name: "Улучшить настроение", progress: 62, color: "from-[#FCD34D] via-[#FDE047] to-[#EAB308]", checked: false, bubbleColor: "bg-yellow-100" },
  reduce_anxiety: { name: "Уменьшить тревожность", progress: 52, color: "from-[#6366F1] via-[#818CF8] to-[#4F46E5]", checked: false, bubbleColor: "bg-indigo-100" },
  improve_eating_habits: { name: "Улучшить пищевые привычки", progress: 66, color: "from-[#DB2777] via-[#F472B6] to-[#9D174D]", checked: false, bubbleColor: "bg-rose-100" },
  more_wfpb: { name: "Есть больше цельной растительной еды", progress: 78, color: "from-[#F97316] via-[#FDBA74] to-[#EA580C]", checked: false, bubbleColor: "bg-orange-100" },
  less_overeating: { name: "Меньше переедать", progress: 45, color: "from-[#78716C] via-[#A8A29E] to-[#57534E]", checked: false, bubbleColor: "bg-stone-100" },
  drink_water: { name: "Пить достаточно воды", progress: 80, color: "from-[#06B6D4] via-[#67E8F9] to-[#0891B2]", checked: false, bubbleColor: "bg-[#e0f7fa]" },
  routine_stability: { name: "Быть устойчивее в режиме", progress: 55, color: "from-[#10B551] via-[#2DD4BF] to-[#0F766E]", checked: false, bubbleColor: "bg-teal-100" },
  improve_wellbeing: { name: "Улучшить общее самочувствие", progress: 73, color: "from-[#65A30D] via-[#A3E635] to-[#4D7C0F]", checked: false, bubbleColor: "bg-amber-100" },
  other_goal: { name: "Другое", progress: 50, color: "from-[#475569] via-[#94A3B8] to-[#334155]", checked: false, bubbleColor: "bg-gray-100" }
};

const ALL_CHRONIC_METADATA: Record<string, { name: string; icon: any; color: string }> = {
  hypertension: { name: "Гипертония", icon: HeartPulse, color: "text-red-500 bg-red-50" },
  gastritis: { name: "Гастрит", icon: Flame, color: "text-orange-500 bg-orange-50" },
  reflux: { name: "Рефлюкс", icon: ArrowUp, color: "text-amber-500 bg-amber-50" },
  diabetes: { name: "Диабет", icon: Droplet, color: "text-blue-500 bg-[#eff6ff]" },
  ibs: { name: "СРК", icon: Activity, color: "text-emerald-500 bg-[#ecfdf5]" },
  constipation: { name: "Запоры", icon: Hourglass, color: "text-cyan-500 bg-cyan-50" },
  cholesterol: { name: "Высокий холестерин", icon: Activity, color: "text-rose-500 bg-rose-50" },
  anemia: { name: "Анемия", icon: Droplets, color: "text-red-600 bg-red-100" },
  allergy: { name: "Аллергия", icon: Flower2, color: "text-pink-500 bg-pink-50" },
  thyroid: { name: "Заболевания щитовидной железы", icon: Shield, color: "text-violet-500 bg-violet-50" },
  fatigue: { name: "Хроническая усталость", icon: BatteryLow, color: "text-slate-500 bg-slate-100" },
  migraine: { name: "Мигрень", icon: Brain, color: "text-indigo-500 bg-indigo-50" },
  asthma: { name: "Астма", icon: Wind, color: "text-sky-500 bg-sky-50" },
  liver: { name: "Заболевания печени", icon: Heart, color: "text-red-400 bg-red-50" },
  kidneys: { name: "Заболевания почек", icon: Layers, color: "text-teal-600 bg-teal-50" },
  arthritis: { name: "Артрит / боли в суставах", icon: Link, color: "text-stone-600 bg-stone-100" },
  anxiety: { name: "Тревожность", icon: Waves, color: "text-purple-500 bg-purple-50" },
  depression: { name: "Депрессия", icon: CloudRain, color: "text-blue-600 bg-blue-100" },
  insomnia: { name: "Нарушения сна", icon: Moon, color: "text-indigo-900 bg-indigo-50" },
  autoimmune: { name: "Аутоиммунные заболевания", icon: ShieldCheck, color: "text-lime-600 bg-lime-50" },
  other_chronic: { name: "Другое", icon: AlertCircle, color: "text-gray-500 bg-gray-100" }
};

export default function MyPageScreen(props: MyPageScreenProps) {
  const { dayNotes, currentDayIndex, screen, onOpenCalendar } = props;
  // Current weight state initialized with starting weight from props, and synced when props change
  const [currentWeight, setCurrentWeight] = useState<number>(props.startingWeight);
  const [aiProvider, setAiProvider] = useState<"studio" | "server" | "hybrid">(() => AIServiceLayer.getCurrentProvider());

  const handleProviderChange = (newProv: "studio" | "server" | "hybrid") => {
    setAiProvider(newProv);
    AIServiceLayer.setCurrentProvider(newProv);
  };

  React.useEffect(() => {
    setCurrentWeight(props.startingWeight);
  }, [props.startingWeight]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).currentScreenContext = {
      screen_id: "my-page",
      screen_title: "Личный Кабинет и Интегральная WFPB-аналитика",
      current_day: currentDayIndex,
      current_status: "Просмотр графиков прогресса, ИИ настроек соединения и хронограммы оздоровления",
      metrics: {
        weight_kg: currentWeight,
        height_cm: props.height,
        blood_pressure: `${props.systolic}/${props.diastolic}`
      },
      selectedGoals: props.selectedGoals,
      selectedChronic: props.selectedChronic,
      user_input_values: {
        selected_ai_provider: aiProvider
      }
    };

    return () => {
      if ((window as any).currentScreenContext?.screen_id === "my-page") {
        delete (window as any).currentScreenContext;
      }
    };
  }, [currentDayIndex, currentWeight, props.height, props.systolic, props.diastolic, props.selectedGoals, props.selectedChronic, aiProvider]);

  // Derive selected goals from props, or fallback to default ones
  const defaultSelectedGoals = props.selectedGoals !== undefined
    ? props.selectedGoals 
    : ["improve_digestion", "lose_weight", "increase_energy", "normalize_sleep", "reduce_sugar_cravings", "plant_diet"];

  const buildGoalsFromIds = (ids: string[]) => {
    return ids.map(id => {
      const meta = ALL_GOALS_METADATA[id] ?? {
        name: id,
        progress: 50,
        color: "from-[#10B551] via-[#14C85A] to-[#0A8F3B]",
        checked: false,
        bubbleColor: "bg-emerald-100"
      };
      return {
        id,
        name: meta.name,
        progress: meta.progress,
        color: meta.color,
        checked: meta.checked,
        bubbleColor: meta.bubbleColor,
        glowColor: getGlowColor(meta.color)
      };
    });
  };

  const [goals, setGoals] = useState<GoalType[]>(() => buildGoalsFromIds(defaultSelectedGoals));

  React.useEffect(() => {
    if (props.selectedGoals !== undefined) {
      setGoals(buildGoalsFromIds(props.selectedGoals));
    }
  }, [props.selectedGoals]);

  const checkedCount = goals.filter(g => g.checked).length;

  const toggleGoal = (id: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, checked: !g.checked };
      }
      return g;
    }));
  };

  return (
    <div className="w-full flex flex-col justify-between" id="my-page-screen">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fluidBubble1 {
          0% { transform: translate(0px, 0px) scale(0.9); }
          50% { transform: translate(15px, -2px) scale(1.15); }
          100% { transform: translate(30px, 0px) scale(0.9); }
        }
        @keyframes fluidBubble2 {
          0% { transform: translate(0px, 0px) scale(1.1); }
          50% { transform: translate(-10px, 1.5px) scale(0.9); }
          100% { transform: translate(10px, 0px) scale(1.1); }
        }
        @keyframes fluidBubble3 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(12px, -1px) scale(1.2); }
          100% { transform: translate(25px, 0px) scale(1); }
        }
        @keyframes fluidBubble4 {
          0% { transform: translate(0px, 0px) scale(1.15); }
          50% { transform: translate(-8px, 1px) scale(0.85); }
          100% { transform: translate(12px, 0px) scale(1.15); }
        }
        @keyframes fluidBubble5 {
          0% { transform: translate(0px, 0px) scale(0.8); }
          50% { transform: translate(14px, -1.5px) scale(1.1); }
          100% { transform: translate(24px, 0px) scale(0.8); }
        }
        @keyframes elixirGlow {
          0% {
            filter: drop-shadow(0 0 2px var(--glow-color, #10B551));
            box-shadow: inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 1px 6px rgba(255,255,255,0.2);
          }
          50% {
            filter: drop-shadow(0 0 6px var(--glow-color, #10B551));
            box-shadow: inset 0 -2.5px 5px rgba(0,0,0,0.25), inset 0 1px 7px rgba(255,255,255,0.3);
          }
          100% {
            filter: drop-shadow(0 0 2px var(--glow-color, #10B551));
            box-shadow: inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 1px 6px rgba(255,255,255,0.2);
          }
        }
      `}} />
      
      {/* Scrollable Main Area */}
      <div className="flex-1 px-5 pt-3 pb-2">
        
        {/* Navigation / Header Row */}
        <div className="flex items-start justify-between mb-5">
          {/* Leftside: title and day count */}
          <div className="flex flex-col gap-1 text-left">
            <h2 
              className="text-[28px] sm:text-[30px] font-bold text-text-dark leading-tight"
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
            >
              Моя страница
            </h2>
            <div className="flex items-center gap-1.5">
              <span 
                className="text-[16px] sm:text-[18px] font-bold text-brand-green-bright flex items-center gap-1 leading-none"
                style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
              >
                День {currentDayIndex} из 28 🍃
              </span>
            </div>
          </div>

          {/* Rightside action button: Calendar */}
          <CalendarButton 
            dayNotes={dayNotes}
            currentDayIndex={currentDayIndex}
            screen={screen}
            onClick={onOpenCalendar}
            className="w-10 h-10 rounded-2xl"
          />
        </div>

        {/* Section 1: Basic Parameters Block */}
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_18px_rgba(43,49,55,0.03)] p-5 mb-4 flex flex-col gap-3.5">
          <div className="flex justify-between items-center py-0.5">
            <span 
              className="text-[16px] sm:text-[18px] font-normal text-text-sec"
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
            >
              Стартовый вес
            </span>
            <span 
              className="text-[16px] sm:text-[18px] font-bold text-text-dark"
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
            >
              {props.startingWeight} кг
            </span>
          </div>
          
          <div className="h-[1px] bg-gray-100/75 w-full" />

          <div className="flex justify-between items-center py-0.5">
            <span 
              className="text-[16px] sm:text-[18px] font-normal text-text-sec"
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
            >
              Текущий вес
            </span>
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => setCurrentWeight(w => Math.max(20, w - 1))}
                className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-text-sec font-bold hover:bg-gray-100 active:scale-90 transition-all cursor-pointer"
              >
                -
              </button>
              <span 
                className={`text-[16px] sm:text-[18px] font-bold flex items-center gap-1 min-w-[50px] justify-center ${
                  currentWeight > props.startingWeight 
                    ? "text-[#EF4444]" 
                    : currentWeight < props.startingWeight 
                    ? "text-brand-green-bright" 
                    : "text-text-dark"
                }`}
                style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
              >
                {currentWeight} кг
                {currentWeight > props.startingWeight && (
                  <span className="text-[14px]">↑</span>
                )}
                {currentWeight < props.startingWeight && (
                  <span className="text-[14px]">↓</span>
                )}
              </span>
              <button 
                type="button" 
                onClick={() => setCurrentWeight(w => Math.min(300, w + 1))}
                className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-text-sec font-bold hover:bg-gray-100 active:scale-90 transition-all cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          <div className="h-[1px] bg-gray-100/75 w-full" />

          <div className="flex justify-between items-center py-0.5">
            <span 
              className="text-[16px] sm:text-[18px] font-normal text-text-sec"
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
            >
              Рост
            </span>
            <span 
              className="text-[16px] sm:text-[18px] font-bold text-text-dark"
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
            >
              {props.height} см
            </span>
          </div>

          <div className="h-[1px] bg-gray-100/75 w-full" />

          <div className="flex justify-between items-center py-0.5">
            <span 
              className="text-[16px] sm:text-[18px] font-normal text-text-sec"
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
            >
              Давление
            </span>
            <span 
              className="text-[16px] sm:text-[18px] font-bold text-text-dark"
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
            >
              {props.systolic}/{props.diastolic}
            </span>
          </div>
        </div>

        {/* Section 2: Weight Warning Alert Card */}
        {Math.abs(currentWeight - props.startingWeight) >= 5 && (
          <div className="bg-[#FEF2F2]/80 border border-red-100 rounded-[24px] p-4.5 mb-5 flex gap-4 items-center shadow-[0_2px_12px_rgba(239,68,68,0.015)]">
            <div className="relative">
              {/* Glossy ring surrounding warning circle */}
              <div className="w-11 h-11 rounded-full bg-red-100/60 flex items-center justify-center text-[#EF4444]">
                <AlertCircle className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>
            <div className="flex flex-col text-left">
              <span 
                className="text-[15px] sm:text-[16px] font-bold text-[#1F2328] leading-tight"
                style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
              >
                Вес изменился сильнее, чем ожидалось
              </span>
              <span 
                className="text-[13px] sm:text-[14px] text-text-muted mt-0.5 font-normal"
                style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
              >
                Проверьте введённые данные ({currentWeight - props.startingWeight > 0 ? "+" : ""}{currentWeight - props.startingWeight} кг)
              </span>
            </div>
          </div>
        )}

        {/* Section 3: Мои цели (list of volumetric health potions) */}
        <div className="flex flex-col gap-3.5 mb-5 text-left">
          <div className="flex justify-between items-center px-1">
            <span 
              className="text-[18px] sm:text-[20px] font-bold text-text-dark"
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
            >
              Мои цели
            </span>
          </div>

          {goals.length === 0 ? (
            <div 
              className="text-center py-6 px-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-text-muted text-[15px]"
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
            >
              Цели отсутствуют
            </div>
          ) : (
            <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_3px_12px_rgba(43,49,55,0.02)] p-4 sm:p-5 flex flex-col gap-1.5">
              {goals.map((g, index) => {
                return (
                  <div 
                    key={g.id} 
                    className="flex flex-col gap-1"
                  >
                    <div className="flex justify-between items-center">
                      <span 
                        className="text-[15px] sm:text-[16px] font-bold text-text-dark block leading-tight text-left"
                        style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                      >
                        {g.name}
                      </span>
                    </div>

                    {/* Volumetric horizontal crystal glass tube filled with glowing magical healthy potion/elixir and medical floating bubbles */}
                    <div 
                      className="w-full h-[20px] bg-[#E2E8F0]/35 rounded-full border relative overflow-hidden flex items-center p-[1px] transition-all duration-300"
                      style={{
                        borderColor: `${g.glowColor}40`,
                        boxShadow: `0 4.5px 12px rgba(43, 49, 55, 0.08), 0 1.5px 3.5px rgba(43, 49, 55, 0.04), 0 0 16px 3.5px ${g.glowColor}25, inset 0 2.5px 4px rgba(0, 0, 0, 0.12)`,
                      }}
                    >
                      {/* Glowing elixir substance filled */}
                      <div 
                        className={`h-full bg-gradient-to-r ${g.color} rounded-full transition-all duration-500 relative flex items-center animate-[elixirGlow_3.5s_infinite_ease-in-out]`}
                        style={{ width: `${g.progress}%`, '--glow-color': g.glowColor } as React.CSSProperties}
                      >
                        {/* Inside 3D reflection gloss */}
                        <div className="absolute inset-x-2 top-[1.5px] h-[30%] bg-white/45 rounded-full filter blur-[0.3px]" />
                        
                        {/* Sub-surface volumetric lighting highlight helper */}
                        <div className="absolute inset-x-2 bottom-[1.5px] h-[22%] bg-black/12 rounded-full" />

                        {/* Sparkly health bubbles inside the glowing substance */}
                        <div className="absolute inset-0 overflow-hidden">
                          {/* Bubble 1 */}
                          <div className="absolute top-[20%] left-[12%] w-[4px] h-[4px] bg-white/80 rounded-full shadow-[0_0_2px_rgba(255,255,255,1)] animate-[fluidBubble1_7s_infinite_ease-in-out_alternate]" />
                          <div className="absolute top-[20%] left-[12%] w-[3.5px] h-[3.5px] bg-white/95 rounded-full shadow-[0_0_1.5px_rgba(255,255,255,0.8)]" />
                          
                          {/* Bubble 2 */}
                          <div className="absolute top-[45%] left-[32%] w-[4.5px] h-[4.5px] bg-white/85 rounded-full shadow-[0_0_2px_rgba(255,255,255,0.85)] animate-[fluidBubble2_9s_infinite_ease-in-out_alternate]" />
                          
                          {/* Bubble 3 */}
                          <div className="absolute top-[15%] left-[55%] w-[3px] h-[3px] bg-white/90 rounded-full shadow-[0_0_1px_rgba(255,255,255,0.8)] animate-[fluidBubble3_6s_infinite_ease-in-out_alternate]" />
                          
                          {/* Bubble 4 */}
                          <div className="absolute top-[50%] left-[72%] w-[4px] h-[4px] bg-white/85 rounded-full shadow-[0_0_2.5px_rgba(255,255,255,0.85)] animate-[fluidBubble4_10s_infinite_ease-in-out_alternate]" />
                          
                          {/* Bubble 5 */}
                          <div className="absolute top-[25%] left-[86%] w-[2.5px] h-[2.5px] bg-white/95 rounded-full shadow-[0_0_1px_rgba(255,255,255,0.8)] animate-[fluidBubble5_8s_infinite_ease-in-out_alternate]" />
                        </div>
                      </div>

                      {/* Outer glass tube static highlights - creates the shell separation regardless of progress level */}
                      <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-black/10 pointer-events-none rounded-full" />
                      
                      {/* Linear high-intensity light reflection stripe across the whole tube */}
                      <div className="absolute inset-x-3.5 top-0.5 h-[12%] bg-white/40 pointer-events-none rounded-full filter blur-[0.2px]" />
                      
                      {/* Glass tube dome edge highlight on the left */}
                      <div className="absolute inset-y-1.5 left-1 w-1.5 bg-white/35 pointer-events-none rounded-full filter blur-[0.5px]" />
                    </div>
                    {index < goals.length - 1 && (
                      <div className="h-[1px] bg-gray-100/40 w-full mt-1.5" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 4: Что важно учитывать */}
        <div className="flex flex-col gap-3 text-left mb-6">
          <div className="flex justify-between items-center px-1">
            <span 
              className="text-[18px] sm:text-[20px] font-bold text-text-dark"
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
            >
              Что важно учитывать
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_3px_12px_rgba(43,49,55,0.02)] p-2.5 flex flex-col gap-1">
            {(() => {
              const selectedChronicIds = props.selectedChronic !== undefined
                ? props.selectedChronic 
                : ["hypertension", "ibs", "anemia"];
              if (selectedChronicIds.length === 0) {
                return (
                  <div 
                    className="text-center py-5 px-4 text-text-muted text-[15px]"
                    style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                  >
                    Хронических состояний нет
                  </div>
                );
              }
              return selectedChronicIds.map((condId, index) => {
                const meta = ALL_CHRONIC_METADATA[condId];
                if (!meta) return null;
                const IconComp = meta.icon;
                return (
                  <div key={condId}>
                    <div 
                      className="flex items-center justify-between py-2 px-1.5 rounded-xl hover:bg-[#FAFAFA]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${meta.color} flex items-center justify-center`}>
                          <IconComp className="w-5 h-5 stroke-[2]" />
                        </div>
                        <span 
                          className="font-medium text-[15px] sm:text-[16px] text-text-dark"
                          style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                        >
                          {meta.name}
                        </span>
                      </div>
                    </div>
                    {index < selectedChronicIds.length - 1 && (
                      <div className="h-[1px] bg-gray-100/60 w-full" />
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Section 5: AI Architecture Layer Config */}
        <div className="flex flex-col gap-3 text-left mb-6">
          <div className="flex justify-between items-center px-1">
            <span 
              className="text-[18px] sm:text-[20px] font-bold text-text-dark"
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
            >
              Архитектура ядра Системы (Пилот)
            </span>
            <span className="text-[11.5px] bg-[#E8F8EE] text-[#16B551] px-2.5 py-0.5 rounded-full font-bold border border-[#D1F7E2]">
              Гатвей активен
            </span>
          </div>

          <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_3px_12px_rgba(43,49,55,0.02)] p-4 sm:p-5 flex flex-col gap-4">
            <p className="text-[13px] text-text-muted leading-relaxed">
              Этот слой абстрагирует роли <span className="font-semibold text-[#16B551]">AnnaText</span>, <span className="font-semibold text-[#16B551]">MealAnalysis</span> и <span className="font-semibold text-[#16B551]">IngredientRecognition</span>. Вы можете бесшовно переключать источник моделей под капотом без изменения интерфейса:
            </p>

            {/* Selector Pills */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-50 rounded-[18px] border border-gray-100">
              {(["studio", "server", "hybrid"] as const).map((prov) => {
                const isActive = aiProvider === prov;
                const label = prov === "studio" ? "Studio" : prov === "server" ? "Сервер" : "Гибрид";
                return (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => handleProviderChange(prov)}
                    className={`py-2 rounded-[14px] text-[13px] font-black cursor-pointer transition-all duration-300 relative ${
                      isActive 
                        ? "bg-white text-[#16B551] shadow-sm border border-gray-100" 
                        : "text-text-muted hover:text-text-dark"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Selected Mode Descriptor */}
            <div className="bg-[#FAFBFB] rounded-xl p-3 border border-gray-100/70 text-[12.5px] text-text-sec leading-relaxed text-left">
              {aiProvider === "studio" && (
                <div>
                  <span className="font-bold text-amber-600 block mb-0.5">🪄 Режим: Google AI Studio</span>
                  Прямые оптимизированные вызовы Системы. Отказоустойчивый квотный кэш-фильтр автоматически страхует приложение от лимитов.
                </div>
              )}
              {aiProvider === "server" && (
                <div>
                  <span className="font-bold text-[#16B551] block mb-0.5">🖥️ Режим: Собственная инфраструктура</span>
                  Все запросы маршрутизируются на выделенные production-серверы компании и кастомные тонкие шлюзы API.
                </div>
              )}
              {aiProvider === "hybrid" && (
                <div>
                  <span className="font-bold text-indigo-600 block mb-0.5">🧬 Режим: Гибридный шлюз</span>
                  Высокоскоростное комбинирование локального квотного реестра и облачной Studio-консоли для пиковых скоростей.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Premium "Продолжить" button */}
        <div className="w-full px-2 mt-6 mb-4 flex justify-center">
          <button
            id="btn-continue"
            type="button"
            onClick={props.onOpenMyDay}
            className="w-full max-w-[340px] h-[58px] rounded-[28px] text-[18px] sm:text-[20px] font-bold text-white volumetric-btn flex items-center justify-center cursor-pointer overflow-hidden relative select-none"
            style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
          >
            {/* Shimmer glaze overlay inside the button */}
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_3s_infinite_linear]" />
            <div className="absolute top-1 right-8 w-2 h-2 rounded-full bg-white/30 blur-[0.5px]" />
            <span className="relative z-10 drop-shadow-[0_1.5px_2px_rgba(9,102,43,0.35)] tracking-wide">
              Продолжить
            </span>
          </button>
        </div>

      </div>

      {/* Embedded stationary Bottom Bar layout with prototype back click attached to nav-home */}
      <div className="w-full">
        <BottomBar onHomeClick={props.onBack} />
      </div>

    </div>
  );
}
