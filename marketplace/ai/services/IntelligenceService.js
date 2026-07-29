/** Backend intelligence responses — routed through YEBO AI Gateway (mock). */

function compareProducts(products = []) {
  const names = products.map((p) => p?.name || p?.title || "Product").slice(0, 3);
  return {
    type: "comparison",
    summary: `YEBO AI compared ${products.length} products for you.`,
    winner: names[0] || "Top pick",
    insights: [
      `${names[0] || "Option A"} offers the best overall value for your criteria.`,
      `${names[1] || "Option B"} is a strong alternative if budget is a priority.`,
      "All options meet baseline quality thresholds on Yebone.",
    ],
    products: products.slice(0, 5),
    displayBrand: "YEBO AI",
  };
}

function budgetAdvice(selection = {}) {
  const budget = selection?.budget || selection?.amount || 50000;
  return {
    type: "budget",
    summary: `YEBO AI budget guidance for ${budget} RWF.`,
    recommendations: [
      "Allocate 60% to core items, 25% to accessories, 15% to shipping buffer.",
      "Consider flash-sale listings to stretch your budget further.",
      "Enable wishlist alerts for price drops within 10% of your target.",
    ],
    budget,
    displayBrand: "YEBO AI",
  };
}

function giftFinder(categoryId = "general") {
  return {
    type: "gift",
    summary: `YEBO AI gift ideas for ${categoryId}.`,
    suggestions: [
      { label: "Premium gift bundle", category: categoryId, confidence: 92 },
      { label: "Trending local pick", category: categoryId, confidence: 88 },
      { label: "Budget-friendly surprise", category: categoryId, confidence: 85 },
    ],
    displayBrand: "YEBO AI",
  };
}

function getProactiveSuggestions() {
  return [
    { label: "Compare similar products", action: "compare" },
    { label: "Find gifts under your budget", action: "gift" },
    { label: "Get budget advice", action: "budget" },
  ];
}

function getShoppingTips() {
  return [
    "Ask YEBO AI to compare products side by side.",
    "Use natural language search to find exactly what you need.",
    "Check seller ratings before checkout.",
  ];
}

module.exports = {
  compareProducts,
  budgetAdvice,
  giftFinder,
  getProactiveSuggestions,
  getShoppingTips,
};
