class EmailConfig {
  constructor(env) {
    this.provider = env.get("EMAIL_PROVIDER", "placeholder");
    this.smtpHost = env.get("SMPT_HOST", "");
    this.smtpPort = Number(env.get("SMPT_PORT", "587"));
    this.smtpService = env.get("SMPT_SERVICE", "");
    this.smtpMail = env.get("SMPT_MAIL", "");
    this.smtpPassword = env.get("SMPT_PASSWORD", "");
    this.resendApiKey = env.get("RESEND_API_KEY", "");
    this.fromAddress = env.get("EMAIL_FROM", "noreply@example.com");
  }
}
module.exports = EmailConfig;
