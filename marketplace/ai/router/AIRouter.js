const { AI_PREVIEW_TYPE, AI_SERVICE } = require("../commerce/CreditPolicy");

const FASHION_PREVIEW_TYPES = new Set([
  AI_PREVIEW_TYPE.BODY_TRYON,
  AI_PREVIEW_TYPE.FOOT_TRYON,
  AI_PREVIEW_TYPE.FACE_TRYON,
  AI_PREVIEW_TYPE.WRIST_TRYON,
  AI_PREVIEW_TYPE.NECK_TRYON,
]);

const INTERIOR_PREVIEW_TYPES = new Set([AI_PREVIEW_TYPE.ROOM_PREVIEW]);

const INTERIOR_PLACEMENT_PREVIEW_TYPES = new Set([
  AI_PREVIEW_TYPE.WALL_PREVIEW,
  AI_PREVIEW_TYPE.WINDOW_PREVIEW,
  AI_PREVIEW_TYPE.FLOOR_PREVIEW,
]);

const SERVICE_ROUTE_MAP = Object.freeze({
  [AI_SERVICE.SHOPPING_ASSISTANT]: "llm",
  [AI_SERVICE.SEARCH]: "llm",
  [AI_SERVICE.RECOMMENDATIONS]: "llm",
  [AI_SERVICE.DESCRIPTION]: "llm",
  [AI_SERVICE.TRANSLATION]: "llm",
  [AI_SERVICE.VENDOR_ASSISTANT]: "llm",
  [AI_SERVICE.INTELLIGENCE]: "llm",
  [AI_SERVICE.IMAGE_SEARCH]: "vision",
  [AI_SERVICE.CUSTOMER_SUPPORT]: "llm",
  [AI_SERVICE.PREVIEW]: "vision",
  [AI_SERVICE.BACKGROUND_REMOVAL]: "vision",
  [AI_SERVICE.ANALYTICS]: "llm",
  chat: "llm",
  search: "llm",
  compare: "llm",
  budget: "llm",
  gift: "llm",
  image_search: "vision",
});

/**
 * AI Router — selects provider interface by service/preview type only.
 * Contains no provider-specific business logic.
 */
class AIRouter {
  constructor(providerRegistry) {
    this.registry = providerRegistry;
  }

  resolveProviderId({ serviceType, previewType = null, scope = null } = {}) {
    if (previewType) {
      if (FASHION_PREVIEW_TYPES.has(previewType)) return "fashion";
      if (INTERIOR_PREVIEW_TYPES.has(previewType)) return "interior";
      if (INTERIOR_PLACEMENT_PREVIEW_TYPES.has(previewType)) return "interior_placement";
      return "vision";
    }

    const key = scope || serviceType || "chat";
    return SERVICE_ROUTE_MAP[key] || SERVICE_ROUTE_MAP[serviceType] || "llm";
  }

  route({ serviceType, previewType = null, scope = null, input = "", options = {} } = {}) {
    const providerId = this.resolveProviderId({ serviceType, previewType, scope });
    const provider = this.registry.get(providerId);

    return {
      providerId,
      category: provider.category,
      provider,
      serviceType: previewType || serviceType || scope,
      routedAt: new Date().toISOString(),
      displayBrand: "YEBO AI",
      input,
      options: { ...options, previewType, serviceType, scope },
    };
  }

  async execute(routingContext) {
    const { provider, input, options } = routingContext;
    const result = await provider.execute(input, options);
    return {
      ...result,
      routing: {
        providerCategory: routingContext.category,
        serviceType: routingContext.serviceType,
        displayBrand: "YEBO AI",
      },
    };
  }
}

module.exports = AIRouter;
