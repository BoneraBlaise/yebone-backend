const BaseTool = require("./BaseTool");
const KNOWLEDGE_ENTRIES = require("./knowledgeContent");

/**
 * KnowledgeTool — marketplace FAQ and policy documentation.
 */
class KnowledgeTool extends BaseTool {
  constructor() {
    super({
      id: "knowledge.faq",
      name: "KnowledgeTool",
      version: "7.2.0",
      capabilities: ["faq", "policy", "shipping", "payment_help", "platform_docs"],
      permissions: ["public"],
      platform: "Documentation",
    });
  }

  _matchEntries(input = {}) {
    const topic = String(input.topic || input.scope || "").toLowerCase();
    const query = String(input.q || input.query || input.message || "").toLowerCase();

    return KNOWLEDGE_ENTRIES.filter((entry) => {
      const topicMatch =
        !topic ||
        topic === "general" ||
        entry.topics.some((value) => value.includes(topic) || topic.includes(value));
      if (!topicMatch) return false;
      if (!query) return true;
      return (
        entry.question.toLowerCase().includes(query) ||
        entry.answer.toLowerCase().includes(query) ||
        entry.keywords.some((keyword) => query.includes(keyword) || keyword.includes(query))
      );
    });
  }

  async execute(input = {}, _context = {}) {
    const entries = this._matchEntries(input);
    const limit = Math.min(Number(input.limit) || 5, 10);

    return {
      articles: entries.slice(0, limit).map((entry) => ({
        id: entry.id,
        question: entry.question,
        answer: entry.answer,
        topics: entry.topics,
        source: entry.source,
      })),
      meta: {
        count: Math.min(entries.length, limit),
        totalMatches: entries.length,
        topic: input.topic || input.scope || "general",
        sources: ["marketplace-docs"],
      },
    };
  }
}

module.exports = KnowledgeTool;
