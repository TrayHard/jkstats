import { FastifyRequest, FastifyReply } from 'fastify';
import { PlayersOnline } from '../models/PlayersOnline';
import { SvlistRequests } from '../models/SvlistRequests';

type TimeInterval = '30m' | '1h' | '1d' | '1w' | '1M';

const CACHE_TTL = 5 * 60; // 5 minutes in seconds

const getIntervalInMs = (interval: TimeInterval): number => {
  switch (interval) {
    case '30m': return 30 * 60 * 1000;
    case '1h': return 60 * 60 * 1000;
    case '1d': return 24 * 60 * 60 * 1000;
    case '1w': return 7 * 24 * 60 * 60 * 1000;
    case '1M': return 30 * 24 * 60 * 60 * 1000;
  }
};

export const getPlayersOnlineStats = async (req: FastifyRequest<{ Querystring: { interval?: TimeInterval } }>, reply: FastifyReply) => {
  const { interval = '1h' } = req.query;
  const intervalMs = getIntervalInMs(interval);

  const stats = await PlayersOnline.aggregate([
    {
      $group: {
        _id: {
          $toDate: {
            $multiply: [
              { $floor: { $divide: ['$updated', intervalMs] } },
              intervalMs
            ]
          }
        },
        totalPlayers: {
          $avg: {
            $reduce: {
              input: { $objectToArray: '$servers' },
              initialValue: 0,
              in: { $add: ['$$value', '$$this.v'] }
            }
          }
        }
      }
    },
    {
      $sort: { _id: 1 }
    },
    {
      $project: {
        _id: 0,
        timestamp: '$_id',
        totalPlayers: 1
      }
    }
  ]);

  return stats;
};

export const getSvlistRequestsStats = async (req: FastifyRequest<{ Querystring: { interval?: TimeInterval } }>, reply: FastifyReply) => {
  const { interval = '1h' } = req.query;
  const intervalMs = getIntervalInMs(interval);

  const stats = await SvlistRequests.aggregate([
    { $unwind: '$ips' },
    {
      $group: {
        _id: {
          interval: {
            $toDate: {
              $multiply: [
                { $floor: { $divide: ['$updated', intervalMs] } },
                intervalMs
              ]
            }
          },
          ip: '$ips'
        }
      }
    },
    {
      $group: {
        _id: '$_id.interval',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        t: '$_id',
        count: 1
      }
    },
    { $sort: { t: 1 } }
  ]);

  return stats;
};