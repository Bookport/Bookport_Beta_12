import React from "react";
import { Check } from "lucide-react";

interface SettingsSaveButtonProps {
  onClick: () => void;
  label?: string;
  icon?: React.ReactNode;
}

export default function SettingsSaveButton({ onClick, label = "Сохранить", icon }: SettingsSaveButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-[0_8px_20px_rgba(16,185,129,0.25)] hover:brightness-105 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-[15px]"
      style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
    >
      {icon ?? <Check className="w-5 h-5 stroke-[3] text-white" />}
      <span>{label}</span>
    </button>
  );
}
