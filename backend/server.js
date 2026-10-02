const app = require('./app');
const config = require('./config');

app.listen(config.port, '0.0.0.0', () => {
  console.log(`\n  KrishiMitra AI backend running -> http://0.0.0.0:${config.port}`);
  console.log(`  API health:  http://localhost:${config.port}/api/health`);
  console.log(`  Built frontend (if present) is served from the same port.\n`);
});
