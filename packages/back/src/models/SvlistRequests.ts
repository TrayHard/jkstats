import mongoose from 'mongoose';

const svlistRequestsSchema = new mongoose.Schema({
  ips: [{
    type: Number,
    required: true
  }],
  updated: {
    type: Number,
    required: true
  }
}, { timestamps: true });

export const SvlistRequests = mongoose.model('svlist_requests', svlistRequestsSchema);
