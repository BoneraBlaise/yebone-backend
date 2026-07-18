const BaseAIProvider = require("./BaseAIProvider");

/** Placeholder provider — not active in Phase 7.1 */
class PlaceholderProvider extends BaseAIProvider {
  constructor(id) {
    super(id, {});
  }

  async health() {
    return {
      providerId: this.id,
      configured: Boolean(process.env[`AI_${this.id.toUpperCase()}_API_KEY`]),
      healthy: false,
      active: false,
      mock: false,
      note: "Registered for Phase 7.1 — MockProvider is active",
    };
  }
}

function registerPlaceholderProviders(registry) {
  ["openrouter", "gemini", "openai", "anthropic", "groq"].forEach((id) => {
    registry.register(id, new PlaceholderProvider(id), { active: false });
  });
}

module.exports = { PlaceholderProvider, registerPlaceholderProviders };
