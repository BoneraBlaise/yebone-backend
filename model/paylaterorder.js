import mongoose from 'mongoose';
import { Schema } from 'mongoose';
import PayLaterUser from './paylateruser';
const PayLaterOrderSchema = new Schema({
  payLaterUserId: { 
    type: Schema.Types.ObjectId, 
    ref: 'PayLaterUser', // Link to PayLaterUser model
    required: true,
  },
  payLaterProductId: { 
    type: Schema.Types.ObjectId, 
    ref: 'PayLaterProduct', // Link to PayLaterProduct model
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  firstPayment: {
    type: Number,
    required: true, // Amount paid initially
  },
  remainingAmount: {
    type: Number,
    required: true,
  },
  installmentPlan: [{
    installmentNumber: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    amountDue: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Paid'],
      default: 'Pending',
    },
  }],
  payments: [{
    paymentDate: {
      type: Date,
      default: Date.now(),
    },
    paymentAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Success', 'Failed', 'Pending'],
      default: 'Pending',
    },
  }],
  orderStatus: {
    type: String,
    enum: ['Pending', 'Active', 'Completed', 'Defaulted'],
    default: 'Pending', // Tracks the status of the Pay Later order
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

module.exports = mongoose.model('PayLaterOrder', PayLaterOrderSchema);
