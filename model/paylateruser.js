const mongoose = require('mongoose');

const { Schema } = mongoose;

const PayLaterUserSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', // Link to the User model
    required: true
  },
  isAgreed: {
    type: Boolean,
    required: true,
    default: false, // User has agreed to terms
  },
  isApproved: {
    type: Boolean,
    required: true,
    default: false, // Approval status by Guriraline
  },
  occupation: {
    type: String,
    required: true,
  },
  income: {
    type: Number,
    required: true,
  },
  IpAddress: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  updatedAt: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model('PayLaterUser', PayLaterUserSchema);
