const fs = require('fs');
let code = fs.readFileSync('app/api/ratings/submit/route.ts', 'utf8');
code = code.replace(
`        const timeToSubmitMs = form_start_time ? Date.now() - parseInt(form_start_time, 10) : null;`,
`        const timeToSubmitMs = form_start_time ? Date.now() - Number(form_start_time) : null;`
);
fs.writeFileSync('app/api/ratings/submit/route.ts', code);
