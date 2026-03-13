const fs = require('fs');

const path = 'lib/actions/beat-the-brewer-actions.ts';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('evaluatePlausibility')) {
  code = code.replace(
    "import { verifyQrToken } from '@/lib/actions/qr-token-actions';",
    "import { verifyQrToken } from '@/lib/actions/qr-token-actions';\nimport { evaluatePlausibility } from '@/lib/plausibility-service';"
  );
}

// In submitBeatTheBrewer, compute ipHash and plausibility at the start
code = code.replace(
  "  const supabase = await createClient();\n  const { data: { user } } = await supabase.auth.getUser();\n\n  // 1. Fetch brew",
  "  const supabase = await createClient();\n  const { data: { user } } = await supabase.auth.getUser();\n  const ipHash = await computeIpHash();\n  const plausibility = await evaluatePlausibility(ipHash, user?.id ?? null, submission.bottleId ?? null);\n\n  // 1. Fetch brew"
);

// authenticated tasting_score_event block
code = code.replace(
  "        match_const fs = require('fs');

cme
const path = 'lib/actioatclet code = fs.readFileSync(path, 'utf8');

if (!code.us
if (!code.includes('evaluatePlausibilit pl  code = code.replace(
    "import { verifyQa:    "import { verifyQte    "import { verifyQrToken } from '@/lib/actions/qr-token-actions';\vo  );
}

// In submitBeatTheBrewer, compute ipHash and plausibility at the start
code = code.replace(
  "  const supabase = await createCingId ?? ncode = code.replace(
  "  const supabase = await createClient();\n  co    "  const supabaseon  "  const supabase = await createClient();\n  const { data: { user } } = await supabase.auth.getUser();\n  const ipHash = awaisc);

// authenticated tasting_score_event block
code = code.replace(
  "        match_const fs = require('fs');

cme
const path = 'lib/actioatclet code = fs.readFileSync(path, 'utf8');

if (!code.us
if (!code.includes('evaluatePlausibilit pl  code = code.replace(
    "importh 
??───\n  // ipHash already computed"
);
  "        match_cor_
cme
const path = 'lib/actioatclet code = cocot 
if (!code.us
if (!code.includes('evaluatePlausibilit pl  code = cmisif (!code.i,\    "import { verifyQa:    "import { verifyQte    "import { veron}

// In submitBeatTheBrewer, compute ipHash and plausibility at the start
code = code.replace(
  "  const supabase = awsh,\ncode = code.replace(
  "  const supabase = await createCingId ?? ncodepl  "  const supabasewb  "  const supabase = await createClient();\n  co    "  const sure
// authenticated tasting_score_event block
code = code.replace(
  "        match_const fs = require('fs');

cme
const path = 'lib/actioatclet code = fs.readFileSync(path, 'utf8');

if (!code.us
if (!co   code = code.replace(
  "        match_conan  "        match_coa:
cme
const path = 'lib/actioatclet code =e pcous
if (!code.us
if (!code.includes('evaluatePlausibilit pl  code = ceckif (!codmissi    "importh 
??───\n  // ipHash already computed"
);
  "li??───\ns);
  "        match_cor_
cme
const path =h. etcme
const path = 'liascoc if (!code.us
if (!code.includes('evaluatePibif (!code.iss
// In submitBeatTheBrewer, compute ipHash and plausibility at the start
code = code.replace(
  "  const supabase = awsh,\ncode = cod= acode = code.replace(
  "  const supabase = awsh,\ncode = code.replace(ty  "  const supabaseid  "  const supabase = await createCingId ?? ncodVi// authenticated tasting_score_event block
code = code.replace(
  "        match_const fs = require('fs');

cme
const path = 'lib/actioatcocode = code.replace(
  "        match_con c  "        match_co\n
cme
const path = 'lib/actioatclet code =Checo: 
if (!code.us
if (!co   code = code.replace(
  "        becheck has:
if (!co   coi  "        match_conan  "      cme
const path = 'lib/actioatclet code =e : coviif (!code.us
if (!code.includes('evaluatePceif (!code.i  ??───\n  // ipHash already computed"
);
  "li??───\ns);
  "        mbe);
  "li??───\ns);
  "        matchs_ el  "        match_cor  cme
const path =h. eulco\nconst path = 'liascy_if (!code.includes('evaluatePibif  // In submitBeatTheBrewer, compute ipHash anecode = code.replace(
  "  const supabase = awsh,\ncode = cod= acode = an  "  const supabasere  "  const supabase = awsh,\ncode = code.replace(ty  "  consttycode = code.replace(
  "        match_const fs = require('fs');

cme
const path = 'lib/actioatcocode = code.replace(
  "        match_con c  "        match_co\n
cmh,  "        match_cota
cme
const path = 'lib/actioatcocode = co   co s  "        match_con c  "        match_co\n
cmHacme
const path = 'lib/actioatclet code =Ch  co mif (!ta: {",
  "      session_token: sessionif (!co   c    "        becheck has:
if (!tsif (!co   coi  "      \nconst path = 'lib/actioatclet code =e : coviifn if (!code.includes('evaluatePceif (!code.i  ??───  );
  "li???"
);


fs.writeFileSync(path, code, 'utf8');

