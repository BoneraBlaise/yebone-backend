const OFFER_STATUSES = ["pending", "accepted", "rejected", "countered", "expired"];
const MESSAGE_TYPES = ["text", "image", "offer", "system"];
const DEFAULT_OFFER_EXPIRY_HOURS = 72;

const NOTIFICATION_TYPES = {
  NEW_MESSAGE: "new_message",
  NEW_OFFER: "new_offer",
  OFFER_ACCEPTED: "offer_accepted",
  OFFER_REJECTED: "offer_rejected",
  OFFER_COUNTER: "offer_counter",
  ORDER_CONFIRMED: "order_confirmed",
  ORDER_SHIPPED: "order_shipped",
  ORDER_DELIVERED: "order_delivered",
  DELIVERY_CONFIRMED: "delivery_confirmed",
};

module.exports = {
  OFFER_STATUSES,
  MESSAGE_TYPES,
  DEFAULT_OFFER_EXPIRY_HOURS,
  NOTIFICATION_TYPES,
};
