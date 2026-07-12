class PaymentConfigPlaceholder {
  constructor(env) {
    this.providerIntegrationsEnabled = env.get("PAYMENT_PROVIDER_INTEGRATIONS", "false") === "true";
    this.defaultCurrency = env.get("PAYMENT_DEFAULT_CURRENCY", "USD");
    this.stripeSecretKey = env.get("STRIPE_SECRET_KEY", "");
    this.stripeApiKey = env.get("STRIPE_API_KEY", "");
    this.flutterwavePublicKey = env.get("FLUTTERWAVE_PUBLIC_KEY", "");
    this.paypackClientId = env.get("PAYPACK_CLIENT_ID", "");
    this.mtnSubscriptionKey = env.get("MTN_SUBSCRIPTION_KEY", "");
    this.airtelClientId = env.get("AIRTEL_CLIENT_ID", "");
  }
  isProviderEnabled() { return false; }
}
module.exports = PaymentConfigPlaceholder;
