import React from "react";
import { motion } from "motion/react";
import { Settings, SunMedium, Sun, Moon, Clock, Sprout } from "lucide-react";
import { resolveAvatar } from "../../utils/annaAvatarResolver";
import type { UserPreferences } from "../../services/UserPreferencesStore";
import AnnaSettingsCard from "./AnnaSettingsCard";
import SettingsSaveButton from "./SettingsSaveButton";
import iconWater from "../../assets/images/settings/6.webp";
import iconSleep from "../../assets/images/settings/7.webp";
import iconMeasurements from "../../assets/images/settings/8.webp";
import iconHabits from "../../assets/images/settings/9.webp";
import iconSummary from "../../assets/images/settings/10.webp";
import iconAnnaTip from "../../assets/images/settings/11.webp";

const NOTIF_ICONS: Record<string, string> = {
  water: iconWater,
  sleep: iconSleep,
  measurements: iconMeasurements,
  habits: iconHabits,
  daySummary: iconSummary,
  annaTip: iconAnnaTip,
};

const NOTIF_THEMES: Record<string, {
  activeBorder: string;
  activeBg: string;
  accentLine: string;
  toggleActive: string;
  badgeBg: string;
}> = {
  water: {
    activeBorder: "border-sky-200 hover:border-sky-300",
    activeBg: "bg-gradient-to-r from-sky-50/50 via-white to-white",
    accentLine: "border-sky-400",
    toggleActive: "from-sky-500 to-cyan-500 shadow-[0_2px_8px_rgba(14,165,233,0.35)]",
    badgeBg: "bg-sky-100/70 text-sky-800",
  },
  sleep: {
    activeBorder: "border-indigo-200 hover:border-indigo-300",
    activeBg: "bg-gradient-to-r from-indigo-50/50 via-white to-white",
    accentLine: "border-indigo-400",
    toggleActive: "from-indigo-500 to-purple-500 shadow-[0_2px_8px_rgba(99,102,241,0.35)]",
    badgeBg: "bg-indigo-100/70 text-indigo-800",
  },
  measurements: {
    activeBorder: "border-teal-200 hover:border-teal-300",
    activeBg: "bg-gradient-to-r from-teal-50/50 via-white to-white",
    accentLine: "border-teal-400",
    toggleActive: "from-teal-500 to-emerald-500 shadow-[0_2px_8px_rgba(20,184,166,0.35)]",
    badgeBg: "bg-teal-100/70 text-teal-800",
  },
  habits: {
    activeBorder: "border-amber-200 hover:border-amber-300",
    activeBg: "bg-gradient-to-r from-amber-50/50 via-white to-white",
    accentLine: "border-amber-400",
    toggleActive: "from-amber-500 to-orange-400 shadow-[0_2px_8px_rgba(245,158,11,0.35)]",
    badgeBg: "bg-amber-100/70 text-amber-800",
  },
  daySummary: {
    activeBorder: "border-purple-200 hover:border-purple-300",
    activeBg: "bg-gradient-to-r from-purple-50/50 via-white to-white",
    accentLine: "border-purple-400",
    toggleActive: "from-purple-500 to-pink-500 shadow-[0_2px_8px_rgba(168,85,247,0.35)]",
    badgeBg: "bg-purple-100/70 text-purple-800",
  },
  annaTip: {
    activeBorder: "border-emerald-200 hover:border-emerald-300",
    activeBg: "bg-gradient-to-r from-emerald-50/50 via-white to-white",
    accentLine: "border-emerald-400",
    toggleActive: "from-emerald-500 to-teal-600 shadow-[0_2px_8px_rgba(16,185,129,0.35)]",
    badgeBg: "bg-emerald-100/70 text-emerald-800",
  },
};

interface SettingsNotificationsProps {
  prefs: UserPreferences;
  savePrefs: (p: UserPreferences) => void;
  toggleNotifEnabled: (key: keyof UserPreferences["notifications"]) => void;
  handleTimeRangeChange: (
    key: keyof UserPreferences["notifications"],
    mode: "morning" | "day" | "evening" | "single",
    value: string
  ) => void;
  activeNotifKey: keyof UserPreferences["notifications"] | null;
  setActiveNotifKey: (k: keyof UserPreferences["notifications"] | null) => void;
  onSave: () => void;
}

