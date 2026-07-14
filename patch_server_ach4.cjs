const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const rawFixInjection = `
        for (const d of day1Dishes) {
          let ings = [];
          try { ings = JSON.parse(d.ingredients || "[]"); } catch(e){}
          totalCount += ings.length;
          ings.forEach(i => {
            if (i.isRaw === true || i.processingType === 'raw') {
              rawCount++;
            }
          });
        }
`;

const oldRawLogic = `        for (const d of day1Dishes) {
          let ings: any[] = [];
          try { ings = JSON.parse(d.ingredients || "[]"); } catch(e){}
          totalCount += ings.length;
          ings.forEach(i => {
            const lower = (i.name || "").toLowerCase();
            if (lower.includes('свеж') || lower.includes('сыр') || lower.includes('зелен') || lower.includes('салат') || lower.includes('огурец') || lower.includes('помидор') || lower.includes('яблок') || lower.includes('фрукт')) {
              rawCount++;
            }
          });
        }`;

content = content.replace(oldRawLogic, rawFixInjection);

fs.writeFileSync('server.ts', content, 'utf8');
console.log("Patched ach-085 bug.");
