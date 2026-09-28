import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronRight, Sparkles, Check } from "lucide-react";
import type { SettingsSection } from "./settingsData";
import SettingsSaveButton from "./SettingsSaveButton";
import iconAccount from "../../assets/images/settings/1.webp";
import iconNutrition from "../../assets/images/settings/2.webp";
import iconRecipes from "../../assets/images/settings/3.webp";
import iconNotifications from "../../assets/images/settings/4.webp";
import iconRewards from "../../assets/images/settings/5.webp";

interface SettingsHubProps {
  onOpenSection: (s: SettingsSection) => void;
  getNextSection: () => string | null;
  isSystemUsageHelpOpen: boolean;
  onToggleSystemUsageHelp: () => void;
  completedSections: string[];
  sectionOrderLength: number;
  onSaveAll: () => void;
}

interface HubCardProps {
  onClick: () => void;
  cardClass: string;
  iconSrc: string;
  alt: string;
  title: string;
  subtitle: string;
  isNext: boolean;
  isCompleted: boolean;
}

function HubCard({ onClick, cardClass, iconSrc, alt, title, subtitle, isNext, isCompleted }: HubCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[22px] border p-4 flex items-center justify-between text-left transition-all duration-200 active:scale-[0.98] group cursor-pointer focus:outline-none ${cardClass} ${
        isNext ? "ring-2 ring-emerald-400/50" : ""
      }`}
    >
      <span className="flex items-center gap-3 flex-1 min-w-0">
        <span className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
          <img
            src={iconSrc}
            alt={alt}
            className="w-12 h-12 object-contain select-none pointer-events-none drop-shadow-sm transition-transform group-hover:scale-105"
            draggable={false}
          />
        </span>
        <span className="flex-1 flex flex-col min-w-0">
          <span className="text-[16px] font-bold text-slate-800 leading-snug">{title}</span>
          <span className="text-[12px] text-slate-500 font-normal leading-tight mt-0.5">{subtitle}</span>
        </span>
      </span>
      <span className="flex items-center shrink-0 ml-2">
        {isCompleted && (
          <span className="bg-emerald-100/80 text-emerald-700 w-6 h-6 rounded-full flex items-center justify-center mr-1 shadow-xs">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </span>
        )}
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

const ACCORDION_ITEMS = [
  { title: "Уведомления:", text: "задают комфортный ритм. Система подскажет, когда выпить воду или готовиться ко сну, ориентируясь на ваши временные окна." },
  { title: "Питание и цели:", text: "формируют главный вектор. Система адаптирует меню и советы, строго учитывая ваши цели, особенности ЖКТ и пищевые ограничения." },
  { title: "Книга и рецепты:", text: "управляют вашей кулинарной базой, чтобы предлагать блюда нужной сложности и времени готовки." },
  { title: "Аккаунт и данные:", text: "надежно хранят вашу историю, метрики тела и прогресс." },
];

export default function SettingsHub({
  onOpenSection,
  getNextSection,
  isSystemUsageHelpOpen,
  onToggleSystemUsageHelp,
  completedSections,
  sectionOrderLength,
  onSaveAll,
}: SettingsHubProps) {
  const next = getNextSection();
  const isCompleted = (id: string) => completedSections.includes(id);

  return (
    <motion.div
      key="settings-hub"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col"
    >
      {/* Slogan Title */}
      <div className="text-center flex flex-col gap-1.5 mb-6">
        <h2
          className="text-[26px] sm:text-[28px] font-bold text-text-dark leading-tight"
          style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
        >
          Настройки
        </h2>
        <p
          className="text-[14px] sm:text-[15px] text-text-muted leading-snug px-3"
          style={{ fontFamily: '"Calibri", sans-serif' }}
        >
          Пространство персональной конфигурации вашего 28-дневного маршрута долголетия и лёгкости.
        </p>
      </div>

      {/* Settings hub entry cards */}
      <div className="flex flex-col gap-3">
        <HubCard
          onClick={() => onOpenSection("account")}
          cardClass="bg-gradient-to-r from-purple-50/40 via-white to-white border-purple-100 hover:border-purple-200 shadow-[0_4px_16px_rgba(147,51,234,0.04)]"
          iconSrc={iconAccount}
          alt="Аккаунт и данные"
          title="Аккаунт и данные"
          subtitle="Метрики тела, экспорт данных в файл, очистка архивов"
          isNext={next === "account"}
          isCompleted={isCompleted("account")}
        />
        <HubCard
          onClick={() => onOpenSection("nutrition")}
          cardClass="bg-gradient-to-r from-emerald-50/40 via-white to-white border-emerald-100 hover:border-emerald-200 shadow-[0_4px_16px_rgba(16,185,129,0.04)]"
          iconSrc={iconNutrition}
          alt="Питание и цели"
          title="Питание и цели"
          subtitle="Чувствительность к сахару, цели здоровья, особенности ЖКТ"
          isNext={next === "nutrition"}
          isCompleted={isCompleted("nutrition")}
        />
        <HubCard
          onClick={() => onOpenSection("recipes")}
          cardClass="bg-gradient-to-r from-sky-50/40 via-white to-white border-sky-100 hover:border-sky-200 shadow-[0_4px_16px_rgba(14,165,233,0.04)]"
          iconSrc={iconRecipes}
          alt="Книга и рецепты"
          title="Книга и рецепты"
          subtitle="Приоритеты, любимые типы, простота блюд, время готовки"
          isNext={next === "recipes"}
          isCompleted={isCompleted("recipes")}
        />
        <HubCard
          onClick={() => onOpenSection("notifications")}
          cardClass="bg-gradient-to-r from-amber-50/40 via-white to-white border-amber-100 hover:border-amber-200 shadow-[0_4px_16px_rgba(245,158,11,0.04)]"
          iconSrc={iconNotifications}
          alt="Уведомления"
          title="Уведомления"
          subtitle="Умные напоминания, фазы показа, превью карточек от Анны"
          isNext={next === "notifications"}
          isCompleted={isCompleted("notifications")}
        />
        <HubCard
          onClick={() => window.dispatchEvent(new CustomEvent("open-rewards-screen"))}
          cardClass="bg-gradient-to-r from-yellow-50/40 via-white to-white border-yellow-100 hover:border-yellow-200 shadow-[0_4px_16px_rgba(234,179,8,0.04)]"
          iconSrc={iconRewards}
          alt="Мои награды"
          title="Мои награды"
          subtitle="Достижения и трофеи WFPB-пути"
          isNext={false}
          isCompleted={false}
        />
      </div>

      {/* Collapsible System Info Spoiler */}
      <div className="mt-6 border border-slate-100 rounded-3xl bg-slate-50/50 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={onToggleSystemUsageHelp}
          className="w-full flex items-center justify-between p-4 text-left font-bold text-slate-800 text-[14.5px] hover:bg-white/70 transition-colors focus:outline-none cursor-pointer"
          style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Как система использует ваши настройки?
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isSystemUsageHelpOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence initial={false}>
          {isSystemUsageHelpOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div
                className="px-4 pb-5 pt-1 text-[13px] text-slate-600 leading-relaxed border-t border-slate-100 flex flex-col gap-3 bg-white/60"
                style={{ fontFamily: '"Calibri", sans-serif' }}
              >
                <p className="font-semibold text-slate-800">
                  Этот раздел помогает Системе выстроить ваш индивидуальный маршрут оздоровления.
                </p>
                <ul className="flex flex-col gap-2.5 list-none pl-0">
                  {ACCORDION_ITEMS.map((item) => (
                    <li key={item.title} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 mt-1.5 shrink-0" />
                      <span>
                        <strong className="text-slate-800">{item.title}</strong> {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
                <p>
                  Каждая отметка здесь делает ваши ежедневные рекомендации точнее.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Start button - appears after all sections saved */}
      {completedSections.length === sectionOrderLength && (
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <SettingsSaveButton onClick={onSaveAll} label="Старт" />
        </motion.div>
      )}
    </motion.div>
  );
}