export default function SettingsNotifications({
  prefs,
  savePrefs,
  toggleNotifEnabled,
  handleTimeRangeChange,
  activeNotifKey,
  setActiveNotifKey,
  onSave,
}: SettingsNotificationsProps) {
  return (
    <motion.div
      key="settings-notifications"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col"
    >
      {/* Title Section */}
      <div className="mb-4 flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#737C86]">Раздел 1 из 4</span>
        <h3 className="text-[22px] font-bold text-text-dark">Параметры уведомлений</h3>
        <p className="text-[13px] text-text-muted leading-tight">
          Задайте временные окна сопровождения. Алгоритм выберет лучший биоритмический момент показа.
        </p>
      </div>

      {/* Anna Context Guide */}
      <div className="mb-4">
        <AnnaSettingsCard
          avatarSrc={resolveAvatar({ toneGroup: 'positive', intent: 'cheerful_reminder', intensity: 2 }).src}
          theme="mint"
          text="Настройте комфортные временные окна. Я буду ориентироваться на них, посылая вам напоминания о воде, сне и замерах здоровья строго в нужный момент биоритма."
        />
      </div>

      {/* Event Cards Loop */}
      <div className="flex flex-col gap-3">
        {(Object.keys(prefs.notifications) as Array<keyof UserPreferences["notifications"]>).map((key) => {
          const item = prefs.notifications[key];
          const isExpanded = activeNotifKey === key;
          const isEnabled = item.enabled;

          // Label maps for nice layout titles
          const labelMap: Record<string, string> = {
            water: "Напоминание про воду",
            sleep: "Напоминание про сон",
            measurements: "Напоминание про замеры",
            habits: "Напоминание про привычки",
            daySummary: "Напоминание про итог дня",
            annaTip: "ИИ Совет дня от Анны"
          };

          return (
            <div
              key={key}
              className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
                isEnabled
                  ? `${NOTIF_THEMES[key].activeBorder} ${NOTIF_THEMES[key].activeBg} shadow-sm`
                  : "border-slate-150 bg-slate-50/40 opacity-75"
              }`}
            >
              {/* Interactive Header area */}
              <div className="border rounded-2xl p-4 transition-all duration-200 flex items-center justify-between gap-2 bg-transparent border-transparent">
                <button
                  type="button"
                  onClick={() => setActiveNotifKey(isExpanded ? null : key)}
                  className="flex-1 flex items-center gap-3 text-left cursor-pointer focus:outline-none min-w-0"
                >
                  <img src={NOTIF_ICONS[key]} alt="" className="w-10 h-10 object-contain drop-shadow-xs shrink-0" draggable={false} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[15px] font-bold text-text-dark leading-tight">{labelMap[key]}</span>
                    <span className="text-[11px] text-text-muted leading-none mt-1">
                      {isEnabled ? "Включено" : "Выключено"} • {item.timeWindows.mode === "three" ? "3 окна" : "1 окно"}
                    </span>
                  </div>
                </button>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => toggleNotifEnabled(key)}
                  className={`w-12 h-7 rounded-full transition-colors relative focus:outline-none cursor-pointer shrink-0 p-1 flex items-center ${
                    isEnabled
                      ? `bg-gradient-to-r ${NOTIF_THEMES[key].toggleActive}`
                      : "bg-slate-200"
                  }`}
                  aria-pressed={isEnabled}
                >
                  <motion.div
                    layout
                    className="w-5 h-5 rounded-full bg-white shadow-sm"
                    animate={{ x: isEnabled ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  />
                </button>
              </div>

              {/* Expandable options box */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 flex flex-col gap-3 bg-white/70">

                  {/* Explanation quote */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wide">Почему это нужно:</span>
                    <p className={`bg-slate-50/80 border-l-[3px] p-3 rounded-r-xl text-[12.5px] text-slate-600 leading-relaxed ${NOTIF_THEMES[key].accentLine}`}>{item.explanation}</p>
                    <span className="text-[12px] text-slate-500">
                      <Settings className="w-3.5 h-3.5 text-emerald-600 mr-1.5 inline" />
                      Источник триггера: {item.sourceOfData}
                    </span>
                  </div>

                  {/* LIGHT PUSH NOTIFICATION PREVIEW */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <span className="text-[11px] font-bold uppercase text-[#737C86] tracking-wide px-1">Визуальный Превью уведомления:</span>
                    <div className="bg-white/95 border border-slate-200/90 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-sm relative overflow-hidden">
                      <div className="flex justify-between items-center px-0.5">
                        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-400 uppercase tracking-wider">
                          <Sprout className="w-3.5 h-3.5 text-emerald-500" />
                          {item.previewTemplate.badge} • сейчас
                        </span>
                        <span className="text-[11.5px] text-emerald-700/80 font-bold">Всё дело в еде!</span>
                      </div>
                      <h5 className="text-[14.5px] font-bold text-slate-800 mt-1 leading-tight">{item.previewTemplate.title}</h5>
                      <p className="text-[13px] text-slate-600 leading-snug mt-1">&laquo;{item.previewTemplate.body}&raquo;</p>

                      <div className="mt-2.5 bg-emerald-50/80 border border-emerald-100 rounded-xl p-2.5 text-[12.5px] text-emerald-900 font-medium">
                        <span className="font-bold">Анна говорит: </span>
                        <span>{item.annaPhrase}</span>
                      </div>
                    </div>
                  </div>

                  {/* RANGE CONFIGURATION ( утром / днём / вечером ) format "с - по" */}
                  <div className="flex flex-col gap-2 pt-1 text-left">
                    <div className="flex justify-between items-center px-1 gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold uppercase text-[#737C86] tracking-wide">Временные Интервалы Показа:</span>
                      <div className="bg-slate-100 p-1 rounded-xl inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...prefs };
                            updated.notifications[key].timeWindows.mode = "single";
                            savePrefs(updated);
                          }}
                          className={`text-[10px] px-2.5 py-1 rounded-lg transition-all ${
                            item.timeWindows.mode === "single"
                              ? "bg-emerald-500 text-white shadow-xs font-bold"
                              : "text-slate-500 hover:text-slate-800 font-medium"
                          }`}
                        >
                          1 ОКНО
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...prefs };
                            updated.notifications[key].timeWindows.mode = "three";
                            savePrefs(updated);
                          }}
                          className={`text-[10px] px-2.5 py-1 rounded-lg transition-all ${
                            item.timeWindows.mode === "three"
                              ? "bg-emerald-500 text-white shadow-xs font-bold"
                              : "text-slate-500 hover:text-slate-800 font-medium"
                          }`}
                        >
                          3 ОКНА
                        </button>
                      </div>
                    </div>

                    {item.timeWindows.mode === "three" ? (
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="bg-white p-2 border border-slate-200 shadow-2xs rounded-xl text-center">
                          <span className="text-[9.5px] text-slate-500 uppercase font-black tracking-wide mb-1 flex items-center justify-center gap-1">
                            <SunMedium className="w-3.5 h-3.5 text-amber-500" /> Утро
                          </span>
                          <select
                            value={item.timeWindows.morning}
                            onChange={(e) => handleTimeRangeChange(key, "morning", e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-[13px] font-semibold text-slate-700 shadow-2xs hover:border-emerald-300 focus:ring-1 focus:ring-emerald-400 focus:outline-none w-full"
                          >
                            <option value="06:30 - 08:30">06:30 - 08:30</option>
                            <option value="07:30 - 10:00">07:30 - 10:00</option>
                            <option value="08:00 - 10:30">08:00 - 10:30</option>
                            <option value="09:00 - 11:30">09:00 - 11:30</option>
                          </select>
                        </div>
                        <div className="bg-white p-2 border border-slate-200 shadow-2xs rounded-xl text-center">
                          <span className="text-[9.5px] text-slate-500 uppercase font-black tracking-wide mb-1 flex items-center justify-center gap-1">
                            <Sun className="w-3.5 h-3.5 text-amber-600" /> День
                          </span>
                          <select
                            value={item.timeWindows.day}
                            onChange={(e) => handleTimeRangeChange(key, "day", e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-[13px] font-semibold text-slate-700 shadow-2xs hover:border-emerald-300 focus:ring-1 focus:ring-emerald-400 focus:outline-none w-full"
                          >
                            <option value="12:00 - 14:00">12:00 - 14:00</option>
                            <option value="12:00 - 16:00">12:00 - 16:00</option>
                            <option value="14:00 - 17:00">14:00 - 17:00</option>
                            <option value="15:30 - 18:00">15:30 - 18:00</option>
                          </select>
                        </div>
                        <div className="bg-white p-2 border border-slate-200 shadow-2xs rounded-xl text-center">
                          <span className="text-[9.5px] text-slate-500 uppercase font-black tracking-wide mb-1 flex items-center justify-center gap-1">
                            <Moon className="w-3.5 h-3.5 text-indigo-400" /> Вечер
                          </span>
                          <select
                            value={item.timeWindows.evening}
                            onChange={(e) => handleTimeRangeChange(key, "evening", e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-[13px] font-semibold text-slate-700 shadow-2xs hover:border-emerald-300 focus:ring-1 focus:ring-emerald-400 focus:outline-none w-full"
                          >
                            <option value="18:30 - 20:30">18:30 - 20:30</option>
                            <option value="18:30 - 21:30">18:30 - 21:30</option>
                            <option value="19:00 - 22:00">19:00 - 22:00</option>
                            <option value="21:30 - 23:00">21:30 - 23:00</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-2.5 border border-slate-200 shadow-2xs rounded-xl text-center flex items-center justify-between gap-4">
                        <span className="text-[10.5px] text-slate-500 uppercase font-black tracking-wide flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> Единый диапазон:
                        </span>
                        <select
                          value={item.timeWindows.single || "09:00 - 12:00"}
                          onChange={(e) => handleTimeRangeChange(key, "single", e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-[13px] font-semibold text-slate-700 shadow-2xs hover:border-emerald-300 focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                        >
                          <option value="07:00 - 11:00">Утро: с 07:00 до 11:00</option>
                          <option value="09:00 - 12:00">Утро: с 09:00 до 12:00</option>
                          <option value="12:00 - 16:00">День: с 12:00 до 16:00</option>
                          <option value="18:00 - 22:00">Вечер: с 18:00 до 22:00</option>
                        </select>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save button for Notifications */}
      <div className="mt-5">
        <SettingsSaveButton onClick={onSave} />
      </div>
    </motion.div>
  );
}
