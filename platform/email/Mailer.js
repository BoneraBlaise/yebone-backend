class Mailer {
  constructor({ provider, templateRegistry, fromAddress = "noreply@example.com" } = {}) {
    this.provider = provider;
    this.templateRegistry = templateRegistry;
    this.fromAddress = fromAddress;
  }

  async send({ to, subject, body, html, from }) {
    return this.provider.send({
      from: from || this.fromAddress,
      to,
      subject,
      text: body,
      html: html || body,
    });
  }

  async sendTemplate(templateId, { to, data = {}, from } = {}) {
    const rendered = this.templateRegistry.render(templateId, data);
    return this.provider.sendTemplate(templateId, data, {
      from: from || this.fromAddress,
      to,
      subject: rendered.subject,
      body: rendered.body,
    });
  }

  async verify() {
    return this.provider.verify();
  }
}

module.exports = Mailer;
