import { FastifyInstance } from 'fastify';
import { getPlayersOnlineStats, getSvlistRequestsStats } from '../controllers/stats.controller';

const querystring = {
  type: 'object',
  properties: {
    interval: { type: 'string', enum: ['30m', '1h', '1d', '1w', '1M'] },
    from: { type: 'number' }, // optional lower time bound (unix seconds or ms)
    limit: { type: 'number' }, // max most-recent buckets to return
  },
} as const;

export const statsRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/online', { schema: { querystring } }, getPlayersOnlineStats);
  fastify.get('/svlist', { schema: { querystring } }, getSvlistRequestsStats);
};
