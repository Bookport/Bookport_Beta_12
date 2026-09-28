import React, { useState } from "react";
import { motion } from "motion/react";
import { Minus, Plus, Clock } from "lucide-react";
import { resolveAvatar } from "../../utils/annaAvatarResolver";
import { browserTimezone } from "../../shared/dates";
import { getUserTimeZone } from "../../shared/timeZoneStore";
import AnnaSettingsCard from "./AnnaSettingsCard";
import SettingsSaveButton from "./SettingsSaveButton";
import iconFemale from "../../assets/images/settings/16.webp";
import iconMale from "../../assets/images/settings/17.webp";

// Helper component for holdable stepper buttons (перенесён из SettingsScreen без изменений логики)
function StepperButton({ onClick, disabled, children, className }: any) {
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const startHolding = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (disabled) return;
    onClick(); // trigger immediate single click
    const tid = setTimeout(() => {
      const iid = setInterval(() => {
        onClick();
      }, 100); // 100ms interval for fast scrolling
      setIntervalId(iid);
    }, 500); // 500ms delay before continuous
    setTimeoutId(tid);
  };

  const stopHolding = () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (intervalId) clearInterval(intervalId);
    setTimeoutId(null);
    setIntervalId(null);
  };

  return (
    <button
      type="button"
      onMouseDown={startHolding}
      onMouseUp={stopHolding}
      onMouseLeave={stopHolding}
      onTouchStart={startHolding}
      onTouchEnd={stopHolding}
      onTouchCancel={stopHolding}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}

interface SettingsAccountProps {
  draftName: string;
  setDraftName: (v: string) => void;
  draftGender: "female" | "male";
  setDraftGender: (v: "female" | "male") => void;
  draftAge: number;
  setDraftAge: React.Dispatch<React.SetStateAction<number>>;
  draftHeight: number;
  setDraftHeight: React.Dispatch<React.SetStateAction<number>>;
  draftWeight: number;
  setDraftWeight: React.Dispatch<React.SetStateAction<number>>;
  draftSystolic: number;
  setDraftSystolic: React.Dispatch<React.SetStateAction<number>>;
  draftDiastolic: number;
  setDraftDiastolic: React.Dispatch<React.SetStateAction<number>>;
  draftTimeZone: string;
  setDraftTimeZone: (v: string) => void;
  timeZoneError: string | null;
  setTimeZoneError: (v: string | null) => void;
  onSave: () => void;
}

