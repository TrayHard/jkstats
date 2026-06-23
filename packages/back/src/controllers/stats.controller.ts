import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { PlayersOnline } from '../models/PlayersOnline';
import { SvlistRequests } from '../models/SvlistRequests';

type TimeInterval = '30m' | '1h' | '1d' | '1w' | '1M';

interface StatsQuery {
  interval?: TimeInterval;
  from?: number; // optional lower bound (unix seconds or ms). When set, returns data from this time.
  limit?: number; // max number of most-recent buckets to return
}

const INTERVAL_MS: Record<TimeInterval, number> = {
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
};

// Long ranges are served from the pre-aggregated `players_online_hourly` rollup (kept fresh by cron).
const ROLLUP_INTERVALS = new Set<TimeInterval>(['1d', '1w', '1M']);

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;
const MAX_SCAN_DOCS = 60000;

const resolveInterval = (x?: string): TimeInterval =>
  (x && x in INTERVAL_MS ? (x as TimeInterval) : '1h');

const resolveLimit = (limit?: number): number => {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT);
};

const resolveFromMs = (from?: number): number | undefined => {
  if (!from || !Number.isFinite(from)) return undefined;
  return from < 1e12 ? from * 1000 : from; // accept seconds or ms
};

// How many recent raw docs to scan to safely cover `limit` buckets of this interval.
// Overshoots (assumes up to ~1 sample/min) so the returned buckets are fully covered even across data gaps.
const scanDocsFor = (intervalMs: number, limit: number): number =>
  Math.min(limit * Math.ceil(intervalMs / 60000), MAX_SCAN_DOCS);

const totalExpr = {
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
};

export const getPlayersOnlineStats = async (
  req: FastifyRequest<{ Querystring: StatsQuery }>,
  _reply: FastifyReply
) => {
  const interval = resolveInterval(req.query.interval);
  const intervalMs = INTERVAL_MS[interval];
  const limit = resolveLimit(req.query.limit ? Number(req.query.limit) : undefined);
  const fromMs = resolveFromMs(req.query.from ? Number(req.query.from) : undefined);

  // Long ranges -> hourly rollup, re-bucketed. Return the most-recent `limit` buckets (gap-proof).
  if (ROLLUP_INTERVALS.has(interval)) {
    const rollup = (mongoose.connection.db as any).collection('players_online_hourly');
    const pipeline: any[] = [];
    if (fromMs) pipeline.push({ $match: { _id: { $gte: fromMs } } });
    pipeline.push(
      {
        $group: {
          _id: { $multiply: [{ $floor: { $divide: ['$_id', intervalMs] } }, intervalMs] },
          sum: { $sum: '$sum' },
          samples: { $sum: '$samples' },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          timestamp: { $toDate: '$_id' },
          totalPlayers: { $cond: [{ $gt: ['$samples', 0] }, { $divide: ['$sum', '$samples'] }, 0] },
        },
      }
    );
    const rolled = await rollup.aggregate(pipeline, { allowDiskUse: true }).toArray();
    rolled.reverse();
    return rolled;
  }

  // Short ranges (30m, 1h) -> raw. Take the most-recent populated buckets via the {updated:1} index,
  // NOT a now-relative window (the data has gaps, so "last N days from now" can be empty).
  const pipeline: any[] = [];
  if (fromMs) {
    pipeline.push({ $match: { updated: { $gte: fromMs } } }, { $sort: { updated: -1 } });
  } else {
    pipeline.push({ $sort: { updated: -1 } }, { $limit: scanDocsFor(intervalMs, limit) });
  }
  pipeline.push(
    {
      $group: {
        _id: { $multiply: [{ $floor: { $divide: ['$updated', intervalMs] } }, intervalMs] },
        totalPlayers: { $avg: totalExpr },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: limit },
    { $project: { _id: 0, timestamp: { $toDate: '$_id' }, totalPlayers: 1 } }
  );

  const rows = await PlayersOnline.aggregate(pipeline, { allowDiskUse: true });
  rows.reverse();
  return rows;
};

export const getSvlistRequestsStats = async (
  req: FastifyRequest<{ Querystring: StatsQuery }>,
  _reply: FastifyReply
) => {
  const interval = resolveInterval(req.query.interval);
  const intervalMs = INTERVAL_MS[interval];
  const limit = resolveLimit(req.query.limit ? Number(req.query.limit) : undefined);
  const fromMs = resolveFromMs(req.query.from ? Number(req.query.from) : undefined);

  // Metric = UNIQUE IPs per bucket (intentional). Per-bucket dedup ($unwind -> group by ip) preserved.
  // Take most-recent raw docs (gap-proof) before unwinding; overshoot keeps returned buckets fully covered.
  const pipeline: any[] = [];
  if (fromMs) {
    pipeline.push({ $match: { updated: { $gte: fromMs } } }, { $sort: { updated: -1 } });
  } else {
    pipeline.push({ $sort: { updated: -1 } }, { $limit: scanDocsFor(intervalMs, limit) });
  }
  pipeline.push(
    { $unwind: '$ips' },
    {
      $group: {
        _id: {
          interval: { $multiply: [{ $floor: { $divide: ['$updated', intervalMs] } }, intervalMs] },
          ip: '$ips',
        },
      },
    },
    { $group: { _id: '$_id.interval', count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
    { $limit: limit },
    { $project: { _id: 0, t: { $toDate: '$_id' }, count: 1 } }
  );

  const rows = await SvlistRequests.aggregate(pipeline, { allowDiskUse: true });
  rows.reverse();
  return rows;
};
