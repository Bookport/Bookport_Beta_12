import iconHome from "../assets/images/menu/1.webp";
import iconDishes from "../assets/images/menu/2.webp";
import iconCalculators from "../assets/images/menu/3.webp";
import iconSettings from "../assets/images/menu/4.webp";
import { useAppStore } from "../store/useAppStore";

interface BottomBarProps {
  activeTab?: "my-day" | "recipes" | "my-dishes" | "progress" | "cellular-impulse" | "home" | "diary" | "anna" | "settings" | "what-i-eat" | "add-food" | "club" | "calculators";
  onHomeClick?: () => void;
  onRecipesClick?: () => void;
  onAnalyticsClick?: () => void;
  onProfileClick?: () => void;
  onAnnaClick?: () => void;
  onDiaryClick?: () => void;
}

const labelStyle = { fontFamily: '"Calibri", "Candara", sans-serif' } as const;

function SideButton({
  id,
  label,
  icon,
  alt,
  isActive,
  onClick,
}: {
  id: string;
  label: string;
  icon: string;
  alt: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className="group flex-1 flex flex-col items-center justify-center py-1 min-h-[68px] rounded-2xl transition-all duration-150 ease-out cursor-pointer active:scale-92 active:translate-y-0.5 text-center outline-none focus:outline-none focus:ring-0 bg-transparent"
    >
      <span className="w-[50px] h-[50px] flex items-center justify-center -mb-0.5">
        <img
          src={icon}
          alt={alt}
          draggable={false}
          className={`w-full h-full object-contain pointer-events-none transition-all duration-150 ${
            isActive
              ? "scale-105 opacity-100 drop-shadow-[0_5px_8px_rgba(16,185,129,0.18)]"
              : "opacity-70 grayscale-[10%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.08)] group-hover:opacity-90"
          }`}
        />
      </span>
      <span
        className={`text-[11px] font-bold leading-none tracking-tight transition-colors duration-150 ${
          isActive ? "text-emerald-600" : "text-slate-400"
        }`}
        style={labelStyle}
      >
        {label}
      </span>
    </button>
  );
}

