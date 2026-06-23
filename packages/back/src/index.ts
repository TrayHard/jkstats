import 'dotenv/config';
import Fastify from 'fastify';
import mongoose from 'mongoose';
import cors from '@fastify/cors';
import { statsRoutes } from './routes/stats.routes';
import cache from './cache';

const fastify = Fastify({ logger: true });

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/jkstats';

fastify.register(cors, {
  origin: ['https://stats.rujka.ru', 'http://localhost:5173', 'https://stats.jkhub.org'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
});

// Let Cloudflare/browser cache GET responses (data changes every 3-5 min). NOT for future authed routes.
fastify.addHook('onSend', async (request, reply, payload) => {
  if (request.method === 'GET' && request.url !== '/health' && reply.statusCode < 400) {
    reply.header(
      'Cache-Control',
      'public, max-age=30, s-maxage=300, stale-while-revalidate=600, stale-if-error=86400'
    );
  }
  return payload;
});

fastify.get('/health', async () => {
  return { status: 'ok' };
});

cache(fastify, { ttl: 5 * 60 });
fastify.register(statsRoutes);

const start = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`Server listening on port ${PORT}!`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
