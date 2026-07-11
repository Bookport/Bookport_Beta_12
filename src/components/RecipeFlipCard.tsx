import { useState } from "react";
import { motion } from "motion/react";
import { X, RefreshCw } from "lucide-react";
import { getRecipeImagePath } from "../utils/recipeImageMapper";
import { complimentsBackData } from "../data/compliments_back";

interface RecipeFlipCardProps {
  id: number;
  emotionalName?: string;
  technicalName: string;
  onClose: () => void;
}

export default function RecipeFlipCard({ id, emotionalName, technicalName, onClose }: RecipeFlipCardProps) {
  const [flipped, setFlipped] = useState(false);

  const fontStyle = { fontFamily: '"Calibri", "Candara", sans-serif' };
  const imageFront = getRecipeImagePath(emotionalName, technicalName);
  const backData = complimentsBackData.find((d) => d.id === `compliment_${id}`);

  return (
    <div
      className="relative w-full"
      style={{ aspectRatio: "9 / 16", perspective: "1200px", ...fontStyle }}
      onClick={() => setFlipped((prev) => !prev)}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* ── Front ── */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          {imageFront ? (
            <img
              src={imageFront}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
              <span className="text-5xl opacity-40">🍽</span>
            </div>
          )}

          <div
            className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm text-white/90 shadow-lg"
            style={{ bottom: "40px" }}
            onClick={(e) => { e.stopPropagation(); setFlipped(true); }}
          >
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>

        {/* ── Back ── */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden bg-white"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="relative h-full flex flex-col">
            <button
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/80 shadow-sm text-gray-500 hover:text-gray-800 transition-colors"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
            >
              <X className="w-4 h-4" />
            </button>

            <div
              className="flex-1 overflow-y-auto pr-1"
              style={{ padding: "20px", scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div className="[&::-webkit-scrollbar]:hidden">
                {backData ? (
                  <>
                    <h3
                      className="text-[16px] font-bold text-gray-800 mb-2"
                      style={fontStyle}
                    >
                      Ингредиенты:
                    </h3>
                    <ul className="text-[14px] font-normal text-gray-700 space-y-1 list-disc list-inside" style={fontStyle}>
                      {backData.ingredients.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>

                    <h3
                      className="text-[16px] font-bold text-gray-800 mt-5 mb-2"
                      style={fontStyle}
                    >
                      Способ приготовления:
                    </h3>
                    <p className="text-[14px] font-normal text-gray-700 leading-relaxed whitespace-pre-line" style={fontStyle}>
                      {backData.instructions}
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {backData.kbju.map((item, i) => {
                        const [label, value] = item.includes(":") ? item.split(":") : [item, ""];
                        return (
                          <div key={i} className="flex items-baseline gap-1 text-[14px]" style={fontStyle}>
                            <span className="text-gray-400 font-normal">{label.trim()}:</span>
                            <span className="text-gray-800 font-semibold">{value.trim()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-[14px]" style={fontStyle}>
                    Данные не загружены
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
