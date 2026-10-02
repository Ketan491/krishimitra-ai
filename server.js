const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const FRONTEND_DIST = path.join(__dirname, 'frontend', 'dist');
if (!fs.existsSync(FRONTEND_DIST)) {
  console.log('[KrishiMitra AI] Frontend assets not found. Building frontend...');
  try {
    execSync('npm run build --workspace=frontend', { stdio: 'inherit', cwd: __dirname });
  } catch (err) {
    console.error('[KrishiMitra AI] Failed to build frontend:', err.message);
  }
}

const app = require('./backend/app');
const config = require('./backend/config');

const host = '0.0.0.0';
const port = config.port || 3000;

app.listen(port, host, () => {
  console.log(`\n  KrishiMitra AI running -> http://${host}:${port}`);
  console.log(`  API health: http://${host}:${port}/api/health\n`);
});
