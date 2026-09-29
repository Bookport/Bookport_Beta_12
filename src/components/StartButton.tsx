import React from 'react';

interface StartButtonProps {
  onClick?: () => void;
}

export const StartButton: React.FC<StartButtonProps> = ({ onClick }) => {
  return (
    <div className="w-full flex justify-center px-4">
      <button
        type="button"
        onClick={onClick}
        id="btn-start"
        className="relative w-full max-w-[260px] h-[46px] rounded-full bg-gradient-to-b from-[#34D399] via-[#16A34A] to-[#15803D] p-[1.5px] shadow-[0_12px_28px_rgba(22,163,74,0.38)] active:scale-95 transition-transform duration-150 cursor-pointer overflow-hidden group focus:outline-none"
      >
        {/* Верхний стеклянный блик (объём капсулы) */}
        <div className="absolute inset-x-3 top-1 h-[45%] bg-gradient-to-b from-white/45 to-transparent rounded-full pointer-events-none" />

        {/* Внутреннее тело кнопки */}
        <div className="w-full h-full rounded-full flex items-center justify-center gap-2 text-white font-bold text-[15px] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
          <span>Начать путь</span>
          <span className="text-lg transition-transform duration-200 group-hover:translate-x-1">→</span>
        </div>
      </button>
    </div>
  );
};

export default StartButton;
