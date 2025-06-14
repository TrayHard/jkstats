import { FastifyInstance } from 'fastify';
import { getPlayersOnlineStats, getSvlistRequestsStats } from '../controllers/stats.controller';

export const statsRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/online', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          interval: {
            type: 'string',
            enum: ['30m', '1h', '1d', '1w', '1M']
          }
        }
      }
    },
  }, getPlayersOnlineStats);

  fastify.get('/svlist', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          interval: {
            type: 'string',
            enum: ['30m', '1h', '1d', '1w', '1M']
          }
        }
      }
    },
  }, getSvlistRequestsStats);
};
