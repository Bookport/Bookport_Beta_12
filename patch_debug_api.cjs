const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const debugApi = `
  // ── Achievements Debug API ──
  app.post("/api/achievements/debug-action", async (req, res) => {
    try {
      if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
      const { action, payload } = req.body;

      if (action === "reset_all") {
        await prisma.userAchievement.deleteMany({ where: { userId: req.userId } });
        await prisma.user.update({
          where: { id: req.userId },
          data: { lastAchievementUnlockedAt: null, pendingAchievementId: null }
        });
        logger.info(\`[Debug] Reset all achievements for user \${req.userId}\`);
        return res.json({ success: true });
      }

      if (action === "set_day") {
        const day = parseInt(payload.day, 10);
        if (isNaN(day)) return res.status(400).json({ error: "Invalid day" });
        await prisma.user.update({
          where: { id: req.userId },
          data: { currentDayIndex: day }
        });
        logger.info(\`[Debug] Set currentDayIndex to \${day} for user \${req.userId}\`);
        return res.json({ success: true });
      }

      if (action === "force_queue") {
        const { achievementId } = payload;
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        let pendingStr = user.pendingAchievementId || "";
        const pendingArr = pendingStr ? pendingStr.split(",") : [];
        if (!pendingArr.includes(achievementId)) pendingArr.push(achievementId);

        await prisma.user.update({
          where: { id: req.userId },
          data: { pendingAchievementId: pendingArr.join(",") }
        });
        logger.info(\`[Debug] Force queued \${achievementId} for user \${req.userId}\`);
        return res.json({ success: true });
      }

      res.status(400).json({ error: "Unknown action" });
    } catch (e: any) {
      logger.error("[Debug] Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });
`;

content = content.replace('  // ── Achievement Check Pending Endpoint ──', debugApi + '\n  // ── Achievement Check Pending Endpoint ──');
fs.writeFileSync('server.ts', content, 'utf8');
console.log("Patched debug API.");
