const fs = require('fs');

const f1 = fs.readFileSync('app/brewery/[id]/page.tsx', 'utf8');
console.log("brewery page lines:", f1.split('\n').findIndex(l => l.includes("const avg = ratings")));

const f2 = fs.readFileSync('app/team/[breweryId]/dashboard/page.tsx', 'utf8');
console.log("team dashboard lines:", f2.split('\n').findIndex(l => l.includes("const avg = Math.round(")));
