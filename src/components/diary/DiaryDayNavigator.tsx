import React, { useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DiaryDayNavigatorProps {
  selectedDayIndex: number;
  minDay: number;
  maxDay: number;
  hasNotesByDay: Record<number, boolean>;
  bookmarkByDay: Record<number, string>;
  onSelectDay: (day: number) => void;
  isNightMode: boolean;
}

export default function DiaryDayNavigator({
  selectedDayIndex,
  minDay,
  maxDay,
  hasNotesByDay,
  bookmarkByDay,
  onSelectDay,
  isNightMode
}: DiaryDayNavigatorProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handlePrevDay = () => {
    if (selectedDayIndex > minDay) {
      onSelectDay(selectedDayIndex - 1);
    }
  };

  const handleNextDay = () => {
    if (selectedDayIndex < maxDay) {
      onSelectDay(selectedDayIndex + 1);
    }
  };

  useEffect(() => {
    const selectedElement = dayRefs.current[selectedDayIndex - minDay];
    if (selectedElement && stripRef.current) {
      selectedElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
      });
    }
  }, [selectedDayIndex, minDay]);

  const regularDayBg = isNightMode ? "bg-[#2A3634]" : "bg-[#FBFAF7]";
  const selectedDayBg = isNightMode ? "bg-[#5F9872]" : "bg-[#B7DDC3]";
  const regularDayText = isNightMode ? "text-[#F4F1EA]" : "text-[#243126]";
  const selectedDayText = isNightMode ? "text-[#F4F1EA]" : "text-[#243126]";
  const titleText = isNightMode ? "text-[#C7CEC8]" : "text-[#6F786F]";
  const eventDotColor = isNightMode ? "bg-[#8BD5A7]" : "bg-[#79C995]";
  
  const arrowBg = isNightMode ? "bg-[#203A43]" : "bg-[#EBF5FB]";
  const arrowColor = isNightMode ? "text-[#CFE3EE]" : "text-[#3E728D]";
  const disabledArrowBg = isNightMode ? "bg-[#F4F6F8]" : "bg-[#F4F6F8]";
  const disabledArrowColor = isNightMode ? "text-[#8A9990]" : "text-[#9AAFB9]";
  const arrowOutline = isNightMode ? "border-white/20" : "border-white/90";
  const arrowShadow = isNightMode ? "shadow-[0_3px_10px_rgba(0,0,0,0.20)]" : "shadow-[0_3px_10px_rgba(83,139,167,0.16)]";
  
  const outlineColor = isNightMode ? "border-[rgba(255,255,255,0.18)]" : "border-[rgba(255,255,255,0.92)]";
  const regularShadow = isNightMode ? "shadow-[0_3px_10px_rgba(0,0,0,0.18)]" : "shadow-[0_3px_10px_rgba(61,83,70,0.08)]";
  const selectedShadow = isNightMode ? "shadow-[0_7px_18px_rgba(95,152,114,0.34)]" : "shadow-[0_7px_18px_rgba(126,181,149,0.34)]";

  return (
    <div className="flex flex-col relative">
      <div className="flex justify-between items-center mb-3">
        <span className={`text-[12px] font-bold uppercase tracking-[0.08em] font-sans leading-none ${titleText}`}>ДЕНЬ ЦИКЛА</span>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={handlePrevDay}
          disabled={selectedDayIndex <= minDay}
          aria-label="Предыдущий день"
          className={`w-11 h-11 rounded-full flex items-center justify-center border ${arrowOutline} ${
            selectedDayIndex <= minDay 
              ? `${disabledArrowColor} ${disabledArrowBg} cursor-not-allowed` 
              : `${arrowColor} ${arrowBg} ${arrowShadow} hover:opacity-90 active:scale-95`
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div ref={stripRef} className="flex-1 overflow-x-auto scrollbar-none pr-1">
          <div className="flex gap-3">
            {Array.from({ length: maxDay - minDay + 1 }, (_, i) => {
              const day = minDay + i;
              const isActive = day === selectedDayIndex;
              const hasNotes = hasNotesByDay[day];
              const bookmark = bookmarkByDay[day];

              return (
                <button
                  ref={(el) => { dayRefs.current[i] = el; }}
                  key={day}
                  onClick={() => onSelectDay(day)}
                  className={`flex-shrink-0 rounded-full flex flex-col items-center justify-center cursor-pointer relative ${
                    isActive 
                      ? `w-[62px] h-[62px] ${selectedDayBg} ${selectedDayText} ${selectedShadow}` 
                      : `w-12 h-12 ${regularDayBg} ${regularDayText} ${regularShadow}`
                  } border ${outlineColor} active:scale-95`}
                >
                  <span className={isActive ? "text-[18px] font-extrabold" : "text-[16px] font-bold"} style={{ lineHeight: '1' }}>{day}</span>
                  
                  {hasNotes && !isActive && (
                    <div className={`absolute w-2 h-2 rounded-full ${eventDotColor} bottom-[-7px]`} />
                  )}

                  {bookmark && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] bg-amber-400 text-slate-950 px-1 rounded-full font-black scale-90 border border-white">
                      ★
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        <button 
          onClick={handleNextDay}
          disabled={selectedDayIndex >= maxDay}
          aria-label="Следующий день"
          className={`w-11 h-11 rounded-full flex items-center justify-center border ${arrowOutline} ${
            selectedDayIndex >= maxDay 
              ? `${disabledArrowColor} ${disabledArrowBg} cursor-not-allowed` 
              : `${arrowColor} ${arrowBg} ${arrowShadow} hover:opacity-90 active:scale-95`
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}