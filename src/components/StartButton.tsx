interface StartButtonProps {
  onClick?: () => void;
}

export default function StartButton(props: StartButtonProps) {
  return (
    <div className="w-full px-4 my-3 flex justify-center">
      <button
        id="btn-start"
        type="button"
        onClick={props.onClick}
        className="w-full max-w-[340px] h-[58px] rounded-[28px] text-[18px] sm:text-[20px] font-bold text-white volumetric-btn flex items-center justify-center cursor-pointer overflow-hidden relative select-none"
        style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
      >
        {/* Shimmer glaze overlay inside the button */}
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_3s_infinite_linear]" />
        
        {/* Sparkle spot on the right */}
        <div className="absolute top-1 right-8 w-2 h-2 rounded-full bg-white/30 blur-[0.5px]" />
        
        {/* Content text */}
        <span className="relative z-10 drop-shadow-[0_1.5px_2px_rgba(9,102,43,0.35)] tracking-wide">
          Начать
        </span>
      </button>

      {/* Inject custom shimmer animation inline */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-150%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(150%); }
        }
      `}</style>
    </div>
  );
}
