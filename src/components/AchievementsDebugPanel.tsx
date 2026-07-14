import React, { useState, useEffect } from "react";
import { ACHIEVEMENTS } from "../modules/achievements/config/achievementContent";
import { api } from "../utils/api";

export default function AchievementsDebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [dayInput, setDayInput] = useState("");
  const [selectedAch, setSelectedAch] = useState(ACHIEVEMENTS[0]?.id || "");

  useEffect(() => {
    const isDev = process.env.NODE_ENV === "development";
    const godMode = localStorage.getItem("isGodMode") === "true";
    if (isDev || godMode) {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  const handleReset = async () => {
    try {
      await api("/api/achievements/debug-action", {
        method: "POST",
        body: { action: "reset_all" }
      });
      alert("All achievements reset successfully.");
    } catch (e: any) {
      alert(`Error resetting achievements: ${e?.message || e}`);
    }
  };

  const handleSetDay = async () => {
    try {
      await api("/api/achievements/debug-action", {
        method: "POST",
        body: { action: "set_day", payload: { day: dayInput } }
      });
      alert(`Day set to ${dayInput}.`);
    } catch (e: any) {
      alert(`Error setting day: ${e?.message || e}`);
    }
  };

  const handleForceQueue = async () => {
    try {
      await api("/api/achievements/debug-action", {
        method: "POST",
        body: { action: "force_queue", payload: { achievementId: selectedAch } }
      });
      alert(`Forced queued ${selectedAch}. Go to My Day to see it.`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('force-check-pending-achievements'));
      }
    } catch (e: any) {
      alert(`Error forcing queue: ${e?.message || e}`);
    }
  };

  return (
    <div className="fixed bottom-0 right-0 z-[9999] p-4 bg-zinc-900/90 text-white rounded-tl-xl border-t border-l border-zinc-700 shadow-2xl text-xs flex flex-col gap-3 backdrop-blur-md max-w-xs">
      <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
        <h3 className="font-bold text-amber-400">⚡ God Mode (Achievements)</h3>
        <button onClick={() => setIsVisible(false)} className="text-zinc-400 hover:text-white">✕</button>
      </div>

      <button onClick={handleReset} className="w-full py-1.5 bg-red-600 hover:bg-red-500 rounded font-semibold text-white transition-colors">
        Сбросить все ачивки
      </button>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-[10px] text-zinc-400 mb-1">День курса (currentDayIndex)</label>
          <input 
            type="number" 
            value={dayInput} 
            onChange={(e) => setDayInput(e.target.value)}
            className="w-full px-2 py-1.5 bg-zinc-800 rounded border border-zinc-600 text-white outline-none focus:border-amber-400"
            placeholder="Напр: 22"
          />
        </div>
        <button onClick={handleSetDay} className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 rounded font-semibold transition-colors">
          Установить
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="block text-[10px] text-zinc-400">Выбор ачивки (все 85 шт.)</label>
        <select 
          value={selectedAch} 
          onChange={(e) => setSelectedAch(e.target.value)}
          className="w-full px-2 py-1.5 bg-zinc-800 rounded border border-zinc-600 text-white outline-none focus:border-amber-400"
        >
          {ACHIEVEMENTS.map(a => (
            <option key={a.id} value={a.id}>
              {a.id} - {a.name} ({a.rarity})
            </option>
          ))}
        </select>
        <button onClick={handleForceQueue} className="w-full mt-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded font-semibold transition-colors">
          Принудительно закинуть в очередь
        </button>
      </div>
    </div>
  );
}
