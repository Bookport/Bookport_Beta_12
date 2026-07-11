const fs = require('fs');
const path = 'src/components/MyDayScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the pre-populate logic to actually load from localStorage first
const oldPrePopulate = `  // Pre-populate historical water logs for past days of the course
  useEffect(() => {
    if (waterLogs[currentDayIndex]) return;
    const initialLogs: Record<number, WaterLogEntry[]> = {};
    const normBase = (weight || 65) * 30;
    
    for (let day = 1; day < currentDayIndex; day++) {
      const success = Math.random() > 0.35;
      const totalAmount = success 
        ? normBase + (Math.floor(Math.random() * 4) * 100 - 100) 
        : normBase * 0.6 + (Math.floor(Math.random() * 3) * 100);
      
      const count = 3 + Math.floor(Math.random() * 3);
      const dayEntries: WaterLogEntry[] = [];
      let accumulated = 0;
      for (let i = 0; i < count; i++) {
        const amt = i === count - 1 
          ? Math.max(100, Math.round(totalAmount - accumulated)) 
          : Math.round((totalAmount / count) + (Math.floor(Math.random() * 5) * 20 - 50));
        accumulated += amt;
        dayEntries.push({
          id: \`hist-\${day}-\${i}\`,
          amount: amt,
          time: \`\${8 + Math.floor(i * 3)}:\${10 + Math.floor(Math.random() * 45)}\`,
          timestamp: Date.now() - (currentDayIndex - day) * 24 * 60 * 60 * 1000
        });
      }
      initialLogs[day] = dayEntries;
    }
    setWaterLogs(initialLogs);
  }, [currentDayIndex, weight]);`;

const newPrePopulate = `  // Pre-populate historical water logs for past days of the course
  useEffect(() => {
    if (waterLogs && Object.keys(waterLogs).length > 0) return;
    let initialLogs: Record<number, WaterLogEntry[]> = {};
    try {
      const raw = localStorage.getItem('wfpb_daily_water_entries_v3');
      if (raw) initialLogs = JSON.parse(raw);
    } catch {}

    const normBase = (weight || 65) * 30;
    for (let day = 1; day < currentDayIndex; day++) {
      if (initialLogs[day]) continue;
      const success = Math.random() > 0.35;
      const totalAmount = success 
        ? normBase + (Math.floor(Math.random() * 4) * 100 - 100) 
        : normBase * 0.6 + (Math.floor(Math.random() * 3) * 100);
      const count = 3 + Math.floor(Math.random() * 3);
      const dayEntries: WaterLogEntry[] = [];
      let accumulated = 0;
      for (let i = 0; i < count; i++) {
        const amt = i === count - 1 
          ? Math.max(100, Math.round(totalAmount - accumulated)) 
          : Math.round((totalAmount / count) + (Math.floor(Math.random() * 5) * 20 - 50));
        accumulated += amt;
        dayEntries.push({
          id: \`hist-\${day}-\${i}\`,
          amount: amt,
          time: \`\${8 + Math.floor(i * 3)}:\${10 + Math.floor(Math.random() * 45)}\`,
          timestamp: Date.now() - (currentDayIndex - day) * 24 * 60 * 60 * 1000
        });
      }
      initialLogs[day] = dayEntries;
    }
    setWaterLogs(initialLogs);
    localStorage.setItem('wfpb_daily_water_entries_v3', JSON.stringify(initialLogs));
  }, [currentDayIndex, weight]);`;

if (content.includes('// Pre-populate historical water logs for past days of the course')) {
    content = content.replace(oldPrePopulate, newPrePopulate);
} else {
    console.log("Could not find pre-populate logic!");
}

// Ensure handleAddWaterAmount persists to localStorage
const oldSetWaterLogs = `    updatedLogs[currentDayIndex].push(newEntry);
    
    setWaterLogs(updatedLogs);
    
    const sum = updatedLogs[currentDayIndex].reduce((acc, e) => acc + e.amount, 0);`;

const newSetWaterLogs = `    updatedLogs[currentDayIndex].push(newEntry);
    
    setWaterLogs(updatedLogs);
    localStorage.setItem('wfpb_daily_water_entries_v3', JSON.stringify(updatedLogs));
    
    const sum = updatedLogs[currentDayIndex].reduce((acc, e) => acc + e.amount, 0);`;

if (content.includes('setWaterLogs(updatedLogs);')) {
    content = content.replace(oldSetWaterLogs, newSetWaterLogs);
}

fs.writeFileSync(path, content);
console.log("MyDayScreen.tsx updated.");