export default function SettingsAccount(props: SettingsAccountProps) {
  const {
    draftName, setDraftName,
    draftGender, setDraftGender,
    draftAge, setDraftAge,
    draftHeight, setDraftHeight,
    draftWeight, setDraftWeight,
    draftSystolic, setDraftSystolic,
    draftDiastolic, setDraftDiastolic,
    draftTimeZone, setDraftTimeZone,
    timeZoneError, setTimeZoneError,
    onSave,
  } = props;

  const currentZoneLabel = getUserTimeZone();

  return (
    <motion.div
      key="settings-account"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-5 text-left"
    >
      {/* Header title */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#737C86]">Раздел 4 из 4</span>
        <h3 className="text-[22px] font-bold text-text-dark">Аккаунт и управление данными</h3>
        <p className="text-[13px] text-text-muted leading-tight">
          Ваши биологические метрики тела и инструменты резервного копирования истории пути.
        </p>
      </div>

      {/* Anna Context Guide */}
      <div className="mb-1">
        <AnnaSettingsCard
          avatarSrc={resolveAvatar({ toneGroup: 'neutral_thoughtful', intent: 'understanding_nuances', intensity: 3 }).src}
          theme="lilac"
          text="Ваши биологические метрики помогают мне точнее рассчитывать КБЖУ, объём воды для очистки почек и плотность капиллярного тонуса. Держите эти показатели актуальными!"
        />
      </div>

      {/* Personal measurements fields */}
      <div className="bg-gradient-to-br from-white to-purple-50/5 rounded-[24px] border border-white/80 p-5 shadow-[0_6px_20px_rgba(139,92,246,0.08)] flex flex-col gap-4">

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold uppercase text-[#737C86]">Ваше имя:</span>
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            className="w-full h-14 mt-2 bg-purple-50/75 border border-white/80 rounded-2xl px-4 text-[16px] font-semibold text-slate-800 shadow-[0_4px_16px_rgba(168,85,247,0.06)] outline-none focus:outline-none focus:ring-0"
          />
        </div>

        {/* Gender toggle */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold uppercase text-[#737C86]">Ваш пол для обращений Анны:</span>
          <div className="flex gap-3 mt-2.5">
            <button
              type="button"
              onClick={() => setDraftGender("female")}
              className={`h-14 flex-1 rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer active:scale-95 select-none border ${
                draftGender === "female"
                  ? "bg-gradient-to-r from-purple-100/90 via-purple-50/70 to-purple-100/80 text-purple-950 border-white shadow-[0_6px_18px_rgba(168,85,247,0.18)] -translate-y-0.5 font-bold"
                  : "bg-slate-50/80 text-slate-600 border-white/80 shadow-[0_4px_14px_rgba(0,0,0,0.03)] font-medium"
              }`}
            >
              <img src={iconFemale} alt="" className="w-8 h-8 object-contain" draggable={false} />
              <span>Женский</span>
            </button>
            <button
              type="button"
              onClick={() => setDraftGender("male")}
              className={`h-14 flex-1 rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer active:scale-95 select-none border ${
                draftGender === "male"
                  ? "bg-gradient-to-r from-purple-100/90 via-purple-50/70 to-purple-100/80 text-purple-950 border-white shadow-[0_6px_18px_rgba(168,85,247,0.18)] -translate-y-0.5 font-bold"
                  : "bg-slate-50/80 text-slate-600 border-white/80 shadow-[0_4px_14px_rgba(0,0,0,0.03)] font-medium"
              }`}
            >
              <img src={iconMale} alt="" className="w-8 h-8 object-contain" draggable={false} />
              <span>Мужской</span>
            </button>
          </div>
        </div>

        {/* Age stepper */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold uppercase text-[#737C86]">Возраст:</span>
          <div className="flex items-center gap-3.5 my-1">
            <StepperButton
              onClick={() => setDraftAge(prev => Math.max(1, prev - 1))}
              disabled={draftAge <= 1}
              className="w-14 h-14 rounded-2xl bg-gradient-to-b from-emerald-100/90 to-emerald-200/80 border border-white shadow-[0_4px_14px_rgba(16,185,129,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center justify-center text-emerald-900 active:scale-92 active:translate-y-0.5 active:shadow-[0_1px_4px_rgba(16,185,129,0.25)] transition-all cursor-pointer select-none outline-none disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="w-6 h-6 stroke-[3] text-emerald-900" />
            </StepperButton>
            <div className="flex-1 h-14 px-4 rounded-2xl bg-emerald-50/70 border border-white/80 shadow-[0_4px_14px_rgba(16,185,129,0.06)] flex items-center justify-center text-[22px] font-bold text-slate-800 select-none tracking-wide">
              <span>{draftAge}</span>
            </div>
            <StepperButton
              onClick={() => setDraftAge(prev => Math.min(120, prev + 1))}
              disabled={draftAge >= 120}
              className="w-14 h-14 rounded-2xl bg-gradient-to-b from-emerald-100/90 to-emerald-200/80 border border-white shadow-[0_4px_14px_rgba(16,185,129,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center justify-center text-emerald-900 active:scale-92 active:translate-y-0.5 active:shadow-[0_1px_4px_rgba(16,185,129,0.25)] transition-all cursor-pointer select-none outline-none disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="w-6 h-6 stroke-[3] text-emerald-900" />
            </StepperButton>
          </div>
        </div>

        {/* Height stepper */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold uppercase text-[#737C86]">Рост (см):</span>
          <div className="flex items-center gap-3.5 my-1">
            <StepperButton
              onClick={() => setDraftHeight(prev => Math.max(50, prev - 1))}
              disabled={draftHeight <= 50}
              className="w-14 h-14 rounded-2xl bg-gradient-to-b from-emerald-100/90 to-emerald-200/80 border border-white shadow-[0_4px_14px_rgba(16,185,129,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center justify-center text-emerald-900 active:scale-92 active:translate-y-0.5 active:shadow-[0_1px_4px_rgba(16,185,129,0.25)] transition-all cursor-pointer select-none outline-none disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="w-6 h-6 stroke-[3] text-emerald-900" />
            </StepperButton>
            <div className="flex-1 h-14 px-4 rounded-2xl bg-emerald-50/70 border border-white/80 shadow-[0_4px_14px_rgba(16,185,129,0.06)] flex items-center justify-center text-[22px] font-bold text-slate-800 select-none tracking-wide">
              <span>{draftHeight}</span>
            </div>
            <StepperButton
              onClick={() => setDraftHeight(prev => Math.min(250, prev + 1))}
              disabled={draftHeight >= 250}
              className="w-14 h-14 rounded-2xl bg-gradient-to-b from-emerald-100/90 to-emerald-200/80 border border-white shadow-[0_4px_14px_rgba(16,185,129,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center justify-center text-emerald-900 active:scale-92 active:translate-y-0.5 active:shadow-[0_1px_4px_rgba(16,185,129,0.25)] transition-all cursor-pointer select-none outline-none disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="w-6 h-6 stroke-[3] text-emerald-900" />
            </StepperButton>
          </div>
        </div>

        {/* Weight stepper */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold uppercase text-[#737C86]">Вес (кг):</span>
          <div className="flex items-center gap-3.5 my-1">
            <StepperButton
              onClick={() => setDraftWeight(prev => {
                const step = 0.1
                return Math.round(Math.max(20, prev - step) * 100) / 100
              })}
              disabled={draftWeight <= 20}
              className="w-14 h-14 rounded-2xl bg-gradient-to-b from-emerald-100/90 to-emerald-200/80 border border-white shadow-[0_4px_14px_rgba(16,185,129,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center justify-center text-emerald-900 active:scale-92 active:translate-y-0.5 active:shadow-[0_1px_4px_rgba(16,185,129,0.25)] transition-all cursor-pointer select-none outline-none disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="w-6 h-6 stroke-[3] text-emerald-900" />
            </StepperButton>
            <div className="flex-1 h-14 px-4 rounded-2xl bg-emerald-50/70 border border-white/80 shadow-[0_4px_14px_rgba(16,185,129,0.06)] flex items-center justify-center text-[22px] font-bold text-slate-800 select-none tracking-wide">
              <span>{draftWeight.toFixed(1)}</span>
            </div>
            <StepperButton
              onClick={() => setDraftWeight(prev => {
                const step = 0.1
                return Math.round(Math.min(300, prev + step) * 100) / 100
              })}
              disabled={draftWeight >= 300}
              className="w-14 h-14 rounded-2xl bg-gradient-to-b from-emerald-100/90 to-emerald-200/80 border border-white shadow-[0_4px_14px_rgba(16,185,129,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center justify-center text-emerald-900 active:scale-92 active:translate-y-0.5 active:shadow-[0_1px_4px_rgba(16,185,129,0.25)] transition-all cursor-pointer select-none outline-none disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="w-6 h-6 stroke-[3] text-emerald-900" />
            </StepperButton>
          </div>
        </div>

        {/* Systolic pressure stepper */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold uppercase text-[#737C86]">Верхнее давление (систола):</span>
          <div className="flex items-center gap-3.5 my-1">
            <StepperButton
              onClick={() => setDraftSystolic(prev => Math.max(60, prev - 5))}
              disabled={draftSystolic <= 60}
              className="w-14 h-14 rounded-2xl bg-gradient-to-b from-emerald-100/90 to-emerald-200/80 border border-white shadow-[0_4px_14px_rgba(16,185,129,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center justify-center text-emerald-900 active:scale-92 active:translate-y-0.5 active:shadow-[0_1px_4px_rgba(16,185,129,0.25)] transition-all cursor-pointer select-none outline-none disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="w-6 h-6 stroke-[3] text-emerald-900" />
            </StepperButton>
            <div className="flex-1 h-14 px-4 rounded-2xl bg-emerald-50/70 border border-white/80 shadow-[0_4px_14px_rgba(16,185,129,0.06)] flex items-center justify-center text-[22px] font-bold text-slate-800 select-none tracking-wide">
              <span>{draftSystolic}</span>
            </div>
            <StepperButton
              onClick={() => setDraftSystolic(prev => Math.min(220, prev + 5))}
              disabled={draftSystolic >= 220}
              className="w-14 h-14 rounded-2xl bg-gradient-to-b from-emerald-100/90 to-emerald-200/80 border border-white shadow-[0_4px_14px_rgba(16,185,129,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center justify-center text-emerald-900 active:scale-92 active:translate-y-0.5 active:shadow-[0_1px_4px_rgba(16,185,129,0.25)] transition-all cursor-pointer select-none outline-none disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="w-6 h-6 stroke-[3] text-emerald-900" />
            </StepperButton>
          </div>
        </div>

        {/* Diastolic pressure stepper */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold uppercase text-[#737C86]">Нижнее давление (диастола):</span>
          <div className="flex items-center gap-3.5 my-1">
            <StepperButton
              onClick={() => setDraftDiastolic(prev => Math.max(30, prev - 5))}
              disabled={draftDiastolic <= 30}
              className="w-14 h-14 rounded-2xl bg-gradient-to-b from-emerald-100/90 to-emerald-200/80 border border-white shadow-[0_4px_14px_rgba(16,185,129,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center justify-center text-emerald-900 active:scale-92 active:translate-y-0.5 active:shadow-[0_1px_4px_rgba(16,185,129,0.25)] transition-all cursor-pointer select-none outline-none disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="w-6 h-6 stroke-[3] text-emerald-900" />
            </StepperButton>
            <div className="flex-1 h-14 px-4 rounded-2xl bg-emerald-50/70 border border-white/80 shadow-[0_4px_14px_rgba(16,185,129,0.06)] flex items-center justify-center text-[22px] font-bold text-slate-800 select-none tracking-wide">
              <span>{draftDiastolic}</span>
            </div>
            <StepperButton
              onClick={() => setDraftDiastolic(prev => Math.min(140, prev + 5))}
              disabled={draftDiastolic >= 140}
              className="w-14 h-14 rounded-2xl bg-gradient-to-b from-emerald-100/90 to-emerald-200/80 border border-white shadow-[0_4px_14px_rgba(16,185,129,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center justify-center text-emerald-900 active:scale-92 active:translate-y-0.5 active:shadow-[0_1px_4px_rgba(16,185,129,0.25)] transition-all cursor-pointer select-none outline-none disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="w-6 h-6 stroke-[3] text-emerald-900" />
            </StepperButton>
          </div>
        </div>

        {/* Time zone — standalone pastel peach card */}
        <div className="mt-6 p-4 rounded-3xl bg-gradient-to-br from-orange-100/70 via-orange-50/60 to-orange-100/40 border border-white shadow-[0_6px_20px_rgba(249,115,22,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600 stroke-[2.5]" />
              <span className="text-[13.5px] font-bold text-orange-950 uppercase tracking-wide">Часовой пояс (IANA)</span>
            </div>
            <span className="text-[11.5px] text-orange-900/70 font-medium">Текущий: {currentZoneLabel}</span>
          </div>
          <div className="flex items-center gap-2.5 mt-2">
            <input
              type="text"
              value={draftTimeZone}
              onChange={(e) => { setDraftTimeZone(e.target.value); setTimeZoneError(null); }}
              placeholder="Напр. Europe/Moscow"
              className="flex-1 h-12 bg-white/95 border border-white rounded-2xl px-4 text-[13.5px] font-medium text-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.04)] outline-none"
            />
            <button
              type="button"
              onClick={() => { setDraftTimeZone(browserTimezone()); setTimeZoneError(null); }}
              className="h-12 px-4 rounded-2xl bg-gradient-to-b from-orange-200/90 to-orange-300/80 border border-white text-orange-950 font-bold text-[13px] shadow-[0_3px_10px_rgba(249,115,22,0.18)] active:scale-95 transition-all cursor-pointer flex items-center justify-center select-none"
              title="Использовать часовой пояс устройства"
            >
              Устройство
            </button>
          </div>
          {timeZoneError && (
            <span className="text-[11px] font-bold text-red-500">{timeZoneError}</span>
          )}
          <p className="text-[11px] text-orange-900/75 leading-relaxed mt-2">
            Новые записи и отображение времени будут строиться в этом поясе. Исторические данные не переносятся между днями.
          </p>
        </div>

      </div>

      {/* Save button for Account */}
      <div className="mt-5">
        <SettingsSaveButton onClick={onSave} />
      </div>
    </motion.div>
  );
}
