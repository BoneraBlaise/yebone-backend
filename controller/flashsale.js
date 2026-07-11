const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const FlashSale = require('../model/flashsale');
const Shop = require("../model/shop");
const cloudinary = require("cloudinary");
const ErrorHandler = require("../utils/ErrorHandler");
const mongoose = require("mongoose");

// Create a Flash Sale Product
router.post(
    "/create-flashsale",
    catchAsyncErrors(async (req, res, next) => {
        try {
            const { shopId, name, description, category, tags, flashSalePrice, stockAvailable, images, originalPrice, discountPercentage } = req.body;

            console.log('Request received to create flash sale product.');
            console.log('Shop ID:', shopId);
            console.log('Flash Sale Price:', flashSalePrice);
            console.log('Stock Available:', stockAvailable);

            // Validate Shop ID
            const shop = await Shop.findById(shopId);
            if (!shop) {
                console.error("Invalid Shop ID:", shopId);
                return next(new ErrorHandler("Shop Id is invalid!", 400));
            }
            console.log('Shop found:', shop.name);

            // Handle image uploads
            let imageLinks = [];
            if (typeof images === "string") {
                images = [images]; // In case a single image is passed as string
            }

            for (let i = 0; i < images.length; i++) {
                const result = await cloudinary.v2.uploader.upload(images[i], {
                    folder: "flashSaleProducts",
                });
                imageLinks.push({
                    public_id: result.public_id,
                    url: result.secure_url,
                });
                console.log(`Uploaded image ${i + 1}:`, result.secure_url);
            }

            // Calculate endTime for the flash sale (24 hours from now)
            const startTime = new Date();
            const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours

            const flashSaleData = {
                shopId,
                name,
                description,
                category,
                tags,
                flashSalePrice,
                stockAvailable,
                images: imageLinks,
                originalPrice,
                discountPercentage,
                startTime,
                endTime,
                isActive: true, // Mark the flash sale as active
                shop,
            };

            const flashSaleProduct = await FlashSale.create(flashSaleData);

            console.log("Flash Sale product created:", flashSaleProduct._id);

            res.status(201).json({
                success: true,
                message: "Flash Sale product created successfully",
                flashSaleProduct,
            });
        } catch (error) {
            console.error('Error during flash sale creation:', error);
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

// Get all Active Flash Sale Products
router.get(
    "/get-all-flashsales",
    catchAsyncErrors(async (req, res, next) => {
        try {
            const flashSales = await FlashSale.find({ isActive: true }).sort({ startTime: -1 });

            console.log(`Fetched ${flashSales.length} active flash sale products.`);

            res.status(200).json({
                success: true,
                flashSales,
            });
        } catch (error) {
            console.error('Error fetching flash sales:', error);
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

// Delete Flash Sale Product
router.delete(
    "/delete-flashsale/:id",
    isAuthenticated,
    isSeller, // Only seller can delete their flash sales
    catchAsyncErrors(async (req, res, next) => {
        try {
            const flashSaleId = req.params.id;

            console.log('Request received to delete flash sale product. ID:', flashSaleId);

            // Validate the ID format (MongoDB ObjectId format)
            if (!mongoose.Types.ObjectId.isValid(flashSaleId)) {
                console.error("Invalid Flash Sale ID format:", flashSaleId);
                return next(new ErrorHandler("Invalid Flash Sale ID format", 400));
            }

            const flashSaleProduct = await FlashSale.findById(flashSaleId);

            if (!flashSaleProduct) {
                console.error("Flash Sale product not found:", flashSaleId);
                return next(new ErrorHandler("Flash Sale product not found!", 404));
            }

            // Delete the product images from Cloudinary
            for (let i = 0; i < flashSaleProduct.images.length; i++) {
                try {
                    const result = await cloudinary.v2.uploader.destroy(flashSaleProduct.images[i].public_id);
                    console.log(`Deleted image from Cloudinary: ${result}`);
                } catch (cloudinaryError) {
                    console.error("Error deleting image from Cloudinary:", cloudinaryError);
                    // Continue even if Cloudinary deletion fails
                }
            }

            // Delete the flash sale product from the database
            await FlashSale.deleteOne({ _id: flashSaleId });

            console.log("Flash Sale product deleted successfully:", flashSaleId);

            res.status(200).json({
                success: true,
                message: "Flash Sale product deleted successfully!",
            });
        } catch (error) {
            console.error('Error during flash sale deletion:', error);
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

// Update Flash Sale Product
router.put(
    "/update-flashsale/:id",
    isAuthenticated,
    isSeller, // Only seller can update their flash sale
    catchAsyncErrors(async (req, res, next) => {
        try {
            const flashSaleId = req.params.id;
            const { flashSalePrice, stockAvailable, images, discountPercentage } = req.body;

            console.log('Request received to update flash sale product. ID:', flashSaleId);

            // Validate Flash Sale ID
            if (!mongoose.Types.ObjectId.isValid(flashSaleId)) {
                console.error("Invalid Flash Sale ID format:", flashSaleId);
                return next(new ErrorHandler("Invalid Flash Sale ID format", 400));
            }

            const flashSaleProduct = await FlashSale.findById(flashSaleId);
            if (!flashSaleProduct) {
                console.error("Flash Sale product not found:", flashSaleId);
                return next(new ErrorHandler("Flash Sale product not found!", 404));
            }

            // Handle new images if provided
            let imageLinks = [];
            if (images && typeof images === "string") {
                images = [images]; // In case a single image is passed as string
            }

            if (images) {
                for (let i = 0; i < images.length; i++) {
                    const result = await cloudinary.v2.uploader.upload(images[i], {
                        folder: "flashSaleProducts",
                    });
                    imageLinks.push({
                        public_id: result.public_id,
                        url: result.secure_url,
                    });
                    console.log(`Uploaded new image ${i + 1}:`, result.secure_url);
                }
            }

            // Update the flash sale product with new details
            flashSaleProduct.flashSalePrice = flashSalePrice || flashSaleProduct.flashSalePrice;
            flashSaleProduct.stockAvailable = stockAvailable || flashSaleProduct.stockAvailable;
            flashSaleProduct.images = imageLinks.length ? imageLinks : flashSaleProduct.images;
            flashSaleProduct.discountPercentage = discountPercentage || flashSaleProduct.discountPercentage;

            await flashSaleProduct.save();

            console.log("Flash Sale product updated successfully:", flashSaleProduct._id);

            res.status(200).json({
                success: true,
                message: "Flash Sale product updated successfully!",
                flashSaleProduct,
            });
        } catch (error) {
            console.error('Error during flash sale update:', error);
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

// Like/Unlike a Flash Sale Product
router.put(
    "/like-flashsale",
    isAuthenticated,  // Ensure the user is authenticated
    catchAsyncErrors(async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "User not authenticated" });
            }

            const { flashSaleId } = req.body;
            const userId = req.user._id; // Get the authenticated user's ID 

            console.log(`[${new Date().toISOString()}] User ${userId} attempting to like/unlike flash sale ${flashSaleId}`);

            // Find the flash sale product
            const flashSale = await FlashSale.findById(flashSaleId);

            if (!flashSale) {
                console.log(`[${new Date().toISOString()}] Flash Sale product with ID ${flashSaleId} not found`);
                return next(new ErrorHandler("Flash Sale product not found!", 404));
            }

            // Check if the flash sale is already liked by the user
            const isLiked = flashSale.likes.includes(userId);
            console.log(`[${new Date().toISOString()}] Flash Sale ${flashSaleId} liked by user: ${isLiked}`);

            if (isLiked) {
                // If already liked, remove the user from the likes array
                flashSale.likes = flashSale.likes.filter((user) => user.toString() !== userId);
                await flashSale.save();
                console.log(`[${new Date().toISOString()}] User ${userId} removed from flash sale ${flashSaleId} likes`);
                return res.status(200).json({
                    success: true,
                    message: "Removed from liked flash sale",
                });
            } else {
                // If not liked, add the user to the likes array
                flashSale.likes.push(userId);
                await flashSale.save();
                console.log(`[${new Date().toISOString()}] User ${userId} added to flash sale ${flashSaleId} likes`);
                return res.status(200).json({
                    success: true,
                    message: "Added to liked flash sale",
                });
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error occurred: ${error.message}`);
            return next(new ErrorHandler(error.message, 500));
        }
    })
);


// Get Flash Sale Product by ID
router.get(
    "/get-flashsale/:id",
    catchAsyncErrors(async (req, res, next) => {
        try {
            const flashSaleId = req.params.id;

            // Validate the ID format (MongoDB ObjectId format)
            if (!mongoose.Types.ObjectId.isValid(flashSaleId)) {
                console.error("Invalid Flash Sale ID format:", flashSaleId);
                return next(new ErrorHandler("Invalid Flash Sale ID format", 400));
            }

            // Fetch the flash sale by ID
            const flashSaleProduct = await FlashSale.findById(flashSaleId).populate('shopId', 'name'); // Optional: populate shop details (e.g., shop name)
            if (!flashSaleProduct) {
                console.error("Flash Sale product not found:", flashSaleId);
                return next(new ErrorHandler("Flash Sale product not found!", 404));
            }

            console.log("Flash Sale product fetched successfully:", flashSaleProduct._id);

            res.status(200).json({
                success: true,
                flashSaleProduct,
            });
        } catch (error) {
            console.error('Error fetching flash sale product by ID:', error);
            return next(new ErrorHandler(error.message, 500));
        }
    })
);


module.exports = router;
