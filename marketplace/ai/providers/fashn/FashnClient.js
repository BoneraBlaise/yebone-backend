const FashnConfiguration = require("./FashnConfiguration");
const { estimateCostUsd } = require("./FashnCostEstimator");

/**
 * Internal FASHN HTTP client — never import outside providers/fashn/.
 */
class FashnClient {
  constructor(config = null) {
    this.config = config || FashnConfiguration.fromEnv();
  }

  _headers() {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  async _request(path, { method = "GET", body = null } = {}) {
    if (!this.config.isConfigured()) {
      throw new Error("FASHN is not configured — set FASHN_API_KEY");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseURL}${path}`, {
        method,
        headers: this._headers(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          payload?.message ||
          payload?.error?.message ||
          payload?.error ||
          `FASHN request failed (${response.status})`;
        const err = new Error(message);
        err.statusCode = response.status;
        err.code = payload?.error?.name || payload?.error || "FASHN_REQUEST_FAILED";
        throw err;
      }

      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  async startTryOn({ modelImage, garmentImage, modelName, options = {} }) {
    const model_name = modelName || this.config.model;
    const inputs = {
      model_image: modelImage,
      garment_image: garmentImage,
      mode: options.mode || "balanced",
      output_format: options.outputFormat || "jpeg",
      return_base64: options.returnBase64 === true,
    };

    if (model_name === "tryon-max") {
      inputs.product_image = garmentImage;
      delete inputs.garment_image;
    }

    const startedAt = Date.now();
    const runResponse = await this._request("/v1/run", {
      method: "POST",
      body: { model_name, inputs },
    });

    if (runResponse?.error) {
      throw new Error(runResponse.error?.message || runResponse.error || "FASHN run failed");
    }

    const predictionId = runResponse.id;
    if (!predictionId) {
      throw new Error("FASHN did not return a prediction id");
    }

    const completed = await this.pollUntilComplete(predictionId);
    const generationDurationMs = Date.now() - startedAt;
    const creditsUsed = Number(completed.creditsUsed || 1);
    const cost = estimateCostUsd(model_name, { creditsUsed });

    const output = Array.isArray(completed.output) ? completed.output : [];
    const previewImageUrl = output[0] || completed.previewImageUrl || null;

    return {
      predictionId,
      status: completed.status || "completed",
      previewImageUrl,
      output,
      generationDurationMs,
      creditsUsed,
      cost,
    };
  }

  async getStatus(predictionId) {
    return this._request(`/v1/status/${encodeURIComponent(predictionId)}`);
  }

  async pollUntilComplete(predictionId, onProgress = null) {
    const deadline = Date.now() + this.config.timeoutMs;
    let lastStatus = "starting";

    while (Date.now() < deadline) {
      const statusResponse = await this.getStatus(predictionId);
      lastStatus = statusResponse.status || lastStatus;

      if (typeof onProgress === "function") {
        onProgress({
          status: lastStatus,
          progress: mapStatusToProgress(lastStatus),
        });
      }

      if (lastStatus === "completed") {
        const creditsHeader = statusResponse.creditsUsed;
        return {
          ...statusResponse,
          creditsUsed: creditsHeader || 1,
          previewImageUrl: Array.isArray(statusResponse.output) ? statusResponse.output[0] : null,
        };
      }

      if (lastStatus === "failed") {
        const message =
          statusResponse.error?.message ||
          statusResponse.error?.name ||
          "YEBO AI try-on generation failed";
        const err = new Error(message);
        err.code = statusResponse.error?.name || "GENERATION_FAILED";
        throw err;
      }

      await sleep(this.config.pollIntervalMs);
    }

    const err = new Error(`YEBO AI try-on timed out while ${lastStatus}`);
    err.code = "GENERATION_TIMEOUT";
    throw err;
  }
}

function mapStatusToProgress(status) {
  switch (status) {
    case "starting":
      return 10;
    case "in_queue":
      return 25;
    case "processing":
      return 60;
    case "completed":
      return 100;
    case "failed":
      return 0;
    default:
      return 15;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = FashnClient;
