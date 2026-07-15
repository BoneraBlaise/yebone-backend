const IntegrationConfig = require("./IntegrationConfig");
const { ExecutionStage, STAGE_ORDER } = require("./ExecutionStage");
const EngineHealthContract = require("../engine/EngineHealthContract");
const LedgerHealthContract = require("../ledger/LedgerHealthContract");
const CommissionHealthContract = require("../commission/CommissionHealthContract");
const WalletHealthContract = require("../wallet/WalletHealthContract");

const READY = "ready";
const MISSING = "missing";

/**
 * Aggregated health across all foundation modules wired into the integration gate.
 */
class IntegrationHealthContract {
  static build(deps = {}) {
    const engineHealth = deps.engine ? EngineHealthContract.build(deps.engine) : null;
    const ledgerHealth = deps.ledgerFoundation?.engine
      ? LedgerHealthContract.build(deps.ledgerFoundation.engine)
      : null;
    const commissionHealth = deps.commissionEngine
      ? CommissionHealthContract.build(deps.commissionEngine)
      : null;
    const walletHealth = deps.walletService ? WalletHealthContract.build(deps.walletService) : null;

    const idempotency = IntegrationHealthContract._checkService(deps.idempotencyService, "execute");
    const transactions = IntegrationHealthContract._checkService(
      deps.transactionService,
      "createTransaction"
    );
    const audit = IntegrationHealthContract._checkService(deps.auditService, "record");
    const events = IntegrationHealthContract._checkService(deps.eventBus, "publish");

    const modules = Object.freeze({
      [ExecutionStage.ENGINE]: engineHealth?.healthy === true,
      [ExecutionStage.IDEMPOTENCY]: idempotency === READY,
      [ExecutionStage.TRANSACTION]: transactions === READY,
      [ExecutionStage.COMMISSION]: commissionHealth?.healthy === true,
      [ExecutionStage.LEDGER]: ledgerHealth?.healthy === true,
      [ExecutionStage.WALLET]: walletHealth?.healthy === true,
      [ExecutionStage.AUDIT]: audit === READY,
      [ExecutionStage.EVENTS]: events === READY,
    });

    const ready = Object.values(modules).every(Boolean);

    return Object.freeze({
      ready,
      version: IntegrationConfig.version,
      pipelineVersion: IntegrationConfig.pipelineVersion,
      stages: STAGE_ORDER,
      pipeline: Object.freeze({
        stages: STAGE_ORDER,
        terminalStage: ExecutionStage.COMPLETE,
        stageCount: STAGE_ORDER.length,
      }),
      modules,
      details: Object.freeze({
        engine: engineHealth,
        idempotency: { status: idempotency, stage: ExecutionStage.IDEMPOTENCY },
        transactions: { status: transactions, stage: ExecutionStage.TRANSACTION },
        commission: { ...commissionHealth, stage: ExecutionStage.COMMISSION },
        ledger: { ...ledgerHealth, stage: ExecutionStage.LEDGER },
        wallet: { ...walletHealth, stage: ExecutionStage.WALLET },
        audit: { status: audit, stage: ExecutionStage.AUDIT },
        events: {
          ...(deps.eventBus?.health?.() || { status: events }),
          stage: ExecutionStage.EVENTS,
        },
      }),
      checkedAt: new Date().toISOString(),
    });
  }

  static _checkService(service, methodName) {
    if (!service || typeof service[methodName] !== "function") {
      return MISSING;
    }
    return READY;
  }
}

module.exports = IntegrationHealthContract;
