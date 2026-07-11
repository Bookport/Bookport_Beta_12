'use client'

interface ShowUnearnedToggleProps {
  value: boolean
  onChange: (value: boolean) => void
}

export default function ShowUnearnedToggle({ value, onChange }: ShowUnearnedToggleProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex items-center gap-2 text-xs font-bold text-zinc-500 cursor-pointer active:scale-95 transition-all shrink-0 select-none"
    >
      <span>Скрытые</span>
      <div
        className={`w-8 h-[18px] rounded-full transition-colors duration-200 relative ${
          value ? 'bg-zinc-800' : 'bg-zinc-200'
        }`}
      >
        <div
          className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
            value ? 'translate-x-[18px]' : 'translate-x-[2px]'
          }`}
        />
      </div>
    </button>
  )
}
