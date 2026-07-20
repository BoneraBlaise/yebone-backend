const SearchPlatform = require("../../search/SearchPlatform");
const ProductPlatform = require("../../catalog/ProductPlatform");
const VendorPlatform = require("../../vendor/VendorPlatform");
const OrderPlatform = require("../../orders/OrderPlatform");
const PropertyMobilityPlatform = require("../../property-mobility/PropertyMobilityPlatform");
const SellerOperationsPlatform = require("../../seller-operations/SellerOperationsPlatform");
const GrowthCommercePlatform = require("../../growth-commerce/GrowthCommercePlatform");
const SearchTool = require("./SearchTool");
const CatalogTool = require("./CatalogTool");
const VendorTool = require("./VendorTool");
const OrderTool = require("./OrderTool");
const PaymentTool = require("./PaymentTool");
const RecommendationTool = require("./RecommendationTool");
const CheckoutTool = require("./CheckoutTool");
const KnowledgeTool = require("./KnowledgeTool");
const PropertySearchTool = require("./PropertySearchTool");
const PropertyListingGetTool = require("./PropertyListingGetTool");
const GrowthRecommendTool = require("./GrowthRecommendTool");
const SellerInventoryTool = require("./SellerInventoryTool");
const PropertyListingManageTool = require("./PropertyListingManageTool");

function resolvePlatform(getter, Factory, marketplaceCore, factoryOptions = {}) {
  try {
    return getter();
  } catch (_err) {
    return new Factory({ marketplaceCore, ...factoryOptions });
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

  const propertyMobilityPlatform =
    platforms.propertyMobility ||
    resolvePlatform(
      () => require("../../index").getPropertyMobilityPlatform(),
      PropertyMobilityPlatform,
      marketplaceCore,
      { useMemoryOnly: true }
    );

  const sellerOperationsPlatform =
    platforms.sellerOperations ||
    resolvePlatform(
      () => require("../../index").getSellerOperationsPlatform(),
      SellerOperationsPlatform,
      marketplaceCore,
      { useMemoryOnly: true }
    );

  const growthCommercePlatform =
    platforms.growthCommerce ||
    resolvePlatform(
      () => require("../../index").getGrowthCommercePlatform(),
      GrowthCommercePlatform,
      marketplaceCore,
      { useMemoryOnly: true }
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

  const propertySearchTool = new PropertySearchTool({
    searchBridge: propertyMobilityPlatform.searchBridge,
  }).initialize();
  const propertyListingGetTool = new PropertyListingGetTool({
    listingService: propertyMobilityPlatform.listingService,
  }).initialize();
  const growthRecommendTool = new GrowthRecommendTool({
    growthCommerceAI: growthCommercePlatform.aiService,
  }).initialize();
  const sellerInventoryTool = new SellerInventoryTool({
    inventoryService: sellerOperationsPlatform.inventoryService,
  }).initialize();
  const propertyListingManageTool = new PropertyListingManageTool({
    listingService: propertyMobilityPlatform.listingService,
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
    propertySearchTool,
    propertyListingGetTool,
    growthRecommendTool,
    sellerInventoryTool,
    propertyListingManageTool,
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
  PropertySearchTool,
  PropertyListingGetTool,
  GrowthRecommendTool,
  SellerInventoryTool,
  PropertyListingManageTool,
};
