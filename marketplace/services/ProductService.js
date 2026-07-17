const Shop = require("../../model/shop");
const Product = require("../../model/product");
const UploadService = require("./UploadService");

/**
 * Product service — extracted create flow from legacy controller.
 */
class ProductService {
  constructor({ uploadService = new UploadService() } = {}) {
    this.uploadService = uploadService;
  }

  async createProduct(input = {}) {
    const shop = await Shop.findById(input.shopId);
    if (!shop) {
      const error = new Error("Shop Id is invalid!");
      error.statusCode = 400;
      throw error;
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
    });

    return product;
  }
}

module.exports = ProductService;
