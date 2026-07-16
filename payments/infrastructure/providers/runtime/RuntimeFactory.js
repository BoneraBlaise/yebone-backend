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
const MTNMoMoTokenCache = require("./mtn/MTNMoMoTokenCache");
const MTNMoMoOAuthClient = require("./mtn/MTNMoMoOAuthClient");
const MTNMoMoApiUserService = require("./mtn/MTNMoMoApiUserService");
const MTNMoMoCollectionClient = require("./mtn/MTNMoMoCollectionClient");
const MTNMoMoDisbursementClient = require("./mtn/MTNMoMoDisbursementClient");
const MTNMoMoErrorMapper = require("./mtn/MTNMoMoErrorMapper");
const MTNMoMoRuntimeAdapter = require("./mtn/MTNMoMoRuntimeAdapter");
const PaypackAuthClient = require("./paypack/PaypackAuthClient");
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
    const tokenCache = options.tokenCache || new MTNMoMoTokenCache();

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

    return new MTNMoMoRuntimeAdapter({
      collectionClient,
      disbursementClient,
      oauthClient,
      apiUserService,
      errorMapper: options.errorMapper || new MTNMoMoErrorMapper(),
    });
  }

  static createPaypackRuntime(options = {}) {
    const credentialStore = options.credentialStore || RuntimeFactory.createCredentialStore(options);
    const environmentResolver =
      options.environmentResolver || new ProviderEnvironmentResolver(options);
    const httpClient = RuntimeFactory.createHttpClient(options);
    const tokenCache = options.tokenCache || new MTNMoMoTokenCache();

    const authClient = new PaypackAuthClient({
      credentialStore,
      tokenCache,
      httpClient,
      environmentResolver,
    });

    return new PaypackRuntimeAdapter({
      authClient,
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
