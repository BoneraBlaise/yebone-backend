const SMTPAdapterPlaceholder = require("./SMTPAdapterPlaceholder");
const ResendAdapterPlaceholder = require("./ResendAdapterPlaceholder");
const TemplateRegistry = require("./TemplateRegistry");
const Mailer = require("./Mailer");

const DEFAULT_TEMPLATES = [
  {
    id: "welcome",
    subject: "Welcome to {{appName}}",
    body: "Hello {{name}}, welcome to {{appName}}!",
  },
  {
    id: "password-reset",
    subject: "Reset your password",
    body: "Use this link to reset your password: {{resetLink}}",
  },
];

class EmailBootstrap {
  static create({ emailConfig } = {}) {
    const providerName = emailConfig?.provider || "placeholder";
    let provider;

    if (providerName === "smtp") {
      provider = new SMTPAdapterPlaceholder({
        host: emailConfig?.smtpHost,
        port: emailConfig?.smtpPort,
        service: emailConfig?.smtpService,
        mail: emailConfig?.smtpMail,
        password: emailConfig?.smtpPassword,
      });
    } else if (providerName === "resend") {
      provider = new ResendAdapterPlaceholder({
        apiKey: emailConfig?.resendApiKey,
        fromAddress: emailConfig?.fromAddress,
      });
    } else {
      provider = new SMTPAdapterPlaceholder();
    }

    const templateRegistry = new TemplateRegistry();
    for (const template of DEFAULT_TEMPLATES) {
      templateRegistry.register(template.id, template);
    }

    const mailer = new Mailer({
      provider,
      templateRegistry,
      fromAddress: emailConfig?.fromAddress || "noreply@example.com",
    });

    return {
      provider,
      providerName,
      templateRegistry,
      mailer,
    };
  }
}

module.exports = EmailBootstrap;
