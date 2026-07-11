const mongoose = require("mongoose");

const flashSaleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter the flash sale product name!"],
  },
  description: {
    type: String,
    required: [true, "Please enter the flash sale product description!"],
  },
  category: {
    type: String,
    required: [true, "Please enter the flash sale product category!"],
  },
  tags: {
    type: String,
  },
  originalPrice: {
    type: Number,
    required: true, // Original price of the product before the discount
  },
  flashSalePrice: {
    type: Number,
    required: [true, "Please enter the flash sale product price!"],
  },
  startTime: {
    type: Date,
    required: true, // Flash sale start time
    default: Date.now(),
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  ],
  endTime: {
    type: Date,
    required: true, // Flash sale end time (24 hours after start)
    default: function () {
      return new Date(this.startTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours after start
    },
  },
  isActive: {
    type: Boolean,
    default: true, // Indicates whether the flash sale is active
  },
  stockAvailable: {
    type: Number,
    required: [true, "Please enter the flash sale product stock!"],
  },
  soldOut: {
    type: Number,
    default: 0, // Count of products sold in the flash sale
  },
  images: [
    {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
  ],
  discountPercentage: {
    type: Number,
    required: true, // Discount percentage applied to the product
  },
  shopId: {
    type: String,
    required: true, // ID of the shop hosting the flash sale
  },
  shop: {
    type: Object,
    required: true, // Shop details for the flash sale
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("FlashSale", flashSaleSchema);
