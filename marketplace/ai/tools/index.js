function createMockToolResponse(id, input = {}) {
  return {
    toolId: id,
    mock: true,
    phase: "7.1",
    input,
    data: {
      message: `${id} placeholder — platform integration in Phase 7.2+`,
      items: [],
      meta: { count: 0, empty: true },
    },
    executedAt: new Date().toISOString(),
  };
}

const TOOL_DEFINITIONS = [
  {
    id: "search.products",
    name: "SearchTool",
    version: "7.1.0",
    capabilities: ["product-search", "suggestions"],
    permissions: ["public"],
    execute: async (input = {}) => createMockToolResponse("search.products", input),
  },
  {
    id: "catalog.product.get",
    name: "CatalogTool",
    version: "7.1.0",
    capabilities: ["product-read", "categories"],
    permissions: ["public"],
    execute: async (input = {}) => createMockToolResponse("catalog.product.get", input),
  },
  {
    id: "vendor.shop.get",
    name: "VendorTool",
    version: "7.1.0",
    capabilities: ["shop-read"],
    permissions: ["public"],
    execute: async (input = {}) => createMockToolResponse("vendor.shop.get", input),
  },
  {
    id: "order.get",
    name: "OrderTool",
    version: "7.1.0",
    capabilities: ["order-read"],
    permissions: ["authenticated"],
    execute: async (input = {}) => createMockToolResponse("order.get", input),
  },
  {
    id: "payment.readiness",
    name: "PaymentTool",
    version: "7.1.0",
    capabilities: ["payment-readiness"],
    permissions: ["authenticated"],
    execute: async (input = {}) => createMockToolResponse("payment.readiness", input),
  },
  {
    id: "recommend.contextual",
    name: "RecommendationTool",
    version: "7.1.0",
    capabilities: ["recommendations"],
    permissions: ["public"],
    execute: async (input = {}) => createMockToolResponse("recommend.contextual", input),
  },
  {
    id: "knowledge.faq",
    name: "KnowledgeTool",
    version: "7.1.0",
    capabilities: ["faq", "policy"],
    permissions: ["public"],
    execute: async (input = {}) => createMockToolResponse("knowledge.faq", input),
  },
];

module.exports = { TOOL_DEFINITIONS, createMockToolResponse };
