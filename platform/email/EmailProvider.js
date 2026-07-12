class EmailProvider {
  async send(_message) {
    throw new Error("EmailProvider.send must be implemented");
  }

  async sendTemplate(_templateId, _data, _options = {}) {
    throw new Error("EmailProvider.sendTemplate must be implemented");
  }

  async verify() {
    throw new Error("EmailProvider.verify must be implemented");
  }
}

module.exports = EmailProvider;
