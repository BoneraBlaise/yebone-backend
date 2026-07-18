/**
 * Follow-up analysis for commerce assistant turns (Phase 7.4–7.7).
 */
const ConversationMemoryEngine = require("./ConversationMemoryEngine");

class ConversationFlowAnalyzer {
  static CHECKOUT_PATTERNS =
    /should i buy|is it worth buying|is it worth it|can i buy|can i purchase|purchase now|buy this today|buy today|compare these|compare them|which is cheaper|cheaper overall|better value|product a or| or product |is this product.*available|currently available|availability|is it available|can i order|worth buying|which is better|which one is better|gives me better value/i;

  static RECOMMENDATION_PATTERNS =
    /what do you recommend|which one do you recommend|best option|what would you recommend|you recommend|recommend one from|recommend one\b/i;

  constructor({ searchParameterExtractor, conversationMemoryEngine } = {}) {
    this.searchParameterExtractor = searchParameterExtractor;
    this.conversationMemoryEngine =
      conversationMemoryEngine || new ConversationMemoryEngine();
  }

  isMemoryReference(message = "", sessionContext = {}) {
    return (
      sessionContext.turnCount > 1 &&
      this.conversationMemoryEngine.hasReference(message)
    );
  }

  isCheckoutRequest(message = "") {
    return ConversationFlowAnalyzer.CHECKOUT_PATTERNS.test(String(message || ""));
  }

  isRecommendationRequest(message = "") {
    return ConversationFlowAnalyzer.RECOMMENDATION_PATTERNS.test(String(message || ""));
  }

  isFollowUp(message, sessionContext = {}) {
    if (!sessionContext || sessionContext.turnCount <= 1) return false;
    if (!sessionContext.lastToolResult && !sessionContext.lastSearchRequest) return false;

    const text = String(message || "").toLowerCase().trim();
    const patterns = [
      /^only\b/,
      /^just\b/,
      /\binstead\b/,
      /\bcheaper\b/,
      /\bunder\b/,
      /\bbelow\b/,
      /\bwhich one\b/,
      /\bbest battery\b/,
      /\bcompare\b/,
      /\bthe first\b/,
      /\bshow me more\b/,
      /\bfilter\b/,
      /\bblack\b/,
      /\bwhite\b/,
      /\bmore results\b/,
      /\bwhat about\b/,
    ];
    return patterns.some((pattern) => pattern.test(text));
  }

  analyze(message, sessionContext = {}) {
    const text = String(message || "").toLowerCase().trim();
    const followUp = this.isFollowUp(message, sessionContext);
    const memory = this.conversationMemoryEngine.resolve(message, sessionContext);

    if (memory.hit && sessionContext.turnCount > 1) {
      const intentHint = this.conversationMemoryEngine.inferIntentFromReference(
        message,
        memory,
        sessionContext
      );
      return {
        followUp: true,
        type: "memory_reference",
        intent: intentHint.intent,
        toolStrategy: intentHint.toolStrategy,
        reason: "resolved_conversation_reference",
        memory,
        memoryAction: intentHint.action,
        memoryMode: intentHint.mode,
        reuseToolResults: intentHint.toolStrategy === "reuse",
      };
    }

    if (memory.miss && this.isMemoryReference(message, sessionContext)) {
      return {
        followUp: true,
        type: "memory_miss",
        intent: "commerce_chat",
        toolStrategy: "execute",
        reason: "unresolved_conversation_reference",
        memory,
      };
    }

    if (this.isCheckoutRequest(message)) {
      const hasProducts =
        (sessionContext.currentProducts?.length || 0) > 0 ||
        (sessionContext.lastToolResult?.data?.products?.length || 0) > 0 ||
        (sessionContext.lastToolResult?.data?.recommendations?.length || 0) > 0 ||
        Boolean(sessionContext.currentProduct);
      return {
        followUp: sessionContext.turnCount > 1,
        type: "checkout_request",
        intent: "checkout",
        toolStrategy: "execute",
        reason: hasProducts ? "checkout_from_existing_results" : "checkout_needs_product_context",
        reuseToolResults: hasProducts,
      };
    }

    if (this.isRecommendationRequest(message)) {
      const hasProducts =
        (sessionContext.currentProducts?.length || 0) > 0 ||
        (sessionContext.lastToolResult?.data?.products?.length || 0) > 0;
      return {
        followUp: sessionContext.turnCount > 1,
        type: "recommendation_request",
        intent: "recommend",
        toolStrategy: "execute",
        reason: hasProducts ? "recommend_from_existing_results" : "recommend_with_search",
        reuseSearchResults: hasProducts,
      };
    }

    if (
      /which one|best battery|compare them|tell me about (this|the)|what about the first/i.test(
        text
      )
    ) {
      if (!sessionContext.lastToolResult) {
        return {
          followUp: false,
          type: "new_turn",
          intent: "search",
          toolStrategy: "execute",
          reason: "question_without_prior_results",
        };
      }
      return {
        followUp,
        type: "result_question",
        intent: "commerce_chat",
        toolStrategy: "reuse",
        reason: "question_about_existing_results",
      };
    }

    if (/\binstead\b|switch to|what about (apple|samsung|nike|dell|sony|lg)\b|show (apple|samsung|nike|dell)\b/i.test(text)) {
      return {
        followUp,
        type: "topic_switch",
        intent: "search",
        toolStrategy: "execute",
        reason: "new_search_topic",
      };
    }

    if (
      followUp &&
      sessionContext.lastSearchRequest &&
      (/^only\b|^just\b|cheaper|under |below |above |over |black|white|in stock|sort by|page \d+/i.test(text) ||
        text.split(/\s+/).length <= 6)
    ) {
      return {
        followUp,
        type: "search_refinement",
        intent: "search",
        toolStrategy: "execute",
        reason: "refine_existing_search",
      };
    }

    if (followUp && sessionContext.lastToolResult) {
      return {
        followUp,
        type: "contextual_follow_up",
        intent: sessionContext.lastIntent || "commerce_chat",
        toolStrategy: "reuse",
        reason: "reuse_previous_tool_result",
      };
    }

    return {
      followUp: false,
      type: "new_turn",
      intent: null,
      toolStrategy: "execute",
      reason: "fresh_tool_execution",
    };
  }

  buildSearchRequest(message, sessionContext = {}, options = {}) {
    if (
      sessionContext.lastSearchRequest &&
      this.isFollowUp(message, sessionContext) &&
      !/\binstead\b|switch to|what about (apple|samsung|nike|dell|sony|lg)\b/i.test(message)
    ) {
      return this.searchParameterExtractor.refine(sessionContext.lastSearchRequest, message, options);
    }
    return this.searchParameterExtractor.extract(message, options);
  }
}

module.exports = ConversationFlowAnalyzer;
