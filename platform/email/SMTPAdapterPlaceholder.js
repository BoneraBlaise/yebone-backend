const EmailProvider = require("./EmailProvider");

class SMTPAdapterPlaceholder extends EmailProvider {
  constructor({ host = "", port = 587, service = "", mail = "", password = "" } = {}) {
    super();
    this.host = host;
    this.port = port;
    this.service = service;
    this.mail = mail;
    this.password = password;
  }

  async send(message) {
    return {
      mode: "placeholder",
      provider: "smtp",
      messageId: `smtp-placeholder-${Date.now()}`,
      to: message.to,
      subject: message.subject,
      status: "queued",
    };
  }

  async sendTemplate(templateId, data, options = {}) {
    return {
      mode: "placeholder",
      provider: "smtp",
      templateId,
      data,
      options,
      status: "queued",
    };
  }

  async verify() {
    return {
      mode: "placeholder",
      provider: "smtp",
      verified: false,
      message: "SMTP adapter not configured — placeholder only",
    };
  }
}

module.exports = SMTPAdapterPlaceholder;
