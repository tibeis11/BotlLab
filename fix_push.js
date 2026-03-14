import { execSync } from 'child_process';
try {
  const out = execSync('npx supabase db push', { stdio: 'pipe' });
  console.log(out.toString());
} catch(e) {
  console.log(e.stderr.toString());
  console.log(e.stdout.toString());
}
