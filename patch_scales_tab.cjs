const fs = require('fs');
const path = 'src/components/statenow/ScalesTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add todayWaterEntries to Props
content = content.replace(
  '  activityLogs?: any[];',
  '  activityLogs?: any[];\n  todayWaterEntries?: { amount: number; time?: string; timestamp: number }[];'
);

// Destructure todayWaterEntries
content = content.replace(
  '  activityLogs = [],',
  '  activityLogs = [],\n  todayWaterEntries = [],'
);

// Display todayWaterEntries in the Water section
const waterBlockEnd = `              <div className="absolute top-[2px] inset-x-2.5 h-[3px] bg-white/35 rounded-full filter blur-[0.1px] pointer-events-none" />
              <div className="absolute bottom-[2px] inset-x-2.5 h-[2px] bg-white/10 rounded-full pointer-events-none" />
            </div>
          </div>`;

const newWaterBlockEnd = `              <div className="absolute top-[2px] inset-x-2.5 h-[3px] bg-white/35 rounded-full filter blur-[0.1px] pointer-events-none" />
              <div className="absolute bottom-[2px] inset-x-2.5 h-[2px] bg-white/10 rounded-full pointer-events-none" />
            </div>
            {todayWaterEntries && todayWaterEntries.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                {todayWaterEntries.map((entry, i) => (
                  <span key={i} className="text-[9px] bg-sky-50 text-sky-700 font-bold px-1.5 py-0.5 rounded-md border border-sky-100 flex items-center gap-1">
                    💧 +{entry.amount} мл <span className="text-[8px] text-sky-400 font-mono opacity-80">{entry.time || ''}</span>
                  </span>
                ))}
              </div>
            )}
          </div>`;

content = content.replace(waterBlockEnd, newWaterBlockEnd);

fs.writeFileSync(path, content);
console.log("ScalesTab.tsx updated.");
