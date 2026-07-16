const PaypackConfig = require("./PaypackConfig");

/**
 * Resolves Paypack credentials for runtime clients.
 * Supports client credentials and optional username/password for future extension.
 */
class PaypackCredentials {
  static resolveProduct(credentialResult, product = "default") {
    const credentials = credentialResult?.credentials || {};
    const normalizedProduct = String(product || "default").trim().toLowerCase();
    const productCredentials =
      normalizedProduct === "checkout" && credentials.checkout
        ? credentials.checkout
        : credentials.default || credentials;

    const clientId = productCredentials.clientId || credentials.clientId || null;
    const clientSecret = productCredentials.clientSecret || credentials.clientSecret || null;
    const username = productCredentials.username || credentials.username || null;
    const password = productCredentials.password || credentials.password || null;
    const webhookSecret = productCredentials.webhookSecret || credentials.webhookSecret || null;
    const appId =
      productCredentials.appId ||
      productCredentials.applicationId ||
      credentials.appId ||
      credentials.applicationId ||
      null;

    return Object.freeze({
      clientId,
      clientSecret,
      username,
      password,
      webhookSecret,
      appId,
      mode: clientId && clientSecret ? "client_credentials" : username && password ? "password" : null,
      product: normalizedProduct,
    });
  }

  static resolve(credentialResult) {
    const credentials = credentialResult?.credentials || {};
    const defaultAuth = PaypackCredentials.resolveProduct(credentialResult, "default");
    const checkoutAuth = PaypackCredentials.resolveProduct(credentialResult, "checkout");

    const auth = Object.freeze({ ...defaultAuth });

    return Object.freeze({
      auth,
      checkout: Object.freeze({ ...checkoutAuth }),
      transactions: Object.freeze({ ...defaultAuth }),
    });
  }

  static assertAuthResolvable(resolved) {
    if (!resolved?.auth?.mode) {
      throw new Error("PaypackCredentials: clientId/clientSecret or username/password required");
    }
    return resolved;
  }
}

module.exports = PaypackCredentials;
