/**
 * @future-wallet/api — Server entrypoint
 *
 * Starts the Fastify server using the app factory from `./app.ts`.
 * This file handles only server lifecycle; all routes and config
 * live in buildApp() for testability.
 */
import { buildApp } from './app.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

try {
  const app = await buildApp({ logger: true });
  await app.listen({ port: PORT, host: HOST });
  console.log(`Future Wallet API running on http://${HOST}:${PORT}`);
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}
