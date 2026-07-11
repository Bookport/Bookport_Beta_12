import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, Check, HelpCircle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { NoteSpeechInputHelper } from "../utils/speechToText";

export type BriefNoteModuleKey = 
  | "water" 
  | "food" 
  | "movement" 
  | "sleep" 
  | "measurements" 
  | "digestion" 
  | "recipes" 
  | "purchases";

interface BriefNoteBlockProps {
  moduleKey: BriefNoteModuleKey;
  onSave: (text: string, selectedTags: string[], isVoice: boolean) => void;
  onSkip: () => void;
}

// Exactly 10 neutral-gendered tags per module
const MODULE_TAGS: Record<BriefNoteModuleKey, string[]> = {
  water: [
    "Лёгкость",
    "Чистота",
    "Бодрость",
    "Энергия",
    "Без отёков",
    "Свежесть",
    "Баланс",
    "Прилив сил",
    "Влага внутри",
    "Очищение"
  ],
  food: [
    "Сытость",
    "Лёгкость",
    "Чистый вкус",
    "Без соли 🌿",
    "Энергия",
    "Без тяжести",
    "Растительная сила",
    "Баланс",
    "Хорошее усвоение",
    "Приятный рацион"
  ],
  movement: [
    "Тонус",
    "Лёгкость",
    "Бодрость",
    "Гибкость",
    "Энергия",
    "Мышцы в тонусе",
    "Свободное дыхание",
    "Сила",
    "Удовлетворение",
    "Здоровый ритм"
  ],
  sleep: [
    "Ясная голова",
    "Отдых",
    "Бодрость",
    "Лёгкий подъём",
    "Глубокая фаза",
    "Восстановление",
    "Гармония",
    "Без будильника",
    "Отличный сон",
    "Заряд энергии"
  ],
  measurements: [
    "Лёгкость",
    "Прогресс",
    "Стабильность",
    "Хороший темп",
    "Внимание к телу",
    "Мотивация",
    "Результат",
    "Гармония",
    "Здоровье",
    "Осознанность"
  ],
  digestion: [
    "Лёгкость кишечника",
    "Комфорт",
    "Очищение",
    "Энергия",
    "Здоровый микроб",
    "Свобода",
    "Отличный обмен",
    "Забота о теле",
    "Без вздутия",
    "Прилив сил"
  ],
  recipes: [
    "Интерес",
    "Вдохновение",
    "Аппетит",
    "Новый рецепт",
    "Просто готовить",
    "Вкусно и чисто",
    "Творчество",
    "Польза",
    "Любимое",
    "Растительное меню"
  ],
  purchases: [
    "Запас здоровья",
    "Зелёная корзина",
    "Чистый выбор",
    "Без химии",
    "Осознанность",
    "Полезный шопинг",
    "Готовность к неделе",
    "Довольное меню",
    "Овощной арсенал",
    "Польза в корзине"
  ]
};

// Beautiful customized placeholders per module inviting fast thoughts
const PLACEHOLDERS: Record<BriefNoteModuleKey, string> = {
  water: "Что хочется зафиксировать? Напишите о чистоте и свежести...",
  food: "Можно добавить короткую заметку о вкусе и ощущениях после еды...",
  movement: "Как чувствует себя тело? Напишите или надиктуйте пару слов об энергии...",
  sleep: "Что зафиксировать о качестве сна или утренней бодрости прямо сейчас?",
  measurements: "Каковы ощущения в теле при замерах? Запишите короткую мысль...",
  digestion: "Опишите лёгкость или комфорт пищеварения одной приятной строкой...",
  recipes: "Какие вкусовые инсайты или ожидания до старта авторского WFPB блюда?",
  purchases: "Что хочется зафиксировать о пользе товаров в вашей корзине здоровья?"
};

// Custom voice dictation transcripts to simulate real automatic conversion
const VOICE_TRANSCRIPTS: Record<BriefNoteModuleKey, string> = {
  water: "Выпила стакан чистой теплой воды с лимоном натощак. Очень освежает! 🍋",
  food: "Полноценный WFPB обед из чечевицы и запечённой тыквы без капли соли. Вкусно и чисто! 🥗",
  movement: "Завершила 30 минут быстрой ходьбы в парке, суставы лёгкие, дыхание стабильное 🌱",
  sleep: "Спала отлично, проснулась бодрой и с ясной головой без звонка будильника 😴",
  measurements: "Вес снижается плавно, чувствуется небывалая лёгкость и свобода в теле ⚖️",
  digestion: "Усвоение идеальное, кишечник работает как часы на растительной пище 🌿",
  recipes: "Рецепт выглядит потрясающе простым, хочу приготовить на ужин для всей семьи 🍲",
  purchases: "Собрала корзину зелени, свежих овощей и бобовых на всю неделю. Готовы к циклу!"
};

