const fs = require('fs');
const path = 'src/components/statenow/ScalesTab.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldBadge = `🏃 {log.activityType} ({Math.round(log.durationSeconds / 60)} мин)`;
const newBadge = `🏃 {log.activityType} ({Math.round(log.durationSeconds / 60)} мин) <span className="text-[8px] text-amber-500/80 font-mono ml-1">{log.timeString || ''}</span>`;

content = content.replace(oldBadge, newBadge);
fs.writeFileSync(path, content);
