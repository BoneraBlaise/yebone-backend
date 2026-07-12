/**
 * Payment provider contract.
 *
 * All concrete providers must implement these methods.
 * PaymentService depends only on this interface — never on a specific provider.
 *
 * @typedef {Object} PaymentRequest
 * @property {number} amount
 * @property {string} currency
 * @property {string} method
 * @property {Object} metadata
 *
 * @typedef {Object} PaymentResult
 * @property {string} providerReference
 * @property {string} status
 * @property {Object} raw
 */
class PaymentProviderInterface {
  /**
   * @returns {string} Provider code (e.g. STRIPE)
   */
  getCode() {
    throw new Error("getCode() must be implemented");
  }

  /**
   * @param {PaymentRequest} _request
   * @returns {Promise<PaymentResult>}
   */
  async createPayment(_request) {
    throw new Error("createPayment() must be implemented");
  }

  /**
   * @param {string} _providerReference
   * @returns {Promise<PaymentResult>}
   */
  async verifyPayment(_providerReference) {
    throw new Error("verifyPayment() must be implemented");
  }

  /**
   * @param {string} _providerReference
   * @returns {Promise<PaymentResult>}
   */
  async cancelPayment(_providerReference) {
    throw new Error("cancelPayment() must be implemented");
  }

  /**
   * @param {string} _providerReference
   * @param {number} _amount
   * @param {string} [_reason]
   * @returns {Promise<PaymentResult>}
   */
  async refundPayment(_providerReference, _amount, _reason) {
    throw new Error("refundPayment() must be implemented");
  }

  /**
   * @param {Object} _payoutRequest
   * @returns {Promise<Object>}
   */
  async createPayout(_payoutRequest) {
    throw new Error("createPayout() must be implemented");
  }

  /**
   * @param {Object} _headers
   * @param {Object|string} _payload
   * @returns {Promise<Object>}
   */
  async verifyWebhook(_headers, _payload) {
    throw new Error("verifyWebhook() must be implemented");
  }

  /**
   * @param {string} _providerReference
   * @returns {Promise<Object>}
   */
  async getTransaction(_providerReference) {
    throw new Error("getTransaction() must be implemented");
  }

  /**
   * @returns {Promise<{ healthy: boolean, message?: string }>}
   */
  async healthCheck() {
    throw new Error("healthCheck() must be implemented");
  }
}

module.exports = PaymentProviderInterface;
