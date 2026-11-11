// Run with: npm run server
import { startServer, DEFAULTS } from './app.js';

const srv = await startServer();
console.log(`BEFORE US save server on ${srv.url}`);
console.log(`MongoDB ${DEFAULTS.mongoUrl} / ${DEFAULTS.dbName}: ${(await srv.dbOk()) ? 'connected' : 'NOT reachable (start it with: npm run mongo:up)'}`);
const stop = () => srv.close().finally(() => process.exit(0));
process.on('SIGINT', stop); process.on('SIGTERM', stop);
