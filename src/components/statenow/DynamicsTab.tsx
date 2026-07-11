import React, { useState, useEffect } from "react";
import { 
  Check, 
  ArrowRight, 
  Droplet, 
  Flame, 
  Moon, 
  Sun, 
  Wind, 
  Zap, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Heart, 
  Smile, 
  Activity, 
  AlertCircle,
  Key
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AnnaTabSpoiler from "./AnnaTabSpoiler";
import { NextStepRecommendation } from "../../utils/nextStepEngine";
import { SystemKeysStore, SystemKeyProgress } from "../../services/SystemKeysStore";

const PHYSIOLOGICAL_IMPACTS: Record<string, string> = {
  legumes: "Насыщает кишечник биогенной ацидофильной флорой, нормализует уровень глюкозы и снимает сосудистый спазм за счет высокого калия.",
  whole_grains: "Обеспечивает плавное высвобождение гликогена, исключая выбросы инсулина, и питает миелиновые оболочки нервных стволов.",
  vegetables: "Создает устойчивую щелочную среду, снижает риски микролитов в почках и поддерживает эластичность соединительного матрикса.",
  leafy_greens: "Критический донор органических нитратов, стимулирует синтез оксида азота (NO), расслабляющего и омолаживающего капиллярную сеть.",
  nuts: "Обогащает мембраны гепатоцитов и нейронов незаменимыми жирами высокой чистоты, укрепляя когнитивную устойчивость.",
  seeds: "Обеспечивает ядра клеток микроэлементами-кофакторами (цинком, селеном), активируя регенерацию и митохондриальный баланс.",
  ground_flax: "Образует деликатную обволакивающую мембрану в желудке, предотвращает рефлюкс и связывает желчные кислоты для детоксикации.",
  spices: "Инактивирует системные маркеры воспаления, повышает активность пищевых ферментов без раздражения слизистой.",
  fruits: "Ощелачивает плазму, поставляет клеткам легкоусвояемые структурированные моносахариды и биофлавоноиды молодости.",
  berries: "Защищает почечные клубочки и сосудистую сеть глаз от оксидативной деструкции, активируя долголетие генов SIRT1.",
  sprouts: "Запускает мощную фазу II печеночной конъюгации через сульфорафановые индукторы, убирая органический застой.",
  must_have: "Стабилизирует защитную микробиологическую биопленку в ЖКТ и повышает абсорбцию аминокислот высокой чистоты.",
  healthy_drinks: "Увеличивает объем циркулирующей плазмы, тонизирует блуждающий нерв (Вагус) и вымывает накопленный натрий.",
  compliment: "Резко снижает активность амигдалы и надпочечников, прекращая деструктивную выработку кортизола и адреналина.",
  recipe: "Обогащает разнообразие полезных штаммов макробиома, укрепляя иммунитет и повышая защитные функции слизистых.",
  soaking: "Разрушает молекулы фитиновой кислоты, делая калий, железо, магний и фосфор полностью биодоступными для всасывания.",
  no_oil_cook: "Освобождает клеточные мембраны от перекисных окисленных липидов, разгружая лимфодренажный проток.",
  no_salt_cook: "Снимает осмотический стресс с интимы артерий, убирает скрытую задержку плазмы в тканях и снижает давление.",
  no_caffeine_day: "Позволяет аденозиновым рецепторам восстановить чувствительность, возвращая глубокие восстановительные фазы сна.",
  no_sugar_day: "Предотвращает реакцию гликозилирования (склеивания) белков, оберегая эластин и коллаген сосудов от разрушения."
};

interface DynamicsTabProps {
  key?: any;
  sleep: number;
  water: number;
  ratingEnergy: number;
  ratingWellbeing: number;
  ratingLightness: number;
  habitsDone: number;
  habitsTarget: number;
  cookedBookDishes: {
    id: string;
    name: string;
    category: string;
  }[];
  annaAnalysisText?: string;
  recommendedAction?: NextStepRecommendation;
  currentDayIndex?: number;
  savedDishes?: any[];
}

export default function DynamicsTab({
  sleep,
  water,
  ratingEnergy,
  ratingWellbeing,
  ratingLightness,
  habitsDone,
  habitsTarget,
  cookedBookDishes,
  annaAnalysisText,
  recommendedAction,
  currentDayIndex = 1,
  savedDishes = [],
}: DynamicsTabProps) {
  // Local reactive states initialized from props to allows interactive system simulation
  const [localSleep, setLocalSleep] = useState<number>(sleep);
  const [localWater, setLocalWater] = useState<number>(water);
  const [localEnergy, setLocalEnergy] = useState<number>(ratingEnergy);
  const [localWellbeing, setLocalWellbeing] = useState<number>(ratingWellbeing);
  const [localLightness, setLocalLightness] = useState<number>(ratingLightness);
  const [localHabitsDone, setLocalHabitsDone] = useState<number>(habitsDone);
  const [localCooked, setLocalCooked] = useState(cookedBookDishes);

  // 20 Keys integration state
  const [keysProgress, setKeysProgress] = useState<SystemKeyProgress[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("legumes");
  const [keysTrigger, setKeysTrigger] = useState<number>(0);
  
  // Interactive simulator states unique to the "Dynamics" pulse tab
  const [dayConfirmedStart, setDayConfirmedStart] = useState<boolean>(sleep > 0);
  const [breathingDone, setBreathingDone] = useState<boolean>(false);
  const [movementDone, setMovementDone] = useState<boolean>(habitsDone > 1);
  const [dayEndedSleep, setDayEndedSleep] = useState<boolean>(false);
  const [systemAlertMessage, setSystemAlertMessage] = useState<string | null>(null);

  // Load and calculate 20 system keys in real-time
  useEffect(() => {
    const res = SystemKeysStore.calculateKeysForDay(currentDayIndex, savedDishes, localWater);
    setKeysProgress(res.keys);
    setLocalHabitsDone(res.closedCount);
  }, [currentDayIndex, savedDishes, localWater, keysTrigger]);

  const handleToggleKey = (keyId: string) => {
    const targetKey = keysProgress.find(k => k.id === keyId);
    if (!targetKey) return;

    if (targetKey.category === "action") {
      const newChecked = !targetKey.optimalDone;
      SystemKeysStore.updateManualKey(currentDayIndex, keyId, false, { checked: newChecked });
      setKeysTrigger(prev => prev + 1);
      triggerNotification(`${targetKey.emoji} Ключ «${targetKey.name}»: ${newChecked ? "Выполнен!" : "Отметка снята"}`);
    } else {
      const isOptimal = targetKey.totalGrams >= targetKey.portionSizeInGrams * targetKey.optimum;
      const newGrams = isOptimal ? 0 : targetKey.portionSizeInGrams * targetKey.optimum;
      SystemKeysStore.updateManualKey(currentDayIndex, keyId, true, { manualGrams: newGrams });
      setKeysTrigger(prev => prev + 1);
      triggerNotification(`${targetKey.emoji} Ключ «${targetKey.name}»: ${!isOptimal ? "Выполнен!" : "Отметка снята"}`);
    }
  };

  const handleAddPortion = (keyId: string, delta: number) => {
    const targetKey = keysProgress.find(k => k.id === keyId);
    if (!targetKey) return;

    const currentManual = targetKey.manualGrams;
    const size = targetKey.portionSizeInGrams;
    const newManual = Math.max(0, currentManual + (delta * size));

    SystemKeysStore.updateManualKey(currentDayIndex, keyId, true, { manualGrams: newManual });
    setKeysTrigger(prev => prev + 1);
    triggerNotification(`${targetKey.emoji} Объём ключа «${targetKey.name}»: ${newManual + targetKey.autoGrams} г.`);
  };

  // Sync state if props change slightly, while respecting user's interactive overrides
  useEffect(() => {
    if (sleep > 0) {
      setLocalSleep(sleep);
      setDayConfirmedStart(true);
    }
  }, [sleep]);

  useEffect(() => {
    if (water > 0) setLocalWater(water);
  }, [water]);

  // Derived wellness conditions
  const hasBreakfast = localCooked.some(d => d.category === "Завтраки") || localCooked.some(d => d.name.toLowerCase().includes("завтрак"));
  const hasLunch = localCooked.some(d => d.category === "Супы и Салаты" || d.category === "Вторые блюда") || localCooked.some(d => d.name.toLowerCase().includes("обед"));

  // Calculate dynamic physiological metrics for the "System Pulse" panel
  const calculatePulseMetrics = () => {
    let score = 30; // base score if alive
    if (dayConfirmedStart) score += 15;
    if (localSleep >= 420) score += 15; // 7+ hours
    else if (localSleep > 0) score += 8;
    
    // Water metric (target 1500)
    score += Math.min(15, Math.round((localWater / 1500) * 15));
    
    // Nutrition
    if (hasBreakfast) score += 10;
    if (hasLunch) score += 10;
    
    // Daily active status
    if (movementDone) score += 10;
    if (breathingDone) score += 10;

    // Keys of the system completion bonus (up to +15 pts)
    const activeKeysCount = keysProgress.filter(k => k.optimalDone).length;
    score += Math.min(15, activeKeysCount * 1.5);
    
    // Self score
    if (localEnergy > 0) {
      score += Math.round(((localEnergy + localWellbeing + localLightness) / 15) * 15);
    }
    
    const finalScore = Math.min(100, score);
    
    // Status interpretation text based on score
    let label = "Слабый отклик";
    let desc = "Начните утро с подтверждения сна и стакана теплой воды для восстановления баланса.";
    let statusClass = "text-amber-600 bg-amber-50 border-amber-100";
    
    if (finalScore >= 85) {
      label = "Синергия ритмов";
      desc = "Все ключевые системы синхронизированы. Наблюдается идеальный вегетативный тонус.";
      statusClass = "text-emerald-700 bg-emerald-50 border-emerald-100";
    } else if (finalScore >= 60) {
      label = "Адаптивное плато";
      desc = "Ритм удерживается. Добавьте гидратации и запланируйте дыхательный Вагус-ритуал.";
      statusClass = "text-sky-700 bg-sky-50 border-sky-100";
    } else if (finalScore >= 40) {
      label = "Рассогласование";
      desc = "Пропущены опорные точки питания и питья. Есть риск спазма капиллярной сети.";
      statusClass = "text-orange-700 bg-orange-50 border-orange-100";
    }
    
    return {
      score: finalScore,
      label,
      desc,
      statusClass
    };
  };

  const pulse = calculatePulseMetrics();

  // Show a temporary system notification on actions to emphasize full-stack interactivity
  const triggerNotification = (msg: string) => {
    setSystemAlertMessage(msg);
    setTimeout(() => {
      setSystemAlertMessage(null);
    }, 4500);
  };

  // Compile the interactive timeline nodes representing the circadian flow of the day
  const timelineItems = [
    {
      id: "wakeup",
      time: "07:30",
      categoryLabel: "Старт Дня",
      title: "Выход из ночной нейрогормональной фазы",
      description: dayConfirmedStart
        ? `Пробуждение подтверждено. Запущен обратный отсчет циркадного ритма. Восстановительный сон: ${localSleep > 0 ? Math.round(localSleep / 60) + " ч." : "время зафиксировано."}`
        : "Система ожидает подтверждения пробуждения. Режим сна не закрыт, данные вчерашнего периода в режиме ожидания.",
      status: dayConfirmedStart 
        ? (localSleep >= 420 ? "green" : "orange") 
        : "waiting" as const,
      type: dayConfirmedStart ? "actual" as const : "recommendation" as const,
      interpretationText: "Момент фиксации подъема запускает выброс утреннего кортизола, настраивая ритм сосудов на 16 часов вперед.",
      actionButtonLabel: "Подтвердить пробуждение",
      onExecute: () => {
        setDayConfirmedStart(true);
        if (localSleep === 0) setLocalSleep(480); // default to 8 hrs
        triggerNotification("🌅 День успешно начат! Циркадный таймер оптимизирует выработку дневного кортизола.");
      }
    },
    {
      id: "water_morning",
      time: "08:00",
      categoryLabel: "Гидратация",
      title: "Ранняя клеточная детоксикация",
      description: localWater >= 250
        ? `Внесено первые ${localWater} мл чистой структурированной теплой воды. Межклеточный матрикс активирован.`
        : "Вчерашний дефицит влаги не восполнен. Капиллярам почек трудно начать утреннюю фильтрацию.",
      status: localWater >= 250 ? "green" : "waiting" as const,
      type: localWater >= 250 ? "actual" as const : "recommendation" as const,
      interpretationText: "250-500 мл воды натощак мгновенно разжижают кровь, снижая риски утренних перегрузок кровеносного русла.",
      actionButtonLabel: "Выпить 250 мл воды",
      onExecute: () => {
        setLocalWater(prev => Math.max(250, prev + 250));
        triggerNotification("💧 Клеточный баланс: плазма крови разжижена, почки плавно запущены.");
      }
    },
    {
      id: "breakfast",
      time: "09:00",
      categoryLabel: "Питание • Завтрак",
      title: "Завтрак WFPB: Медленный углеводный старт",
      description: hasBreakfast
        ? `Принят завтрак: «${localCooked.find(d => d.category === "Завтраки")?.name || "Овсяный цельнозерновой завтрак с ягодами"}».`
        : "Завтрак еще не зафиксирован. Клетки мозга нуждаются в безопасной плавной глюкозе без инсулиновых качелей.",
      status: hasBreakfast ? "green" : "waiting" as const,
      type: hasBreakfast ? "actual" as const : "recommendation" as const,
      interpretationText: "Сложные углеводы без соли и сахара обеспечивают равномерную подачу энергии в сосуды и ЖКТ без спазмов.",
      actionButtonLabel: "Кулинарная книга: Записать завтрак",
      onExecute: () => {
        const dish = { id: "dyn_breakfast", name: "Зеленая гречка с авокадо и томатами", category: "Завтраки" };
        setLocalCooked(prev => [dish, ...prev]);
        triggerNotification("🥣 Завтрак записан! Клетки получили ценную клетчатку и растительный белок.");
      }
    },
    {
      id: "movement",
      time: "11:30",
      categoryLabel: "Движение",
      title: "Венозная помпа и мышечный лимфоток",
      description: movementDone
        ? "Выполнена тридцатиминутная сосудистая прогулка в темпе циркадного тонуса. Застойные процессы ликвидированы."
        : "Длительное гиподинамическое состояние. Наблюдается спад кровообращения малого таза.",
      status: movementDone ? "green" : "waiting" as const,
      type: movementDone ? "actual" as const : "recommendation" as const,
      interpretationText: "Сокращение икроножных мышц работает как второе сердце, облегчая возврат венозной крови и снижая нагрузку давления.",
      actionButtonLabel: "Выполнить прогулку / Разминку",
      onExecute: () => {
        setMovementDone(true);
        setLocalHabitsDone(prev => Math.min(habitsTarget, prev + 1));
        triggerNotification("🏃‍♂️ Венозная помпа запущена. Лимфодренажный эффект снизил общее сопротивление сосудов.");
      }
    },
    {
      id: "lunch",
      time: "13:30",
      categoryLabel: "Питание • Обед",
      title: "Антиоксидантный обеденный импульс",
      description: hasLunch
        ? `Внесен омолаживающий обед с высокой концентрацией клетчатки: «${localCooked.find(d => d.category === "Супы и Салаты" || d.category === "Вторые блюда")?.name || "Чечевичный суп-пюре со шпинатом"}».`
        : "Обед не верифицирован. Ожидается сытная, но легкая порция овощей, богатых нитратами для расширения сосудов.",
      status: hasLunch ? "green" : "waiting" as const,
      type: hasLunch ? "actual" as const : "recommendation" as const,
      interpretationText: "Листовая зелень и бобовые стимулируют синтез оксида азота, который расслабляет эндотелий мелких артериол.",
      actionButtonLabel: "Зафиксировать сытный обед",
      onExecute: () => {
        const dish = { id: "dyn_lunch", name: "Теплый нутовый салат с брокколи и зеленью", category: "Вторые блюда" };
        setLocalCooked(prev => [...prev, dish]);
        triggerNotification("🥗 Обед подтвержден. Запущена мягкая стимуляция синтеза естественного оксида азота.");
      }
    },
    {
      id: "vagus",
      time: "17:00",
      categoryLabel: "Восстановление • Покой",
      title: "Вагусный ритуал замедления",
      description: breathingDone
        ? "Проведено глубокое респираторное замедление (дыхание в ритме 6-2-7). Симпатический тонус снижен."
        : "Ближе к вечеру накапливается психологическая нагрузка. Рекомендуется 5 минут дыхания по квадрату.",
      status: breathingDone ? "green" : "waiting" as const,
      type: breathingDone ? "actual" as const : "recommendation" as const,
      interpretationText: "Раздражение блуждающего нерва (вагуса) замедляет пульс, успокаивает надпочечники и снижает тонус артерий.",
      actionButtonLabel: "Сделать дыхательную паузу",
      onExecute: () => {
        setBreathingDone(true);
        triggerNotification("💨 Парасимпатическая система активирована. Стресс-индекс снижен на 15%.");
      }
    },
    {
      id: "assessment",
      time: "20:30",
      categoryLabel: "Самооценка",
      title: "Вечерняя точка вегетативного баланса",
      description: localEnergy > 0
        ? `Физический тонус: ${localEnergy}/5 • Лёгкость ЖКТ: ${localLightness}/5 • Психологический дзен: ${localWellbeing}/5.`
        : "Системе не хватает обратной связи о вашем вечернем самочувствии для построения завтрашней карты адаптации.",
      status: localEnergy > 0 ? "green" : "waiting" as const,
      type: localEnergy > 0 ? "actual" as const : "recommendation" as const,
      interpretationText: "Самооценка — ценнейший маркер субъективного отклика. ИИ сопоставляет его с нутриентами для тонкой настройки рекомендаций.",
      actionButtonLabel: "Заполнить вечернюю анкету",
      onExecute: () => {
        setLocalEnergy(4);
        setLocalWellbeing(5);
        setLocalLightness(5);
        triggerNotification("📝 Самочувствие сохранено. Модель обновила прогностические маркеры на завтра.");
      }
    },
    {
      id: "night_sleep",
      time: "22:30",
      categoryLabel: "Конец Цикла",
      title: "Переход к секреции мелатонина",
      description: dayEndedSleep
        ? "Суточный круг успешно завершен и зафиксирован в системе. Оптимальный период для полной релаксации органов и регенерации."
        : "Подготовка к отходу ко сну. Пора убрать синие экраны, приглушить свет и активировать ночной режим для идеальной выработки мелатонина.",
      status: dayEndedSleep ? "green" : "waiting" as const,
      type: "recommendation" as const,
      interpretationText: "Мелатонин является сильнейшим антиоксидантом нервной системы. Засыпание до 23:00 бережет сосуды мозга от раннего старения.",
      actionButtonLabel: "Закрыть день и уйти в сон",
      onExecute: () => {
        setDayEndedSleep(true);
        triggerNotification("🌙 Спокойной ночи! Ночной цикл запущен. Системы переходят в фазу глубокой детоксикации.");
      }
    }
  ];

  const completedKeysCount = keysProgress.filter(k => k.optimalDone).length;
  const selectedKey = keysProgress.find(k => k.id === selectedKeyId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-6 animate-fade-in"
      id="dynamics-tab-panel"
    >
      {/* 0. Anna's Tab Spoiler Analysis */}
      {annaAnalysisText && recommendedAction && (
        <AnnaTabSpoiler 
          tabId="dynamics"
          tabName="Динамика и биоритмы дня"
          analysisText={annaAnalysisText}
          recommendedAction={recommendedAction}
        />
      )}

      {/* Floating Interactive Toast Feedback */}
      <AnimatePresence>
        {systemAlertMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-[#111827] text-[#F9FAFB] text-[12.5px] p-4 rounded-2xl shadow-xl border border-gray-800 flex items-start gap-2.5 z-50 font-sans"
          >
            <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-400 mt-0.5 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-extrabold text-[13px] text-emerald-300">Резонанс Системы</p>
              <p className="text-gray-300 font-medium mt-0.5 leading-relaxed">{systemAlertMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. CENTRAL MODULE "SYSTEM PULSE" PANELS */}
      <div className="bg-[#FAF9F5] rounded-[30px] border border-[#F2EDE4]/80 p-5 md:p-6 text-left relative overflow-hidden shadow-[0_8px_30px_rgba(243,238,230,0.35)] transition-all duration-300">
        <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Dynamic header / Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECE1D0]/30 pb-4.5 mb-5 select-none">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] p-1.5 bg-[#FAF3E5] rounded-xl text-amber-800">🩺</span>
              <div>
                <h2 className="text-[14.5px] font-black tracking-tight text-slate-800 uppercase font-sans">
                  Пульс Системы: Суточный Биоритм
                </h2>
                <p className="text-[11px] text-slate-400/95 font-bold mt-0.5">Вкладка интегрирует сон, воду, питание и вегетативный тонус</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className={`text-[10px] font-extrabold uppercase tracking-wide px-3 py-1 rounded-full border border-orange-100/10 ${pulse.statusClass}`}>
              ● {pulse.label}
            </span>
          </div>
        </div>

        {/* Central visual metric section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5.5 items-center">
          {/* Circular indicator widget (custom crafted pure HTML canvas vibe) */}
          <div className="col-span-1 md:col-span-4 flex flex-col items-center justify-center p-3.5 bg-white/70 rounded-2xl border border-[#F5EFE4]/45 shadow-3xs">
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Radial background arc */}
              <svg className="absolute transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="#F1EFE9" strokeWidth="6.5" fill="transparent" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="42" 
                  stroke={pulse.score > 75 ? "#10B981" : pulse.score > 50 ? "#0288D1" : "#F59E0B"} 
                  strokeWidth="7" 
                  fill="transparent" 
                  strokeDasharray="263.8" 
                  strokeDashoffset={263.8 - (263.8 * pulse.score) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              {/* Inner details */}
              <div className="text-center z-10">
                <span className="text-[26px] font-black tracking-tighter text-slate-800 font-sans block leading-none">
                  {pulse.score}%
                </span>
                <span className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider font-mono block mt-1">
                  ИНДЕКС дня
                </span>
              </div>
            </div>
            
            {/* Realtime mini tracking clock */}
            <div className="mt-3.5 flex items-center gap-1.5 text-slate-500 bg-[#F5F4EF]/60 px-3 py-1 rounded-full border border-slate-200/50">
              <Clock className="w-3.5 h-3.5 text-amber-700 animate-spin" style={{ animationDuration: '45s' }} />
              <span className="text-[10px] font-black font-mono tracking-wide">
                13:14 • ПИК ОРГАНИЗМА
              </span>
            </div>
          </div>

          {/* Interactive feedback & key recommendations interpretation block */}
          <div className="col-span-1 md:col-span-8 space-y-3.5 text-slate-700">
            <div className="bg-[#FAF9F6]/20 py-1.5">
              <h3 className="text-[13px] font-extrabold text-slate-800 leading-normal mb-1">
                Сопряженность физиологических ритмов
              </h3>
              <p className="text-[12px] text-slate-500/95 leading-relaxed font-semibold">
                {pulse.desc} Согласованное прохождение точек гидратации и питания защищает эластичность стенок сосудов и нормализует почечный кровоток.
              </p>
            </div>

            {/* Quick Micro Status Meters */}
            <div className="grid grid-cols-3 gap-2 pb-1 pt-1 border-t border-[#ECE1D0]/30">
              <div className="text-center p-2 rounded-xl bg-white/50 border border-[#F2ECE0]/50 shadow-3xs">
                <div className="flex justify-center mb-1 text-slate-400">
                  <Droplet className={`w-4 h-4 ${localWater >= 1000 ? "text-sky-500 fill-sky-200" : "text-slate-400"}`} />
                </div>
                <div className="text-[11px] font-black text-slate-800 font-mono leading-none">{localWater} мл</div>
                <div className="text-[8.5px] uppercase text-slate-400/90 font-bold tracking-wider mt-1 leading-none">Вода</div>
              </div>

              <div className="text-center p-2 rounded-xl bg-white/50 border border-[#F2ECE0]/50 shadow-3xs">
                <div className="flex justify-center mb-1 text-slate-400">
                  <Flame className={`w-4 h-4 ${hasBreakfast && hasLunch ? "text-amber-500" : "text-slate-400"}`} />
                </div>
                <div className="text-[11px] font-black text-slate-800 font-mono leading-none">
                  {[hasBreakfast, hasLunch].filter(Boolean).length} / 2
                </div>
                <div className="text-[8.5px] uppercase text-slate-400/90 font-bold tracking-wider mt-1 leading-none">Питание</div>
              </div>

              <div className="text-center p-2 rounded-xl bg-white/50 border border-[#F2ECE0]/50 shadow-3xs">
                <div className="flex justify-center mb-1 text-slate-400">
                  <Activity className={`w-4 h-4 ${movementDone ? "text-emerald-500 animate-pulse" : "text-slate-400"}`} />
                </div>
                <div className="text-[11px] font-black text-slate-800 font-mono leading-none">
                  {movementDone ? "Активен" : "Покой"}
                </div>
                <div className="text-[8.5px] uppercase text-slate-400/90 font-bold tracking-wider mt-1 leading-none">Движение</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CHRONOLOGICAL WELLNESS TIMELINE (THE SPINE OF THE MODULE) */}
      <div className="bg-[#FAF9F6] rounded-[28px] border border-orange-100/15 shadow-[0_4px_24px_rgba(242,236,228,0.25)] p-5.5 text-left relative overflow-hidden transition-all duration-300">
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-2 select-none">
          <div className="flex items-center gap-2">
            <span className="text-[14px]">⏰</span>
            <h2 className="text-[13.5px] font-black text-slate-800 tracking-tight uppercase font-sans">
              Временная шкала текущего дня
            </h2>
          </div>
          <span className="text-[8.5px] font-extrabold text-[#10B981] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
            Автоматическое ведение
          </span>
        </div>
        
        <p className="text-[11.5px] text-slate-500/90 leading-relaxed mb-6 font-sans">
          Интегральный ход циркадных ритмов и ключевые отметки ваших действий, влияющие на индекс. Шкала отражает согласованность систем организма.
        </p>

        {/* Timeline list body */}
        <div className="relative pl-7 ml-0.5 mt-4">
          {/* Delicate connection line */}
          <div className="absolute left-[11px] top-3.5 bottom-3.5 w-[1.5px] bg-gradient-to-b from-[#E2D8C9] via-[#ECE4D8] to-[#E9DFD0] opacity-60" />

          <div className="space-y-6">
            {timelineItems.map((item) => {
              return (
                <div key={item.id} className="relative pl-3 text-left">
                  {/* Status indicator button exactly aligned on the left line */}
                  <div className="absolute -left-[30px] top-1 flex items-center justify-center z-10 select-none pointer-events-none">
                    {item.status === "green" && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center relative">
                        {/* Soft halo / glow ring */}
                        <div className="absolute inset-0 rounded-full bg-emerald-550/10 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.25)]" />
                        {/* Glow intensity layer */}
                        <div className="absolute w-3.5 h-3.5 rounded-full bg-emerald-400/35 blur-[3px]" />
                        {/* Dimensional LED Core */}
                        <div className="relative w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 border border-emerald-300/30 shadow-[0_1px_2px_rgba(0,0,0,0.1),_0_0_6px_rgba(16,185,129,0.7),_inset_0_1px_1px_rgba(255,255,255,0.45)]" />
                      </div>
                    )}
                    {item.status === "orange" && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center relative">
                        {/* Soft halo / glow ring */}
                        <div className="absolute inset-0 rounded-full bg-amber-550/10 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.25)]" />
                        {/* Glow intensity layer */}
                        <div className="absolute w-3.5 h-3.5 rounded-full bg-amber-400/35 blur-[3px]" />
                        {/* Dimensional LED Core */}
                        <div className="relative w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 border border-amber-300/30 shadow-[0_1px_2px_rgba(0,0,0,0.1),_0_0_6px_rgba(245,158,11,0.7),_inset_0_1px_1px_rgba(255,255,255,0.45)]" />
                      </div>
                    )}
                    {item.status === "red" && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center relative">
                        {/* Soft halo / glow ring */}
                        <div className="absolute inset-0 rounded-full bg-rose-550/10 border border-rose-500/20 shadow-[0_0_10px_rgba(239,68,68,0.25)]" />
                        {/* Glow intensity layer */}
                        <div className="absolute w-3.5 h-3.5 rounded-full bg-rose-400/35 blur-[3px]" />
                        {/* Dimensional LED Core */}
                        <div className="relative w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-rose-600 to-rose-450 border border-rose-300/30 shadow-[0_1px_2px_rgba(0,0,0,0.1),_0_0_6px_rgba(239,68,68,0.7),_inset_0_1px_1px_rgba(255,255,255,0.45)]" />
                      </div>
                    )}
                    {item.status === "waiting" && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center relative">
                        {/* Soft halo / glow ring with gentle pulse */}
                        <div className="absolute inset-0 rounded-full bg-slate-300/10 border border-dashed border-slate-300/40 shadow-[0_0_8px_rgba(148,163,184,0.1)] " />
                        {/* Glow intensity pulse layer */}
                        <div className="absolute w-3.5 h-3.5 rounded-full bg-slate-400/15 blur-[2px] animate-pulse" />
                        {/* Dimensional LED Core (inactive / waiting) */}
                        <div className="relative w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
                        {/* A tiny pulsing dot overlay to show activity */}
                        <div className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-ping" />
                      </div>
                    )}
                  </div>

                  {/* Body textual block */}
                  <div className="font-sans">
                    {/* Time of node */}
                    <div className="flex items-center gap-1.5 select-none font-sans">
                      <span className="text-[10px] font-black font-mono tracking-wide text-slate-400">
                        {item.time}
                      </span>
                      <span className="text-[9px] text-slate-300">•</span>
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-700/80 font-mono">
                        {item.categoryLabel}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="text-[13.5px] font-black text-slate-850 mt-0.5 leading-snug">
                      {item.title}
                    </h4>

                    {/* Description */}
                    <p className="text-[12px] text-slate-500 leading-relaxed font-semibold mt-1">
                      {item.description}
                    </p>

                    {/* Integrated interpretive secondary text */}
                    {item.interpretationText && (
                      <p className="text-[11.5px] text-slate-400/95 leading-relaxed font-semibold italic mt-1.5 pl-2.5 border-l border-amber-200/30">
                        {item.interpretationText}
                      </p>
                    )}

                    {/* Recommendation mini action button (if waiting/needed) */}
                    {item.status === "waiting" && (
                      <div className="mt-2.5 flex items-center select-none">
                        <button
                          type="button"
                          onClick={item.onExecute}
                          className="text-[11px] font-black text-amber-850 hover:text-amber-950 bg-amber-50/70 hover:bg-amber-100/50 px-2.5 py-1 rounded-lg border border-amber-100/40 hover:border-amber-200/50 transition-all cursor-pointer inline-flex items-center gap-1 shadow-3xs hover:shadow-2xs active:scale-97"
                        >
                          <span>{item.actionButtonLabel}</span>
                          <ArrowRight className="w-3 h-3 text-amber-800" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. CORE BEHAVIOR INTEGRATION CARD - 20 КЛЮЧЕЙ СИСТЕМЫ */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_24px_rgba(43,49,55,0.02)] p-5.5 text-left font-sans relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex items-center justify-between gap-2.5 mb-4 select-none">
          <div className="flex items-center gap-1.8">
            <Key className="w-5 h-5 text-amber-500 fill-amber-300" />
            <h2 className="text-[14px] font-black text-slate-850 tracking-tight uppercase">
              20 ключей системы
            </h2>
          </div>
          <span className="text-[11.5px] font-bold text-amber-900 bg-amber-50 border border-amber-200/50 px-2.5 py-0.5 rounded-full">
            Выполнено {completedKeysCount} из 20
          </span>
        </div>

        <p className="text-[11.5px] text-slate-500 leading-relaxed mb-4 font-semibold">
          Интерактивная карта ваших биологических опорных точек. Каждая отметка мгновенно пересчитывает вегетативную нагрузку и отражает суммарное влияние привычек на структуры организма. Нажмите на ключ для управления и просмотра подробной физиологии.
        </p>

        {/* 20 Keys Circle Grid */}
        <div className="grid grid-cols-5 gap-2.5 sm:gap-3.5 mb-5 select-none">
          {keysProgress.map(k => {
            const isSelected = selectedKeyId === k.id;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setSelectedKeyId(k.id)}
                className={`aspect-square p-1.5 rounded-2xl flex flex-col items-center justify-center border transition-all relative cursor-pointer ${
                  isSelected
                    ? "bg-amber-100/40 border-amber-400 shadow-sm scale-102 ring-2 ring-amber-300/30"
                    : k.optimalDone
                    ? "bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200/50"
                    : k.portionsFilled > 0
                    ? "bg-amber-50/20 hover:bg-amber-50/45 border-amber-200/30"
                    : "bg-slate-50/35 hover:bg-slate-50/70 border-slate-100/80"
                }`}
              >
                <span className="text-[17px] md:text-[20px]">{k.emoji}</span>
                <span className="absolute top-1 right-1.5 text-[7px] md:text-[8.5px] font-mono font-extrabold text-slate-400">
                  {k.num}
                </span>
                
                {/* Visual state bulb indicator */}
                <span className={`w-1.5 h-1.5 rounded-full mt-1.2 ${
                  k.optimalDone 
                    ? "bg-emerald-500 shadow-[0_0_6px_#10B981]" 
                    : k.portionsFilled > 0 
                    ? "bg-amber-500 shadow-[0_0_5px_#F59E0B] animate-pulse" 
                    : "bg-slate-200/80"
                }`} />
              </button>
            );
          })}
        </div>

        {/* Selected Key Details Box */}
        {selectedKey && (
          <div className="p-4 bg-gradient-to-br from-slate-50/80 to-slate-50/30 border border-slate-100/70 rounded-[24px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dashed border-slate-200/60">
              <div className="flex items-center gap-2.5">
                <span className="text-[25px] select-none p-1.8 bg-white rounded-xl shadow-4xs border border-slate-100/60 leading-none">
                  {selectedKey.emoji}
                </span>
                <div>
                  <h3 className="text-[13px] font-black text-slate-850 flex items-center gap-1.5 leading-snug">
                    Ключ {selectedKey.num}: {selectedKey.name}
                    {selectedKey.optimalDone && (
                      <span className="text-[9px] font-black text-emerald-800 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                        Оптимум
                      </span>
                    )}
                  </h3>
                  <p className="text-[11.5px] text-slate-450 leading-snug mt-0.5 font-sans font-semibold">
                    {selectedKey.category === "product" ? "Суточный Продукт питания" : "Образ жизни / Вегетативный ритуал"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-[10px] font-black text-slate-400 uppercase">Статус:</span>
                {selectedKey.optimalDone ? (
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">Закрыт</span>
                ) : selectedKey.portionsFilled > 0 ? (
                  <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">Частично</span>
                ) : (
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100/60 px-2.5 py-0.5 rounded-full">Ожидание</span>
                )}
              </div>
            </div>

            {/* Physiological Action */}
            <div className="mt-3.5">
              <h4 className="text-[11px] font-extrabold text-amber-850 uppercase tracking-wider font-sans">
                Комплексное влияние на организм:
              </h4>
              <p className="text-[12.5px] text-slate-700 leading-relaxed font-semibold mt-1">
                {PHYSIOLOGICAL_IMPACTS[selectedKey.id] || "Элемент активирует процессы регенерации клеток и гармонизирует вегетативную нервную систему."}
              </p>
            </div>

            {/* Direct manual weight entry controls with quick buttons */}
            {selectedKey.category === "product" && (
              <div className="mt-3.5 p-3 bg-white/60 border border-slate-200/50 rounded-2xl flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                    {selectedKey.id === "healthy_drinks" ? "💧 Ручной ввод (мл):" : "📝 Ручной ввод (грамм):"}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={selectedKey.manualGrams === 0 ? "" : selectedKey.manualGrams}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Number(e.target.value);
                        SystemKeysStore.updateManualKey(currentDayIndex, selectedKey.id, true, { manualGrams: val });
                        setKeysTrigger(prev => prev + 1);
                      }}
                      placeholder="0"
                      className="w-16 px-1.5 py-0.5 rounded-lg border border-slate-250 text-center text-slate-800 font-bold text-[12px] focus:outline-none focus:border-amber-400 bg-white"
                    />
                    <span className="text-[10px] font-bold text-slate-450 select-none">
                      {selectedKey.id === "healthy_drinks" ? "мл" : "г"}
                    </span>
                  </div>
                </div>

                {/* Quick increment buttons row */}
                <div className="flex flex-wrap gap-1 w-full justify-start select-none">
                  {selectedKey.id === "healthy_drinks" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const val = selectedKey.manualGrams + 100;
                          SystemKeysStore.updateManualKey(currentDayIndex, selectedKey.id, true, { manualGrams: val });
                          setKeysTrigger(prev => prev + 1);
                        }}
                        className="px-2 py-1 text-[10.5px] font-black bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/15 rounded-lg text-amber-955 cursor-pointer active:scale-95 transition-all"
                      >
                        +100 мл
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const val = selectedKey.manualGrams + 250;
                          SystemKeysStore.updateManualKey(currentDayIndex, selectedKey.id, true, { manualGrams: val });
                          setKeysTrigger(prev => prev + 1);
                        }}
                        className="px-2 py-1 text-[10.5px] font-black bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/15 rounded-lg text-amber-955 cursor-pointer active:scale-95 transition-all"
                      >
                        +250 мл
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const val = selectedKey.manualGrams + 10;
                          SystemKeysStore.updateManualKey(currentDayIndex, selectedKey.id, true, { manualGrams: val });
                          setKeysTrigger(prev => prev + 1);
                        }}
                        className="px-2 py-1 text-[10.5px] font-black bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/15 rounded-lg text-amber-955 cursor-pointer active:scale-95 transition-all"
                      >
                        +10 г
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const val = selectedKey.manualGrams + 50;
                          SystemKeysStore.updateManualKey(currentDayIndex, selectedKey.id, true, { manualGrams: val });
                          setKeysTrigger(prev => prev + 1);
                        }}
                        className="px-2 py-1 text-[10.5px] font-black bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/15 rounded-lg text-amber-955 cursor-pointer active:scale-95 transition-all"
                      >
                        +50 г
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const val = selectedKey.manualGrams + 100;
                          SystemKeysStore.updateManualKey(currentDayIndex, selectedKey.id, true, { manualGrams: val });
                          setKeysTrigger(prev => prev + 1);
                        }}
                        className="px-2 py-1 text-[10.5px] font-black bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/15 rounded-lg text-amber-955 cursor-pointer active:scale-95 transition-all"
                      >
                        +100 г
                      </button>
                    </>
                  )}
                  {selectedKey.manualGrams > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        SystemKeysStore.updateManualKey(currentDayIndex, selectedKey.id, true, { manualGrams: 0 });
                        setKeysTrigger(prev => prev + 1);
                      }}
                      className="px-2 py-1 text-[10.5px] font-black bg-red-50 hover:bg-red-100 border border-red-200/40 rounded-lg text-red-655 cursor-pointer active:scale-95 transition-all ml-auto"
                    >
                      Сброс
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Practical progress & Interactive Toggles */}
            <div className="mt-4 pt-4 border-t border-slate-200/40 flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
              <div className="text-[11.5px] text-slate-400 font-sans font-semibold">
                {selectedKey.category === "product" ? (
                  <>
                    Прогресс: <strong className="text-slate-700">{selectedKey.totalGrams}г</strong> из {selectedKey.portionSizeInGrams * selectedKey.optimum}г (требуется порций: {selectedKey.optimum})
                    {selectedKey.autoGrams > 0 && <span className="block text-[10px] text-emerald-600 font-bold mt-0.5">Внесено из блюд дня: {selectedKey.autoGrams}г</span>}
                  </>
                ) : (
                  <>
                    Прогресс ритуала: <strong className={selectedKey.optimalDone ? "text-emerald-600" : "text-slate-500"}>{selectedKey.optimalDone ? "Выполнено" : "Ожидает выполнения"}</strong>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.8">
                {selectedKey.category === "product" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleAddPortion(selectedKey.id, -1)}
                      disabled={selectedKey.manualGrams <= 0}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-45 text-slate-600 active:scale-95 transition-all text-[15px] font-extrabold cursor-pointer"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPortion(selectedKey.id, 1)}
                      className="px-3.5 h-8 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-900 rounded-xl flex items-center gap-1 hover:text-amber-950 active:scale-95 transition-all text-[11px] font-black cursor-pointer"
                    >
                      + Порция (+{selectedKey.portionSizeInGrams}г)
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleKey(selectedKey.id)}
                    className={`px-3.5 py-1.8 rounded-xl border font-black text-[11px] transition-all cursor-pointer active:scale-95 flex items-center gap-1 ${
                      selectedKey.optimalDone
                        ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                        : "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20 text-emerald-900"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    {selectedKey.optimalDone ? "Сбросить отметку" : "Отметить выполнение"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
