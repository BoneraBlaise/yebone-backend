/**
 * Static marketplace knowledge — sourced from platform documentation.
 */
module.exports = Object.freeze([
  {
    id: "faq-orders",
    topics: ["faq", "orders"],
    keywords: ["order", "track", "delivery", "status"],
    question: "How do I track my order?",
    answer:
      "Open your order history after signing in. Each order shows its current fulfillment status from placement through delivery.",
    source: "marketplace/orders/README.md",
  },
  {
    id: "faq-shipping",
    topics: ["shipping", "faq"],
    keywords: ["shipping", "delivery", "ship", "address"],
    question: "How does shipping work?",
    answer:
      "Shipping options and fees are selected at checkout. Sellers fulfill orders according to the shipping method chosen during purchase.",
    source: "marketplace/orders/PRODUCTION.md",
  },
  {
    id: "faq-payments",
    topics: ["payment", "payment_help", "faq"],
    keywords: ["pay", "payment", "checkout", "momo", "card"],
    question: "Which payment methods are supported?",
    answer:
      "Checkout supports card and mobile money flows coordinated through the marketplace payment integration hook after order creation.",
    source: "payments/infrastructure/integration/README.md",
  },
  {
    id: "policy-refunds",
    topics: ["policy", "faq"],
    keywords: ["refund", "return", "cancel"],
    question: "What is the refund policy?",
    answer:
      "Refund requests are handled through the order lifecycle. Contact the seller or support if an order is eligible for a refund review.",
    source: "marketplace/orders/README.md",
  },
  {
    id: "policy-vendors",
    topics: ["policy", "faq"],
    keywords: ["vendor", "seller", "shop", "store"],
    question: "How are vendors verified?",
    answer:
      "Vendors register through the vendor platform, activate their account, and may receive verification status visible on their public shop profile.",
    source: "marketplace/vendor/README.md",
  },
  {
    id: "platform-search",
    topics: ["platform", "faq"],
    keywords: ["search", "find", "filter", "category"],
    question: "How does marketplace search work?",
    answer:
      "Product and shop discovery runs through the Search Platform with keyword, category, price, rating, availability, pagination, and sorting support.",
    source: "marketplace/search/README.md",
  },
]);
