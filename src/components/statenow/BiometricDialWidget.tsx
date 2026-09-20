import React from "react";
import { Droplet, Clock, Utensils, Zap } from "lucide-react";
import type { BioDialOutput } from "../../utils/bioDialAdvisorEngine";

interface BiometricDialWidgetProps {
  advice: BioDialOutput;
  onFocusClick?: () => void;
  onGrowthClick?: () => void;
  onStationClick?: () => void;
}

export const BiometricDialWidget: React.FC<BiometricDialWidgetProps> = ({ advice, onFocusClick, onGrowthClick, onStationClick }) => {
  const {
    integralScore,
    rings,
    timePhase,
    diagnosis,
    focusAction,
    nextStation,
  } = advice;

  const renderTrackSegments = (
    radius: number,
    strokeWidth: number,
    litCount: number,
    totalCount: number,
    activeGradId: string,
    glowId: string,
    trackKey: string
  ) => {
    const center = 105;
    const gapAngleDeg = totalCount <= 4 ? 14 : totalCount <= 6 ? 10 : 7;
    const totalGapDeg = gapAngleDeg * totalCount;
    const segmentAngleDeg = (360 - totalGapDeg) / totalCount;

    const segments = [];
    let currentAngle = -90 + gapAngleDeg / 2;

    for (let i = 0; i < totalCount; i++) {
      const isLit = i < litCount;
      const startRad = (currentAngle * Math.PI) / 180;
      const endRad = ((currentAngle + segmentAngleDeg) * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const largeArc = segmentAngleDeg > 180 ? 1 : 0;
      const pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;

      segments.push(
        <path
          key={`${trackKey}-${i}`}
          d={pathData}
          fill="none"
          stroke={isLit ? `url(#${activeGradId})` : "#E2E8F0"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          filter={isLit ? `url(#${glowId})` : undefined}
          className="transition-all duration-700 ease-out"
        />
      );

      currentAngle += segmentAngleDeg + gapAngleDeg;
    }

    return segments;
  };

  const focusDisplayText = focusAction.text
    .replace(/ \(\+\d+\% к балансу\)/i, "")
    .replace(/Физиологический питьевой интервал/i, "Питьевой интервал")
    .replace(/Плановый гидратационный шаг/i, "Питьевой шаг")
    .replace(/Физиологический\s*/i, "")
    .replace(/Плановый\s*/i, "")
    .trim();

  // Подбор иконки для фокуса
  const getFocusIcon = () => {
    const lower = focusDisplayText.toLowerCase();
    if (lower.includes("завтрак") || lower.includes("обед") || lower.includes("блюд") || lower.includes("ед")) {
      return <Utensils className="w-3.5 h-3.5 stroke-[2.5]" />;
    }
    if (lower.includes("разминк") || lower.includes("движен") || lower.includes("зарядк")) {
      return <Zap className="w-3.5 h-3.5 stroke-[2.5]" />;
    }
    return <Droplet className="w-3.5 h-3.5 stroke-[2.5]" />;
  };

  // Компактный лейбл для 360px: «Баланс дня» вместо длинного phaseLabel
  const compactPhaseLabel = "Баланс дня";
  const compactStationName = nextStation.stationName.replace(/ WFPB/i, "");

  return (
    <div className="w-full flex flex-col mb-4 select-none font-sans">
      
      {/* ВЕРХНИЙ РЯД: Циферблат слева + ровно 3 плашки справа */}
      <div className="w-full flex items-center justify-between gap-2">
        
        {/* ЛЕВАЯ КОЛОНКА: био-диск фиксированный для 360px */}
        <div className="relative w-[128px] h-[128px] shrink-0 flex items-center justify-center">
          <svg className="w-full h-full drop-shadow-sm" viewBox="0 0 210 210">
            <defs>
              <linearGradient id="sleepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#4338CA" />
              </linearGradient>
              <filter id="sleepGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#4F46E5" floodOpacity="0.35" />
              </filter>

              <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
              <filter id="waterGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#0284C7" floodOpacity="0.35" />
              </filter>

              <linearGradient id="nutritionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <filter id="nutritionGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#059669" floodOpacity="0.35" />
              </filter>

              <linearGradient id="toneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
              <filter id="toneGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#D97706" floodOpacity="0.35" />
              </filter>
            </defs>

            {/* 1. Сон (Радиус 90, толщина 10.5px, 8 сегментов) */}
            {renderTrackSegments(90, 10.5, rings.sleep.litSegments, rings.sleep.totalSegments, "sleepGrad", "sleepGlow", "slp")}

            {/* 2. Вода (Радиус 76, толщина 10px, 8 сегментов) */}
            {renderTrackSegments(76, 10, rings.water.litSegments, rings.water.totalSegments, "waterGrad", "waterGlow", "wtr")}

            {/* 3. Рацион (Радиус 62.5, толщина 9.5px, 4 сегмента) */}
            {renderTrackSegments(62.5, 9.5, rings.nutrition.litSegments, rings.nutrition.totalSegments, "nutritionGrad", "nutritionGlow", "ntr")}

            {/* 4. Тонус (Радиус 49.5, толщина 9px, 6 сегментов) */}
            {renderTrackSegments(49.5, 9, rings.movement.litSegments, rings.movement.totalSegments, "toneGrad", "toneGlow", "ton")}
          </svg>

          {/* Центральный процент */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[26px] sm:text-[26px] font-black text-slate-800 tracking-tight leading-none font-sans">
              {integralScore}%
            </span>
            <span className="text-[7.0px] font-black text-slate-400 tracking-wider uppercase -mt-0.5 leading-none">
              БАЛАНС ДНЯ
            </span>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Ровно 3 плашки с честным компактным зазором */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
          
          {/* 1. Фаза дня и время */}
          <div className="flex items-center gap-2 py-1.5 px-2.5 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_6px_rgba(15,23,42,0.03)] min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full ${timePhase.dotColor} animate-pulse shrink-0`} />
            <span className="text-[12px] font-semibold text-slate-700 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
              {timePhase.timeStr} • {compactPhaseLabel}
            </span>
          </div>

          {/* 2. Фокус действия */}
          <div onClick={onFocusClick} role={onFocusClick ? "button" : undefined} className={`py-1.5 px-2.5 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 shadow-[0_2px_6px_rgba(16,185,129,0.04)] flex items-center gap-2 min-w-0 ${onFocusClick ? "cursor-pointer hover:bg-emerald-50 active:scale-[0.98] transition" : ""}`}>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              {getFocusIcon()}
            </div>
            <div className="flex flex-col min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider leading-none">
                  ФОКУС
                </span>
                <span className="px-1 py-0.2 rounded bg-emerald-200/90 text-emerald-900 text-[7.5px] font-black leading-none shrink-0">
                  +{focusAction.gainPct}%
                </span>
              </div>
              <span className="text-[12px] font-semibold text-slate-700 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                {focusDisplayText}
              </span>
            </div>
          </div>

          {/* 3. Следующая станция */}
          <div onClick={onStationClick} role={onStationClick ? "button" : undefined} className={`py-1.5 px-2.5 rounded-2xl bg-indigo-50/75 border border-indigo-100 shadow-[0_2px_6px_rgba(99,102,241,0.03)] flex items-center gap-2 min-w-0 ${onStationClick ? "cursor-pointer hover:bg-indigo-50 active:scale-[0.98] transition" : ""}`}>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider leading-none">
                СЛЕДУЮЩАЯ СТАНЦИЯ
              </span>
              <span className="text-[12px] font-semibold text-slate-700 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                {compactStationName} • <span className="text-indigo-600 font-black">{nextStation.timeRemainingText}</span>
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* НИЖНЯЯ ПЛАШКА: Фактическое состояние во всю ширину экрана */}
      <div onClick={onGrowthClick} role={onGrowthClick ? "button" : undefined} className={`w-full mt-3 px-3.5 py-2.5 rounded-2xl border flex items-center gap-3 shadow-[0_3px_10px_rgba(15,23,42,0.04)] ${diagnosis.badgeStyle} ${onGrowthClick ? "cursor-pointer hover:opacity-95 active:scale-[0.99] transition" : ""}`}>
        <div className="relative flex h-2.5 w-2.5 shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${diagnosis.dotColor}`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${diagnosis.dotColor}`} />
        </div>
        <div className="flex items-center justify-between gap-2 w-full min-w-0">
          <span className="text-[12px] sm:text-[12.5px] font-black tracking-tight shrink-0">
            {diagnosis.title}
          </span>
          <span className="text-[10.5px] sm:text-[11px] opacity-85 font-semibold truncate text-right">
            {diagnosis.subtitle}
          </span>
        </div>
      </div>

    </div>
  );
};

export default BiometricDialWidget;