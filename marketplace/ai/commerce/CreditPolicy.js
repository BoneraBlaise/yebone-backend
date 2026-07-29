/** Credit costs per AI service — mirrors frontend CommerceConfig defaults */

const AI_PREVIEW_TYPE = {
  BODY_TRYON: "body_tryon",
  FOOT_TRYON: "foot_tryon",
  FACE_TRYON: "face_tryon",
  WRIST_TRYON: "wrist_tryon",
  NECK_TRYON: "neck_tryon",
  ROOM_PREVIEW: "room_preview",
  WALL_PREVIEW: "wall_preview",
  WINDOW_PREVIEW: "window_preview",
  FLOOR_PREVIEW: "floor_preview",
};

const AI_SERVICE = {
  PREVIEW: "preview",
  DESCRIPTION: "description",
  TRANSLATION: "translation",
  BACKGROUND_REMOVAL: "background_removal",
  PRODUCT_VIDEO: "product_video",
  SEARCH: "search",
  CUSTOMER_SUPPORT: "customer_support",
  RECOMMENDATIONS: "recommendations",
  ANALYTICS: "analytics",
  SHOPPING_ASSISTANT: "shopping_assistant",
  INTELLIGENCE: "intelligence",
  VENDOR_ASSISTANT: "vendor_assistant",
  IMAGE_SEARCH: "image_search",
};

const CREDIT_POLICY = Object.freeze({
  [AI_PREVIEW_TYPE.BODY_TRYON]: 1,
  [AI_PREVIEW_TYPE.FOOT_TRYON]: 1,
  [AI_PREVIEW_TYPE.FACE_TRYON]: 1,
  [AI_PREVIEW_TYPE.WRIST_TRYON]: 1,
  [AI_PREVIEW_TYPE.NECK_TRYON]: 1,
  [AI_PREVIEW_TYPE.ROOM_PREVIEW]: 2,
  [AI_PREVIEW_TYPE.WALL_PREVIEW]: 2,
  [AI_PREVIEW_TYPE.WINDOW_PREVIEW]: 2,
  [AI_PREVIEW_TYPE.FLOOR_PREVIEW]: 2,
  [AI_SERVICE.PREVIEW]: 1,
  [AI_SERVICE.DESCRIPTION]: 0.2,
  [AI_SERVICE.TRANSLATION]: 0.1,
  [AI_SERVICE.BACKGROUND_REMOVAL]: 0.5,
  [AI_SERVICE.PRODUCT_VIDEO]: 8,
  [AI_SERVICE.SEARCH]: 0,
  [AI_SERVICE.CUSTOMER_SUPPORT]: 0,
  [AI_SERVICE.RECOMMENDATIONS]: 0,
  [AI_SERVICE.ANALYTICS]: 0.5,
  [AI_SERVICE.SHOPPING_ASSISTANT]: 0,
  [AI_SERVICE.INTELLIGENCE]: 0,
  [AI_SERVICE.VENDOR_ASSISTANT]: 0.3,
  [AI_SERVICE.IMAGE_SEARCH]: 0.2,
});

const FREE_SERVICES = new Set([
  AI_SERVICE.SEARCH,
  AI_SERVICE.SHOPPING_ASSISTANT,
  AI_SERVICE.INTELLIGENCE,
  AI_SERVICE.RECOMMENDATIONS,
  AI_SERVICE.CUSTOMER_SUPPORT,
]);

function getCreditCost(serviceType, previewType = null) {
  if (previewType && CREDIT_POLICY[previewType] != null) {
    return CREDIT_POLICY[previewType];
  }
  if (serviceType && CREDIT_POLICY[serviceType] != null) {
    return CREDIT_POLICY[serviceType];
  }
  return 0;
}

function isPaidService(serviceType, previewType = null) {
  return getCreditCost(serviceType, previewType) > 0;
}

function isFreeService(serviceType) {
  return FREE_SERVICES.has(serviceType);
}

module.exports = {
  AI_PREVIEW_TYPE,
  AI_SERVICE,
  CREDIT_POLICY,
  getCreditCost,
  isPaidService,
  isFreeService,
};
