import React from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  Share2,
  Check,
  Brain,
  Camera,
  History,
  BookOpen,
  Calculator,
  RotateCcw,
  ArrowRight
} from "lucide-react";

import imgMedal from "../assets/images/SOST/balance/8.webp";
import imgWater from "../assets/images/SOST/balance/2.webp";
import imgDish from "../assets/images/SOST/balance/6.webp";
import imgFiber from "../assets/images/SOST/balance/14.webp";
import imgSleep from "../assets/images/SOST/balance/1.webp";

export interface GraduationScreenProps {
  userName?: string;
  totalWaterLiters?: number;
  cookedOutOf166?: number;
  totalFiberKg?: number;
  weightDelta?: number | null;
  systolicDelta?: number | null;
  onSelectPro?: () => void;
  onSelectFree?: () => void;
  onShareCertificate?: () => void;
  // legacy alias for backward compatibility
  totalCookedCount?: number;
}

export const GraduationScreen: React.FC<GraduationScreenProps> = ({
  userName = "",
  totalWaterLiters,
  cookedOutOf166,
  totalFiberKg,
  weightDelta = null,
  systolicDelta = null,
  onSelectPro,
  onSelectFree,
  onShareCertificate,
  totalCookedCount,
}) => {
  const displayCooked = cookedOutOf166 ?? totalCookedCount ?? null;
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 pt-4 px-3 sm:px-4 max-w-lg mx-auto font-sans antialiased text-slate-800">
      {/* 1. HERO-БЛОК «ТРИУМФ 28 ДНЕЙ» */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center text-center pt-2 pb-6"
      >
        {/* Парящая 3D-медаль с мягким золотым свечением */}
        <div className="relative mb-3.5">
          <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl scale-125 pointer-events-none" />
          <motion.img
            src={imgMedal}
            alt="Золотая медаль выпускника"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain relative z-10 drop-shadow-[0_8px_20px_rgba(245,158,11,0.28)] select-none"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Бейдж статуса потока */}
        <div className="inline-flex items-center gap-1.5 bg-amber-100/90 text-amber-900 border border-amber-200/80 px-3 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider mb-2 shadow-2xs">
          <Sparkles className="w-3 h-3 text-amber-600" />
          <span>Выпускной потока • Курс завершён</span>
        </div>

        {/* Главный заголовок */}
        <h1 className="text-[23px] sm:text-[28px] font-black text-slate-900 tracking-tight leading-tight px-1">
          28 дней чистого WFPB-баланса
        </h1>

        {/* Персональный подзаголовок */}
        <p className="text-[13px] sm:text-[14.5px] font-medium text-slate-600 max-w-sm mt-1.5 leading-snug px-2">
          {userName ? <><span className="font-bold text-slate-800">{userName}</span>, вы</> : "Вы"} совершили фундаментальную перезагрузку метаболизма и клеточной энергии.
        </p>
        {(weightDelta != null || systolicDelta != null) && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            {weightDelta != null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-emerald-200 text-[11px] font-bold text-slate-700 shadow-sm">
                <span className={weightDelta < 0 ? "text-emerald-600" : weightDelta > 0 ? "text-amber-600" : "text-slate-600"}>
                  {weightDelta > 0 ? "↑" : weightDelta < 0 ? "↓" : "→"}
                </span>
                Вес {weightDelta > 0 ? "+" : ""}{weightDelta.toFixed(1)} кг
              </span>
            )}
            {systolicDelta != null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-sky-200 text-[11px] font-bold text-slate-700 shadow-sm">
                <span className={systolicDelta < 0 ? "text-emerald-600" : systolicDelta > 0 ? "text-rose-600" : "text-slate-600"}>
                  {systolicDelta > 0 ? "↑" : systolicDelta < 0 ? "↓" : "→"}
                </span>
                Давление {systolicDelta > 0 ? "+" : ""}{systolicDelta} мм рт. ст.
              </span>
            )}
          </div>
        )}
      </motion.header>

      {/* 2. БЛОК 4 СМАРТ-КАРТОЧЕК «ТРАНСФОРМАЦИЯ В ЦИФРАХ» */}
      <section className="mb-6">
        <div className="flex items-center justify-between px-1 mb-2.5">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Трансформация в цифрах
          </h2>
          <span className="text-[10px] font-bold text-slate-600 uppercase">
            4 недели курса
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          {/* Карточка 1: ВОДА */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="bg-sky-50/85 border border-white rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-[0_2px_12px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-1 mb-1.5">
              <img
                src={imgWater}
                alt="Вода"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 drop-shadow-2xs select-none"
              />
              <span className="text-[9.5px] font-bold text-sky-700 uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-sky-100/70 border border-sky-200/50">
                Гидратация
              </span>
            </div>
            <div>
              <div className="text-[20px] sm:text-[22px] font-black text-slate-900 leading-none mb-1">
                {totalWaterLiters != null ? totalWaterLiters.toFixed(1) : "—"} л
              </div>
              <p className="text-[10.5px] text-slate-600 leading-tight">
                Чистый объём воды, восстановивший текучесть лимфы и тургор тканей.
              </p>
            </div>
          </motion.div>

          {/* Карточка 2: РАЦИОН ИЗ КНИГИ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="bg-emerald-50/85 border border-white rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-[0_2px_12px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-1 mb-1.5">
              <img
                src={imgDish}
                alt="Блюда"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 drop-shadow-2xs select-none"
              />
              <span className="text-[9.5px] font-bold text-emerald-700 uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-emerald-100/70 border border-emerald-200/50">
                По книге
              </span>
            </div>
            <div>
              <div className="text-[20px] sm:text-[22px] font-black text-slate-900 leading-none mb-1">
                {displayCooked != null ? displayCooked : "—"} из 166
              </div>
              <p className="text-[10.5px] text-slate-600 leading-tight">
                Цельных растительных блюд, сформировавших новый защитный микробиом.
              </p>
            </div>
          </motion.div>

          {/* Карточка 3: КЛЕТЧАТКА */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="bg-teal-50/85 border border-white rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-[0_2px_12px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-1 mb-1.5">
              <img
                src={imgFiber}
                alt="Клетчатка"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 drop-shadow-2xs select-none"
              />
              <span className="text-[9.5px] font-bold text-teal-700 uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-teal-100/70 border border-teal-200/50">
                Клетчатка
              </span>
            </div>
            <div>
              <div className="text-[20px] sm:text-[22px] font-black text-slate-900 leading-none mb-1">
                {totalFiberKg != null ? totalFiberKg.toFixed(1) : "—"} кг
              </div>
              <p className="text-[10.5px] text-slate-600 leading-tight">
                Терапевтическое волокно, снявшее оксидативный стресс и инсулиновые пики.
              </p>
            </div>
          </motion.div>

          {/* Карточка 4: СОН */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.25 }}
            className="bg-indigo-50/85 border border-white rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-[0_2px_12px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-1 mb-1.5">
              <img
                src={imgSleep}
                alt="Сон"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 drop-shadow-2xs select-none"
              />
              <span className="text-[9.5px] font-bold text-indigo-700 uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-indigo-100/70 border border-indigo-200/50">
                Биоритм
              </span>
            </div>
            <div>
              <div className="text-[20px] sm:text-[22px] font-black text-slate-900 leading-none mb-1">
                28 ночей
              </div>
              <p className="text-[10.5px] text-slate-600 leading-tight">
                Сформированный рефлекс глубокого ночного сна и лёгкого утреннего подъёма.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. ГРАНД-РАЗБОР КУРАТОРА АННЫ */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="bg-white rounded-3xl p-4 sm:p-5 border border-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] mb-6 text-left"
      >
        {/* Шапка Анны */}
        <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-100 to-teal-50 border border-emerald-200/80 flex items-center justify-center font-bold text-emerald-800 text-[14px] shrink-0 shadow-2xs">
              А
            </div>
            <div className="min-w-0">
              <h3 className="text-[14px] font-bold text-slate-900 leading-tight truncate">
                Анна
              </h3>
              <p className="text-[11px] font-medium text-slate-600 truncate">
                WFPB-советник
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[9.5px] font-black tracking-wider uppercase bg-amber-100/80 text-amber-800 border border-amber-200/60 whitespace-nowrap shrink-0 shadow-2xs">
            Финальный вердикт
          </span>
        </div>

        {/* Текст клинического разбора */}
        <div className="text-[13px] sm:text-[14px] text-slate-700 leading-relaxed font-normal space-y-2.5">
          <p>
            Поздравляю с успешным завершением 28-дневного протокола! За этот месяц ваш организм прошёл путь от первичной детоксикации до стабильного клеточного автопилота.
          </p>
          <p>
            Мы устранили скрытую задержку натрия, наполнили депо калием и магнием, а главное — перестроили ферментную систему на лёгкое извлечение энергии из медленных углеводов и цельных растительных белков. Ваши сосуды защищены, а мозг получает чистый субстрат без дневных провалов бодрости.
          </p>
          <p className="font-semibold text-slate-800">
            Фундамент заложен. Теперь наступает важнейший этап — закрепление привычки на втором круге.
          </p>
        </div>
      </motion.section>

      {/* 4. БЛОК ВЫБОРА ДАЛЬНЕЙШЕГО ПУТИ */}
      <section className="space-y-3.5 mb-6">
        <div className="px-1">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Траектория закрепления результата
          </h2>
        </div>

        {/* ТАРИФ 1: PRO С ИИ АННОЙ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="relative rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-amber-50/90 via-emerald-50/50 to-white border-2 border-emerald-400/90 shadow-[0_4px_20px_rgba(16,185,129,0.12)] text-left"
        >
          {/* Светящийся бейдж */}
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-2xs mb-2.5">
            <Sparkles className="w-3 h-3" />
            <span>Выбор выпускников</span>
          </div>

          <h3 className="text-[17px] sm:text-[19px] font-black text-slate-900 leading-tight mb-1.5">
            Тариф «PRO с ИИ Анной»
          </h3>
          <p className="text-[12px] text-slate-600 leading-snug mb-3">
            Индивидуальное кураторство второго круга с нейросетевым анализом каждого приёма.
          </p>

          {/* Список преимуществ */}
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-[12px] sm:text-[12.5px] text-slate-700 font-medium">
              <Brain className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Живой персонализированный диалог с Анной на базе Qwen LLM</span>
            </li>
            <li className="flex items-start gap-2 text-[12px] sm:text-[12.5px] text-slate-700 font-medium">
              <Camera className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Распознавание блюд и оценка порций по фото через Qwen-VL</span>
            </li>
            <li className="flex items-start gap-2 text-[12px] sm:text-[12.5px] text-slate-700 font-medium">
              <History className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Анна помнит всю историю, биомаркеры и динамику вашего 1-го круга</span>
            </li>
            <li className="flex items-start gap-2 text-[12px] sm:text-[12.5px] text-slate-700 font-medium">
              <BookOpen className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Продвинутые терапевтические протоколы книги на 29–56 дни</span>
            </li>
          </ul>

          <button
            type="button"
            onClick={onSelectPro}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-[14px] shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Продолжить 2-й круг с ИИ Анной (Pro)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* ТАРИФ 2: БАЗОВЫЙ РЕЖИМ «АВТОНОМНЫЙ КРУГ» */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="rounded-3xl p-4 sm:p-5 bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.04)] text-left"
        >
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[15px] sm:text-[16px] font-bold text-slate-800 leading-tight">
              Базовый режим «Автономный круг»
            </h3>
            <span className="text-[10px] font-bold text-slate-600 uppercase bg-slate-100 px-2 py-0.5 rounded-md">
              Бесплатно
            </span>
          </div>

          <p className="text-[12px] text-slate-600 leading-snug mb-3">
            Самостоятельное повторение курса с сохранением локального инструментария.
          </p>

          <ul className="space-y-1.5 mb-4 text-[11.5px] sm:text-[12px] text-slate-600">
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Доступ ко всей базе рецептов книги и составу блюд</span>
            </li>
            <li className="flex items-center gap-2">
              <Calculator className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Локальные калькуляторы КБЖУ, воды и циркадный таймлайн</span>
            </li>
            <li className="flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Старт 2-го круга с Дня 1 в автономном режиме</span>
            </li>
          </ul>

          <button
            type="button"
            onClick={onSelectFree}
            className="w-full py-3 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[13px] border border-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Начать 2-й круг автономно</span>
          </button>
        </motion.div>
      </section>

      {/* 5. КНОПКА «ПОДЕЛИТЬСЯ СЕРТИФИКАТОМ ВЫПУСКНИКА» */}
      <footer className="pt-1 pb-4 flex justify-center">
        <button
          type="button"
          onClick={onShareCertificate}
          className="inline-flex items-center gap-2 text-[12px] font-bold text-slate-600 hover:text-emerald-700 transition-colors py-2 px-3 rounded-xl active:bg-slate-100 cursor-pointer"
        >
          <Share2 className="w-4 h-4 text-emerald-600" />
          <span>Поделиться достижением и сертификатом</span>
        </button>
      </footer>
    </div>
  );
};

export default GraduationScreen;