const fs = require('fs');
const path = '/home/sam/code/coder/Bookport_12.0_Beta/server.ts';
let content = fs.readFileSync(path, 'utf8');

const oldProfile = `        profile: user ? {
          name: user.name,
          gender: user.gender,
          chronicConditions: user.chronicConditions ? JSON.parse(user.chronicConditions) : [],
          healthGoals: user.healthGoals ? JSON.parse(user.healthGoals) : [],
        } : null,`;

const newProfile = `        profile: user ? {
          name: user.name,
          gender: user.gender,
          weight: user.weight,
          chronicConditions: user.chronicConditions ? JSON.parse(user.chronicConditions) : [],
          healthGoals: user.healthGoals ? JSON.parse(user.healthGoals) : [],
        } : null,`;

if (content.includes(oldProfile)) {
  fs.writeFileSync(path, content.replace(oldProfile, newProfile));
  console.log("StateNow profile patched to include weight!");
}
