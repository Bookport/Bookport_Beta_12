const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldTryUnlock = `    const tryUnlock = (id, condition) => {
      if (condition && !unlocked.has(id)) {
        newUnlocks.push(id);
        unlocked.add(id);
      }
    };`;

const newTryUnlock = `    const tryUnlock = (id, condition, reason = "") => {
      if (condition && !unlocked.has(id)) {
        newUnlocks.push(id);
        unlocked.add(id);
        logger.info(\`[Achievements] Triggered \${id} \${reason ? 'because ' + reason : ''}\`);
      }
    };`;

content = content.replace(oldTryUnlock, newTryUnlock);
fs.writeFileSync('server.ts', content, 'utf8');
console.log("Patched tryUnlock logging.");
