const fs = require('fs');
const path = 'src/components/StateNowScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldWaterLogData = `  const waterLogData = {
    lastWaterTimestamp: undefined as number | undefined,
    todayWaterEntries: undefined as { amount: number; timestamp: number }[] | undefined,
  }`;

const newWaterLogData = `  const waterLogData = (() => {
    try {
      const raw = localStorage.getItem('wfpb_daily_water_entries_v3');
      if (!raw) return { lastWaterTimestamp: undefined, todayWaterEntries: undefined };
      const logs = JSON.parse(raw);
      const todayLogs = logs[currentDayIndex];
      if (!todayLogs || todayLogs.length === 0) return { lastWaterTimestamp: undefined, todayWaterEntries: undefined };
      return {
        lastWaterTimestamp: todayLogs[todayLogs.length - 1].timestamp,
        todayWaterEntries: todayLogs.map((e) => ({ amount: e.amount, timestamp: e.timestamp, time: e.time })),
      };
    } catch {
      return { lastWaterTimestamp: undefined, todayWaterEntries: undefined };
    }
  })();`;

content = content.replace(oldWaterLogData, newWaterLogData);

// Now, we need to pass `todayWaterEntries` into `ScalesTab` so it can render the entries!
const oldScalesTab = `              habitsTarget={habitsTarget}
              ratingEnergy={effRatingEnergy}
              energyPct={energyPct}
              ratingWellbeing={effRatingWellbeing}
              ratingLightness={effRatingLightness}
              wellbeingLog={wellbeingLog}
              energyLog={energyLog}
              lightnessLog={lightnessLog}
              activityLogs={activityLogs}
              currentDayIndex={currentDayIndex}
              todayCookedBookCount={todayCookedBookCount}
              todayTotalBookMenuCount={todayTotalBookMenuCount}
              totalCookedBookRecipesCount={totalCookedBookRecipesCount}
              handleRatingChange={handleRatingChange}
              annaAnalysisText={annaAnalysisText}
              recommendedAction={recommendedAction}
            />`;

const newScalesTab = `              habitsTarget={habitsTarget}
              ratingEnergy={effRatingEnergy}
              energyPct={energyPct}
              ratingWellbeing={effRatingWellbeing}
              ratingLightness={effRatingLightness}
              wellbeingLog={wellbeingLog}
              energyLog={energyLog}
              lightnessLog={lightnessLog}
              activityLogs={activityLogs}
              todayWaterEntries={waterLogData.todayWaterEntries}
              currentDayIndex={currentDayIndex}
              todayCookedBookCount={todayCookedBookCount}
              todayTotalBookMenuCount={todayTotalBookMenuCount}
              totalCookedBookRecipesCount={totalCookedBookRecipesCount}
              handleRatingChange={handleRatingChange}
              annaAnalysisText={annaAnalysisText}
              recommendedAction={recommendedAction}
            />`;

content = content.replace(oldScalesTab, newScalesTab);

fs.writeFileSync(path, content);
console.log("StateNowScreen.tsx water log updated.");
