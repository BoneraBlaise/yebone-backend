/**
 * MTN MoMo sandbox configuration — metadata only, no secrets.
 */
const MTNMoMoConfig = Object.freeze({
  providerCode: "MTN_MOMO",
  sandbox: Object.freeze({
    baseUrl: "https://sandbox.momodeveloper.mtn.com",
    targetEnvironment: "sandbox",
    collectionOauthPath: "/collection/token/",
    disbursementOauthPath: "/disbursement/token/",
    collectionPath: "/collection/v1_0/requesttopay",
    collectionStatusPath: "/collection/v1_0/requesttopay",
    disbursementPath: "/disbursement/v1_0/transfer",
    disbursementStatusPath: "/disbursement/v1_0/transfer",
    apiUserPath: "/v1_0/apiuser",
    apiKeyPath: "/v1_0/apiuser/{uuid}/apikey",
    subscriptionKeyHeader: "Ocp-Apim-Subscription-Key",
    targetEnvironmentHeader: "X-Target-Environment",
    idempotencyHeader: "X-Reference-Id",
    correlationHeader: "X-Correlation-Id",
  }),
  scopes: Object.freeze({
    collection: "collection",
    disbursement: "disbursement",
  }),
});

module.exports = MTNMoMoConfig;
