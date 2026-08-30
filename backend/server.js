const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`\n  KrishiMitra AI backend running -> http://localhost:${config.port}`);
  console.log(`  API health:  http://localhost:${config.port}/api/health`);
  console.log(`  Built frontend (if present) is served from the same port.\n`);
});
