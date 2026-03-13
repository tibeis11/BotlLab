const fs = require('fs');
let code = fs.readFileSync('lib/plausibility-service.ts', 'utf8');
code = code.replace(
  "import { _getAlgorithmSettings } from '@/lib/actions/utility-actions';",
  "import { getAlgorithmSettings } from '@/lib/algorithm-settings';"
);
code = code.replace(
  "const cfg = await _getAlgorithmSettings(adminClient);",
  "const cfg = await getAlgorithmSettings();"
);
fs.writeFileSync('lib/plausibility-service.ts', code);
