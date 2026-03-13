const fs = require('fs');

const path = 'lib/actions/beat-the-brewer-actions.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Add import
if (!code.includes('evaluatePlausibility')) {
  code = code.replace(
    "import { verifyQrToken } from '@/lib/actions/qr-token-actions';",
    "import { verifyQrToken } from '@/lib/actions/qr-token-actions';\nimport { evaluatePlausibility } from '@/lib/plausibility-service';"
  );
}

// 2. Add plausibility check to submitBeatTheBrewer
code = code.replace(
  "export async function submitBeatTheBrewer(",
  "export async function submitBeatTheBrewer("
);

// wait let's just do it cleanly
