const fs = require('fs');
const path = 'src/components/statenow/ScalesTab.tsx';
let content = fs.readFileSync(path, 'utf8');

const badBlock = `            {todayWaterEntries && todayWaterEntries.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                {todayWaterEntries.map((entry, i) => (
                  <span key={i} className="text-[9px] bg-sky-50 text-sky-700 font-bold px-1.5 py-0.5 rounded-md border border-sky-100 flex items-center gap-1">
                    💧 +{entry.amount} мл <span className="text-[8px] text-sky-400 font-mono opacity-80">{entry.time || ''}</span>
                  </span>
                ))}
              </div>
            )}`;

content = content.replace(badBlock + '\\n', ""); // Remove from Sleep
content = content.replace(badBlock, ""); // Remove from Sleep just in case

// Add to Water
const waterEnd = `              <div className="absolute bottom-[2px] inset-x-2.5 h-[2px] bg-white/10 rounded-full pointer-events-none" />
            </div>
          </div>

          {/* Scale 3: Рацион растительный */}`;

const newWaterEnd = `              <div className="absolute bottom-[2px] inset-x-2.5 h-[2px] bg-white/10 rounded-full pointer-events-none" />
            </div>
${badBlock}
          </div>

          {/* Scale 3: Рацион растительный */}`;

content = content.replace(waterEnd, newWaterEnd);

fs.writeFileSync(path, content);
