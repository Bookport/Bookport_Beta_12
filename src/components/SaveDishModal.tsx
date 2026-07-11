import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { getCategoryColor, DEFAULT_CATEGORIES } from "../utils/categoryColors";
import type { SavedDish } from "./MyDishesScreen";

interface SaveDishModalProps {
  dish: SavedDish;
  allSavedCategories: string[];
  onSave: (category: string) => void;
  onClose: () => void;
}

export default function SaveDishModal({
  dish,
  allSavedCategories,
  onSave,
  onClose,
}: SaveDishModalProps) {
  const [selectedCat, setSelectedCat] = useState(dish.category || "");
  const [customCat, setCustomCat] = useState("");

  const categories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    allSavedCategories.forEach((c) => {
      if (c) {
        const norm = c.trim();
        if (norm) {
          const matched = DEFAULT_CATEGORIES.find((d) => d.toLowerCase() === norm.toLowerCase());
          set.add(matched || norm);
        }
      }
    });
    return Array.from(set);
  }, [allSavedCategories]);

  const handleSave = () => {
    const finalCat = customCat.trim() || selectedCat;
    if (!finalCat) return;
    onSave(finalCat);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="save-dish-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 pb-12"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-[28px] w-full max-w-md mx-4 p-5 shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-gray-800">Первая настройка блюда</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4 p-3 rounded-[16px] bg-gray-50">
            <div className="w-14 h-14 rounded-[12px] bg-gray-200 overflow-hidden shrink-0">
              {dish.image ? (
                <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🍽</div>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">{dish.name}</p>
              <p className="text-xs text-gray-500">Выберите категорию для этого блюда</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((cat) => {
              const col = getCategoryColor(cat);
              const isActive = selectedCat === cat && !customCat.trim();
              return (
                <button
                  key={cat}
                  onClick={() => { setSelectedCat(cat); setCustomCat(""); }}
                  className={`px-3.5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  style={isActive ? { backgroundColor: col.badge, boxShadow: `0 0 12px ${col.shadow}` } : {}}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Или создайте свою категорию</p>
            <input
              type="text"
              value={customCat}
              onChange={(e) => setCustomCat(e.target.value)}
              placeholder="Например: Перекусы"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-green-pure/30 focus:border-brand-green-pure"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!customCat.trim() && !selectedCat}
            className="w-full py-3 rounded-2xl bg-brand-green-pure text-white font-bold text-sm tracking-tight hover:bg-brand-green-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Сохранить
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
