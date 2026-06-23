import { FastifyRequest, FastifyReply } from 'fastify';
import { PlayersOnline } from '../models/PlayersOnline';
import { SvlistRequests } from '../models/SvlistRequests';

type TimeInterval = '30m' | '1h' | '1d' | '1w' | '1M';

interface StatsQuery {
  interval?: TimeInterval;
  from?: number; // optional lower bound (unix seconds or ms); overrides default window if more recent
  limit?: number; // max number of most-recent buckets to return
}

const INTERVAL_MS: Record<TimeInterval, number> = {
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
};

// Default lookback ≈ 500 buckets per interval (what the chart actually renders).
// Long intervals effectively cover all history.
const LOOKBACK_MS: Record<TimeInterval, number> = {
  '30m': 11 * 24 * 60 * 60 * 1000, // ~11 days
  '1h': 21 * 24 * 60 * 60 * 1000, // ~3 weeks
  '1d': 500 * 24 * 60 * 60 * 1000, // ~1.4 years
  '1w': 20 * 365 * 24 * 60 * 60 * 1000, // all
  '1M': 100 * 365 * 24 * 60 * 60 * 1000, // all
};

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;

const resolveInterval = (x?: string): TimeInterval =>
  (x && x in INTERVAL_MS ? (x as TimeInterval) : '1h');

const resolveSince = (interval: TimeInterval, from?: number): number => {
  const byInterval = Date.now() - LOOKBACK_MS[interval];
  if (from && Number.isFinite(from)) {
    const fromMs = from < 1e12 ? from * 1000 : from; // accept seconds or ms
    return Math.max(byInterval, fromMs);
  }
  return byInterval;
};

const resolveLimit = (limit?: number): number => {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT);
};

export const getPlayersOnlineStats = async (
  req: FastifyRequest<{ Querystring: StatsQuery }>,
  _reply: FastifyReply
) => {
  const interval = resolveInterval(req.query.interval);
  const intervalMs = INTERVAL_MS[interval];
  const since = resolveSince(interval, req.query.from ? Number(req.query.from) : undefined);
  const limit = resolveLimit(req.query.limit ? Number(req.query.limit) : undefined);

  const rows = await PlayersOnline.aggregate([
    { $match: { updated: { $gte: since } } },
    {
      $group: {
        _id: {
          $toDate: {
            $multiply: [{ $floor: { $divide: ['$updated', intervalMs] } }, intervalMs],
          },
        },
        // `total` is precomputed by the collector / backfill; reduce kept only as fallback for legacy docs.
        totalPlayers: {
          $avg: {
            $ifNull: [
              '$total',
              {
                $reduce: {
                  input: { $objectToArray: '$servers' },
                  initialValue: 0,
                  in: { $add: ['$$value', '$$this.v'] },
                },
              },
            ],
          },
        },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: limit },
    { $project: { _id: 0, timestamp: '$_id', totalPlayers: 1 } },
  ]);

  rows.reverse(); // ascending by time for the chart
  return rows;
};

export const getSvlistRequestsStats = async (
  req: FastifyRequest<{ Querystring: StatsQuery }>,
  _reply: FastifyReply
) => {
  const interval = resolveInterval(req.query.interval);
  const intervalMs = INTERVAL_MS[interval];
  const since = resolveSince(interval, req.query.from ? Number(req.query.from) : undefined);
  const limit = resolveLimit(req.query.limit ? Number(req.query.limit) : undefined);

  // Metric = UNIQUE IPs per bucket (intentional: spamming "get list" must not inflate it),
  // so the per-bucket dedup ($unwind -> group by ip) is preserved. The $match makes it cheap.
  const rows = await SvlistRequests.aggregate(
    [
      { $match: { updated: { $gte: since } } },
      { $unwind: '$ips' },
      {
        $group: {
          _id: {
            interval: {
              $toDate: {
                $multiply: [{ $floor: { $divide: ['$updated', intervalMs] } }, intervalMs],
              },
            },
            ip: '$ips',
          },
        },
      },
      { $group: { _id: '$_id.interval', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: limit },
      { $project: { _id: 0, t: '$_id', count: 1 } },
    ],
    { allowDiskUse: true }
  );

  rows.reverse();
  return rows;
};
