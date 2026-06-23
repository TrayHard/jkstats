import { FastifyInstance } from 'fastify';
import NodeCache from 'node-cache';

// Simple per-URL response cache for GET endpoints.
async function cache(fastify: FastifyInstance, options: { ttl: number }) {
  const store = new NodeCache({ stdTTL: options.ttl });

  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET' || request.url === '/health') return;
    const cached = store.get<string>(request.url);
    if (cached !== undefined) {
      // Serve cached JSON with the correct content-type and stop the lifecycle here.
      reply.header('X-Cache', 'HIT').type('application/json').send(cached);
      return reply;
    }
  });

  fastify.addHook('onSend', async (request, reply, payload) => {
    if (request.method !== 'GET' || request.url === '/health') return payload;
    if (reply.statusCode >= 400) return payload;
    if (store.get(request.url) === undefined && typeof payload === 'string') {
      store.set(request.url, payload);
    }
    return payload;
  });
}

export default cache;
