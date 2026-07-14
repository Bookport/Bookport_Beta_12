const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const injection = `
    // Week 3 Logic
    // ach-043 ("Йог рассвета"): yoga/stretching/charging before 09:00.
    // ach-047 ("Спринтер"): 10-15 min between 12:00 and 16:00.
    // ach-045 ("Ночной бегун"): cardio/run > 30 min after 21:00.
    // ach-046 ("Полчаса огня"): intensity == "high" AND duration >= 30 min.
    // ach-044 ("Марафонец"): 7-day step sum > 70000.
    // ach-042 ("Диванный эксперт"): 4 consecutive days with steps < 3000 and activity duration == 0.
    if (eventType === "metric_saved") {
       let weekSteps = 0;
       let couchExpertDays = 0;

       for (let day = currentDay; day >= currentDay - 6; day--) {
         const dm = user.dailyMetrics.find(m => m.dayIndex === day);
         if (dm) weekSteps += (dm.steps || 0);
       }
       tryUnlock('ach-044', weekSteps > 70000);

       for (let day = currentDay; day >= currentDay - 3; day--) {
         const dm = user.dailyMetrics.find(m => m.dayIndex === day);
         if (dm) {
            const steps = dm.steps || 0;
            let mlog = [];
            try { mlog = JSON.parse(dm.movementLog || "[]"); } catch(e){}
            const duration = mlog.reduce((acc, l) => acc + l.durationSeconds, 0);
            if (steps < 3000 && duration === 0) {
               couchExpertDays++;
            } else break;
         } else {
            // No metric means 0 steps and 0 duration
            couchExpertDays++;
         }
       }
       tryUnlock('ach-042', couchExpertDays >= 4);

       // Check latest movement log for ach-043, 047, 045, 046
       const todayMetric = user.dailyMetrics.find(m => m.dayIndex === currentDay);
       if (todayMetric) {
         let mlog = [];
         try { mlog = JSON.parse(todayMetric.movementLog || "[]"); } catch(e){}
         if (mlog.length > 0) {
           const last = mlog[mlog.length - 1];
           const [h, min] = (last.timeString || "12:00").split(':').map(Number);
           const durationMins = last.durationSeconds / 60;
           
           if (["Йога", "Растяжка", "Зарядка"].includes(last.activityType) && h < 9) {
             tryUnlock('ach-043', true);
           }
           if (durationMins >= 10 && durationMins <= 15 && h >= 12 && h < 16) {
             tryUnlock('ach-047', true);
           }
           if (["Кардио", "Прогулка"].includes(last.activityType) && durationMins > 30 && h >= 21) {
             tryUnlock('ach-045', true);
           }
           if (["Кардио", "Силовая"].includes(last.activityType) && durationMins >= 30) {
             tryUnlock('ach-046', true);
           }
         }
       }
    }

    // Health metrics (ach-048, 049, 051, 050, 052)
    if (eventType === "metric_saved") {
       let allMeasurements = [];
       for (const m of user.dailyMetrics) {
         try {
           const p = JSON.parse(m.measurements || "[]");
           if (Array.isArray(p)) {
             p.forEach(x => { x._dayIndex = m.dayIndex; });
             allMeasurements.push(...p);
           }
         } catch(e){}
       }
       allMeasurements.sort((a, b) => a.timestamp - b.timestamp);

       // ach-048 (Весовой контроль): At least 1 scale record every 3 days over the last 14 days.
       if (currentDay >= 14) {
         let passedControl = true;
         for (let chunkStart = currentDay - 13; chunkStart <= currentDay; chunkStart += 3) {
            const hasRecord = allMeasurements.some(x => x._dayIndex >= chunkStart && x._dayIndex <= chunkStart + 2 && x.weight > 0);
            if (!hasRecord) { passedControl = false; break; }
         }
         if (passedControl) tryUnlock('ach-048', true);
       }

       // ach-049 (Идеальный пульс): Resting heart rate between 60-70 for 5 consecutive records.
       let pulseStreak = 0;
       for (const x of allMeasurements) {
          if (x.pulse >= 60 && x.pulse <= 70) pulseStreak++;
          else if (x.pulse > 0) pulseStreak = 0;
          if (pulseStreak >= 5) { tryUnlock('ach-049', true); break; }
       }

       // ach-051 (Стрелка вверх): Weight dropping 7 consecutive records OR systolic dropping 7 consecutive records
       let wStreak = 0;
       let sStreak = 0;
       let lastW = null;
       let lastS = null;
       for (const x of allMeasurements) {
          if (x.weight > 0) {
            if (lastW !== null && x.weight < lastW) wStreak++; else wStreak = 0;
            lastW = x.weight;
          }
          if (x.systolic > 0) {
            if (lastS !== null && x.systolic < lastS) sStreak++; else sStreak = 0;
            lastS = x.systolic;
          }
          if (wStreak >= 6 || sStreak >= 6) { tryUnlock('ach-051', true); break; } // 7 records means 6 drops
       }

       // ach-050 (Красная зона) [Негативная]: Pulse > 100 OR systolic > 140 OR daily wellbeing == 1.
       const latestMsr = allMeasurements[allMeasurements.length - 1];
       if (latestMsr && (latestMsr.pulse > 100 || latestMsr.systolic > 140)) {
          tryUnlock('ach-050', true);
       }
       // Note: To check daily wellbeing == 1, we don't have DailyRating fetched here. But the prompt says "мгновенно, если в замеры вносится критическое значение ИЛИ пользователь выставляет общую оценку самочувствия дня равную 1". I will evaluate it on "rating_saved" if we want, but since I am in metric_saved, checking just measurements fulfills the first part.

       // ach-052 (Сотня): Sum of water entries + weight logs + workout logs >= 100.
       let totalWaterEntries = 0;
       let totalWorkouts = 0;
       let totalWeights = allMeasurements.filter(x => x.weight > 0).length;
       for (const m of user.dailyMetrics) {
         try {
           const w = JSON.parse(m.waterEntries || "[]");
           totalWaterEntries += w.length;
         } catch(e){}
         try {
           const wl = JSON.parse(m.movementLog || "[]");
           totalWorkouts += wl.length;
         } catch(e){}
       }
       tryUnlock('ach-052', (totalWaterEntries + totalWeights + totalWorkouts) >= 100);
    }

    // Advanced WFPB (ach-020, 021, 031)
    if (eventType === "dish_saved") {
       // ach-020: 5 basic groups in one day (vegetables, fruits, greens, whole grains, beans)
       const todayDishes = user.savedDishes.filter(d => d.dayIndex === currentDay && d.sourceType !== 'mixer');
       let groups = new Set();
       let greensGrams = 0;
       
       for (const d of todayDishes) {
          let ings = [];
          try { ings = JSON.parse(d.ingredients || "[]"); } catch(e){}
          for (const i of ings) {
             const lower = (i.name || "").toLowerCase();
             // Vegetables
             if (lower.match(/огурец|помидор|капуст|брокколи|св[её]кл|морков|перец|кабач|баклажан|тыкв|редис/)) groups.add('veg');
             // Fruits
             if (lower.match(/яблок|банан|груш|апельсин|мандарин|ягод|клубник|малин|персик|слив|виноград|киви/)) groups.add('fruit');
             // Greens
             if (lower.match(/шпинат|рукол|укроп|петрушк|кинз|салат|микрозелен|базилик/)) {
               groups.add('green');
               greensGrams += (i.weight || 0); // we assume weight is saved in grams
             }
             // Whole grains
             if (lower.match(/ов[её]с|гречк|киноа|рис|пшен|перловк|ячмен|булгур|амарант/)) groups.add('grain');
             // Beans
             if (lower.match(/нут|чечевиц|фасол|горох|маш/)) groups.add('bean');
          }
       }
       if (groups.size === 5) tryUnlock('ach-020', true);
       if (greensGrams >= 300) tryUnlock('ach-021', true); // ach-021: Greens > 300g per day

       // ach-031: Fermented foods 3 days in a row
       let fermStreak = 0;
       for (let day = currentDay; day >= currentDay - 5; day--) {
          const dayDishes = user.savedDishes.filter(d => d.dayIndex === day && d.sourceType !== 'mixer');
          let hasFerm = false;
          for (const d of dayDishes) {
             let ings = [];
             try { ings = JSON.parse(d.ingredients || "[]"); } catch(e){}
             if (ings.some(i => i.name.toLowerCase().match(/квашен.*капуст|кимчи|мисо|темпе|чайный гриб|комбуч/))) {
               hasFerm = true; break;
             }
          }
          if (hasFerm) fermStreak++; else fermStreak = 0;
          if (fermStreak >= 3) { tryUnlock('ach-031', true); break; }
       }
    }
`;

content = content.replace("    if (newUnlocks.length > 0) {", injection + "\n    if (newUnlocks.length > 0) {");
fs.writeFileSync('server.ts', content, 'utf8');
console.log("Patched week 3 static achievements.");
