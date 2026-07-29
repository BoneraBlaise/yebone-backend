const VendorCreditsWallet = require("../models/VendorCreditsWallet");
const VendorCreditTransaction = require("../models/VendorCreditTransaction");
const AIRequestIdempotency = require("../models/AIRequestIdempotency");

class VendorCreditsService {
  async getWallet(vendorId) {
    return VendorCreditsWallet.findOne({ vendorId: String(vendorId) }).lean();
  }

  async getWalletSnapshot(vendorId) {
    const wallet = await this.getWallet(vendorId);
    if (!wallet) {
      return {
        currentCredits: 0,
        monthlyAllocation: 0,
        consumedCredits: 0,
        remainingCredits: 0,
        cycleStartedAt: null,
        nextResetAt: null,
        displayBrand: "YEBO AI",
      };
    }
    return {
      currentCredits: wallet.currentCredits,
      monthlyAllocation: wallet.monthlyAllocation,
      consumedCredits: wallet.consumedCredits,
      remainingCredits: wallet.currentCredits,
      cycleStartedAt: wallet.cycleStartedAt,
      nextResetAt: wallet.nextResetAt,
      displayBrand: "YEBO AI",
    };
  }

  async _findIdempotentResult(idempotencyKey) {
    if (!idempotencyKey) return null;
    return AIRequestIdempotency.findOne({ idempotencyKey, status: "completed" }).lean();
  }

  async consumeCredits(vendorId, amount, {
    idempotencyKey = null,
    requestId = null,
    serviceType = null,
    metadata = {},
  } = {}) {
    const cost = Number(amount) || 0;
    const id = String(vendorId);

    if (cost <= 0) {
      return { ok: true, creditsConsumed: 0, duplicate: false, wallet: await this.getWalletSnapshot(id) };
    }

    if (idempotencyKey) {
      const existing = await this._findIdempotentResult(idempotencyKey);
      if (existing) {
        return {
          ok: true,
          duplicate: true,
          creditsConsumed: existing.creditsDebited || 0,
          wallet: await this.getWalletSnapshot(id),
          cachedResponse: existing.response,
          transactionId: existing.transactionId,
        };
      }

      try {
        await AIRequestIdempotency.create({
          idempotencyKey,
          vendorId: id,
          serviceType,
          requestId,
          status: "processing",
        });
      } catch (err) {
        if (err.code === 11000) {
          const dup = await this._findIdempotentResult(idempotencyKey);
          if (dup) {
            return {
              ok: true,
              duplicate: true,
              creditsConsumed: dup.creditsDebited || 0,
              wallet: await this.getWalletSnapshot(id),
              cachedResponse: dup.response,
            };
          }
        }
        throw err;
      }
    }

    const wallet = await VendorCreditsWallet.findOneAndUpdate(
      { vendorId: id, currentCredits: { $gte: cost } },
      { $inc: { currentCredits: -cost, consumedCredits: cost } },
      { new: true }
    );

    if (!wallet) {
      if (idempotencyKey) {
        await AIRequestIdempotency.findOneAndUpdate({ idempotencyKey }, { status: "failed" });
      }
      return {
        ok: false,
        error: "insufficient_credits",
        code: "INSUFFICIENT_CREDITS",
        wallet: await this.getWalletSnapshot(id),
        displayBrand: "YEBO AI",
      };
    }

    const tx = await VendorCreditTransaction.create({
      vendorId: id,
      type: "consumption",
      amount: cost,
      balanceAfter: wallet.currentCredits,
      idempotencyKey: idempotencyKey || undefined,
      requestId,
      serviceType,
      status: "completed",
      metadata,
    });

    return {
      ok: true,
      duplicate: false,
      creditsConsumed: cost,
      wallet: await this.getWalletSnapshot(id),
      transactionId: tx._id.toString(),
    };
  }

  async rollbackConsumption(transactionId, { reason = "provider_failure" } = {}) {
    const tx = await VendorCreditTransaction.findById(transactionId);
    if (!tx || tx.status === "rolled_back" || tx.type !== "consumption") {
      return { ok: false, error: "invalid_transaction" };
    }

    const wallet = await VendorCreditsWallet.findOneAndUpdate(
      { vendorId: tx.vendorId },
      { $inc: { currentCredits: tx.amount, consumedCredits: -tx.amount } },
      { new: true }
    );

    tx.status = "rolled_back";
    tx.metadata = { ...tx.metadata, rollbackReason: reason };
    await tx.save();

    await VendorCreditTransaction.create({
      vendorId: tx.vendorId,
      type: "refund",
      amount: tx.amount,
      balanceAfter: wallet?.currentCredits ?? 0,
      requestId: tx.requestId,
      serviceType: tx.serviceType,
      status: "completed",
      metadata: { originalTransactionId: transactionId, reason },
    });

    return { ok: true, refunded: tx.amount, wallet: await this.getWalletSnapshot(tx.vendorId) };
  }

  async completeIdempotency(idempotencyKey, response, creditsDebited, transactionId) {
    if (!idempotencyKey) return;
    await AIRequestIdempotency.findOneAndUpdate(
      { idempotencyKey },
      { status: "completed", response, creditsDebited, transactionId }
    );
  }

  async topUp(vendorId, amount, metadata = {}) {
    const added = Number(amount) || 0;
    const wallet = await VendorCreditsWallet.findOneAndUpdate(
      { vendorId: String(vendorId) },
      { $inc: { currentCredits: added } },
      { upsert: true, new: true }
    );

    await VendorCreditTransaction.create({
      vendorId: String(vendorId),
      type: "top_up",
      amount: added,
      balanceAfter: wallet.currentCredits,
      status: "completed",
      metadata,
    });

    return this.getWalletSnapshot(vendorId);
  }

  async allocateMonthly(vendorId, amount) {
    const allocation = Number(amount) || 0;
    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setDate(nextReset.getDate() + 30);

    const wallet = await VendorCreditsWallet.findOneAndUpdate(
      { vendorId: String(vendorId) },
      {
        $set: {
          currentCredits: allocation,
          monthlyAllocation: allocation,
          consumedCredits: 0,
          cycleStartedAt: now,
          nextResetAt: nextReset,
        },
      },
      { upsert: true, new: true }
    );

    await VendorCreditTransaction.create({
      vendorId: String(vendorId),
      type: "allocation",
      amount: allocation,
      balanceAfter: wallet.currentCredits,
      status: "completed",
    });

    return this.getWalletSnapshot(vendorId);
  }

  async adminAdjust(vendorId, amount, { reason = "admin_adjustment", adminId = null } = {}) {
    const delta = Number(amount) || 0;
    const wallet = await VendorCreditsWallet.findOneAndUpdate(
      { vendorId: String(vendorId) },
      { $inc: { currentCredits: delta } },
      { upsert: true, new: true }
    );

    await VendorCreditTransaction.create({
      vendorId: String(vendorId),
      type: "admin_adjustment",
      amount: Math.abs(delta),
      balanceAfter: wallet.currentCredits,
      status: "completed",
      metadata: { reason, adminId, direction: delta >= 0 ? "credit" : "debit" },
    });

    return this.getWalletSnapshot(vendorId);
  }

  async getTransactionHistory(vendorId, limit = 50) {
    return VendorCreditTransaction.find({ vendorId: String(vendorId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

module.exports = VendorCreditsService;
