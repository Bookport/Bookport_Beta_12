import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Calendar } from "lucide-react";

interface CalendarButtonProps {
  className?: string;
  dayNotes: Record<number, { text: string; time: string }[]>;
  currentDayIndex: number;
  screen: string;
  onClick: () => void;
}

export default function CalendarButton({
  className = "",
  dayNotes,
  currentDayIndex,
  screen,
  onClick,
}: CalendarButtonProps) {
  const [vibrate, setVibrate] = useState(false);

  const notesCount = dayNotes[currentDayIndex]?.length || 0;

  // Trigger delicate vibration on entering any screen ONLY if there are no notes for the current active day
  useEffect(() => {
    if (notesCount === 0) {
      setVibrate(true);
      const timer = setTimeout(() => {
        setVibrate(false);
      }, 2000); // Gentle vibration lasts for about 2 seconds
      return () => clearTimeout(timer);
    } else {
      setVibrate(false);
    }
  }, [screen, currentDayIndex, notesCount]);

  // Premium, noble, non-aggressive color ranges for the premium style of "Всё дело в еде!"
  let stateClasses = "bg-white border-gray-100 flex items-center justify-center text-text-dark shadow-[0_4px_12px_rgba(43,49,55,0.03)] active:scale-95 hover:bg-[#FAFBFB] transition-all";
  let iconColor = "text-[#2B3137]";

  if (notesCount === 1) {
    // Elegant extremely pale orange
    stateClasses = "bg-[#FFFDFB] border-[#FFECD6] text-[#E05C14] shadow-[0_3px_10px_-2px_rgba(249,115,22,0.05)] hover:bg-[#FFF9F2] active:scale-95 transition-all";
    iconColor = "text-[#F97316]/90";
  } else if (notesCount === 2) {
    // Soft tender orange
    stateClasses = "bg-[#FFF6EC] border-[#FDDDB7] text-[#EA580C] shadow-[0_4px_12px_-2px_rgba(249,115,22,0.08)] hover:bg-[#FFF0E0] active:scale-95 transition-all";
    iconColor = "text-[#F97316]";
  } else if (notesCount === 3) {
    // Warm rich sunset orange
    stateClasses = "bg-[#FFF0E0] border-[#FDC28A] text-[#C2410C] shadow-[0_5px_15px_-3px_rgba(249,115,22,0.12)] hover:bg-[#FFE6CD] active:scale-95 transition-all";
    iconColor = "text-[#EA580C]";
  } else if (notesCount >= 4) {
    // Saturated but graceful noble deep orange
    stateClasses = "bg-[#FFE6CD] border-[#FBA653]/55 text-[#9A3412] shadow-[0_6px_18px_-4px_rgba(234,88,12,0.16)] hover:bg-[#FFDCAE] active:scale-95 transition-all";
    iconColor = "text-[#C2410C]";
  }

  // Purely organic, delicate, and non-distracting wiggle behavior
  const shakeVariants = {
    vibrate: {
      x: [0, -1.8, 1.8, -1.4, 1.4, -0.9, 0.9, 0],
      y: [0, 1.2, -1.2, 0.9, -0.9, 0.5, -0.5, 0],
      rotate: [0, -1.2, 1.2, -0.9, 0.9, -0.5, 0.5, 0],
      transition: {
        duration: 0.55,
        repeat: 3, // ~1.65 seconds of gentle wobble
        ease: "easeInOut" as const
      }
    },
    idle: {
      x: 0,
      y: 0,
      rotate: 0
    }
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      animate={vibrate ? "vibrate" : "idle"}
      variants={shakeVariants}
      className={`relative cursor-pointer ${className} ${stateClasses}`}
    >
      {/* Soft subtle glow spot for WFPB style */}
      <div className="absolute inset-2 rounded-full bg-brand-green-mint/3 pointer-events-none filter blur-[4px]" />
      <Calendar className="w-[21px] h-[21px] stroke-[2.2]" style={{ color: "currentColor" }} />
      
      {/* Absolute positioned elegant counter badge */}
      {notesCount > 0 && (
        <span 
          className="absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] rounded-full bg-[#EA580C] text-white text-[10px] font-extrabold flex items-center justify-center border-1.5 border-white shadow-[0_2px_5px_rgba(234,88,12,0.25)] px-1"
        >
          {notesCount}
        </span>
      )}
    </motion.button>
  );
}
