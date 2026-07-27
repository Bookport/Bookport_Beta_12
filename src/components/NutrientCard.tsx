interface NutrientCardProps {
  name: string;
  value: number | string;
  unit: string;
  symbol: string;
  dvPercent?: number | null;
  isWarning?: boolean;
  circleColor?: "blue" | "amber" | "green" | "purple";
}

const CIRCLE_COLORS: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
};

export default function NutrientCard({
  name,
  value,
  unit,
  symbol,
  dvPercent,
  isWarning,
  circleColor,
}: NutrientCardProps) {
  const isIcon = ["🔥", "🥩", "💧", "🌾", "🌿", "⚖"].includes(symbol);
  const barColor = isWarning ? "bg-red-500" : "bg-green-500";
  const textColor = isWarning ? "text-red-500" : "text-[#2B3137]";
  const circleClasses = circleColor
    ? CIRCLE_COLORS[circleColor] || "bg-[#F5F7F8] text-[#555E68]"
    : "bg-[#F5F7F8] text-[#555E68]";

  return (
    <div className="bg-white rounded-[18px] p-3 flex flex-col shadow-[0_2px_8px_rgba(43,49,55,0.04)] relative overflow-hidden">
      <div className="flex items-start justify-between mb-1">
        <span className="text-[12px] text-[#737C86] font-bold leading-tight">
          {name}
        </span>
        {isIcon ? (
          <span className="text-lg leading-none shrink-0 ml-1">{symbol}</span>
        ) : (
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ml-1 ${circleClasses}`}>
            <span className="text-[10px] font-black leading-none">
              {symbol}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1 mt-1">
        <span className={`text-[26px] font-black leading-none ${textColor}`}>
          {value}
        </span>
        {unit && (
          <span className="text-[11px] text-[#A1B0B8] font-bold">{unit}</span>
        )}
      </div>

      {dvPercent !== undefined && dvPercent !== null && (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1.5 rounded-full bg-[#EEF2F4] overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor} transition-all duration-500`}
              style={{
                width: `${Math.min(dvPercent, 100)}%`,
              }}
            />
          </div>
          <span className={`text-[10px] font-bold shrink-0 ${isWarning ? "text-red-500" : "text-[#737C86]"}`}>
            {Math.round(dvPercent)}%
          </span>
        </div>
      )}
    </div>
  );
}
