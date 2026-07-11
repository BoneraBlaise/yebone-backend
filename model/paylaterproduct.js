import mongoose from 'mongoose';
import Product from './product.js';
const { Schema } = mongoose;

const PayLaterProductSchema = new Schema({
  productId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Product', // Assuming a Product model exists
    required: true
  },
  price: {
    type: Number,
    required: true,
  },
  firstPaymentPercentage: {
    type: Number,
    required: true, // Percentage of the price that is paid upfront
  },
  installmentPeriod: {
    type: Number,
    required: true, // Number of months for installment payments
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

module.exports = mongoose.model('PayLaterProduct', PayLaterProductSchema);
