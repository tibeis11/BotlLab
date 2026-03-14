
const { spawnSync } = require('child_process');
const result = spawnSync('psql', ['-h', 'localhost', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-c', 'SELECT COUNT(*) FROM recipe_ingredients;'], { env: { ...process.env, PGPASSWORD: 'postgres' } });
console.log(result.stdout.toString());
