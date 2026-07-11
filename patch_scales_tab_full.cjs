const fs = require('fs');
const path = 'src/components/statenow/ScalesTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add local state for transient button selection
if (!content.includes('const [activeRating, setActiveRating]')) {
  content = content.replace(
    'export default function ScalesTab({',
    'export default function ScalesTab({\n'
  );
  content = content.replace(
    '  return (',
    '  const [activeRating, setActiveRating] = React.useState<Record<string, number>>({});\n  return ('
  );
}

// 2. Fix Scale 5 text (activityLogs)
content = content.replace(
  '{ratingEnergy} / 5 ({energyPct}%)',
  '{activityLogs.length} / 5 ({energyPct}%)'
);

// 3. Fix Slider 1 (Zen)
content = content.replace(
  'onClick={() => handleRatingChange("zen", val)}',
  'onClick={() => { setActiveRating(p => ({...p, zen: val})); handleRatingChange("zen", val); }}'
);
content = content.replace(
  'ratingWellbeing === val\n                    ? "bg-slate-850 border-slate-850 text-white shadow-xs font-extrabold"',
  'activeRating["zen"] === val\n                    ? "bg-slate-850 border-slate-850 text-white shadow-xs font-extrabold"'
);

const oldZenLog = `{wellbeingLog && wellbeingLog.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-1">История:</span>
              {wellbeingLog.map((log, i) => (
                <div key={i} className="flex flex-col items-center bg-white border border-slate-100 px-1.5 py-0.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-w-[36px]">
                  <span className="text-[11px] font-black text-slate-700">{log.val}</span>
                  <span className="text-[8px] font-mono text-slate-400">{log.time}</span>
                </div>
              ))}
            </div>
          )}`;

const newZenLog = `{wellbeingLog && wellbeingLog.length > 0 && (
            <div className="mt-3 bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">График состояния (Психологический дзен)</span>
              <div className="flex items-end gap-2.5 h-16 overflow-x-auto no-scrollbar">
                {wellbeingLog.map((log, i) => (
                  <div key={i} className="flex flex-col items-center justify-end h-full gap-1 min-w-[28px]">
                    <span className="text-[10px] font-black text-slate-700 leading-none">{log.val}</span>
                    <div className="w-5 bg-slate-100 rounded-t-md relative flex items-end overflow-hidden" style={{ height: '40px' }}>
                      <motion.div 
                        initial={{ height: 0 }} 
                        animate={{ height: \`\${(log.val / 5) * 100}%\` }} 
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="w-full bg-emerald-400 rounded-t-md" 
                      />
                    </div>
                    <span className="text-[8px] text-slate-400 font-mono leading-none">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}`;
content = content.replace(oldZenLog, newZenLog);

// 4. Fix Slider 2 (Energy)
content = content.replace(
  'onClick={() => handleRatingChange("energy", val)}',
  'onClick={() => { setActiveRating(p => ({...p, energy: val})); handleRatingChange("energy", val); }}'
);
content = content.replace(
  'ratingEnergy === val\n                    ? "bg-amber-500 border-amber-550 text-white shadow-xs font-extrabold"',
  'activeRating["energy"] === val\n                    ? "bg-amber-500 border-amber-550 text-white shadow-xs font-extrabold"'
);

const oldEnergyLog = `{energyLog && energyLog.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-1">История:</span>
              {energyLog.map((log, i) => (
                <div key={i} className="flex flex-col items-center bg-white border border-amber-100/50 px-1.5 py-0.5 rounded shadow-[0_1px_2px_rgba(245,158,11,0.04)] min-w-[36px]">
                  <span className="text-[11px] font-black text-amber-600">{log.val}</span>
                  <span className="text-[8px] font-mono text-slate-400">{log.time}</span>
                </div>
              ))}
            </div>
          )}`;

const newEnergyLog = `{energyLog && energyLog.length > 0 && (
            <div className="mt-3 bg-white border border-amber-50/50 rounded-xl p-3 shadow-sm">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">График состояния (Физический тонус)</span>
              <div className="flex items-end gap-2.5 h-16 overflow-x-auto no-scrollbar">
                {energyLog.map((log, i) => (
                  <div key={i} className="flex flex-col items-center justify-end h-full gap-1 min-w-[28px]">
                    <span className="text-[10px] font-black text-amber-600 leading-none">{log.val}</span>
                    <div className="w-5 bg-amber-50 rounded-t-md relative flex items-end overflow-hidden" style={{ height: '40px' }}>
                      <motion.div 
                        initial={{ height: 0 }} 
                        animate={{ height: \`\${(log.val / 5) * 100}%\` }} 
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="w-full bg-amber-400 rounded-t-md" 
                      />
                    </div>
                    <span className="text-[8px] text-slate-400 font-mono leading-none">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}`;
content = content.replace(oldEnergyLog, newEnergyLog);

// 5. Fix Slider 3 (Lightness)
content = content.replace(
  'onClick={() => handleRatingChange("lightness", val)}',
  'onClick={() => { setActiveRating(p => ({...p, lightness: val})); handleRatingChange("lightness", val); }}'
);
content = content.replace(
  'ratingLightness === val\n                    ? "bg-teal-600 border-teal-650 text-white shadow-xs font-extrabold"',
  'activeRating["lightness"] === val\n                    ? "bg-teal-600 border-teal-650 text-white shadow-xs font-extrabold"'
);

const oldLightnessLog = `{lightnessLog && lightnessLog.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-1">История:</span>
              {lightnessLog.map((log, i) => (
                <div key={i} className="flex flex-col items-center bg-white border border-teal-100/50 px-1.5 py-0.5 rounded shadow-[0_1px_2px_rgba(20,184,166,0.04)] min-w-[36px]">
                  <span className="text-[11px] font-black text-teal-600">{log.val}</span>
                  <span className="text-[8px] font-mono text-slate-400">{log.time}</span>
                </div>
              ))}
            </div>
          )}`;

const newLightnessLog = `{lightnessLog && lightnessLog.length > 0 && (
            <div className="mt-3 bg-white border border-teal-50/50 rounded-xl p-3 shadow-sm">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">График состояния (Ощущение лёгкости)</span>
              <div className="flex items-end gap-2.5 h-16 overflow-x-auto no-scrollbar">
                {lightnessLog.map((log, i) => (
                  <div key={i} className="flex flex-col items-center justify-end h-full gap-1 min-w-[28px]">
                    <span className="text-[10px] font-black text-teal-600 leading-none">{log.val}</span>
                    <div className="w-5 bg-teal-50 rounded-t-md relative flex items-end overflow-hidden" style={{ height: '40px' }}>
                      <motion.div 
                        initial={{ height: 0 }} 
                        animate={{ height: \`\${(log.val / 5) * 100}%\` }} 
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="w-full bg-teal-400 rounded-t-md" 
                      />
                    </div>
                    <span className="text-[8px] text-slate-400 font-mono leading-none">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}`;
content = content.replace(oldLightnessLog, newLightnessLog);

fs.writeFileSync(path, content);
console.log("ScalesTab.tsx self-assessment and graphs patched.");
