import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  Settings, 
  Send, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Info,
  Check,
  RotateCcw
} from "lucide-react";
import BottomBar from "./BottomBar";
import { resolveGeneralAvatar, resolveAvatarByState } from "../utils/annaAvatarResolver";
import { useAppStore } from "../store/useAppStore";
import { api } from "../utils/api";
import { clientLogger } from "../utils/clientLogger";

export interface AnnaScreenProps {
  onBack?: () => void;
  onNavigateHome?: () => void;
  onNavigateDiary?: () => void;
  onNavigateProgress?: () => void;
  userName?: string;
  userGender?: "female" | "male";
  age?: number;
  height?: number;
  weight?: number;
  systolic?: number;
  diastolic?: number;
  selectedChronic?: string[];
  selectedGoals?: string[];
  initialAge?: number;
  initialHeight?: number;
  initialWeight?: number;
  initialSystolic?: number;
  initialDiastolic?: number;
}

interface Message {
  id: string;
  sender: "user" | "anna";
  text: string;
  time: string;
}

type ConversationState = 
  | "На связи"
  | "Слушаю"
  | "Думаю"
  | "Отвечаю"
  | "Занята"
  | "Нет в сети";

export default function AnnaScreen(props: AnnaScreenProps) {
  const setScreen = useAppStore((s) => s.setScreen);
  const profile = useAppStore((s) => s.userProfile);
  const p = profile;

  const onBack = props.onBack ?? (() => setScreen("my-day"));
  const onNavigateHome = props.onNavigateHome ?? (() => setScreen("my-day"));
  const onNavigateDiary = props.onNavigateDiary ?? (() => setScreen("what-i-eat"));
  const onNavigateProgress = props.onNavigateProgress ?? (() => setScreen("habits-twenty"));
  const userName = props.userName || p.name || "";
  const userGender = (props.userGender || p.gender || "female") as "female" | "male";
  const age = props.age ?? (p.age || 28);
  const height = props.height ?? (p.height || 165);
  const weight = props.weight ?? (p.weight || 50);
  const systolic = props.systolic ?? (p.systolic || 120);
  const diastolic = props.diastolic ?? (p.diastolic || 80);
  const selectedChronic = props.selectedChronic || p.chronicConditions || [];
  const selectedGoals = props.selectedGoals || p.healthGoals || [];
  const initialAge = props.initialAge ?? (p.initialAge || 28);
  const initialHeight = props.initialHeight ?? (p.initialHeight || 165);
  const initialWeight = props.initialWeight ?? (p.initialWeight || 50);
  const initialSystolic = props.initialSystolic ?? (p.initialSystolic || 120);
  const initialDiastolic = props.initialDiastolic ?? (p.initialDiastolic || 80);

  const annaAvatarSrc = resolveGeneralAvatar().src;

  // Chat dialogue state - clean greeting from Anna
  const [messages, setMessages] = useState<Message[]>([]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    (window as any).currentScreenContext = {
      screen_id: "anna-screen",
      screen_title: "Анна на связи",
      userName, userGender, age, height, weight, systolic, diastolic,
      initialAge, initialHeight, initialWeight, initialSystolic, initialDiastolic,
      selectedChronic, selectedGoals,
      user_input_values: {
        "Имя": userName,
        "Пол": userGender === "female" ? "Женский" : "Мужской",
        "Возраст": age, "Рост": height, "Вес": weight,
        "Систолическое давление (верхнее)": systolic,
        "Диастолическое давление (нижнее)": diastolic
      }
    };
    return () => {
      if ((window as any).currentScreenContext?.screen_id === "anna-screen") {
        delete (window as any).currentScreenContext;
      }
    };
  }, [userName, userGender, age, height, weight, systolic, diastolic, initialAge, initialHeight, initialWeight, initialSystolic, initialDiastolic, selectedChronic, selectedGoals]);

  const [annaState, setAnnaState] = useState<ConversationState>("На связи");
  const [typedInput, setTypedInput] = useState<string>("");
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeFetchAbortRef = useRef<AbortController | null>(null);

  const triggerResponse = async (queryText: string, currentHistory: Message[]) => {
    setAnnaState("Думаю");
    if (activeFetchAbortRef.current) activeFetchAbortRef.current.abort();
    const abortController = new AbortController();
    activeFetchAbortRef.current = abortController;
    const busyTimer = setTimeout(() => setAnnaState("Занята"), 4000);
    try {
      const data = await api<any>("/api/anna-chat", {
        method: "POST",
        signal: abortController.signal,
        body: {
          message: queryText,
          history: currentHistory.map(m => ({ sender: m.sender, text: m.text })),
          screenContext: "anna-screen",
          screenContextDetails: {
            screen_id: "anna-screen", screen_title: "Анна на связи",
            userName, userGender, age, height, weight, systolic, diastolic,
            initialAge, initialHeight, initialWeight, initialSystolic, initialDiastolic,
            selectedChronic, selectedGoals,
            user_input_values: {
              "Имя": userName, "Пол": userGender === "female" ? "Женский" : "Мужской",
              "Возраст": age, "Рост": height, "Вес": weight,
              "Систолическое давление (верхнее)": systolic,
              "Диастолическое давление (нижнее)": diastolic
            }
          },
          bookRecipesDataContext: typeof window !== "undefined" ? (window as any).currentBookRecipesContext : null,
          userName
        }
      });
      clearTimeout(busyTimer);
      const rawReply = data.reply || "Привет! Всё отлично! Я всегда рядом, чтобы поддержать твой путь к здоровью всей душой! 🌿";
      const replyText = rawReply.replace(/^(?:`[^`]+`(?:\s*[-–]\s*\d+|\s*\([^)]*\))?|[\wа-яА-Я]+\s+\d+)\s*\n+/g, '').trim();
      const annaMsgId = `back-anna-${Date.now()}`;
      const now = new Date();
      const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
      setAnnaState("Отвечаю");
      let currentText = "";
      const words = replyText.split(" ");
      let wordIndex = 0;
      const animateTyping = () => {
        if (wordIndex < words.length) {
          currentText += (wordIndex === 0 ? "" : " ") + words[wordIndex];
          setMessages(prev => {
            const exists = prev.some(m => m.id === annaMsgId);
            if (exists) return prev.map(m => m.id === annaMsgId ? { ...m, text: currentText } : m);
            return [...prev, { id: annaMsgId, sender: "anna", text: currentText, time: timeStr }];
          });
          wordIndex++;
          typingTimerRef.current = setTimeout(animateTyping, 40);
        } else {
          setAnnaState("На связи");
        }
      };
      animateTyping();
    } catch (err: any) {
      clearTimeout(busyTimer);
      if (err.name === "AbortError") return;
      console.error("Gemini API query error:", err);
      setAnnaState("Нет в сети");
      setTimeout(() => setAnnaState("На связи"), 2500);
    }
  };

  const handleSendText = () => {
    if (!typedInput.trim()) return;
    api('/api/achievements/track', { method: 'POST', body: { type: 'anna_chat', payload: {} } });
    setTimeout(() => {
       if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('anna_chat_tracked'));
    }, 500);
    const userText = typedInput.trim();
    setTypedInput("");
    const userMsgId = `msg-user-${Date.now()}`;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const newUserMessage: Message = { id: userMsgId, sender: "user", text: userText, time: timeStr };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    triggerResponse(userText, updatedMessages);
  };

  const reactiveAvatarSrc = resolveAvatarByState(annaState, messages.length > 0 ? messages[messages.length - 1].text : undefined).src;

  return (
    <div 
      className="flex-1 flex flex-col justify-between bg-[#FFF6F0] min-h-[820px] select-none text-text-main"
      id="anna-screen-root"
    >
      
      {/* UPPER NAVIGATION BAR: Perfectly centered and lowered */}
      <div className="w-full flex items-center justify-center px-5 pt-12 pb-3 bg-gradient-to-b from-white to-gray-50/20 relative z-30 border-b border-gray-100/40">
        
        {/* Back Button absolutely aligned to left side */}
        <button
          type="button"
          onClick={onBack}
          className="absolute left-4 top-[50px] p-2 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-gray-500 hover:text-brand-green-dark cursor-pointer transition-all duration-200 active:scale-90 flex items-center gap-0.5 animate-fade-in"
          aria-label="Назад"
          id="anna-btn-back"
        >
          <ChevronLeft className="w-6 h-6 stroke-[1.8]" />
          <span className="text-[14px] font-semibold hidden sm:inline" style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>Назад</span>
        </button>

        {/* Dynamic Header state block (Centered) */}
        <div className="text-center flex flex-col items-center">
          <h2 
            className="text-[20px] font-bold text-gray-800 tracking-wider"
            style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
          >
            Анна
          </h2>
          <span 
            className="text-[15px] font-bold text-gray-500 tracking-wide mt-0.5"
            style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
          >
            Советник WFPB
          </span>
          <div className="flex items-center justify-center gap-1.5 mt-0.5 hidden">
            {/* Soft pulsing color-reactive state indicator */}
            <span className={`w-1.5 h-1.5 rounded-full ${
              annaState === "Слушаю"
                ? "bg-amber-400 animate-ping"
                : annaState === "Думаю" || annaState === "Занята"
                ? "bg-blue-400 animate-pulse"
                : annaState === "Отвечаю"
                ? "bg-brand-green-bright animate-bounce"
                : "bg-[#16B551]"
            }`} />
            <span 
              className="text-[12px] font-bold text-gray-400 tracking-widest uppercase transition-all duration-300"
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
            >
              {annaState}
            </span>
          </div>
        </div>

      </div>

      {/* BODY CONTEXT VIEW: Scrollable wrapper */}
      <div className="flex-1 flex flex-col justify-between px-5 py-2.5 relative">
        
        {/* CENTER EMOTIONAL AVATAR BLOCK - Beautifully scaled to leaves space for scrollable dialogue list */}
        <div id="anna-avatar-orb-container" className="flex flex-col items-center justify-center my-2.5 shrink-0 relative">
          
          {/* Subtle warm environmental glow backing the orb */}
          <div className={`absolute w-24 h-24 rounded-full bg-brand-green-mint/5 blur-xl transition-all duration-1000 ${
            annaState === "Слушаю"
              ? "scale-125 bg-amber-200/10"
              : annaState === "Думаю" || annaState === "Занята"
              ? "scale-110 bg-blue-200/10"
              : annaState === "Отвечаю"
              ? "scale-135 bg-brand-green-bright/10"
              : "scale-100"
          }`} />

          {/* Dynamic Ring Visualizations surrounding the voice orb - Functional indicators */}
          <div className="w-[130px] h-[130px] relative flex items-center justify-center">
            
            {/* Concentric pulsation wave 1 */}
            <AnimatePresence>
              {(annaState === "Слушаю" || annaState === "Отвечаю") && (
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ 
                    scale: annaState === "Отвечаю" ? [1, 1.25, 1] : [1, 1.15, 1],
                    opacity: [0.15, 0.45, 0.15] 
                  }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: annaState === "Отвечаю" ? 1.6 : 1.2, 
                    ease: "easeInOut" 
                  }}
                  className={`absolute inset-[-10px] rounded-full border-2 border-dashed ${
                    annaState === "Слушаю" 
                      ? "border-amber-400" 
                      : "border-brand-green-mint/40"
                  }`}
                />
              )}
            </AnimatePresence>

            {/* Concentric pulsation wave 2 */}
            <AnimatePresence>
              {(annaState === "Думаю" || annaState === "Отвечаю") && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ 
                    scale: [0.95, 1.15, 0.95],
                    rotate: [0, 180, 360],
                    opacity: [0.1, 0.35, 0.1] 
                  }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 3, 
                    ease: "linear" 
                  }}
                  className={`absolute inset-[-4px] rounded-full border border-double ${
                    annaState === "Отвечаю" ? "border-[#16B551]/30" : "border-blue-400/20"
                  }`}
                />
              )}
            </AnimatePresence>

            {/* Solid state ring wrapper with luxury glass shadow */}
            <div className={`absolute inset-[-1px] rounded-full bg-white border border-gray-100 transition-all duration-500 flex items-center justify-center ${
              annaState === "Слушаю"
                ? "shadow-[0_8px_16px_rgba(251,191,36,0.08)] border-amber-200"
                : annaState === "Думаю" || annaState === "Занята"
                ? "shadow-[0_8px_16px_rgba(59,130,246,0.08)] border-blue-200"
                : annaState === "Отвечаю"
                ? "shadow-[0_12px_24px_rgba(22,181,81,0.12)] border-brand-green-bright/35"
                : "shadow-[0_4px_12px_rgba(43,49,55,0.01)]"
            }`}>
              
              <div className={`absolute inset-[3px] rounded-full bg-gradient-to-tr transition-all duration-500 ${
                annaState === "Слушаю" ? "from-amber-200/20 to-transparent" : "from-brand-green-mint/15 to-transparent"
              }`} />
            </div>

            {/* Inner Circular Avatar Portrait / Orb of Anna */}
            <div className="w-[110px] h-[110px] rounded-full overflow-hidden relative z-10 border-4 border-white shadow-inner">
              <img 
                src={reactiveAvatarSrc}
                alt="Анна Коуч" 
                className={`w-full h-full object-cover select-none pointer-events-none transition-all duration-700 ${
                  annaState === "Слушаю"
                    ? "scale-105 saturate-110 brightness-105"
                    : annaState === "Думаю" || annaState === "Занята"
                    ? "brightness-[0.97]"
                    : "scale-100"
                }`}
                referrerPolicy="no-referrer"
              />

              <AnimatePresence>
                {annaState === "Слушаю" && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.12 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-yellow-400 pointer-events-none mix-blend-color"
                  />
                )}
                {(annaState === "Думаю" || annaState === "Занята") && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.15 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-blue-500 pointer-events-none mix-blend-overlay"
                  />
                )}
                {annaState === "Отвечаю" && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.1, 0.25, 0.1] }}
                    exit={{ opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.8 }}
                    className="absolute inset-0 bg-brand-green-mint pointer-events-none mix-blend-color-dodge"
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Tiny voice wave bars overlay on bottom corner of avatar during speech */}
            <AnimatePresence>
              {annaState === "Отвечаю" && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute bottom-0 right-0 z-20 w-6 h-6 rounded-full bg-brand-green-bright flex items-center justify-center shadow-md border-2 border-white"
                >
                  <div className="flex gap-[1.5px] items-end justify-center h-3 w-4">
                    <span className="w-0.5 bg-white rounded-full animate-pulse" style={{ height: '50%', animationDuration: '0.6s' }} />
                    <span className="w-0.5 bg-white rounded-full animate-bounce" style={{ height: '90%', animationDuration: '0.8s' }} />
                    <span className="w-0.5 bg-white rounded-full animate-pulse" style={{ height: '35%', animationDuration: '0.5s' }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* DIALOG AREA: Fully scrollable message list so user can scroll back up */}
        <div 
          id="anna-dialog-card-area" 
          className="anna-chat-scroll flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3.5 mb-1 min-h-[220px] max-h-[380px] scroll-smooth"
        >
          {messages.map((msg, index) => {
            const isAnna = msg.sender === "anna";
            return (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`w-full max-w-[370px] ${
                  isAnna ? "self-start" : "self-end ml-auto"
                }`}
              >
                {/* Bubble styling using high quality color, border, and shadows */}
                <div 
                  className={`rounded-[22px] p-4 relative ${
                    isAnna 
                      ? "bg-[#F3FDF5] text-gray-800 shadow-[0_4px_12px_rgba(43,49,55,0.008)]" 
                      : "bg-white text-brand-green-dark shadow-[0_4px_12px_rgba(22,181,81,0.012)]"
                  }`}
                >
                  <span className="absolute top-2 right-3 text-[10px] font-bold text-gray-300 tracking-wider font-mono">
                    {msg.time}
                  </span>

                  {isAnna ? (
                    <p className="text-[16px] sm:text-[15px] leading-relaxed font-normal text-left pr-5 pt-1.5"
                       style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                    >
                      {msg.text}
                    </p>
                  ) : (
                    <p className="text-[16px] sm:text-[15px] leading-relaxed font-normal text-left pr-5 pt-1.5"
                       style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                    >
                      Ты: {msg.text}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
          {/* Invisible anchor element to support automatic smooth bottom pinning */}
          <div ref={chatEndRef} />
        </div>

        {/* INTERMEDIATE PROCESS STATUS MODULE */}
        <div 
          id="anna-internal-process-bar" 
          className="w-full py-1 px-3 flex items-center justify-center gap-2 relative shrink-0"
        >
          <div className="flex gap-1.5 items-center justify-center">
            
            {(annaState === "Думаю" || annaState === "Занята") && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            )}

            {annaState === "Отвечаю" && (
              <div className="flex items-center gap-1.5 min-w-[20px]">
                <span className="w-1.5 h-3 bg-[#16B551] rounded-full animate-pulse" style={{ animationDuration: '0.8s' }} />
                <span className="w-1.5 h-1.5 bg-[#16B551] rounded-full" />
              </div>
            )}

            {annaState === "Слушаю" && (
              <div className="flex items-center gap-0.5">
                <span className="w-1.5 h-3.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDuration: '0.4s' }} />
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              </div>
            )}

            {annaState === "На связи" && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#16B551] animate-ping" />
            )}

            <span 
              className={`text-[12.5px] font-bold tracking-wide transition-all duration-300 ${
                annaState === "Слушаю"
                  ? "text-amber-500 font-extrabold"
                  : annaState === "Думаю" || annaState === "Занята"
                  ? "text-blue-500 font-extrabold"
                  : "text-[#758478]"
              }`}
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
            >
              {annaState === "На связи" ? "Анна готова к диалогу" : annaState}
            </span>
          </div>
        </div>

        {/* INPUT BOX AREA: Elegant text input field */}
        <div id="anna-text-input-field" className="w-full shrink-0 relative mt-1 select-text">
          <div className="relative rounded-[22px] bg-[#FAF9F5] p-1 flex items-center shadow-[0_4px_12px_rgba(0,0,0,0.06),_inset_0_1px_2px_rgba(255,255,255,0.8)] focus-within:bg-white focus-within:shadow-[0_6px_20px_rgba(22,181,81,0.12)] transition-all">
            <input 
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendText();
              }}
              placeholder="Напиши вопрос Анне..."
              className="flex-1 bg-transparent px-4 py-2 text-[15.5px] text-gray-800 outline-none placeholder:text-gray-400/80"
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
              aria-label="Текстовый вопрос"
            />
            
            <button
              type="button"
              onClick={handleSendText}
              disabled={!typedInput.trim()}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                typedInput.trim() 
                  ? "bg-[#16B551] text-white hover:scale-105 active:scale-95 shadow-sm cursor-pointer" 
                  : "bg-gray-100 text-gray-300 cursor-default"
              }`}
              aria-label="Отправить"
              id="anna-btn-send-text"
            >
              <Send className="w-4 h-4 stroke-[2] ml-0.5" />
            </button>
          </div>
        </div>

      </div>

      {/* LOWER FIXED NAVIGATION SCREEN BAR */}
      <div className="w-full shrink-0" id="anna-screen-bottom-navigation">
        <BottomBar 
          onHomeClick={onNavigateHome}
          onDiaryClick={onNavigateDiary}
          onAnalyticsClick={onNavigateProgress}
          activeTab="anna"
        />
      </div>

      {/* SETTINGS DRAWER OVERLAY MODAL */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end justify-center"
            id="anna-settings-overlay"
          >
            <div className="absolute inset-0 z-10" onClick={() => setShowSettingsModal(false)} />

            <motion.div
              initial={{ y: 240 }}
              animate={{ y: 0 }}
              exit={{ y: 240 }}
              transition={{ type: "spring", damping: 25 }}
              className="w-full bg-white rounded-t-[36px] border-t border-gray-150 p-6 pb-9 z-20 shadow-[0_-12px_36px_rgba(0,0,0,0.06)] relative flex flex-col gap-5 select-text max-h-[85dvh] overflow-y-auto overscroll-contain"
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto" />

              <div className="flex items-center justify-between">
                <h3 
                  className="text-lg font-bold text-gray-800"
                  style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                >
                  Настройки собеседника
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="text-xs font-bold text-gray-400 hover:text-brand-green-dark p-1"
                  id="anna-settings-close-btn"
                >
                  Закрыть
                </button>
              </div>

              {/* Informative description */}
              <div className="flex flex-col gap-3.5 px-2">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-gray-400 mt-0.5 shrink-0 stroke-[2]" />
                  <p 
                    className="text-[12.5px] text-gray-500 leading-normal text-left"
                    style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                  >
                    Анна работает в умном голосовом режиме! Внедрена непрерывная Speech-to-Text диктовка, весёлый девичий синтез голоса (TTS) и поддержка мгновенного прерывания (Interruption) — просто нажмите на микрофон в любой момент её ответа, чтобы перебить Анну и начать говорить!
                  </p>
                </div>

                {/* Reset dialogue list button */}
                <button
                  type="button"
                  onClick={() => {
                    setMessages([
                      {
                        id: `msg-anna-reset-${Date.now()}`,
                        sender: "anna",
                        text: "История очищена. Я готова начать наш полезный разговор заново! Какой вопрос о здоровом питании без соли тебя волнует?",
                        time: "14:00"
                      }
                    ]);
                    setShowSettingsModal(false);
                    setAnnaState("На связи");
                  }}
                  className="w-full py-3 rounded-2xl bg-white border border-gray-200/80 text-gray-700 font-bold hover:bg-gray-55/40 hover:text-red-500 hover:border-red-100 flex items-center justify-center gap-2 transition-all active:scale-[0.99] text-[13.5px]"
                  style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                  id="anna-settings-btn-reset-messages"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2]" />
                  <span>Очистить историю диалога</span>
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
