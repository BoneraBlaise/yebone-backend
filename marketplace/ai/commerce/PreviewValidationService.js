/**
 * Server-side preview request validation — never trust frontend vendorId alone.
 */
class PreviewValidationService {
  constructor({ productModel = null } = {}) {
    this.Product = productModel || require("../../../model/product");
  }

  async validatePreviewRequest({ productId, vendorId, previewType }) {
    if (!productId) {
      return { ok: false, code: "PRODUCT_REQUIRED", message: "productId is required for YEBO AI preview." };
    }
    if (!previewType) {
      return { ok: false, code: "PREVIEW_TYPE_REQUIRED", message: "ai_preview_type is required." };
    }
    if (!vendorId) {
      return { ok: false, code: "VENDOR_REQUIRED", message: "vendorId is required for YEBO AI preview." };
    }

    let product = null;
    try {
      product = await this.Product.findById(productId).select("_id shopId shop name images").lean();
    } catch {
      product = null;
    }

    if (!product) {
      return { ok: false, code: "PRODUCT_NOT_FOUND", message: "Product not found.", statusCode: 404 };
    }

    const productVendorId = String(
      product.shopId ||
        product.shop?._id ||
        (typeof product.shop === "string" ? product.shop : "") ||
        ""
    );

    if (!productVendorId || String(vendorId) !== productVendorId) {
      return {
        ok: false,
        code: "VENDOR_PRODUCT_MISMATCH",
        message: "This product does not belong to the specified vendor.",
        statusCode: 403,
      };
    }

    return {
      ok: true,
      productId: String(product._id),
      vendorId: productVendorId,
      productName: product.name || null,
      productImageUrl: resolveProductImageUrl(product),
    };
  }
}

function resolveProductImageUrl(product = {}) {
  const images = product.images || [];
  const first = images[0];
  if (!first) return null;
  if (typeof first === "string") return first;
  return first.url || first.secure_url || first.path || null;
}

module.exports = PreviewValidationService;
