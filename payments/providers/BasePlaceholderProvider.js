const PaymentProviderInterface = require("../contracts/PaymentProviderInterface");
const NotImplementedError = require("../errors/NotImplementedError");

class BasePlaceholderProvider extends PaymentProviderInterface {
  constructor(providerName, code) {
    super();
    this.providerName = providerName;
    this.code = code;
  }

  getCode() {
    return this.code;
  }

  _notImplemented(methodName) {
    throw new NotImplementedError(this.providerName, methodName);
  }

  async createPayment() {
    this._notImplemented("createPayment");
  }

  async verifyPayment() {
    this._notImplemented("verifyPayment");
  }

  async cancelPayment() {
    this._notImplemented("cancelPayment");
  }

  async refundPayment() {
    this._notImplemented("refundPayment");
  }

  async createPayout() {
    this._notImplemented("createPayout");
  }

  async verifyWebhook() {
    this._notImplemented("verifyWebhook");
  }

  async getTransaction() {
    this._notImplemented("getTransaction");
  }

  async healthCheck() {
    this._notImplemented("healthCheck");
  }
}

module.exports = BasePlaceholderProvider;