export default function BottomBar({ activeTab = "my-day", ...props }: BottomBarProps) {
  const setScreen = useAppStore((s) => s.setScreen);
  const currentScreen = useAppStore((s) => s.screen);

  const isHome = activeTab === "my-day" || activeTab === "home";

  // Железный инвариант: кнопка «Главная» всегда ведёт строго на my-day.
  // Уже на my-day — плавно скроллим наверх к шапке (через событие 'scroll-to-top').
  const scrollHomeToTop = () => {
    try {
      window.dispatchEvent(new CustomEvent("scroll-to-top"));
    } catch {}
    try {
      const marked = document.querySelector("[data-scroll-container]");
      if (marked) (marked as HTMLElement).scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  };

  const goHome = () => {
    if (currentScreen === "my-day") {
      scrollHomeToTop();
      setScreen("my-day");
      // Совместимость с оверлеями внутри MyDay (Water/Sleep/Movement/Measurements/Digestion):
      // они монтируют BottomBar с activeTab="my-day" и onHomeClick=закрыть модалку.
      try {
        props.onHomeClick?.();
      } catch {}
      return;
    }
    // С любого другого экрана — строго на my-day, кастомные переходы
    // (my-page/settings/what-i-eat) игнорируются.
    scrollHomeToTop();
    setScreen("my-day");
  };
  const goDishes = props.onRecipesClick || (() => setScreen("my-dishes"));
  const goDiary = props.onDiaryClick || (() => setScreen("my-day"));
  const goSettings = props.onProfileClick || (() => setScreen("settings"));
  const goAnna = props.onAnnaClick || (() => setScreen("anna"));
  const goCalculators = () => setScreen("calculators");

  void goDiary;
  void props.onAnalyticsClick;

  const isDishes = activeTab === "recipes" || activeTab === "my-dishes";
  const isCalculators = activeTab === "calculators" || activeTab === "club";
  const isSettings = activeTab === "cellular-impulse" || activeTab === "settings";
  const isAnna = activeTab === "anna";

  return (
    <div className="w-full bg-gradient-to-b from-[#FFF9F2]/95 via-[#FFF6EE]/95 to-[#FFEDE0]/90 backdrop-blur-md rounded-t-[28px] px-3 pt-1.5 pb-2 shadow-[0_-6px_25px_rgba(249,115,22,0.06)] border-t border-[#FDE6D2]/80 flex items-center justify-between relative mt-auto select-none">
      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-2px); }
        }
      `}</style>
      {!isAnna && (
        <div className="absolute left-1/2 -top-5 -translate-x-1/2 w-20 h-20 bg-brand-green-pure/20 rounded-full blur-xl pointer-events-none" />
      )}

      {/* Главная */}
      <SideButton
        id="nav-home"
        label="Главная"
        icon={iconHome}
        alt="Главная"
        isActive={isHome}
        onClick={goHome}
      />

      {/* Мои блюда */}
      <SideButton
        id="nav-recipes"
        label="Мои блюда"
        icon={iconDishes}
        alt="Мои блюда"
        isActive={isDishes}
        onClick={goDishes}
      />

      {/* Anna — простой переход по клику */}
      <div className="relative -top-7 mx-1 z-10 shrink-0 flex flex-col items-center">
        <button
          id="nav-anna-voice"
          type="button"
          aria-label="Анна - Голосовой помощник"
          onClick={() => {
            if (isAnna) return;
            goAnna();
          }}
          className={`w-[74px] h-[74px] rounded-full flex items-center justify-center transition-all duration-300 relative select-none outline-none focus:outline-none focus:ring-0 ${
            isAnna ? "cursor-default" : "hover:scale-[1.04] active:scale-95 cursor-pointer"
          }`}
        >
          {!isAnna && (
            <div className="absolute inset-[-4px] rounded-full bg-emerald-400/25 blur-md animate-[pulse_1s_ease-in-out_infinite] pointer-events-none" />
          )}
          <div className={`absolute inset-[-6px] rounded-full bg-white border border-gray-100 flex items-center justify-center transition-all ${
            isAnna
              ? "shadow-none"
              : "shadow-[0_8px_16px_rgba(16,181,81,0.12)]"
          }`}>
            {!isAnna && (
              <div className="absolute inset-[2px] rounded-full bg-gradient-to-tr from-brand-green-mint/20 to-transparent" />
            )}
          </div>
          <div className={`absolute inset-0 rounded-full flex items-center justify-center overflow-hidden transition-all ${
            isAnna
              ? "bg-[#D8ECD9] text-[#789D80] border border-[#CBDCCB]"
              : "bg-gradient-to-b from-brand-green-light through-brand-green-bright to-brand-green-dark shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),_inset_0_-3px_6px_rgba(8,91,36,0.4),_0_8px_25px_rgba(34,197,94,0.4)]"
          }`}>
            {!isAnna && (
              <div className="absolute bottom-1 right-2 w-4 h-4 rounded-full bg-white/10 blur-[1px] pointer-events-none" />
            )}
            <div className="relative z-10 flex flex-col gap-1 items-center justify-center">
              <div className="relative">
                <div className={`w-8 h-7 rounded-[12px] flex items-center justify-center shadow-sm relative after:content-[''] after:absolute after:bottom-[-5px] after:left-[35%] after:w-0 after:h-0 after:border-t-[6px] after:border-x-[5px] after:border-x-transparent ${
                  isAnna
                    ? "bg-[#F3F8F4] after:border-t-[#F3F8F4]"
                    : "bg-white after:border-t-white"
                }`}>
                  <div className="flex gap-[5px] items-center justify-center">
                    {isAnna ? (
                      <>
                        <span className="w-[5px] h-[5px] rounded-full bg-[#789D80]" />
                        <span className="w-[5px] h-[5px] rounded-full bg-[#789D80]" />
                        <span className="w-[5px] h-[5px] rounded-full bg-[#789D80]" />
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" style={{ animation: 'typingDot 1.2s infinite ease-in-out', animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" style={{ animation: 'typingDot 1.2s infinite ease-in-out', animationDelay: '200ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" style={{ animation: 'typingDot 1.2s infinite ease-in-out', animationDelay: '400ms' }} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Калькуляторы (ранее «Клуб») */}
      <SideButton
        id="nav-calculators"
        label="Калькуляторы"
        icon={iconCalculators}
        alt="Калькуляторы"
        isActive={isCalculators}
        onClick={goCalculators}
      />

      {/* Настройки */}
      <SideButton
        id="nav-profile"
        label="Настройки"
        icon={iconSettings}
        alt="Настройки"
        isActive={isSettings}
        onClick={goSettings}
      />

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-[5px] bg-[#E8D5C4]/80 rounded-full text-center" />
    </div>
  );
}
