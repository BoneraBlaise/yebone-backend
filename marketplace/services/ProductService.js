const mongoose = require("mongoose");
const Product = require("../../model/product");
const Order = require("../../model/order");
const UploadService = require("./UploadService");

/**
 * Product service — single business layer for catalog operations.
 * Extracted from legacy controller/product.js (Phase 4).
 */
class ProductService {
  constructor({ uploadService = new UploadService(), shopService = null } = {}) {
    this.uploadService = uploadService;
    this.shopService = shopService;
  }

  _error(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  async _resolveShop(shopId) {
    if (this.shopService) {
      return this.shopService.findById(shopId);
    }
    const Shop = require("../../model/shop");
    return Shop.findById(shopId);
  }

  async createProduct(input = {}) {
    const shop = await this._resolveShop(input.shopId);
    if (!shop) {
      throw this._error("Shop Id is invalid!");
    }

    const imagesLinks = await this.uploadService.uploadImages(input.images, "products");
    const {
      condition = "new",
      location = "Kigali-Rwanda",
      productType = "normal",
      ...restBody
    } = input;

    const product = await Product.create({
      ...restBody,
      condition,
      location,
      productType,
      images: imagesLinks,
      shop,
      shopId: String(input.shopId),
    });

    return product;
  }

  async updateProduct(productId, input = {}, { sellerId } = {}) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw this._error("Invalid product ID format");
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw this._error("Product is not found with this id", 404);
    }

    if (sellerId && String(product.shopId) !== String(sellerId)) {
      throw this._error("You are not allowed to update this product", 403);
    }

    const allowed = [
      "name",
      "description",
      "category",
      "tags",
      "originalPrice",
      "discountPrice",
      "featured",
      "bestdeal",
      "stock",
      "condition",
      "location",
      "productType",
    ];

    for (const key of allowed) {
      if (input[key] !== undefined) {
        product[key] = input[key];
      }
    }

    if (input.images) {
      product.images = await this.uploadService.uploadImages(input.images, "products");
    }

    await product.save();
    return product;
  }

  async findById(productId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw this._error("Invalid product ID format");
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw this._error("Product not found!", 404);
    }

    return product;
  }

  async getProductsByShop(shopId) {
    return Product.find({ shopId: String(shopId) });
  }

  async getAllProducts() {
    return Product.find().sort({ createdAt: -1 });
  }

  async getAllProductsAdmin() {
    return Product.find().sort({ createdAt: -1 });
  }

  async deleteProduct(productId, { sellerId } = {}) {
    if (!productId) {
      throw this._error("Product ID is missing");
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw this._error("Invalid product ID format");
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw this._error("Product is not found with this id", 404);
    }

    if (sellerId && String(product.shopId) !== String(sellerId)) {
      throw this._error("You are not allowed to delete this product", 403);
    }

    if (Array.isArray(product.images)) {
      for (const image of product.images) {
        if (!image?.public_id) continue;
        try {
          await this.uploadService.destroyPublicId(image.public_id);
        } catch (_error) {
          // Continue deleting product even if Cloudinary cleanup fails
        }
      }
    }

    await Product.deleteOne({ _id: productId });
    return { deleted: true, productId };
  }

  async addOrUpdateReview(input = {}, authenticatedUserId) {
    const { user, rating, comment, productId, orderId } = input;

    if (!productId) {
      throw this._error("Product ID is required");
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw this._error("Product not found!", 404);
    }

    const review = {
      user,
      rating,
      comment,
      productId,
    };

    const isReviewed = product.reviews.find(
      (rev) => rev.user._id === authenticatedUserId
    );

    if (isReviewed) {
      product.reviews.forEach((rev) => {
        if (rev.user._id === authenticatedUserId) {
          rev.rating = rating;
          rev.comment = comment;
          rev.user = user;
        }
      });
    } else {
      product.reviews.push(review);
    }

    let avg = 0;
    product.reviews.forEach((rev) => {
      avg += rev.rating;
    });

    product.ratings = product.reviews.length ? avg / product.reviews.length : 0;

    await product.save({ validateBeforeSave: false });

    if (orderId) {
      await Order.findByIdAndUpdate(
        orderId,
        { $set: { "cart.$[elem].isReviewed": true } },
        { arrayFilters: [{ "elem._id": productId }], new: true }
      );
    }

    return product;
  }

  async toggleLike(productId, userId) {
    if (!productId) {
      throw this._error("Product ID is required");
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw this._error("Product not found!", 404);
    }

    const isLiked = product.likes.some((id) => String(id) === String(userId));

    if (isLiked) {
      product.likes = product.likes.filter((id) => String(id) !== String(userId));
      await product.save();
      return { liked: false, message: "Removed from wishlist" };
    }

    product.likes.push(userId);
    await product.save();
    return { liked: true, message: "Added to wishlist" };
  }
}

module.exports = ProductService;
