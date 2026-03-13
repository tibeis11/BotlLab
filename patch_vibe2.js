const fs = require('fs');
let code = fs.readFileSync('lib/actions/beat-the-brewer-actions.ts', 'utf8');
code = code.replace(
`  const ipHash = await computeIpHash();
  const plausibility = await evaluatePlausibility(ipHash, user?.id ?? null, submission.bottleId ?? null);`,
`  const ipHash = await computeIpHash();
  const timeToSubmitMs = submission.formStartTime ? Date.now() - submission.formStartTime : null;
  const plausibility = await evaluatePlausibility(ipHash, user?.id ?? null, {
    currentBottleId: submission.bottleId ?? null,
    timeToSubmitMs,
    isComplexForm: false // VibeCheck is much faster
  });`
);
fs.writeFileSync('lib/actions/beat-the-brewer-actions.ts', code);
