const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

const injection = `
// ==========================================
// BACKGROUND ACHIEVEMENT EVALUATOR
// ==========================================
async function grantAchievements(userId, unlockedIds) {
  if (!unlockedIds || unlockedIds.length === 0) return;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    let pendingStr = user.pendingAchievementId || "";
    const pendingArr = pendingStr ? pendingStr.split(",") : [];
    
    for (const id of unlockedIds) {
      await prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId: id } },
        update: { unlocked: true, unlockedAt: new Date() },
        create: { userId, achievementId: id, unlocked: true, unlockedAt: new Date(), xp: 0 },
      });
      if (!pendingArr.includes(id)) pendingArr.push(id);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { pendingAchievementId: pendingArr.join(",") }
    });
    logger.info(\`[Achievements] Queued new achievements for user \${userId}: \${unlockedIds.join(", ")}\`);
  } catch (dbErr) {
    logger.error("[Achievements] Failed to grant achievements:", dbErr.message);
  }
}

async function checkBackgroundAchievements(userId, eventType, data) {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: {
        userAchievements: true,
        savedDishes: true,
        dailyMetrics: { orderBy: { date: 'asc' } }
      }
    });
    if (!user) return;

    const unlocked = new Set(user.userAchievements.map(ua => ua.achievementId));
    const newUnlocks = [];

    const tryUnlock = (id, condition) => {
      if (condition && !unlocked.has(id)) {
        newUnlocks.push(id);
        unlocked.add(id);
      }
    };

    const isMonday = new Date().getDay() === 1;
    const currentDay = user.currentDayIndex || 1;

    tryUnlock('ach-083', currentDay >= 7);

    if (eventType === "profile_saved") {
      tryUnlock('ach-080', user.hasSavedSettings === true);
    }

    if (eventType === "dish_saved" || eventType === "metric_saved") {
      tryUnlock('ach-084', isMonday);
    }

    if (eventType === "dish_saved") {
      const nonMixer = user.savedDishes.filter(d => !d.isMixerGenerated);
      tryUnlock('ach-081', nonMixer.length === 1);
      
      const latestDish = nonMixer.length > 0 ? nonMixer[nonMixer.length - 1] : null;
      if (latestDish) {
        let ingredients = [];
        try { ingredients = JSON.parse(latestDish.ingredients || "[]"); } catch (e) {}

        const allGreen = ingredients.length > 0 && ingredients.every(i => i.status === "green");
        tryUnlock('ach-082', allGreen);

        const hasRed = ingredients.some(i => i.status === "red");
        tryUnlock('ach-061', hasRed);

        const hasMayo = ingredients.some(i => {
          const lower = (i.name || "").toLowerCase();
          return lower.includes('майонез') || lower.includes('маргарин') || lower.includes('спред');
        });
        tryUnlock('ach-022', hasMayo);

        const hour = new Date(latestDish.createdAt).getHours();
        const hasSugar = ingredients.some(i => {
          const lower = (i.name || "").toLowerCase();
          return lower.includes('сахар') || lower.includes('конфет') || lower.includes('шоколад') || lower.includes('пирож') || lower.includes('торт');
        });
        tryUnlock('ach-028', hasSugar && hour >= 16);

        if (currentDay === 1 && nonMixer.filter(d => d.dayIndex === 1).length > 0) {
          let rawCount = 0;
          let totalCount = ingredients.length;
          ingredients.forEach(i => {
            const lower = (i.name || "").toLowerCase();
            if (lower.includes('свеж') || lower.includes('сыр') || lower.includes('зелен') || lower.includes('салат') || lower.includes('огурец') || lower.includes('помидор') || lower.includes('яблок') || lower.includes('фрукт')) {
              rawCount++;
            }
          });
          if (totalCount > 0 && (rawCount / totalCount) > 0.6) {
             tryUnlock('ach-085', true);
          }
        }
      }
    }

    if (eventType === "metric_saved") {
      const metrics = user.dailyMetrics;
      const waterEntriesAll = [];
      const sleepLogsAll = [];
      
      for (const m of metrics) {
        if (m.waterEntries) {
          try {
            const parsed = typeof m.waterEntries === 'string' ? JSON.parse(m.waterEntries) : m.waterEntries;
            waterEntriesAll.push(...(Array.isArray(parsed) ? parsed : []));
          } catch(e){}
        }
        if (m.sleepMinutes > 0) {
           sleepLogsAll.push({ minutes: m.sleepMinutes, date: m.date });
        }
      }

      tryUnlock('ach-008', waterEntriesAll.length >= 1);

      if (waterEntriesAll.length > 0 && sleepLogsAll.length > 0) {
         const firstWaterTimeStr = waterEntriesAll[0].time;
         if (firstWaterTimeStr) {
           const [h, m] = firstWaterTimeStr.split(':').map(Number);
           const isEarly = h < 9 || (h === 9 && m <= 30);
           tryUnlock('ach-009', isEarly);
         }
      }

      const latestSleep = sleepLogsAll.length > 0 ? sleepLogsAll[sleepLogsAll.length - 1] : null;
      if (latestSleep) {
         const hours = latestSleep.minutes / 60;
         if (hours >= 7 && hours <= 9) {
           tryUnlock('ach-039', true);
         }
      }
    }

    if (newUnlocks.length > 0) {
      await grantAchievements(userId, newUnlocks);
    }
  } catch (e) {
    logger.error("[Achievements] Background check failed", e);
  }
}
// ==========================================

`;

const targetIndex = content.indexOf('// POST /api/user/profile');
if (targetIndex !== -1) {
  const newContent = content.substring(0, targetIndex) + injection + content.substring(targetIndex);
  fs.writeFileSync('server.ts', newContent, 'utf8');
  console.log("Successfully injected background achievement evaluator.");
} else {
  console.log("Target index not found.");
}
