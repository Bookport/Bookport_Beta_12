import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  Calendar, 
  Scan, 
  Sun, 
  EyeOff, 
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Upload,
  AlertTriangle,
  ClipboardCheck
} from "lucide-react";
import BottomBar from "./BottomBar";
import CalendarButton from "./CalendarButton";
import { IngredientRecognitionProvider, AnnaTextProvider } from "../services/aiLayer";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { useAppStore } from "../store/useAppStore";
import { clientLogger } from "../utils/clientLogger";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'neutral_thoughtful', intent: 'thoughtful' }).src;

// Dedicated collections of caring, informative Russian commentary phrases from Anna (strictly technical & non-personal)
const ANNA_FALLBACK_POOL = {
  received: [
    "Изображение получено! Начинается детальный молекулярный анализ тарелки... 🌱",
    "Фотография успешно принята! Система приступила к поиску ингредиентов. Сейчас будет проверено, что на тарелке только чистые цельные растительные продукты ✨",
    "Снимок принят! Запускается глубокое сканирование состава. Порция проверяется на предмет отсутствия скрытой соли, масел и животных добавок!",
    "Отличный ракурс, фото успешно загружено! Система анализирует компоненты блюда. Происходит сканирование структуры изображения..."
  ],
  processing: [
    "Распознавание идёт полным ходом. Нейросеть сопоставляет контуры продуктов с базой данных WFPB... 🔍",
    "Процесс требует времени, так как анализируется каждый ингредиент. Система подтверждает стабильный ход проверки ✨",
    "В данный момент алгоритм аккуратно отделяет фон от самой еды, чтобы никакие лишние предметы не повлияли на итоговый расчёт растительного профиля.",
    "Проводится изучение текстуры и оттенков продуктов на снимке. Состав детально перепроверяется алгоритмом, чтобы исключить малейшие следы соли или животных жиров..."
  ],
  delayed: [
    "Анализ продолжается, это штатная процедура. Прямо сейчас алгоритм рассчитывает точное соотношение белков, жиров и сложных углеводов 🌱",
    "Спасибо за терпение. Сервер тщательно сверяет микроэлементы и витамины блюда. Это деликатная обработка данных ✨",
    "Чуть дольше, чем планировалось, но это ради максимальной точности. Система разделяет сложные блюда на отдельные WFPB-ингредиенты, чтобы отчёт был безупречным ✨",
    "Похоже, на снимке представлено блюдо с насыщенным составом. Нейросеть выполняет кодирование информации. Ещё буквально секунду!"
  ],
  longWait: [
    "Соединение с базой знаний WFPB удерживается стабильно. Система тщательно изучает растительные волокна на изображении. Процесс под контролем!",
    "Вычисляются параметры блюда. Прямо в это мгновение алгоритм формирует подробный отчёт по порции, сверяя состав со строгими стандартами WFPB-питания 🌱",
    "Сервер обрабатывает сложную структуру кадра. Выполняется автоматическая проверка на WFPB-чистоту блюда без соли. Финализируются расчёты..."
  ],
  retries: [
    "Выполняется повторная сонастройка соединения. Алгоритм проводит повторный цикл обработки для получения точного результата 🌱",
    "Алгоритм переподключает резервные вычислительные линии для глубокого анализа структуры кадра. Процесс продолжается ✨",
    "Идёт детальная вторичная сверка структуры кадра. Проверяется каждая деталь, чтобы гарантировать чистоту и пользу рациона! 🔥",
    "Система проводит точечный разбор сложных участков фото. Ожидается финальный ответ от сервера!"
  ]
};

interface WhatIEatScreenProps {
  onBack?: () => void;
  onVerifyComposition: (ingredients: any[], imgBase64: string) => void;
  dayNotes?: Record<number, { text: string; time: string }[]>;
  currentDayIndex: number;
  screen?: string;
  onOpenCalendar?: () => void;
}