// Theme configurations with Hex values only
const MODULE_THEMES = {
  water: {
    bg: "#CFE3EE", // Мягкий голубой
    text: "#0277BD", // Blue accent
    glow: "rgba(207, 227, 238, 0.4)"
  },
  food: {
    bg: "#F3D8C7", // Мягкий персиковый
    text: "#B85D18", // Peach accent
    glow: "rgba(243, 216, 199, 0.4)"
  },
  movement: {
    bg: "#CFE8D6", // Мягкий зелёный
    text: "#1F5F34", // Green accent
    glow: "rgba(207, 232, 214, 0.4)"
  },
  sleep: {
    bg: "#DDD6F3", // Мягкий лавандовый
    text: "#4A148C", // Violet accent
    glow: "rgba(221, 214, 243, 0.4)"
  },
  measurements: {
    bg: "#F7F4EE", // Мягкая тёплая подложка
    text: "#3E4C3F", // Slate accent
    glow: "rgba(247, 244, 238, 0.6)"
  },
  digestion: {
    bg: "#F3E2A9", // Мягкий солнечный
    text: "#A05A00", // Sunny orange accent
    glow: "rgba(243, 226, 169, 0.4)"
  },
  recipes: {
    bg: "#CFE8D6", // Мягкий зелёный
    text: "#1F5F34",
    glow: "rgba(207, 232, 214, 0.4)"
  },
  purchases: {
    bg: "#CFE8D6", // Мягкий зелёный
    text: "#1F5F34",
    glow: "rgba(207, 232, 214, 0.4)"
  }
};

