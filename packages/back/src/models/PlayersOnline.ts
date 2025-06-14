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
  }
}, { 
  timestamps: true,
  collection: 'players_online'
});

export const PlayersOnline = mongoose.model('players_online', playersOnlineSchema);
