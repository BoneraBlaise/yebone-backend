const express = require("express");
const { isAuthenticated, isSeller } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const Bid = require("../model/bid");
const Shop = require("../model/shop");
const router = express.Router();
const mongoose = require("mongoose");


// Create a new auction (Bid) - Only sellers allowed
router.post(
  "/create-bid",
  isAuthenticated,
  isSeller,  // Ensure the user is a seller before creating a bid
  catchAsyncErrors(async (req, res, next) => {
    console.log("Creating a new bid");

    const { name, description, category, originalPrice, auctionStartTime, auctionEndTime, images, shopId } = req.body;

    // Validate the input fields
    if (!name || !description || !category || !originalPrice || !auctionEndTime || !images || !shopId) {
      console.error("Validation failed: Missing required fields");
      return next(new ErrorHandler("All fields are required.", 400));
    }

    // Handle image uploads if they are passed as URLs
    let imageLinks = [];
    if (typeof images === "string") {
      images = [images];  // In case a single image is passed as a string
    }

    for (let i = 0; i < images.length; i++) {
      imageLinks.push({
        public_id: images[i],  // Assuming images are URLs or public_id strings from cloudinary
        url: images[i],
      });
    }

    // Find the shop by ID to ensure it's a valid shop
    const shop = await Shop.findById(shopId);
    if (!shop) {
      console.error("Shop not found:", shopId);
      return next(new ErrorHandler("Invalid shop ID", 400));
    }

    // Create the bid (auction)
    const auctionBid = await Bid.create({
      auctionProduct: {
        name,
        description,
        category,
        originalPrice,
        images: imageLinks,
      },
      auctionStartTime: new Date(),
      auctionEndTime: new Date(auctionEndTime),
      highestBid: 1,
      highestBidder: null,
      isAuctionClosed: false,
      shop: shopId,  // Associate the shop with the bid
    });

    console.log("Bid created successfully:", auctionBid);

    res.status(201).json({
      success: true,
      message: "Auction (Bid) created successfully!",
      auctionBid,
    });
  })
);

