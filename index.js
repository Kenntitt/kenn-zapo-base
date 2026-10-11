import { startBot } from './main.js';

startBot().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});