export default function BriefNoteBlock({
  moduleKey,
  onSave,
  onSkip
}: BriefNoteBlockProps) {
  const [text, setText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTags, setShowTags] = useState(false);
  
  // Voice states and unified helper ref
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceOrigin, setIsVoiceOrigin] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const speechHelperRef = useRef(new NoteSpeechInputHelper());
  const isHoldingMicRef = useRef(false);

  // Clean helper on unmount
  useEffect(() => {
    return () => {
      speechHelperRef.current.release();
    };
  }, []);

  const theme = MODULE_THEMES[moduleKey] || MODULE_THEMES.water;
  const tags = MODULE_TAGS[moduleKey] || MODULE_TAGS.water;
  const placeholderText = PLACEHOLDERS[moduleKey] || "Запишите короткую заметку...";

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleMicPressStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    isHoldingMicRef.current = true;
    setIsRecording(true);
    setIsVoiceOrigin(true);

    speechHelperRef.current.bindSession(
      isHoldingMicRef,
      text,
      (newVal) => setText(newVal),
      (state) => { setIsRecording(state === "listening"); },
    );
  };

  const handleMicPressEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    isHoldingMicRef.current = false;
    speechHelperRef.current.release();
    setIsRecording(false);
  };

  const handleSave = () => {
    onSave(text.trim(), selectedTags, isVoiceOrigin);
    setSaveSuccess(true);
  };

  if (saveSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full py-4 px-5 rounded-[24px] border-t border-white/50 text-center flex flex-col items-center justify-center gap-1.5"
        style={{ 
          backgroundColor: "#FBFAF7",
          boxShadow: "inset 0 1.5px 3px rgba(255, 255, 255, 0.9), 0 4px 18px rgba(0,0,0,0.03)"
        }}
      >
        <div className="w-8 h-8 rounded-full bg-[#CFE8D6] flex items-center justify-center text-[#1F5F34] shadow-inner mb-0.5">
          <Check className="w-5.5 h-5.5 stroke-[3]" />
        </div>
        <span className="text-[14px] font-black text-[#243126] font-sans">Заметка зафиксирована!</span>
        <span className="text-[12px] text-[#6F786F] font-medium leading-none">Ваш инсайт отправлен прямо в архив Дневника.</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full rounded-[28px] p-5.5 relative overflow-hidden text-left flex flex-col gap-3.5 transition-all duration-300"
      style={{
        backgroundColor: "#FBFAF7",
        backgroundImage: `radial-gradient(circle at 80% 10%, ${theme.glow}, transparent 55%)`,
        boxShadow: "inset 0 2px 4px rgba(255, 255, 255, 0.9), 0 6px 20px rgba(0,0,0,0.03)"
      }}
    >
      {/* Dynamic decorative dot colored after the module */}
      <div 
        className="absolute top-5 right-5 w-2 h-2 rounded-full shadow-[0_0_10px_2px_rgba(0,0,0,0.05)]"
        style={{ backgroundColor: theme.bg }}
      />

      {/* Header section with minimal spacing */}
      <div className="flex justify-between items-center pr-4">
        <div className="flex items-center gap-2">
          <div 
            className="w-7 h-7 rounded-xl flex items-center justify-center text-[13px] shadow-[inset_0_1px_2.5px_rgba(255,255,255,0.7)]"
            style={{ backgroundColor: `${theme.bg}50` }}
          >
            🌱
          </div>
          <span className="text-[14px] sm:text-[14.5px] font-black text-[#243126] font-sans tracking-tight">
            Ощущение сейчас
          </span>
        </div>
        
        <button
          type="button"
          onClick={onSkip}
          className="text-[11.5px] font-black uppercase tracking-wider text-[#6F786F] hover:text-[#243126] transition-colors cursor-pointer outline-none select-none"
        >
          Пропустить
        </button>
      </div>

      {/* Input container - without rigid borders, soft look & feel */}
      <div className="flex gap-2 relative">
        <div className="flex-1 min-w-0">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (isVoiceOrigin) setIsVoiceOrigin(false);
            }}
            placeholder={placeholderText}
            className="w-full text-[13px] font-bold leading-normal text-[#243126] placeholder-[#6F786F]/60 p-3.5 rounded-[20px] bg-[#F7F4EE] outline-none min-h-[58px] max-h-[110px] resize-none border-none transition-all focus:bg-[#F7F4EE]/60 focus:ring-2 focus:ring-slate-300/30"
          />
          
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#F7F4EE]/95 rounded-[20px] flex items-center justify-center gap-2 border border-red-200"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-[11px] font-black text-red-500 uppercase tracking-widest animate-pulse font-sans">
                  Анна слушает голос...
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Voice dictation button */}
        <button
          type="button"
          onPointerDown={handleMicPressStart}
          onPointerUp={handleMicPressEnd}
          onPointerCancel={handleMicPressEnd}
          className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-[20px] flex items-center justify-center transition-all cursor-pointer border-none shadow-[0_2.5px_8px_rgba(0,0,0,0.03)] active:scale-95 text-[#243126] select-none touch-none"
          style={{ 
            backgroundColor: theme.bg,
            boxShadow: `inset 0 1px 2px rgba(255,255,255,0.6), 0 3px 9px ${theme.glow}`
          }}
          title="Надиктовать ощущение (Удерживай для записи)"
        >
          <Mic className={`w-4.5 h-4.5 ${isRecording ? "text-red-500 animate-pulse scale-110" : ""}`} />
        </button>
      </div>

      {/* Select tags toggler & Dynamic collapsible capsule list */}
      <div className="flex flex-col text-left gap-2.5">
        <button
          type="button"
          onClick={() => setShowTags(!showTags)}
          className="flex items-center gap-1 text-[11.5px] font-black text-[#6F786F] hover:text-[#243126] transition-colors outline-none cursor-pointer self-start select-none"
        >
          <span>Теги состояния</span>
          {showTags ? <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" /> : <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />}
          <span 
            className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ml-1"
            style={{ backgroundColor: `${theme.bg}40`, color: theme.text }}
          >
            {selectedTags.length > 0 ? `выбрано: ${selectedTags.length}` : "Выбрать"}
          </span>
        </button>

        <AnimatePresence>
          {showTags && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden flex flex-wrap gap-1.5 pt-0.5"
            >
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className="py-1.5 px-3 rounded-full text-[11px] font-extrabold transition-all duration-150 border-none select-none cursor-pointer"
                    style={{
                      backgroundColor: isSelected ? theme.bg : "#F7F4EE",
                      color: isSelected ? theme.text : "#6F786F",
                      boxShadow: isSelected 
                        ? `0 2px 6px ${theme.glow}, inset 0 1px 1px rgba(255,255,255,0.3)` 
                        : "none"
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action triggers: Save & indicators */}
      <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-2.5 px-4 rounded-full font-black text-[12.5px] tracking-wide text-white transition-all cursor-pointer active:scale-98 text-center shadow-[0_4px_12px_rgba(47,107,69,0.15)] hover:brightness-[1.03]"
          style={{ backgroundColor: "#2F6B45" }}
        >
          Сохранить в дневник
        </button>

        {isVoiceOrigin && (
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#6F786F] font-bold">
            <Mic className="w-3 h-3 text-[#1C8D43]" /> голос
          </div>
        )}
      </div>

    </motion.div>
  );
}
