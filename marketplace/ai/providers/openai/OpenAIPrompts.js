const YEBO_SYSTEM =
  "You are YEBO AI, the official shopping assistant for Yebone marketplace in Rwanda. " +
  "Respond helpfully, concisely, and in the user's language when possible. " +
  "Never mention OpenAI, GPT, or underlying provider names. Brand yourself as YEBO AI only.";

const COMMERCE_PROMPTS = Object.freeze({
  compare: (body) =>
    `Compare these marketplace products and return JSON only with keys: type, summary, winner, insights (array of strings), products (array), displayBrand ("YEBO AI"). Products: ${JSON.stringify(body?.products || [])}`,

  budget: (body) => {
    const selection = body?.selection || body || {};
    const budget = selection.budget || selection.amount || body?.budget || 100000;
    return (
      `A shopper has budget ${budget} RWF. Recommend the best products/strategy. ` +
      `Return JSON only: type ("budget"), summary, recommendations (array of strings), budget (number), displayBrand ("YEBO AI"). ` +
      `Context: ${JSON.stringify(selection)}`
    );
  },

  gift: (body) => {
    const category = body?.categoryId || body?.category || body?.occasion || "general";
    return (
      `Suggest gift ideas for occasion/category: ${category}. ` +
      `Return JSON only: type ("gift"), summary, suggestions (array of {label, category, confidence}), displayBrand ("YEBO AI").`
    );
  },

  recommend: (body) =>
    `Recommend products based on: category=${body?.categoryId || body?.category || "any"}, ` +
    `budget=${body?.budget || "any"}, interests=${JSON.stringify(body?.interests || [])}, ` +
    `history=${JSON.stringify(body?.history || [])}. ` +
    `Return JSON only: type ("recommendations"), summary, recommendations (array of {name, reason, confidence}), displayBrand ("YEBO AI").`,

  description: (body) => {
    const product = body?.product || body?.options?.product || body;
    return (
      `Generate product listing copy for Yebone marketplace. Return JSON only with keys: ` +
      `title, shortDescription, longDescription, seoDescription, displayBrand ("YEBO AI"). ` +
      `Product: ${JSON.stringify(product)}`
    );
  },

  translation: (body) => {
    const targetLang = body?.targetLanguage || body?.language || body?.options?.language || "en";
    const content = body?.content || body?.input || body?.text || "";
    return (
      `Translate this product content to ${targetLang}. Return JSON only: ` +
      `{ translatedText, targetLanguage, displayBrand: "YEBO AI" }. Content: ${JSON.stringify(content)}`
    );
  },

  tips: () =>
    'Return JSON only: { tips: string[] (4 shopping tips for Yebone), displayBrand: "YEBO AI" }',

  suggestions: () =>
    'Return JSON only: { suggestions: [{label, action}] (4 proactive shopping suggestions), displayBrand: "YEBO AI" }',

  image_search: () =>
    "Analyze this product image for marketplace search. Return JSON only with keys: " +
    "category, subcategory, attributes (object), colors (array of strings), description (string), " +
    "keywords (array of search terms), confidence (0-100), productType (clothing|furniture|electronics|other), displayBrand (YEBO AI).",
});

function buildSystemPrompt(options = {}) {
  if (options.prompt) return `${YEBO_SYSTEM}\n\n${options.prompt}`;
  return YEBO_SYSTEM;
}

function buildCommercePrompt(mode, body = {}) {
  const fn = COMMERCE_PROMPTS[mode];
  if (fn) return fn(body);
  return null;
}

function formatToolContext(toolResults = []) {
  if (!toolResults.length) return "";
  const summaries = toolResults
    .filter((t) => t?.success)
    .map((t) => {
      const name = t.tool || "tool";
      const preview = JSON.stringify(t.data || {}).slice(0, 2000);
      return `[${name} result]: ${preview}`;
    });
  return summaries.length
    ? `\n\nTool results from marketplace:\n${summaries.join("\n")}`
    : "";
}

module.exports = {
  YEBO_SYSTEM,
  COMMERCE_PROMPTS,
  buildSystemPrompt,
  buildCommercePrompt,
  formatToolContext,
};
