import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import NodeCache from 'node-cache';

async function cache(fastify: FastifyInstance, options: { ttl: number }) {
  const cache = new NodeCache({ stdTTL: options.ttl });

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.method === 'GET') {
      const cachedData = cache.get(request.url);
      if (cachedData) {
        reply.send(cachedData);
      }
    }
  });

  fastify.addHook('onSend', async (request, reply, payload) => {
    if (request.method !== 'GET') {
      return;
    }

    const cachedData = cache.get(request.url);
    if (!cachedData) {
      cache.set(request.url, payload);
    }
  });
}

export default cache;