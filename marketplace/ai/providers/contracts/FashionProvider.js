const BaseServiceProvider = require("./BaseServiceProvider");
const FashnConfiguration = require("../fashn/FashnConfiguration");
const FashnClient = require("../fashn/FashnClient");
const { validateTryOnImages } = require("../fashn/FashnImageValidator");

const ACCESSORY_PREVIEW_TYPES = new Set(["foot_tryon", "face_tryon", "wrist_tryon", "neck_tryon"]);

/**
 * YEBO AI fashion / virtual try-on provider.
 * All FASHN API logic stays inside providers/fashn/.
 * Falls back to mock orchestration when FASHN_API_KEY is unset.
 */
class FashionProvider extends BaseServiceProvider {
  constructor(config = {}) {
    super("fashion", "fashion");
    this.fashnConfig = FashnConfiguration.fromEnv(config.fashn || config);
    this.client = new FashnClient(this.fashnConfig);
    this.model = this.fashnConfig.publicModelAlias;
  }

  get isLive() {
    return this.fashnConfig.isConfigured();
  }

  async initialize() {
    this._initialized = true;
    return {
      providerId: this.id,
      category: this.category,
      initialized: true,
      mock: !this.isLive,
      configured: this.isLive,
      displayBrand: "YEBO AI",
    };
  }

  async health() {
    return {
      providerId: this.id,
      category: this.category,
      configured: this.isLive,
      healthy: this._initialized,
      mock: !this.isLive,
      displayBrand: "YEBO AI",
    };
  }

  _parseInput(input) {
    if (typeof input === "string") {
      try {
        return JSON.parse(input);
      } catch {
        return { raw: input };
      }
    }
    return input || {};
  }

  _resolveImages(parsedInput = {}, options = {}) {
    const inputs = options.inputs || parsedInput.inputs || {};
    const personImage =
      inputs.personImage ||
      inputs.userPhoto ||
      inputs.modelImage ||
      inputs.model_image ||
      null;
    const garmentImage =
      inputs.garmentImage ||
      inputs.productImage ||
      inputs.garment_image ||
      options.productImageUrl ||
      parsedInput.productImageUrl ||
      null;

    return { personImage, garmentImage, inputs };
  }

  _resolveModelName(previewType) {
    if (ACCESSORY_PREVIEW_TYPES.has(previewType)) {
      return process.env.FASHN_ACCESSORY_MODEL || "tryon-max";
    }
    return this.fashnConfig.model;
  }

  async _executeMock(previewType) {
    return {
      providerCategory: this.category,
      model: "yebo-fashion-mock-v1",
      mock: true,
      previewType,
      status: "completed",
      progress: 100,
      imageGeneration: false,
      previewImageUrl: null,
      content: `YEBO AI fashion preview orchestrated for ${previewType}.`,
      displayBrand: "YEBO AI",
      generationDurationMs: 0,
      cost: { estimatedCostUsd: 0, creditsUsed: 0 },
    };
  }

  async _executeLive(parsedInput, options = {}) {
    const previewType = options.previewType || "body_tryon";
    const { personImage, garmentImage } = this._resolveImages(parsedInput, options);

    const validation = validateTryOnImages({ personImage, garmentImage });
    if (!validation.ok) {
      const err = new Error(validation.message);
      err.code = validation.code;
      err.statusCode = 400;
      throw err;
    }

    const modelName = this._resolveModelName(previewType);
    const liveResult = await this.client.startTryOn({
      modelImage: validation.personImage,
      garmentImage: validation.garmentImage,
      modelName,
      options: {
        mode: options.generationMode || "balanced",
        outputFormat: "jpeg",
      },
    });

    return {
      providerCategory: this.category,
      model: this.model,
      mock: false,
      previewType,
      status: "completed",
      progress: 100,
      imageGeneration: true,
      previewImageUrl: liveResult.previewImageUrl,
      output: liveResult.output,
      predictionId: liveResult.predictionId,
      generationDurationMs: liveResult.generationDurationMs,
      cost: liveResult.cost,
      content: "YEBO AI virtual try-on completed.",
      displayBrand: "YEBO AI",
    };
  }

  async execute(input, options = {}) {
    const previewType = options.previewType || "body_tryon";
    const parsedInput = this._parseInput(input);

    if (!this.isLive) {
      return this._executeMock(previewType);
    }

    try {
      return await this._executeLive(parsedInput, {
        ...options,
        previewType,
        inputs: options.inputs || parsedInput.inputs,
      });
    } catch (err) {
      err.displayBrand = "YEBO AI";
      throw err;
    }
  }
}

module.exports = FashionProvider;
