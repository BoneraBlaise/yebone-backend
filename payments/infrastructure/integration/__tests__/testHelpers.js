const createPaymentEngine = require("../../engine/PaymentEngineFactory");
const ProviderRegistry = require("../../engine/ProviderRegistry");
const ProviderResolver = require("../../engine/ProviderResolver");
const FeatureFlagRegistry = require("../../engine/FeatureFlagRegistry");
const TransactionService = require("../../transactions/TransactionService");
const AuditService = require("../../audit/AuditService");
const { createLedgerFoundation } = require("../../ledger");
const { createCommissionEngine } = require("../../commission");
const { createWalletFoundation } = require("../../wallet");
const { createEventBus } = require("../../events");
const PaymentExecutionPipeline = require("../PaymentExecutionPipeline");
const PaymentIntegrationGate = require("../PaymentIntegrationGate");

function createMemoryTransactionRepository() {
  const store = [];
  return {
    store,
    async ensureIndexes() {},
    async create(record) {
      const existing = store.find((row) => row.transactionId === record.transactionId);
      if (existing) {
        return { ...existing };
      }
      store.push(record);
      return { ...record };
    },
    async findByTransactionId(transactionId) {
      return store.find((row) => row.transactionId === transactionId) || null;
    },
    async transitionStatus(transactionId, fromStatus, toStatus, patch = {}) {
      const index = store.findIndex((row) => row.transactionId === transactionId);
      if (index === -1) {
        return null;
      }

      const current = store[index];
      if (current.status === toStatus) {
        return { ...current };
      }

      if (current.status !== fromStatus) {
        return null;
      }

      const updated = {
        ...current,
        ...patch,
        status: toStatus,
        metadata: patch.metadata || current.metadata,
      };
      store[index] = updated;
      return { ...updated };
    },
  };
}

function createMemoryAuditRepository() {
  const store = [];
  return {
    store,
    async append(record) {
      const doc = { ...record, createdAt: new Date() };
      store.push(doc);
      return { ...doc };
    },
  };
}

function createIdempotencyService() {
  const completed = new Map();
  return {
    fingerprint: (payload) => JSON.stringify(payload),
    async execute(key, payload, handler) {
      if (completed.has(key)) {
        return completed.get(key);
      }
      const result = await handler();
      completed.set(key, result);
      return result;
    },
  };
}

function createRetryableIdempotencyService() {
  const completed = new Map();
  return {
    fingerprint: (payload) => JSON.stringify(payload),
    async execute(key, payload, handler) {
      if (completed.has(key)) {
        return completed.get(key);
      }
      const result = await handler();
      completed.set(key, result);
      return result;
    },
  };
}

function createTestIntegrationFoundation(options = {}) {
  const featureFlags = new FeatureFlagRegistry({
    paymentEngineEnabled: true,
    ...options.featureFlagOverrides,
  });
  featureFlags.enable("paymentEngineEnabled");

  const providerRegistry = new ProviderRegistry();
  providerRegistry.registerDefaults();
  const providerResolver = new ProviderResolver({ registry: providerRegistry, featureFlags });

  const transactionRepository = createMemoryTransactionRepository();
  const auditRepository = createMemoryAuditRepository();
  const transactionService = new TransactionService({ repository: transactionRepository });
  const auditService = new AuditService({ repository: auditRepository });
  const idempotencyService = createIdempotencyService();

  const { engine } = createPaymentEngine({
    idempotencyService,
    transactionService,
    auditService,
    providerResolver,
    featureFlags,
  });

  const ledgerFoundation = createLedgerFoundation();
  const commission = createCommissionEngine({
    rules: options.commissionRules || [{ strategy: "GLOBAL", rate: 10 }],
  });
  const wallet = createWalletFoundation({ ledgerFoundation });
  const events = createEventBus({ autoDispatch: false });

  const deps = Object.freeze({
    engine,
    idempotencyService,
    transactionService,
    auditService,
    commissionEngine: commission.engine,
    ledgerFoundation,
    walletService: wallet.service,
    eventBus: events.bus,
    featureFlags,
  });

  const pipeline = new PaymentExecutionPipeline(deps);
  const gate = new PaymentIntegrationGate({ deps, pipeline });

  return Object.freeze({
    gate,
    pipeline,
    deps,
    ledgerFoundation,
    commission,
    wallet,
    events,
    transactionRepository,
    auditRepository,
    idempotencyService,
  });
}

module.exports = {
  createTestIntegrationFoundation,
  createMemoryTransactionRepository,
  createMemoryAuditRepository,
  createIdempotencyService,
  createRetryableIdempotencyService,
};
