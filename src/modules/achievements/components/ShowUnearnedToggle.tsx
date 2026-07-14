interface ShowUnearnedToggleProps {
  value: boolean
  onChange: (value: boolean) => void
}

export default function ShowUnearnedToggle({ value, onChange }: ShowUnearnedToggleProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex items-center gap-2 text-xs font-bold cursor-pointer active:scale-95 transition-all shrink-0 select-none"
    >
      <span className={value ? 'text-zinc-300' : 'text-zinc-500'}>Скрытые</span>
      <div
        className={`w-8 h-[18px] rounded-full transition-colors duration-200 relative ${
          value ? 'bg-amber-500/40' : 'bg-white/10'
        }`}
      >
        <div
          className={`absolute top-[2px] w-[14px] h-[14px] rounded-full shadow-sm transition-transform duration-200 ${
            value ? 'translate-x-[18px] bg-amber-300' : 'translate-x-[2px] bg-zinc-400'
          }`}
        />
      </div>
    </button>
  )
}
