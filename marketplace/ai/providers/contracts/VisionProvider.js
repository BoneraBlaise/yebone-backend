const BaseServiceProvider = require("./BaseServiceProvider");

class VisionProvider extends BaseServiceProvider {
  constructor(config = {}) {
    super("vision", "vision");
    this.model = config.model || "yebo-vision-mock-v1";
  }

  async execute(input, options = {}) {
    const text = typeof input === "string" ? input : JSON.stringify(input);
    return {
      providerCategory: this.category,
      model: this.model,
      mock: true,
      status: "orchestrated",
      imageGeneration: false,
      content: `YEBO AI vision analysis orchestrated. Input length: ${text.length}.`,
      displayBrand: "YEBO AI",
    };
  }
}

module.exports = VisionProvider;
