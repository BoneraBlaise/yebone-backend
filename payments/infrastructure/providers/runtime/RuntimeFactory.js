const RuntimeConfig = require("./RuntimeConfig");
const ProviderCredentialStore = require("./ProviderCredentialStore");
const EnvironmentCredentialProvider = require("./credentials/EnvironmentCredentialProvider");
const SecretManagerCredentialProvider = require("./credentials/SecretManagerCredentialProvider");
const VaultCredentialProvider = require("./credentials/VaultCredentialProvider");
const ProviderEnvironmentResolver = require("./ProviderEnvironmentResolver");
const ProviderTimeoutPolicy = require("./ProviderTimeoutPolicy");
const ProviderRetryPolicy = require("./ProviderRetryPolicy");
const ProviderRequestSigner = require("./ProviderRequestSigner");
const ProviderHttpClient = require("./ProviderHttpClient");
const ProviderErrorMapper = require("./ProviderErrorMapper");
const ProviderTokenCache = require("./ProviderTokenCache");
const MTNMoMoOAuthClient = require("./mtn/MTNMoMoOAuthClient");
const MTNMoMoApiUserService = require("./mtn/MTNMoMoApiUserService");
const MTNMoMoCollectionClient = require("./mtn/MTNMoMoCollectionClient");
const MTNMoMoDisbursementClient = require("./mtn/MTNMoMoDisbursementClient");
const MTNMoMoRefundClient = require("./mtn/MTNMoMoRefundClient");
const MTNMoMoErrorMapper = require("./mtn/MTNMoMoErrorMapper");
const MTNMoMoRuntimeAdapter = require("./mtn/MTNMoMoRuntimeAdapter");
const PaypackAuthClient = require("./paypack/PaypackAuthClient");
const PaypackCheckoutClient = require("./paypack/PaypackCheckoutClient");
const PaypackCashinClient = require("./paypack/PaypackCashinClient");
const PaypackVerifyClient = require("./paypack/PaypackVerifyClient");
const PaypackRefundClient = require("./paypack/PaypackRefundClient");
const PaypackErrorMapper = require("./paypack/PaypackErrorMapper");
const PaypackRuntimeAdapter = require("./paypack/PaypackRuntimeAdapter");

/**
 * Composition root for Module 10 provider runtime — not wired to PaymentModule.
 */
class RuntimeFactory {
  static createCredentialStore(options = {}) {
    const providers = options.providers || [
      new EnvironmentCredentialProvider(options),
      new SecretManagerCredentialProvider(options),
      new VaultCredentialProvider(options),
    ];
    return new ProviderCredentialStore(providers);
  }

  static createHttpClient(options = {}) {
    return new ProviderHttpClient({
      transport: options.transport,
      timeoutPolicy: options.timeoutPolicy || new ProviderTimeoutPolicy(options),
      retryPolicy: options.retryPolicy || new ProviderRetryPolicy(options),
      signer: options.signer || ProviderRequestSigner,
      liveExecutionEnabled: options.liveExecutionEnabled ?? RuntimeConfig.liveExecutionEnabled,
    });
  }

  static createMtnMoMoRuntime(options = {}) {
    const credentialStore = options.credentialStore || RuntimeFactory.createCredentialStore(options);
    const environmentResolver =
      options.environmentResolver || new ProviderEnvironmentResolver(options);
    const httpClient = RuntimeFactory.createHttpClient(options);
    const tokenCache = options.tokenCache || new ProviderTokenCache();

    const oauthClient = new MTNMoMoOAuthClient({
      credentialStore,
      tokenCache,
      httpClient,
      environmentResolver,
    });

    const apiUserService = new MTNMoMoApiUserService({
      credentialStore,
      httpClient,
      environmentResolver,
    });

    const collectionClient = new MTNMoMoCollectionClient({
      oauthClient,
      httpClient,
      environmentResolver,
    });

    const disbursementClient = new MTNMoMoDisbursementClient({
      oauthClient,
      httpClient,
      environmentResolver,
    });

    const refundClient = options.refundClient || new MTNMoMoRefundClient();

    return new MTNMoMoRuntimeAdapter({
      collectionClient,
      disbursementClient,
      oauthClient,
      apiUserService,
      refundClient,
      errorMapper: options.errorMapper || new MTNMoMoErrorMapper(),
    });
  }

  static createPaypackRuntime(options = {}) {
    const credentialStore = options.credentialStore || RuntimeFactory.createCredentialStore(options);
    const environmentResolver =
      options.environmentResolver || new ProviderEnvironmentResolver(options);
    const httpClient = RuntimeFactory.createHttpClient(options);
    const tokenCache = options.tokenCache || new ProviderTokenCache();

    const authClient = new PaypackAuthClient({
      credentialStore,
      tokenCache,
      httpClient,
      environmentResolver,
    });

    const verifyClient = new PaypackVerifyClient({
      authClient,
      httpClient,
      environmentResolver,
    });

    const cashinClient = new PaypackCashinClient({
      authClient,
      httpClient,
      environmentResolver,
      verifyClient,
    });

    const checkoutClient = new PaypackCheckoutClient({
      authClient,
      httpClient,
      environmentResolver,
    });

    const refundClient = options.refundClient || new PaypackRefundClient();

    return new PaypackRuntimeAdapter({
      authClient,
      checkoutClient,
      cashinClient,
      verifyClient,
      refundClient,
      errorMapper: options.errorMapper || new PaypackErrorMapper(),
    });
  }

  static create(options = {}) {
    return Object.freeze({
      version: RuntimeConfig.version,
      credentialStore: RuntimeFactory.createCredentialStore(options),
      environmentResolver: new ProviderEnvironmentResolver(options),
      httpClient: RuntimeFactory.createHttpClient(options),
      errorMapper: new ProviderErrorMapper(),
      mtnMoMo: RuntimeFactory.createMtnMoMoRuntime(options),
      paypack: RuntimeFactory.createPaypackRuntime(options),
    });
  }
}

module.exports = RuntimeFactory;
