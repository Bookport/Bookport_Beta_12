const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const injection = `
    // SECRET & MIXER
    if (eventType === "mixer_spin" && data && data.hasAutoReleased === true && data.outcomeType === "perfect") {
       tryUnlock('ach-075', true);
    }

    // ach-076 ("Новогодний детокс"): Dec 31 - Jan 7
`;

content = content.replace('    // SECRET & MIXER\n    // ach-076 ("Новогодний детокс"): Dec 31 - Jan 7', injection);
fs.writeFileSync('server.ts', content, 'utf8');
console.log("Patched mixer logic.");
