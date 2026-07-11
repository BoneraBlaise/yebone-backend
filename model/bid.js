const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema(
  {
    auctionProduct: {
      name: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      category: {
        type: String,
        required: true,
      },
      originalPrice: {
        type: Number,
        required: true,
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
    },
    auctionStartTime: {
      type: Date,
      default: Date.now(),
    },
    auctionEndTime: {
      type: Date,
      required: true,
    },
    highestBid: {
      type: Number,
      default: 1,
    },
    highestBidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
    bids: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        bidAmount: {
          type: Number,
          required: true,
        },
        bidTime: {
          type: Date,
          default: Date.now(),
        },
      },
    ],
    isAuctionClosed: {
      type: Boolean,
      default: false,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
  },
  { timestamps: true }
);

// Method to place a bid
bidSchema.methods.placeBid = async function (userId, bidAmount) {
  // Check if the auction is closed
  if (this.isAuctionClosed) {
    throw new Error("Auction has already ended");
  }

  // Ensure the bid is higher than the current highest bid
  if (bidAmount <= this.highestBid) {
    throw new Error("Bid amount must be higher than the current highest bid");
  }

  // Optional: Check for bid increment
  const bidIncrement = 500;
  if (bidAmount - this.highestBid < bidIncrement) {
    throw new Error(`Bid must be at least ${bidIncrement} RWF higher than the current highest bid`);
  }

  // Update the highest bid and the highest bidder
  this.highestBid = bidAmount;
  this.highestBidder = userId;

  // Add the new bid to the bids array
  this.bids.push({ user: userId, bidAmount });

  await this.save();
};

// Method to close the auction and finalize the highest bidder
bidSchema.methods.closeAuction = async function () {
  this.isAuctionClosed = true;
  await this.save();
};

// Static method to get the active auctions
bidSchema.statics.getActiveAuctions = function () {
  return this.find({ isAuctionClosed: false, auctionEndTime: { $gt: Date.now() } });
};

// Static method to get the completed auctions
bidSchema.statics.getCompletedAuctions = function () {
  return this.find({ isAuctionClosed: true });
};

module.exports = mongoose.model("Bid", bidSchema);
