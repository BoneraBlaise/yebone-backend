/**
 * Follow-up analysis for commerce assistant turns (Phase 7.4).
 */
class ConversationFlowAnalyzer {
  constructor({ searchParameterExtractor } = {}) {
    this.searchParameterExtractor = searchParameterExtractor;
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

    if (
      /which one|best battery|compare them|tell me about (this|the)|what about the first|recommend one from/i.test(
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
