const fs = require('fs');
const lines = fs.readFileSync('app/brew/[id]/ClientBrewPage.tsx', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('async function fetchBrewInfo() {'));
const endIdx = lines.findIndex(l => l.includes('setBrew(brewData);'));

if (startIdx !== -1 && endIdx !== -1) {
  const newLogic = `    async function fetchBrewInfo() {
      try {
        if (initialError) {
          setErrorMsg(initialError);
          setLoading(false);
          return;
        }

        let user = initialUser;
        let brewData = initialData;

        if (!brewData) {
          try {
            const { data } = await supabase.auth.getUser();
            user = data?.user ?? null;
          } catch (authErr) {}

          const { data: bData, error: brewError } = await supabase
            .from('brews')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (brewError || !bData) {
            setErrorMsg("Rezept nicht gefunden");
            setLoading(false);
            return;
          }

          let hasAccess = bData.is_public;
          if (!hasAccess) {
               if (user && bData.user_id === user.id) {
                   hasAccess = true;
               } else if (user && bData.brewery_id) {
                   const { data: member } = await supabase
                      .from('brewery_members')
                      .select('id')
                      .eq('brewery_id', bData.brewery_id)
                      .eq('user_id', user.id)
                      .maybeSingle();
                   if (member) hasAccess = true;
               }
          }

          if (!hasAccess) {
              setErrorMsg("Dieses Rezept ist privat und nur für Team-Mitglieder sichtbar.");
              setLoading(false);
              return;
          }
          brewData = bData;
          setBrew(brewData);
        }`;
  lines.splice(startIdx, (endIdx - startIdx) + 1, newLogic);
  fs.writeFileSync('app/brew/[id]/ClientBrewPage.tsx', lines.join('\n'), 'utf8');
  console.log("Replaced using lines logic!");
} else {
  console.log("Could not find start or end index.");
}
