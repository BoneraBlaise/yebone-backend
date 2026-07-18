const SearchPlatform = require("../../search/SearchPlatform");
const ProductPlatform = require("../../catalog/ProductPlatform");
const VendorPlatform = require("../../vendor/VendorPlatform");
const OrderPlatform = require("../../orders/OrderPlatform");
const SearchTool = require("./SearchTool");
const CatalogTool = require("./CatalogTool");
const VendorTool = require("./VendorTool");
const OrderTool = require("./OrderTool");
const PaymentTool = require("./PaymentTool");
const RecommendationTool = require("./RecommendationTool");
const CheckoutTool = require("./CheckoutTool");
const KnowledgeTool = require("./KnowledgeTool");

function resolvePlatform(getter, Factory, marketplaceCore) {
  try {
    return getter();
  } catch (_err) {
    return new Factory({ marketplaceCore });
  }
}

function createProductionTools({ marketplaceCore, platforms = {} } = {}) {
  if (!marketplaceCore) {
    throw new Error("createProductionTools requires marketplaceCore");
  }

  const searchPlatform =
    platforms.search ||
    resolvePlatform(
      () => require("../../index").getSearchPlatform(),
      SearchPlatform,
      marketplaceCore
    );
  const productPlatform =
    platforms.product ||
    resolvePlatform(
      () => require("../../index").getProductPlatform(),
      ProductPlatform,
      marketplaceCore
    );
  const vendorPlatform =
    platforms.vendor ||
    resolvePlatform(
      () => require("../../index").getVendorPlatform(),
      VendorPlatform,
      marketplaceCore
    );
  const orderPlatform =
    platforms.order ||
    resolvePlatform(
      () => require("../../index").getOrderPlatform(),
      OrderPlatform,
      marketplaceCore
    );

  const searchTool = new SearchTool({ searchPlatform }).initialize();
  const catalogTool = new CatalogTool({ productPlatform, searchPlatform }).initialize();
  const vendorTool = new VendorTool({ vendorPlatform, searchPlatform }).initialize();
  const orderTool = new OrderTool({ orderPlatform }).initialize();
  const paymentTool = new PaymentTool({ marketplaceCore }).initialize();
  const knowledgeTool = new KnowledgeTool().initialize();
  const recommendationTool = new RecommendationTool({
    searchTool,
    catalogTool,
  }).initialize();
  const checkoutTool = new CheckoutTool({
    catalogTool,
  }).initialize();

  return [
    searchTool,
    catalogTool,
    vendorTool,
    orderTool,
    paymentTool,
    recommendationTool,
    checkoutTool,
    knowledgeTool,
  ];
}

module.exports = {
  createProductionTools,
  SearchTool,
  CatalogTool,
  VendorTool,
  OrderTool,
  PaymentTool,
  RecommendationTool,
  CheckoutTool,
  KnowledgeTool,
};
