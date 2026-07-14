const fs = require('fs');
let content = fs.readFileSync('src/modules/mixer/hooks/useMixerLogic.ts', 'utf8');

// Modify triggerSpin signature
content = content.replace(
  'triggerSpin = useCallback(async (chargeLevel: number, cookingMethod: CookingMethod) => {',
  'triggerSpin = useCallback(async (chargeLevel: number, cookingMethod: CookingMethod, hasAutoReleased?: boolean) => {'
);

// After generateMixerResult
const oldGenerate = `      const result = await generateMixerResult({
        ingredients,
        outcomeType,
        scenarioType: config.scenarioType,
        userGender: config.userGender,
        chargeLevel,
        cookingMethod,
        achievementName: config.achievementName || '',
        achievementCategory: config.achievementCategory,
      })
      if (!activeRef.current) return`;

const newGenerate = `      const result = await generateMixerResult({
        ingredients,
        outcomeType,
        scenarioType: config.scenarioType,
        userGender: config.userGender,
        chargeLevel,
        cookingMethod,
        achievementName: config.achievementName || '',
        achievementCategory: config.achievementCategory,
      })
      if (!activeRef.current) return

      // Track Golden Spin
      if (hasAutoReleased && outcomeType === 'perfect') {
        api('/api/achievements/track', {
           method: 'POST',
           body: { type: 'mixer_spin', payload: { hasAutoReleased, outcomeType } }
        }).catch(e => console.error(e))
      }`;

content = content.replace(oldGenerate, newGenerate);

fs.writeFileSync('src/modules/mixer/hooks/useMixerLogic.ts', content, 'utf8');
console.log("Patched useMixerLogic.");
