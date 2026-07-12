const EmailProvider = require("./EmailProvider");

class ResendAdapterPlaceholder extends EmailProvider {
  constructor({ apiKey = "", fromAddress = "noreply@example.com" } = {}) {
    super();
    this.apiKey = apiKey;
    this.fromAddress = fromAddress;
  }

  async send(message) {
    return {
      mode: "placeholder",
      provider: "resend",
      messageId: `resend-placeholder-${Date.now()}`,
      from: message.from || this.fromAddress,
      to: message.to,
      subject: message.subject,
      status: "queued",
    };
  }

  async sendTemplate(templateId, data, options = {}) {
    return {
      mode: "placeholder",
      provider: "resend",
      templateId,
      data,
      options,
      status: "queued",
    };
  }

  async verify() {
    return {
      mode: "placeholder",
      provider: "resend",
      verified: false,
      message: "Resend adapter not configured — placeholder only",
    };
  }
}

module.exports = ResendAdapterPlaceholder;
