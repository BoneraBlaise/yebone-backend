  const express = require("express");
  const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
  const catchAsyncErrors = require("../middleware/catchAsyncErrors");
  const router = express.Router();
  const Product = require("../model/product");
  const Order = require("../model/order");
  const Shop = require("../model/shop");
  const cloudinary = require("cloudinary");
  const ErrorHandler = require("../utils/ErrorHandler");
  // Import mongoose to validate ObjectId format
  const mongoose = require("mongoose");

   // create product
   router.post(
    "/create-product",
    catchAsyncErrors(async (req, res, next) => {
      try {
        const shopId = req.body.shopId;
        const shop = await Shop.findById(shopId);
        if (!shop) {
          return next(new ErrorHandler("Shop Id is invalid!", 400));
        } else {
          let images = [];

          if (typeof req.body.images === "string") {
            images.push(req.body.images);
          } else {
            images = req.body.images;
          }

          const imagesLinks = [];

          for (let i = 0; i < images.length; i++) {
            const result = await cloudinary.v2.uploader.upload(images[i], {
              folder: "products",
            });

            imagesLinks.push({
              public_id: result.public_id,
              url: result.secure_url,
            });
          }

          // Destructure and set defaults for new fields
          const { condition = "new", location = "Kigali-Rwanda", productType = "normal", ...restBody } = req.body;

          const productData = {
            ...restBody,
            condition,
            location,
            productType,
            images: imagesLinks,
            shop: shop,
          };

          const product = await Product.create(productData);

          res.status(201).json({
            success: true,
            product,
          });
        }
      } catch (error) {
        return next(new ErrorHandler(error, 400));
      }
    })
  );

  // get all products of a shop
  router.get(
    "/get-all-products-shop/:id",
    catchAsyncErrors(async (req, res, next) => {
      try {
        const products = await Product.find({ shopId: req.params.id });

        res.status(201).json({
          success: true,
          products,
        });
      } catch (error) {
        return next(new ErrorHandler(error, 400));
      }
    })
  );


  router.delete(
    "/delete-shop-product/:id",
    isSeller,
    catchAsyncErrors(async (req, res, next) => {
      try {
        const productId = req.params.id;

        // Log the received product ID to check if it's correct
        console.log("Product ID:", productId);

        if (!productId) {
          return next(new ErrorHandler("Product ID is missing", 400));
        }

        // Validate the ID format (MongoDB ObjectId format)
        if (!mongoose.Types.ObjectId.isValid(productId)) {
          return next(new ErrorHandler("Invalid product ID format", 400));
        }

        const product = await Product.findById(productId);

        if (!product) {
          return next(new ErrorHandler("Product is not found with this id", 404));
        }

        // Log the product object to check if it's a valid Mongoose document
        console.log("Found product:", product);

        // If product has images, delete them from Cloudinary
        for (let i = 0; i < product.images.length; i++) {
          try {
            const result = await cloudinary.v2.uploader.destroy(product.images[i].public_id);
            console.log(`Deleted image from Cloudinary: ${result}`);
          } catch (cloudinaryError) {
            console.error("Error deleting image from Cloudinary:", cloudinaryError);
            // Continue to delete product even if Cloudinary deletion fails
          }
        }

        // Use deleteOne instead of remove
        await Product.deleteOne({ _id: productId });

        res.status(200).json({
          success: true,
          message: "Product Deleted successfully!",
        });
      } catch (error) {
        console.error("Error occurred while deleting product:", error); // Log the error for debugging
        return next(new ErrorHandler(error.message || "Internal Server Error", 500));
      }
    })
  );


  // get all products
  router.get(
    "/get-all-products",
    catchAsyncErrors(async (req, res, next) => {
      try {
        const products = await Product.find().sort({ createdAt: -1 });

        res.status(201).json({
          success: true,
          products,
        });
      } catch (error) {
        return next(new ErrorHandler(error, 400));
      }
    })
  );

  // review for a product
  router.put(
    "/create-new-review",
    isAuthenticated,
    catchAsyncErrors(async (req, res, next) => {
      try {
        const { user, rating, comment, productId, orderId } = req.body;

        const product = await Product.findById(productId);

        const review = {
          user,
          rating,
          comment,
          productId,
        };

        const isReviewed = product.reviews.find(
          (rev) => rev.user._id === req.user._id
        );

        if (isReviewed) {
          product.reviews.forEach((rev) => {
            if (rev.user._id === req.user._id) {
              (rev.rating = rating), (rev.comment = comment), (rev.user = user);
            }
          });
        } else {
          product.reviews.push(review);
        }

        let avg = 0;

        product.reviews.forEach((rev) => {
          avg += rev.rating;
        });

        product.ratings = avg / product.reviews.length;

        await product.save({ validateBeforeSave: false });

        await Order.findByIdAndUpdate(
          orderId,
          { $set: { "cart.$[elem].isReviewed": true } },
          { arrayFilters: [{ "elem._id": productId }], new: true }
        );

        res.status(200).json({
          success: true,
          message: "Reviwed succesfully!",
        });
      } catch (error) {
        return next(new ErrorHandler(error, 400));
      }
    })
  );
  // like/unlike a product
  router.put(
    "/like-product",
    isAuthenticated, // Make sure the user is logged in
    catchAsyncErrors(async (req, res, next) => {
      try {
        const { productId } = req.body;
        const userId = req.user._id; // Assuming req.user is set by the authentication middleware

        // Log incoming request with product ID and user ID
        console.log(`Received like/unlike request: UserId = ${userId}, ProductId = ${productId}`);

        // Find the product
        const product = await Product.findById(productId);

        if (!product) {
          console.error(`Product not found: ProductId = ${productId}`);
          return next(new ErrorHandler("Product not found!", 404));
        }

        // Check if the product is already liked by the user
        const isLiked = product.likes.includes(userId);

        if (isLiked) {
          // If already liked, remove the user from the likes array
          product.likes = product.likes.filter((user) => user.toString() !== userId);
          await product.save();
          console.log(`UserId = ${userId} removed from product likes: ProductId = ${productId}`);
          return res.status(200).json({
            success: true,
            message: "Removed from wishlist",
          });
        } else {
          // If not liked, add the user to the likes array
          product.likes.push(userId);
          await product.save();
          console.log(`UserId = ${userId} added to product likes: ProductId = ${productId}`);
          return res.status(200).json({
            success: true,
            message: "Added to wishlist",
          });
        }
      } catch (error) {
        console.error(`Error occurred: ${error.message}`);
        return next(new ErrorHandler(error.message, 500));
      }
    })
  );

  // all products --- for admin
  router.get(
    "/admin-all-products",
    isAuthenticated,
    isAdmin("Admin"),
    catchAsyncErrors(async (req, res, next) => {
      try {
        const products = await Product.find().sort({
          createdAt: -1,
        });
        res.status(201).json({
          success: true,
          products,
        });
      } catch (error) {
        return next(new ErrorHandler(error.message, 500));
      }
    })
  );
  module.exports = router;
