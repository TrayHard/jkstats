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

svlistRequestsSchema.index({ updated: 1 });

export const SvlistRequests = mongoose.model('svlist_requests', svlistRequestsSchema);
