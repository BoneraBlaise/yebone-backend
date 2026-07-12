/**
 * Email provider contract — no SMTP or external mail SDK.
 */
class EmailProvider {
  async send(_message) {
    throw new Error("EmailProvider.send must be implemented");
  }

  async sendTemplate(_templateId, _data) {
    throw new Error("EmailProvider.sendTemplate must be implemented");
  }

  async queue(_message) {
    throw new Error("EmailProvider.queue must be implemented");
  }
}

module.exports = EmailProvider;
