import { createApp } from './app.js';
import { loadEnv } from './config/env.js';

const env = loadEnv();
const { app, ctx } = createApp({ env });

const server = app.listen(env.PORT, () => {
  ctx.logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Eden Falls API listening');
});

function shutdown(signal: string) {
  ctx.logger.info({ signal }, 'Shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
