const OpenAIConfiguration = require("./OpenAIConfiguration");
const { estimateCostUsd } = require("./OpenAICostEstimator");

/**
 * Internal OpenAI SDK wrapper — never import outside providers/openai/.
 */
class OpenAIClient {
  constructor(config = null) {
    this.config = config || OpenAIConfiguration.fromEnv();
    this._client = null;
  }

  _getClient() {
    if (!this.config.isConfigured()) {
      throw new Error("OpenAI is not configured — set OPENAI_API_KEY");
    }
    if (!this._client) {
      // eslint-disable-next-line global-require
      const OpenAI = require("openai");
      this._client = new OpenAI({
        apiKey: this.config.apiKey,
        timeout: this.config.timeoutMs,
        ...(this.config.baseURL ? { baseURL: this.config.baseURL } : {}),
      });
    }
    return this._client;
  }

  async chatCompletion({ messages, model, maxTokens, responseFormat = null, temperature = 0.4 }) {
    const client = this._getClient();
    const resolvedModel = model || this.config.model;

    const params = {
      model: resolvedModel,
      messages,
      max_tokens: maxTokens || this.config.maxTokens,
      temperature,
    };

    if (responseFormat === "json") {
      params.response_format = { type: "json_object" };
    }

    const response = await client.chat.completions.create(params);
    const choice = response.choices?.[0]?.message?.content || "";
    const usage = {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    };
    const cost = estimateCostUsd(resolvedModel, usage);

    return { content: choice, usage, cost, model: resolvedModel };
  }

  async visionAnalysis({ imageUrl, imageBase64, prompt, model, maxTokens }) {
    const client = this._getClient();
    const resolvedModel = model || this.config.visionModel;

    const imageContent = imageUrl
      ? { type: "image_url", image_url: { url: imageUrl, detail: "auto" } }
      : {
          type: "image_url",
          image_url: {
            url: imageBase64.startsWith("data:")
              ? imageBase64
              : `data:image/jpeg;base64,${imageBase64}`,
            detail: "auto",
          },
        };

    const response = await client.chat.completions.create({
      model: resolvedModel,
      max_tokens: maxTokens || this.config.maxTokens,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }, imageContent],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices?.[0]?.message?.content || "{}";
    const usage = {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    };
    const cost = estimateCostUsd(resolvedModel, usage);

    return { content, usage, cost, model: resolvedModel };
  }
}

module.exports = OpenAIClient;
