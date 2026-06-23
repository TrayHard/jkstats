import mongoose from 'mongoose';

const playersOnlineSchema = new mongoose.Schema({
  servers: {
    type: Map,
    of: Number,
    required: true
  },
  updated: {
    type: Number,
    required: true
  },
  // precomputed sum of all servers' players (written by the collector / backfill)
  total: {
    type: Number
  }
}, {
  timestamps: true,
  collection: 'players_online'
});

playersOnlineSchema.index({ updated: 1 });

export const PlayersOnline = mongoose.model('players_online', playersOnlineSchema);
