/**
 * @future-wallet/api
 *
 * Fastify REST API for the simulation engine.
 * Endpoints:
 *   POST /simulate        — run a full simulation
 *   POST /simulate/branch — run a what-if branching simulation
 *   GET  /health          — health check
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { SimulationInputSchema, BranchRequestSchema } from '@future-wallet/shared-types';
import { simulate, simulateBranch } from '@future-wallet/simulation-engine';

const app = Fastify({
  logger: true,
});

// CORS for dashboard
await app.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:3000'],
});

// ─── Health Check ───────────────────────────────────────────────────────────────

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// ─── POST /simulate ─────────────────────────────────────────────────────────────

app.post('/simulate', async (request, reply) => {
  const parsed = SimulationInputSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: 'Invalid simulation input',
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = simulate(parsed.data);
    return reply.status(200).send(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown engine error';
    return reply.status(500).send({ error: message });
  }
});

// ─── POST /simulate/branch ──────────────────────────────────────────────────────

app.post('/simulate/branch', async (request, reply) => {
  const parsed = BranchRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: 'Invalid branch request',
      details: parsed.error.flatten(),
    });
  }

  try {
    const { baseInput, branchAtDay, modifiedInput } = parsed.data;
    const result = simulateBranch(baseInput, branchAtDay, modifiedInput);
    return reply.status(200).send({
      ...result,
      branchAtDay,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown engine error';
    return reply.status(500).send({ error: message });
  }
});

// ─── Start Server ───────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`🚀 Future Wallet API running on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
