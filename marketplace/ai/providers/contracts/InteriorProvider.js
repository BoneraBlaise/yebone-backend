const BaseServiceProvider = require("./BaseServiceProvider");

class InteriorProvider extends BaseServiceProvider {
  constructor(config = {}) {
    super("interior", "interior");
    this.model = config.model || "yebo-interior-mock-v1";
  }

  async execute(input, options = {}) {
    const previewType = options.previewType || "room_preview";
    return {
      providerCategory: this.category,
      model: this.model,
      mock: true,
      previewType,
      status: "orchestrated",
      imageGeneration: false,
      content: `YEBO AI interior preview orchestrated for ${previewType}.`,
      displayBrand: "YEBO AI",
    };
  }
}

module.exports = InteriorProvider;