// Place a bid on an auction - Only authenticated users can place bids
router.post(
  "/place-bid/:bidId",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const { bidId } = req.params;
    const { bidAmount } = req.body;

    console.log(`Placing bid on auction with ID: ${bidId}`);

    if (!bidAmount || bidAmount <= 0) {
      console.error("Invalid bid amount:", bidAmount);
      return next(new ErrorHandler("Please provide a valid bid amount", 400));
    }

    // Find the bid (auction) and populate shop information
    const auctionBid = await Bid.findById(bidId).populate("shop");

    if (!auctionBid) {
      console.error("Auction not found:", bidId);
      return next(new ErrorHandler("Auction not found!", 404));
    }

    // Check if the auction is closed or if the auction end time has passed
    if (auctionBid.isAuctionClosed || auctionBid.auctionEndTime <= Date.now()) {
      console.error("Auction has already ended or is closed");
      return next(new ErrorHandler("Auction has already ended", 400));
    }

    // Ensure the bid is higher than the current highest bid
    if (bidAmount <= auctionBid.highestBid) {
      console.error(`Bid amount is not higher than the current highest bid. Bid: ${bidAmount}, Highest Bid: ${auctionBid.highestBid}`);
      return next(new ErrorHandler("Bid amount must be higher than the current highest bid", 400));
    }

    const bidIncrement = 5;  // Minimum bid increment
    if (bidAmount - auctionBid.highestBid < bidIncrement) {
      console.error(`Bid increment too low. Bid: ${bidAmount}, Minimum Increment: ${bidIncrement}`);
      return next(new ErrorHandler(`Bid must be at least $${bidIncrement} above the current highest bid`, 400));
    }

    try {
      await auctionBid.placeBid(req.user._id, bidAmount);

      console.log(`Bid placed successfully by user: ${req.user._id}, New highest bid: ${bidAmount}`);

      res.status(200).json({
        success: true,
        message: "Your bid has been placed successfully!",
        auctionBid: {
          highestBid: auctionBid.highestBid,
          highestBidder: auctionBid.highestBidder,
          bids: auctionBid.bids,
        },
      });
    } catch (error) {
      console.error("Error placing bid:", error);
      return next(new ErrorHandler(error.message, 400));
    }
  })
);
// like/unlike a bid
router.put(
  "/like-bid",
  isAuthenticated,  // Ensure the user is authenticated
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { bidId } = req.body;
      const userId = req.user._id; // Get the authenticated user's ID

      console.log(`[${new Date().toISOString()}] User ${userId} attempting to like/unlike bid ${bidId}`);

      // Find the bid
      const bid = await Bid.findById(bidId);

      if (!bid) {
        console.log(`[${new Date().toISOString()}] Bid with ID ${bidId} not found`);
        return next(new ErrorHandler("Bid not found!", 404));
      }

      // Check if the bid is already liked by the user
      const isLiked = bid.likes.includes(userId);
      console.log(`[${new Date().toISOString()}] Bid ${bidId} liked by user: ${isLiked}`);

      if (isLiked) {
        // If already liked, remove the user from the likes array
        bid.likes = bid.likes.filter((user) => user.toString() !== userId);
        await bid.save();
        console.log(`[${new Date().toISOString()}] User ${userId} removed from bid ${bidId} likes`);
        return res.status(200).json({
          success: true,
          message: "Removed from wishlist",
        });
      } else {
        // If not liked, add the user to the likes array
        bid.likes.push(userId);
        await bid.save();
        console.log(`[${new Date().toISOString()}] User ${userId} added to bid ${bidId} likes`);
        return res.status(200).json({
          success: true,
          message: "Added to wishlist",
        });
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error occurred: ${error.message}`);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get all active bids (auctions)
router.get(
  "/active-bids",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const activeBids = await Bid.getActiveAuctions();
      console.log("Fetched active bids:", activeBids);

      res.status(200).json({
        success: true,
        activeBids,
      });
    } catch (error) {
      console.error("Error fetching active bids:", error);
      return next(new ErrorHandler(error.message || "Error fetching active bids", 500));
    }
  })
);

// Get all completed bids (auctions)
router.get(
  "/completed-bids",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const completedBids = await Bid.getCompletedAuctions();
      console.log("Fetched completed bids:", completedBids);

      res.status(200).json({
        success: true,
        completedBids,
      });
    } catch (error) {
      console.error("Error fetching completed bids:", error);
      return next(new ErrorHandler(error.message || "Error fetching completed bids", 500));
    }
  })
);

// Get a specific bid's details (using bidId)
router.get(
  "/bid-details/:bidId",
  catchAsyncErrors(async (req, res, next) => {
    const { bidId } = req.params;

    console.log(`Fetching details for bid with ID: ${bidId}`);

    // Find the bid by ID
    const auctionBid = await Bid.findById(bidId);

    if (!auctionBid) {
      console.error("Auction not found:", bidId);
      return next(new ErrorHandler("Auction not found!", 404));
    }

    res.status(200).json({
      success: true,
      auctionBid,
    });
  })
);

// Get all bids (both active and completed)
router.get(
  "/all-bids",
  catchAsyncErrors(async (req, res, next) => {
    try {
      // Fetch all bids regardless of their status (active or completed)
      const allBids = await Bid.find();
      res.status(200).json({
        success: true,
        allBids,
      });
    } catch (error) {
      console.error("Error fetching all bids:", error);
      return next(new ErrorHandler(error.message || "Error fetching all bids", 500));
    }
  })
);

router.get(
  "/all-bids/:sellerId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { sellerId } = req.params;
      console.log("Received sellerId:", sellerId);  

      // Ensure sellerId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(sellerId)) {
        console.error(`Invalid sellerId received: ${sellerId}`); 
        return next(new ErrorHandler("Invalid seller ID", 400));
      }

      console.log("Fetching bids for seller with ID:", sellerId);  

      const allBids = await Bid.find({ shop: sellerId })
        .populate("shop")
        .populate("highestBidder")
        .sort({ auctionEndTime: -1 });

      console.log("Fetched bids from the database:", allBids.length, "bids found");  

      if (!allBids || allBids.length === 0) {
        console.warn("No bids found for seller:", sellerId);  
        return res.status(404).json({
          success: false,
          message: "No bids found for this seller.",
        });
      }

      res.status(200).json({
        success: true,
        allBids,
      });
      console.log("Response sent for sellerId:", sellerId);  
    } catch (error) {
      console.error("Error fetching bids for seller:", error);  
      return next(new ErrorHandler(error.message || "Error fetching bids", 500));
    }
  })
);

// Get all bids where the logged-in user is the highest bidder
router.get(
  "/my-winning-bids",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user._id;
      console.log(`Fetching winning bids for user: ${userId}`);

      // Find all bids where the current user is the highest bidder
      const winningBids = await Bid.find({ 
        highestBidder: userId,
        $or: [
          { isAuctionClosed: true },
          { auctionEndTime: { $lte: new Date() } }
        ]
      })
      .populate("shop", "name email role")
      .populate("highestBidder", "name email")
      .select("auctionProduct highestBid auctionEndTime isAuctionClosed bids")
      .sort({ auctionEndTime: -1 });

      // Debug logs
      console.log('Query conditions:', {
        highestBidder: userId,
        $or: [
          { isAuctionClosed: true },
          { auctionEndTime: { $lte: new Date() } }
        ]
      });
      console.log('Found bids:', winningBids.map(bid => ({
        id: bid._id,
        isAuctionClosed: bid.isAuctionClosed,
        auctionEndTime: bid.auctionEndTime,
        highestBidder: bid.highestBidder
      })));

      res.status(200).json({
        success: true,
        winningBids,
      });
    } catch (error) {
      console.error("Error fetching winning bids:", error);
      return next(new ErrorHandler(error.message || "Error fetching winning bids", 500));
    }
  })
);

// Close an auction bid (only sellers can close the auction)
router.post(
  "/close-bid/:bidId",
  isAuthenticated,
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    const { bidId } = req.params;

    console.log(`Closing auction with ID: ${bidId}`);

    const auctionBid = await Bid.findById(bidId);

    if (!auctionBid) {
      console.error("Auction not found:", bidId);
      return next(new ErrorHandler("Auction not found!", 404));
    }

    if (auctionBid.isAuctionClosed) {
      console.error("Auction is already closed:", bidId);
      return next(new ErrorHandler("Auction has already been closed", 400));
    }

    auctionBid.isAuctionClosed = true;
    await auctionBid.save();

    console.log(`Auction closed successfully with ID: ${bidId}`);

    res.status(200).json({
      success: true,
      message: "Auction closed successfully!",
    });
  })
);

// Delete a bid (auction)
router.delete(
  "/delete-bid/:bidId",
  isAuthenticated,
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    const { bidId } = req.params;

    console.log(`Deleting auction with ID: ${bidId}`);

    const auctionBid = await Bid.findById(bidId);

    if (!auctionBid) {
      console.error("Auction not found:", bidId);
      return next(new ErrorHandler("Auction not found!", 404));
    }

    await auctionBid.remove();
    console.log(`Auction deleted successfully with ID: ${bidId}`);

    res.status(200).json({
      success: true,
      message: "Auction deleted successfully!",
    });
  })
);

module.exports = router;
