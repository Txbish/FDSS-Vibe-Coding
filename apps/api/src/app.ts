/**
 * @future-wallet/api — Application factory
 *
 * Exports a `buildApp()` function that creates and configures the Fastify
 * instance with all routes, validation, error handling, and plugins.
 * Separated from server startup to enable testing via `app.inject()`.
 */
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import {
  SimulationInputSchema,
  BranchRequestSchema,
  type ApiError,
  type ApiErrorCode,
} from '@future-wallet/shared-types';
import { simulate, simulateBranch, compareBranches } from '@future-wallet/simulation-engine';

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Build a structured ApiError response body.
 */
function apiError(code: ApiErrorCode, error: string, details?: unknown): ApiError {
  const body: ApiError = { code, error };
  if (details !== undefined) {
    body.details = details;
  }
  return body;
}

// ─── App Factory ────────────────────────────────────────────────────────────────

export interface BuildAppOptions {
  /** Enable Fastify logger (default: false for tests, true for production) */
  logger?: boolean;
}

export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? false,
    bodyLimit: 1_048_576, // 1 MB payload limit
  });

  // ── CORS ────────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
  });

  // ── Global error handler ────────────────────────────────────────────────────
  app.setErrorHandler(
    (
      error: Error & { statusCode?: number; code?: string; validation?: unknown },
      _request,
      reply,
    ) => {
      // Fastify body limit exceeded
      if (error.statusCode === 413) {
        return reply
          .status(413)
          .send(apiError('PAYLOAD_TOO_LARGE', 'Request payload exceeds maximum size of 1 MB'));
      }

      // Fastify JSON parse errors or validation errors
      if (error.statusCode === 400) {
        return reply.status(400).send(apiError('VALIDATION_ERROR', error.message));
      }

      // Unexpected errors
      app.log.error(error);
      return reply.status(500).send(apiError('INTERNAL_ERROR', 'An unexpected error occurred'));
    },
  );

  // ── GET /health ─────────────────────────────────────────────────────────────
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // ── POST /simulate ──────────────────────────────────────────────────────────
  app.post('/simulate', async (request, reply) => {
    const parsed = SimulationInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(apiError('VALIDATION_ERROR', 'Invalid simulation input', parsed.error.flatten()));
    }

    try {
      const result = simulate(parsed.data);
      return reply.status(200).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown engine error';
      return reply.status(500).send(apiError('ENGINE_ERROR', message));
    }
  });

  // ── POST /simulate/branch ───────────────────────────────────────────────────
  app.post('/simulate/branch', async (request, reply) => {
    const parsed = BranchRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(apiError('VALIDATION_ERROR', 'Invalid branch request', parsed.error.flatten()));
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
      return reply.status(500).send(apiError('ENGINE_ERROR', message));
    }
  });

  // ── POST /simulate/compare ──────────────────────────────────────────────────
  app.post('/simulate/compare', async (request, reply) => {
    const parsed = BranchRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(apiError('VALIDATION_ERROR', 'Invalid comparison request', parsed.error.flatten()));
    }

    try {
      const { baseInput, branchAtDay, modifiedInput } = parsed.data;
      const { baseline, branch } = simulateBranch(baseInput, branchAtDay, modifiedInput);
      const comparison = compareBranches(baseline, branch, branchAtDay);
      return reply.status(200).send(comparison);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown engine error';
      return reply.status(500).send(apiError('ENGINE_ERROR', message));
    }
  });

  return app;
}
