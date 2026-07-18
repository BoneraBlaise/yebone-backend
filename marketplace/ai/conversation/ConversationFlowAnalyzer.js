/**
 * Follow-up analysis for commerce assistant turns (Phase 7.4 + 7.5 recommendations).
 */
class ConversationFlowAnalyzer {
  static RECOMMENDATION_PATTERNS =
    /what do you recommend|which one do you recommend|which one should i buy|which is better|best option|what would you recommend|you recommend|recommend one from|recommend one\b/i;

  constructor({ searchParameterExtractor } = {}) {
    this.searchParameterExtractor = searchParameterExtractor;
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
