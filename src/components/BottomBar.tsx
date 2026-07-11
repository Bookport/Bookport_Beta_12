import React, { useRef, useState } from "react";
import { Home, BookOpen, Users, Settings } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

interface BottomBarProps {
  activeTab?: "my-day" | "recipes" | "my-dishes" | "progress" | "cellular-impulse" | "home" | "diary" | "anna" | "settings" | "what-i-eat" | "add-food";
  onHomeClick?: () => void;
  onRecipesClick?: () => void;
  onAnalyticsClick?: () => void;
  onProfileClick?: () => void;
  onAnnaClick?: () => void;
  onDiaryClick?: () => void;
}

export default function BottomBar({ activeTab = "my-day", ...props }: BottomBarProps) {
  const setScreen = useAppStore((s) => s.setScreen);

  const goHome = props.onHomeClick || (() => setScreen("my-day"));
  const goDishes = props.onRecipesClick || (() => setScreen("my-dishes"));
  const goDiary = props.onDiaryClick || (() => setScreen("my-day"));
  const goSettings = props.onProfileClick || (() => setScreen("settings"));
  const goAnna = props.onAnnaClick || (() => setScreen("anna"));
  const pressStartTimeRef = useRef<number>(0);
  const isHoldingRef = useRef<boolean>(false);
  const [isHolding, setIsHolding] = useState<boolean>(false);

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-t-[32px] rounded-b-[40px] px-2 py-4 shadow-[0_-8px_25px_rgba(0,0,0,0.04)] flex items-center justify-between relative mt-4 select-none">
      {activeTab !== "anna" && (
        <div className="absolute left-1/2 -top-5 -translate-x-1/2 w-20 h-20 bg-brand-green-pure/20 rounded-full blur-xl pointer-events-none" />
      )}

      {/* Главная */}
      <button
        id="nav-home"
        type="button"
        onClick={goHome}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-0.5 transition-all duration-200 cursor-pointer active:scale-95 text-center"
      >
        <div className={`flex items-center justify-center ${
          activeTab === "my-day" || activeTab === "home"
            ? "bg-brand-green-mint/20 rounded-xl p-1.5"
            : ""
        }`}>
          <div className={`w-7 h-7 flex items-center justify-center ${
            activeTab === "my-day" || activeTab === "home"
              ? "text-[#16B551]"
              : "text-[#737C86] hover:text-brand-green-dark"
          }`}>
            <Home className="w-6 h-6 stroke-[2]" />
          </div>
        </div>
        <span
          className={`text-[12px] sm:text-[13px] font-bold leading-none tracking-tight ${
            activeTab === "my-day" || activeTab === "home"
              ? "text-[#16B551]"
              : "text-[#737C86]"
          }`}
          style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
        >
          Главная
        </span>
      </button>

      {/* Мои блюда */}
      <button
        id="nav-recipes"
        type="button"
        onClick={goDishes}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-0.5 transition-all duration-200 cursor-pointer active:scale-95 text-center"
      >
        <div className={`w-7 h-7 flex items-center justify-center ${
          activeTab === "recipes" || activeTab === "my-dishes"
            ? "text-[#16B551]"
            : "text-[#737C86] hover:text-brand-green-dark"
        }`}>
          <BookOpen className="w-6 h-6 stroke-[1.8]" />
        </div>
        <span
          className={`text-[12px] sm:text-[13px] font-bold leading-none tracking-tight ${
            activeTab === "recipes" || activeTab === "my-dishes"
              ? "text-[#16B551]"
              : "text-[#737C86]"
          }`}
          style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
        >
          Мои блюда
        </span>
      </button>

      {/* Anna / Voice Chat Button */}
      <div className="relative -top-7 mx-2 z-10 shrink-0">
        <button
          id="nav-anna-voice"
          type="button"
          aria-label="Анна - Голосовой помощник"
          onPointerDown={(e) => {
            if (activeTab === "anna") return;
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
            pressStartTimeRef.current = Date.now();
            isHoldingRef.current = true;
            setIsHolding(true);
            window.dispatchEvent(new CustomEvent("anna-overlay-start-press"));
          }}
          onPointerUp={(e) => {
            if (activeTab === "anna") return;
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
            if (!isHoldingRef.current) return;
            isHoldingRef.current = false;
            setIsHolding(false);
            const pressDuration = Date.now() - pressStartTimeRef.current;
            if (pressDuration < 350) {
              window.dispatchEvent(new CustomEvent("anna-overlay-cancel-press"));
              goAnna();
            } else {
              window.dispatchEvent(new CustomEvent("anna-overlay-end-press"));
            }
          }}
          onPointerCancel={(e) => {
            if (activeTab === "anna") return;
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
            if (!isHoldingRef.current) return;
            isHoldingRef.current = false;
            setIsHolding(false);
            window.dispatchEvent(new CustomEvent("anna-overlay-cancel-press"));
          }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className={`w-[74px] h-[74px] rounded-full flex items-center justify-center transition-all duration-300 relative select-none ${
            activeTab === "anna" ? "cursor-default" : "hover:scale-[1.04] active:scale-95 cursor-pointer"
          } ${isHolding ? "scale-110" : ""}`}
        >
          <div className={`absolute inset-[-6px] rounded-full bg-white border border-gray-100 flex items-center justify-center transition-all ${
            activeTab === "anna"
              ? "shadow-none"
              : isHolding
              ? "shadow-[0_0_20px_rgba(22,181,81,0.4)] border-brand-green-bright/30"
              : "shadow-[0_8px_16px_rgba(16,181,81,0.12)]"
          }`}>
            {activeTab !== "anna" && (
              <div className="absolute inset-[2px] rounded-full bg-gradient-to-tr from-brand-green-mint/20 to-transparent" />
            )}
          </div>
          <div className={`absolute inset-0 rounded-full flex items-center justify-center overflow-hidden transition-all ${
            activeTab === "anna"
              ? "bg-[#D8ECD9] text-[#789D80] border border-[#CBDCCB]"
              : isHolding
              ? "bg-gradient-to-b from-brand-green-bright to-brand-green-dark shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),_0_4px_8px_rgba(22,181,81,0.2)]"
              : "bg-gradient-to-b from-brand-green-light through-brand-green-bright to-brand-green-dark shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),_inset_0_-3px_6px_rgba(8,91,36,0.4),_0_8px_25px_rgba(34,197,94,0.4)]"
          }`}>
            {activeTab !== "anna" && (
              <div className="absolute bottom-1 right-2 w-4 h-4 rounded-full bg-white/10 blur-[1px] pointer-events-none" />
            )}
            <div className="relative z-10 flex flex-col gap-1 items-center justify-center">
              <div className="relative">
                <div className={`w-8 h-7 rounded-[12px] flex items-center justify-center shadow-sm relative after:content-[''] after:absolute after:bottom-[-5px] after:left-[35%] after:w-0 after:h-0 after:border-t-[6px] after:border-x-[5px] after:border-x-transparent ${
                  activeTab === "anna"
                    ? "bg-[#F3F8F4] after:border-t-[#F3F8F4]"
                    : "bg-white after:border-t-white"
                }`}>
                  <div className="flex gap-[5px] items-center justify-center">
                    <span className={`w-[5px] h-[5px] rounded-full ${activeTab === "anna" ? "bg-[#789D80]" : "bg-brand-green-dark animate-ping"}`} style={activeTab === "anna" ? undefined : { animationDuration: '1.4s' }} />
                    <span className={`w-[5px] h-[5px] rounded-full ${activeTab === "anna" ? "bg-[#789D80]" : "bg-brand-green-dark"}`} />
                    <span className={`w-[5px] h-[5px] rounded-full ${activeTab === "anna" ? "bg-[#789D80]" : "bg-brand-green-dark"}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Клуб */}
      <button
        id="nav-club"
        type="button"
        onClick={() => window.open('https://t.me/placeholder_club', '_blank')}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-0.5 transition-all duration-200 cursor-pointer active:scale-95 text-center"
      >
        <div className="w-7 h-7 flex items-center justify-center text-[#737C86] hover:text-brand-green-dark">
          <Users className="w-6 h-6 stroke-[1.8]" />
        </div>
        <span className="text-[12px] sm:text-[13px] font-bold leading-none tracking-tight text-[#737C86]" style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>Клуб</span>
      </button>

      {/* Настройки */}
      <button
        id="nav-profile"
        type="button"
        onClick={() => { try { props.onProfileClick ? props.onProfileClick() : setScreen("settings"); } catch {} }}
        className="flex-1 flex flex-col items-center justify-center gap-1.5 py-0.5 transition-all duration-200 cursor-pointer active:scale-95 text-center"
      >
        <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center transition-all duration-300 ${
          activeTab === "cellular-impulse" || activeTab === "settings"
            ? "bg-gradient-to-b from-[#F8FAFC] via-[#E2E8F0] to-[#94A3B8] border border-[#64748B]/30 shadow-[0_5px_15px_rgba(100,116,139,0.3),_inset_0_2px_3px_rgba(255,255,255,0.9),_inset_0_-2px_4px_rgba(71,85,105,0.25)] text-[#334155]"
            : "text-[#737C86] hover:bg-slate-50 hover:text-[#475569] bg-transparent border border-transparent"
        }`}>
          <Settings className={`w-5.5 h-5.5 stroke-[2] ${activeTab === "cellular-impulse" || activeTab === "settings" ? "animate-spin-slow text-[#334155]" : ""}`} />
        </div>
        <span className={`text-[12px] sm:text-[12.5px] font-black leading-none tracking-tight transition-colors ${
          activeTab === "cellular-impulse" || activeTab === "settings" ? "text-[#475569]" : "text-[#737C86]"
        }`} style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>Настройки</span>
      </button>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-[5px] bg-[#E2E8F0]/80 rounded-full text-center" />
    </div>
  );
}