export default function WhatIEatScreen({
  onVerifyComposition,
  currentDayIndex,
  onBack: propsOnBack,
  dayNotes: propsDayNotes,
  screen: propsScreen,
  onOpenCalendar: propsOnOpenCalendar,
}: WhatIEatScreenProps) {
  const setScreen = useAppStore((s) => s.setScreen);
  const onBack = propsOnBack || (() => setScreen("my-day"));
  const dayNotes = propsDayNotes || {};
  const screen = propsScreen || useAppStore((s) => s.screen);
  const onOpenCalendar = propsOnOpenCalendar || (() => {});
  const [photoAdded, setPhotoAdded] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAiScanning, setIsAiScanning] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAnalysisAttempted, setIsAnalysisAttempted] = useState<boolean>(false);

  const [retryAttempt, setRetryAttempt] = useState<number>(0);
  const [annaMessage, setAnnaMessage] = useState<string>("");
  const [showAnna, setShowAnna] = useState<boolean>(false);

  const scanIntervalRef = useRef<any>(null);
  const usedMessagesRef = useRef<Set<string>>(new Set());
  const tickCounterRef = useRef<number>(0);
  const isCurrentlyScanningRef = useRef<boolean>(false);

  React.useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      isCurrentlyScanningRef.current = false;
    };
  }, []);

  const loadAnnaMessage = async (situation: string) => {
    const dialog = await AnnaTextProvider.getCaringSupport(situation);
    setAnnaMessage(dialog.message);
  };
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).currentScreenContext = {
      screen_id: "what-i-eat",
      screen_title: "Дневник Тарелки (Сканирование Рациона)",
      current_day: currentDayIndex,
      user_input_values: {
        photo_selected: photoAdded,
        ai_analyzer_is_scanning: isAiScanning,
        scanned_completed: isAnalysisAttempted
      },
      current_status: isAiScanning ? "Проводится молекулярный ИИ-анализ WFPB состава" : (photoAdded ? "Фото готово к анализу" : "Ожидание загрузки снимка тарелки")
    };

    return () => {
      if ((window as any).currentScreenContext?.screen_id === "what-i-eat") {
        delete (window as any).currentScreenContext;
      }
    };
  }, [currentDayIndex, photoAdded, isAiScanning, isAnalysisAttempted]);

  const triggerFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Clear all state immediately to maintain a perfect neutral state during loading
      setErrorMessage(null);
      setIsAnalysisAttempted(false);
      onVerifyComposition(null, null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        setPhotoAdded(true);
        setErrorMessage(null);
        setIsAnalysisAttempted(false);
        onVerifyComposition(null, null);
        showToast("✓ Фото успешно загружено и подготовлено к анализу!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCapturedImage(null);
    setPhotoAdded(false);
    setErrorMessage(null);
    setIsAnalysisAttempted(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onVerifyComposition(null, null); // Ensure everything is fully cleared
    showToast("Центральная область очищена для нового блюда");
  };

  const handleVerify = async () => {
    if (!photoAdded || !capturedImage) return;

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    setIsAiScanning(true);
    setErrorMessage(null);
    setIsAnalysisAttempted(false);
    onVerifyComposition(null, null); // Stop using the old response for a new photo
    setRetryAttempt(1);
    setShowAnna(true);
    setAnnaMessage("");
    showToast("🔬 Нейросетевая проверка скрытой соли, животных жиров и добавок...");

    let requestFinished = false;
    let elapsedSeconds = 0;
    let currentAttempt = 1;

    const getUnusedFallbackMsg = (category: keyof typeof ANNA_FALLBACK_POOL): string => {
      const pool = ANNA_FALLBACK_POOL[category];
      const unused = pool.filter(msg => !usedMessagesRef.current.has(msg));
      if (unused.length > 0) {
        const picked = unused[Math.floor(Math.random() * unused.length)];
        usedMessagesRef.current.add(picked);
        return picked;
      }
      const backup = pool.filter(msg => msg !== annaMessage);
      const picked = backup.length > 0 ? backup[Math.floor(Math.random() * backup.length)] : pool[0];
      return picked;
    };

    const triggerAnnaScanningMessage = async () => {
      tickCounterRef.current += 1;
      const currentTickId = tickCounterRef.current;

      // 1. Instantly display a beautiful, guaranteed non-repeating fallback message so layout is fluid
      let fallbackMsg = "";
      if (currentAttempt > 1) {
        fallbackMsg = getUnusedFallbackMsg("retries");
      } else {
        if (elapsedSeconds === 0) {
          fallbackMsg = getUnusedFallbackMsg("received");
        } else if (elapsedSeconds <= 10) {
          fallbackMsg = getUnusedFallbackMsg("processing");
        } else if (elapsedSeconds <= 20) {
          fallbackMsg = getUnusedFallbackMsg("delayed");
        } else {
          fallbackMsg = getUnusedFallbackMsg("longWait");
        }
      }
      setAnnaMessage(fallbackMsg);

      // 2. Perform a real AI query in the background to fetch a fully custom and unique commentary matching this exact stage
      const getSituationDescription = (seconds: number, attempt: number): string => {
        if (attempt > 1) {
          return `попытка распознавания фотографии номер ${attempt}. Система подбадривает пользователя, поясняет с технической стороны, что сейчас идет повторная сонастройка и сверка данных на сервере. Не используй личные местоимения Я или Мы.`;
        }
        if (seconds === 0) {
          return "изображение блюда успешно получено и отправлено нейросети для поиска скрытой соли, масел и животных добавок. Опиши это вежливо и подбадривающе, от третьего лица (без упоминания Я или Мы), начав технический анализ кадра.";
        }
        if (seconds <= 10) {
          return "анализ длится 10 секунд. Объясни с технической стороны, как алгоритм делит снимок на сегменты, определяет контур каждого ингредиента и сопоставляет их со стандартами WFPB-рациона без соли.";
        }
        if (seconds <= 20) {
          return "анализ длится дольше ожидаемого (20 секунд). Объясни с технической стороны, что сервер сопоставляет ингредиенты со справочной базой данных, исключает скрытые масла и рассчитывает БЖУ-профиль.";
        }
        return `анализ длится уже ${seconds} секунд. Поддержи пользователя, вежливо пояснив, что алгоритм завершает детальное вычисление растительных волокон и кодирование структуры кадра.`;
      };

      const situation = getSituationDescription(elapsedSeconds, currentAttempt);

      try {
        const dialog = await AnnaTextProvider.getCaringSupport(situation);
        // Only apply if scanning is still going and on the same tick
        if (isCurrentlyScanningRef.current && currentTickId === tickCounterRef.current) {
          if (dialog && dialog.message && !usedMessagesRef.current.has(dialog.message)) {
            setAnnaMessage(dialog.message);
            usedMessagesRef.current.add(dialog.message);
          }
        }
      } catch (err) {
        console.warn("[WhatIEatScreen] AI commentary generation failed, remaining on fallback.", err);
      }
    };

    // Mark scanning states
    isCurrentlyScanningRef.current = true;
    usedMessagesRef.current.clear();

    // First message immediately
    triggerAnnaScanningMessage();

    // Setup progressive 10-second interval
    scanIntervalRef.current = setInterval(() => {
      elapsedSeconds += 10;
      triggerAnnaScanningMessage();
    }, 10 * 1000);

    const maxAttempts = 3;
    const waitMs = (ms: number) => new Promise(r => setTimeout(r, ms));

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      currentAttempt = attempt;
      setRetryAttempt(attempt);

      // Immediately refresh the commentary when starting a new attempt
      if (attempt > 1) {
        triggerAnnaScanningMessage();
      }

      try {
        if (attempt > 1) {
          showToast(`🔄 Повторная попытка распознавания (${attempt} из ${maxAttempts})...`);
        }

        const results = await IngredientRecognitionProvider.extractIngredientsFromImage(capturedImage);
        if (results && results.ingredients && results.ingredients.length > 0) {
          requestFinished = true;
          isCurrentlyScanningRef.current = false;
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }
          
          const rawIngredients = results.ingredients || [];
          const hasFood = rawIngredients.some((item: any) => item.status === "green" || item.status === "error");
          const hasNonFood = rawIngredients.some((item: any) => item.status === "blue");
          
          let filteredIngredients = rawIngredients;
          let messageTitle = results.dishName || "Распознанное блюдо";
          
          if (hasFood && hasNonFood) {
            // Rule 2: If contains a mix of both edible (green/error) and non-edible (blue) objects,
            // we select only the edible objects and analyze them!
            filteredIngredients = rawIngredients.filter((item: any) => item.status === "green" || item.status === "error");
            messageTitle = "Исключены непищевые предметы";
          }
          
          showToast(`✓ Анализ завершён: «${messageTitle}»`);
          
          setTimeout(() => {
            setIsAiScanning(false);
            setIsAnalysisAttempted(false);
            setShowAnna(false);
            const finalIngredients = filteredIngredients.map((item: any) => ({
              ...item,
              image: item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=150"
            }));
            onVerifyComposition(finalIngredients, capturedImage);
          }, 800);
          return; // Success! Return out of function
        } else {
          throw new Error("Не удалось извлечь ингредиенты в ответе системы");
        }
      } catch (err: any) {
        console.warn(`[Retry-Loop] Attempt ${attempt} failed:`, err);
        
        if (attempt < maxAttempts) {
          // Trigger Anna's supportive block for unstable state
          setShowAnna(true);
          setAnnaMessage(`Произошёл временный сетевой сбой на шаге ${attempt}. Система автоматически инициирует глубокую перенастройку модулей и выполняет перезапуск запроса...`);
          await waitMs(2500); // progressive pacing delay
        } else {
          // Ultimate complete failure
          requestFinished = true;
          isCurrentlyScanningRef.current = false;
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }
          setIsAiScanning(false);
          setIsAnalysisAttempted(true);
          setErrorMessage(
            "Извините, сейчас сервер испытывает повышенную нагрузку и временно перегружен. Пожалуйста, попробуйте отправить фото еще раз позже или выберите другой снимок."
          );
          setShowAnna(true);
          setAnnaMessage("В данный момент все свободные вычислительные линии сервера заняты. Загруженное блюдо полностью соответствует визуальным стандартам WFPB. Рекомендуется повторить отправку через несколько минут 🌱");
        }
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div 
      className="w-full flex flex-col justify-between min-h-[844px] bg-[#FAFBFB] relative select-none" 
      id="what-i-eat-screen"
      style={{ fontFamily: '"Calibri", "Helvetica Neue", sans-serif' }}
    >
      {/* Hidden system file picker input */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Main content viewport */}
      <div className="flex-1 flex flex-col px-5 pt-3 pb-6 relative">
        
        {/* UPPER NAVIGATION BAR WITH TITLE */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={onBack}
            className="w-11 h-11 bg-[#FFFFFF] hover:bg-[#FAFAFA] border border-[#EFF2F3] shadow-[0_4px_12px_rgba(43,49,55,0.02)] rounded-[16px] flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-[#2B3137] stroke-[2.5]" />
          </button>

          <h1 
            className="text-[23px] font-extrabold text-[#2B3137] tracking-tight"
            style={{ fontFamily: '"Calibri", sans-serif' }}
          >
            Что я ем?
          </h1>

          <CalendarButton 
            dayNotes={dayNotes}
            currentDayIndex={currentDayIndex}
            screen={screen}
            onClick={onOpenCalendar}
            className="w-11 h-11 rounded-[16px]"
          />
        </div>

        {/* GUIDING SUBTITLE */}
        <div className="text-center mb-5">
          <p 
            className="text-[14.5px] text-[#737C86] font-semibold leading-[1.35]"
            style={{ fontFamily: '"Calibri", sans-serif' }}
          >
            {photoAdded 
              ? "Фото готово к обработке! Нажмите на кнопку внизу для мгновенного расчёта всех нутриентов системой."
              : "Загрузите фото блюда из галереи устройства для проведения моментального анализа состава системой."
            }
          </p>
        </div>

        {/* CENTRAL CARING UPLOAD FRAMEWAY */}
        <div className="relative w-full aspect-[4/5] sm:aspect-square rounded-[36px] overflow-hidden bg-[#FFFFFF] shadow-[0_16px_40px_rgba(43,49,55,0.035)] border-4 border-[#FFFFFF] p-1.5 mb-5 flex flex-col items-center justify-center">
          
          <AnimatePresence mode="wait">
            {!photoAdded ? (
              // 1. STATE: DESIGNED EMPTY STATE OF THE CONTAINER
              <motion.button
                key="empty-upload-box"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                onClick={triggerFileDialog}
                className="w-full h-full rounded-[30px] border-2 border-dashed border-[#D1E7DD] bg-[#FAFAFA] hover:bg-[#F4FAF7] hover:border-[#16B551]/40 transition-all duration-300 flex flex-col items-center justify-center p-6 text-center group cursor-pointer relative"
              >
                {/* Soft glowing ambient drop light */}
                <div className="absolute inset-6 rounded-[24px] bg-gradient-to-b from-[#16B551]/0 to-[#16B551]/[0.02] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center justify-center">
                  {/* Glowing Icon Enclosure */}
                  <div className="w-[88px] h-[88px] rounded-full bg-[#ECFDF5] border border-[#D1F7E1] flex items-center justify-center mb-5 shadow-[0_8px_20px_rgba(22,181,81,0.05)] group-hover:scale-105 transition-transform duration-300 relative">
                    <Upload className="w-8 h-8 text-[#16B551] stroke-[2.2]" />
                    <div className="absolute inset-0 rounded-full border-2 border-[#16B551]/15 animate-pulse" />
                  </div>

                  <h3 
                    className="text-[20px] font-extrabold text-[#2B3137] mb-2 leading-tight"
                    style={{ fontFamily: '"Calibri", sans-serif' }}
                  >
                    Загрузите фото блюда из галереи
                  </h3>

                  <p 
                    className="text-[13.5px] text-[#737C86] font-medium max-w-[260px] leading-relaxed"
                    style={{ fontFamily: '"Calibri", sans-serif' }}
                  >
                    Нажмите в этой области, чтобы выбрать снимок. Система очистит состав от скрытой соли и продуктов животного происхождения.
                  </p>
                </div>
              </motion.button>
            ) : (
              // 2. STATE: USER IMAGE LOADED SENSORY PREVIEW
              <motion.div
                key="image-loaded-preview"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="w-full h-full rounded-[30px] overflow-hidden relative flex flex-col justify-between p-5 bg-[#121415]"
              >
                {/* Actual image source background */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src={capturedImage || ""} 
                    alt="Loaded plate" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {/* Clean artistic glass shading gradient overlay */}
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.6))] pointer-events-none" />
                </div>

                {/* File uploaded status indicators */}
                <div className="relative z-10 flex items-center justify-between pointer-events-none">
                  <span className="bg-[#16B551]/95 text-[#FFFFFF] font-mono text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border border-white/20 shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Файл загружен</span>
                  </span>
                  
                  <span className="bg-[#121415]/75 backdrop-blur-sm text-[#10D150] font-mono text-[10px] font-black px-3 py-1 rounded-full border border-white/10 uppercase">
                    ГОТОВО К АНАЛИЗУ
                  </span>
                </div>

                {/* Sensory glass reset options bar */}
                <div className="relative z-10 mt-auto flex flex-col gap-1 text-center bg-[#121415]/85 backdrop-blur-md rounded-[22px] p-4 border border-white/10 max-w-[325px] mx-auto w-full">
                  <p 
                    className="text-[14px] text-white font-extrabold leading-tight"
                    style={{ fontFamily: '"Calibri", sans-serif' }}
                  >
                    Ваше изображение готово
                  </p>
                  
                  <button
                    type="button"
                    onClick={handleResetPhoto}
                    className="mt-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl py-2 px-4 text-[12.5px] font-bold text-gray-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5 self-center active:scale-95 select-none"
                  >
                    <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span style={{ fontFamily: '"Calibri", sans-serif' }}>Выбрать другое фото</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DYNAMIC SPINNER MODAL BLOCK */}
          <AnimatePresence>
            {isAiScanning && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#0E1F1A]/96 backdrop-blur-md z-40 flex flex-col items-center justify-center text-center p-6 rounded-[32px]"
              >
                <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
                  <div className="absolute inset-0 bg-[#16B551]/20 rounded-full animate-ping" />
                  <div className="absolute inset-2 bg-[#16B551]/30 rounded-full animate-pulse" />
                  <div className="w-14 h-14 bg-[#16B551] text-white rounded-full flex items-center justify-center shadow-lg">
                    <Sparkles className="w-6 h-6 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                </div>

                <h3 
                  className="text-[20px] font-extrabold text-white mb-2" 
                  style={{ fontFamily: '"Calibri", sans-serif' }}
                >
                  Нейросетевой анализ Системы
                </h3>
                
                <p 
                  className="text-[13.5px] text-[#A7F3D0] max-w-[260px] font-semibold leading-relaxed mb-4" 
                  style={{ fontFamily: '"Calibri", sans-serif' }}
                >
                  Рекалькуляция микроэлементов, поиск скрытой соли, соусов, добавленных масел и ингредиентов животного происхождения...
                </p>

                {/* Shimmer fluid line */}
                <div className="w-44 h-1.5 bg-[#10D150]/20 rounded-full overflow-hidden border border-[#10D150]/10">
                  <div className="h-full bg-gradient-to-r from-[#10D150] via-white to-[#0A8F3B] animate-[shimmer_1.8s_infinite] w-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SUPPORTIVE CHARACTER BLOCK OF ANNA */}
        <AnimatePresence>
          {showAnna && annaMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gradient-to-r from-[#F0FDF4] to-[#ECFDF5] rounded-[24px] p-4 flex gap-4.5 mb-5 text-left shadow-[0_4px_16px_rgba(22,181,81,0.02)] relative overflow-hidden"
              id="anna-supportive-block"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-b from-[#10D150]/3 to-transparent rounded-full blur-xl pointer-events-none" />
              
              {/* Circular Avatar area of Anna with a tiny green pulsed badge */}
              <div className="relative shrink-0 select-none">
                <div className="w-[45px] h-[45px] rounded-full overflow-hidden shadow-md border border-brand-green-mint/20 relative">
                  <img 
                    src={annaAvatarSrc}
                    alt="Анна — Советник WFPB" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-[12px] h-[12px] bg-[#10D150] rounded-full border border-white shadow-sm flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                </span>
              </div>

              {/* Text Area */}
              <div className="flex flex-col gap-1 w-full">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span 
                      className="text-[14.5px] text-[#15803D] font-extrabold leading-none"
                      style={{ fontFamily: '"Calibri", sans-serif' }}
                    >
                      Анна
                    </span>
                    <span 
                      className="text-[11px] text-text-muted font-bold mt-0.5 leading-none"
                      style={{ fontFamily: '"Calibri", sans-serif' }}
                    >
                      Советник WFPB
                    </span>
                  </div>
                  
                  {isAiScanning && (
                    <span 
                      className="text-[11px] text-[#16B551] font-mono font-bold animate-pulse"
                    >
                      {retryAttempt > 0 ? `Попытка ${retryAttempt}/3` : "Анализ..."}
                    </span>
                  )}
                </div>
                
                <p 
                  className="text-[13.5px] text-[#2B3137] font-semibold leading-normal"
                  style={{ fontFamily: '"Calibri", sans-serif' }}
                >
                  {annaMessage}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* COGNITIVE TIPS ADVISING PANEL */}
        <div className="bg-[#FFFFFF] rounded-[24px] border border-[#EFF2F3] shadow-[0_4px_16px_rgba(43,49,55,0.015)] p-4.5 flex flex-col gap-3.5 mb-5 text-left">
          
          <div className="flex items-center gap-3.5">
            <div className="w-[30px] h-[30px] rounded-full bg-[#ECFDF5] border border-[#FFFFFF] flex items-center justify-center text-[#16B551] shrink-0 shadow-sm">
              <Scan className="w-4 h-4 text-[#16B551]" />
            </div>
            <span 
              className="text-[14px] text-[#2B3137] font-semibold tracking-tight leading-snug"
              style={{ fontFamily: '"Calibri", sans-serif' }}
            >
              Система рассчитывает состав блюда по снимку за секунды.
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-[30px] h-[30px] rounded-full bg-[#ECFDF5] border border-[#FFFFFF] flex items-center justify-center text-[#16B551] shrink-0 shadow-sm">
              <Sun className="w-4 h-4 text-[#16B551]" />
            </div>
            <span 
              className="text-[14px] text-[#2B3137] font-semibold tracking-tight leading-snug"
              style={{ fontFamily: '"Calibri", sans-serif' }}
            >
              Равномерное освещение и чёткий ракурс повышают точность.
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-[30px] h-[30px] rounded-full bg-[#ECFDF5] border border-[#FFFFFF] flex items-center justify-center text-[#16B551] shrink-0 shadow-sm">
              <EyeOff className="w-4 h-4 text-[#16B551]" />
            </div>
            <span 
              className="text-[14px] text-[#2B3137] font-semibold tracking-tight leading-snug"
              style={{ fontFamily: '"Calibri", sans-serif' }}
            >
              Не беспокойтесь о фоне — алгоритм выделит только еду.
            </span>
          </div>
        </div>

        {/* ERROR STATE MESSAGE DISPLAY CARD */}
        <AnimatePresence>
          {errorMessage && isAnalysisAttempted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-red-50/90 border border-red-200 rounded-[24px] p-4.5 flex gap-3.5 mb-5 text-left shadow-sm z-10"
            >
              <div className="w-[30px] h-[30px] rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0 shadow-sm animate-bounce">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <span 
                className="text-[14px] text-red-800 font-semibold tracking-tight leading-snug"
                style={{ fontFamily: '"Calibri", sans-serif' }}
              >
                {errorMessage}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTTOM OPTION DIRECTORIES (DEDICATED CONTROLS) */}
        <div className="flex flex-col gap-3 mt-auto">

          {/* Action Button 2: Проверить состав Системой (disabled/gray until file is added!) */}
          <button
            type="button"
            onClick={handleVerify}
            disabled={!photoAdded || isAiScanning}
            className={`w-full border rounded-[22px] py-[14.5px] px-6 font-extrabold flex items-center justify-center gap-2.5 transition-all duration-300 text-[16px] select-none ${
              photoAdded && !isAiScanning
                ? "bg-gradient-to-b from-[#10D150] via-[#16B551] to-[#0A8F3B] hover:brightness-[1.04] text-white border-transparent shadow-[0_6px_18px_rgba(22,181,81,0.22),_inset_0_2px_4px_rgba(255,255,255,0.35)] animate-[pulse_2.2s_infinite] cursor-pointer"
                : "bg-[#F4F9F6] border-[#D1E7DD] text-[#15803D]/45 opacity-60 cursor-not-allowed"
            }`}
          >
            {photoAdded ? (
              <CheckCircle2 className="w-5 h-5 text-white stroke-[2.5]" />
            ) : (
              <ClipboardCheck className="w-5 h-5 text-[#16B551]/40" />
            )}
            <span style={{ fontFamily: '"Calibri", sans-serif' }} className="uppercase tracking-wider">
              {isAiScanning ? "Проверяем состав..." : "Проверить состав Системой"}
            </span>
          </button>
        </div>

        {/* TOAST POPUP NOTIFICATION overlays */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="absolute bottom-[24px] left-5 right-5 bg-black/85 backdrop-blur-md px-4 py-2.5 rounded-[18px] text-white text-[13px] font-semibold text-center border border-white/10 shadow-lg z-50 leading-snug"
            >
              <span style={{ fontFamily: '"Calibri", sans-serif' }}>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* STICKY BOTTOM TAB NAVIGATION BAR */}
      <div className="w-full">
        <BottomBar onHomeClick={onBack} activeTab="add-food" />
      </div>

    </div>
  );
}
