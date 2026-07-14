const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const metricLogicInjection = `
      const latestSleep = sleepLogsAll.length > 0 ? sleepLogsAll[sleepLogsAll.length - 1] : null;
      if (latestSleep) {
         const hours = latestSleep.minutes / 60;
         if (hours >= 7 && hours <= 9) {
           tryUnlock('ach-039', true);
         }
      }

      // ach-034: Wake up < 06:30 for 5 days
      // ach-037: Sleep time < 22:30
      // ach-010: ach-009 fulfilled 5 days in a row
      let wakeUpConsecutiveDays = 0;
      let morningWaterConsecutiveDays = 0;
      
      for (let day = currentDay; day >= currentDay - 7; day--) {
         const m = user.dailyMetrics.find(dm => dm.dayIndex === day);
         if (m && m.sleepLogs) {
           let slogs = [];
           try { slogs = JSON.parse(m.sleepLogs); } catch(e){}
           const sl = slogs[slogs.length - 1];
           if (sl && sl.wakeTime) {
             const [h, min] = sl.wakeTime.split(':').map(Number);
             if (h < 6 || (h === 6 && min <= 30)) {
               wakeUpConsecutiveDays++;
             } else {
               wakeUpConsecutiveDays = 0; // reset
             }
           }
           if (sl && sl.sleepTime && day === currentDay) {
             const [h, min] = sl.sleepTime.split(':').map(Number);
             if (h < 22 || (h === 22 && min <= 30)) {
               tryUnlock('ach-037', true);
             }
           }
         }
         
         if (m && m.waterEntries) {
           let wentries = [];
           try { wentries = JSON.parse(m.waterEntries); } catch(e){}
           if (wentries.length > 0 && wentries[0].time) {
             const [h, min] = wentries[0].time.split(':').map(Number);
             if (h < 9 || (h === 9 && min <= 30)) morningWaterConsecutiveDays++;
             else morningWaterConsecutiveDays = 0;
           }
         }
      }
      tryUnlock('ach-034', wakeUpConsecutiveDays >= 5);
      tryUnlock('ach-010', morningWaterConsecutiveDays >= 5);
`;

const oldMetricLogic = `      const latestSleep = sleepLogsAll.length > 0 ? sleepLogsAll[sleepLogsAll.length - 1] : null;
      if (latestSleep) {
         const hours = latestSleep.minutes / 60;
         if (hours >= 7 && hours <= 9) {
           tryUnlock('ach-039', true);
         }
      }`;

content = content.replace(oldMetricLogic, metricLogicInjection);


const dishLogicInjection = `
      tryUnlock('ach-082', hasAnyGreenDish);
      tryUnlock('ach-061', hasAnyRedIngredient);
      tryUnlock('ach-022', hasAnyMayo);
      tryUnlock('ach-028', hasAnySugarAfter16);

      // ach-018: beans 5 days in a row
      // ach-019: broccoli 3 days in a row
      let beansConsecutiveDays = 0;
      let broccoliConsecutiveDays = 0;

      for (let day = currentDay; day >= currentDay - 7; day--) {
         const dayDishes = user.savedDishes.filter(d => d.dayIndex === day && d.sourceType !== 'mixer' && !(d).isMixerGenerated);
         let dayHasBeans = false;
         let dayHasBroccoli = false;
         
         for (const d of dayDishes) {
            let ings = [];
            try { ings = JSON.parse(d.ingredients || "[]"); } catch(e){}
            if (ings.some(i => {
              const lower = (i.name || "").toLowerCase();
              return lower.includes('нут') || lower.includes('чечевиц') || lower.includes('фасол') || lower.includes('горох');
            })) { dayHasBeans = true; }
            if (ings.some(i => {
              const lower = (i.name || "").toLowerCase();
              return lower.includes('броккол') || lower.includes('цветная капуст') || lower.includes('кольраб');
            })) { dayHasBroccoli = true; }
         }
         
         if (dayHasBeans) beansConsecutiveDays++; else beansConsecutiveDays = 0;
         if (dayHasBroccoli) broccoliConsecutiveDays++; else broccoliConsecutiveDays = 0;
      }
      tryUnlock('ach-018', beansConsecutiveDays >= 5);
      tryUnlock('ach-019', broccoliConsecutiveDays >= 3);

      // ach-015: 7 days no meat (on day 14)
      // ach-016: 7 days no sugar (on day 14)
      if (currentDay >= 14) {
         let meatFreeDays = 0;
         let sugarFreeDays = 0;
         for (let day = currentDay; day >= currentDay - 6; day--) {
            const dayDishes = user.savedDishes.filter(d => d.dayIndex === day && d.sourceType !== 'mixer');
            let dayHasMeat = false;
            let dayHasSugar = false;
            for (const d of dayDishes) {
               let ings = [];
               try { ings = JSON.parse(d.ingredients || "[]"); } catch(e){}
               if (ings.some(i => {
                 const lower = (i.name || "").toLowerCase();
                 return lower.includes('мяс') || lower.includes('кур') || lower.includes('говяд') || lower.includes('свинин') || lower.includes('баранин') || lower.includes('индейк') || lower.includes('утк') || lower.includes('рыб') || lower.includes('кревет');
               })) { dayHasMeat = true; }
               
               if (ings.some(i => {
                 const lower = (i.name || "").toLowerCase();
                 return (lower.includes('сахар') && !lower.includes('сахарозам')) || lower.includes('фруктоз') || lower.includes('глюкоз') || lower.includes('сироп') || lower.includes('конфет') || lower.includes('шоколад') || lower.includes('торт') || lower.includes('пирож');
               })) { dayHasSugar = true; }
            }
            if (!dayHasMeat && dayDishes.length > 0) meatFreeDays++;
            if (!dayHasSugar && dayDishes.length > 0) sugarFreeDays++;
         }
         tryUnlock('ach-015', meatFreeDays >= 7);
         tryUnlock('ach-016', sugarFreeDays >= 7);
      }
`;

const oldDishLogic = `      tryUnlock('ach-082', hasAnyGreenDish);
      tryUnlock('ach-061', hasAnyRedIngredient);
      tryUnlock('ach-022', hasAnyMayo);
      tryUnlock('ach-028', hasAnySugarAfter16);`;

content = content.replace(oldDishLogic, dishLogicInjection);

fs.writeFileSync('server.ts', content, 'utf8');
console.log("Patched dynamic logic achievements.");
