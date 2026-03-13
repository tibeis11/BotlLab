const fs = require('fs');

const migrationsPath = 'supabase/migrations/';
const files = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'));

files.forEach(file => {
   const content = fs.readFileSync(migrationsPath + file, 'utf8');
   if(content.includes('avg') || content.includes('AVG')) {
       if(!content.includes('AVG(r.rating)')) {
          console.log("Other AVG in: ", file);
       }
   }
});
