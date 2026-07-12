const { PaymentIntent, OrderPayment } = require("../domain");
const { PaymentStatus } = require("../enums");

/**
 * Provider-agnostic payment orchestration.
 *
 * Depends only on injected abstractions:
 * - ProviderResolver (selects provider from config)
 * - Repositories (persistence skeletons)
 *
 * Never imports Stripe, Flutterwave, or any SDK directly.
 */
class PaymentService {
  constructor({
    providerResolver,
    paymentRepository,
    transactionRepository,
    refundRepository,
    payoutRepository,
    walletRepository,
  }) {
    this.providerResolver = providerResolver;
    this.paymentRepository = paymentRepository;
    this.transactionRepository = transactionRepository;
    this.refundRepository = refundRepository;
    this.payoutRepository = payoutRepository;
    this.walletRepository = walletRepository;
  }

  async createOrderPayment({ orderId, userId, amount, currency, method, country, metadata }) {
    const provider = this.providerResolver.resolve({ method, country });

    const intent = new PaymentIntent({
      amount,
      currency,
      method,
      providerCode: provider.getCode(),
      metadata: { ...metadata, orderId, userId },
    });

    const providerResult = await provider.createPayment({
      amount,
      currency,
      method,
      metadata: intent.metadata,
    });

    const orderPayment = new OrderPayment({
      orderId,
      userId,
      amount,
      currency,
      method,
      status: providerResult.status || PaymentStatus.PENDING,
      providerCode: provider.getCode(),
      providerReference: providerResult.providerReference,
      paymentIntentId: intent.id,
      metadata: { ...metadata, providerRaw: providerResult.raw },
    });

    await this.paymentRepository.saveOrderPayment(orderPayment);
    return { orderPayment, providerResult };
  }

  async verifyOrderPayment({ providerReference, method, country, providerCode }) {
    const provider = this.providerResolver.resolve({ method, country, providerCode });
    return provider.verifyPayment(providerReference);
  }

  async refundOrderPayment({ paymentId, amount, reason, method, country, providerCode, providerReference }) {
    const provider = this.providerResolver.resolve({ method, country, providerCode });
    const providerResult = await provider.refundPayment(providerReference, amount, reason);

    const refundRecord = {
      paymentId,
      amount,
      reason,
      providerCode: provider.getCode(),
      providerReference: providerResult.providerReference,
      status: providerResult.status || PaymentStatus.PENDING,
    };

    await this.refundRepository.save(refundRecord);
    return providerResult;
  }

  async createVendorPayout(payoutRequest) {
    const provider = this.providerResolver.resolve({
      method: payoutRequest.method,
      country: payoutRequest.country,
      providerCode: payoutRequest.providerCode,
    });

    const result = await provider.createPayout(payoutRequest);
    await this.payoutRepository.save({ ...payoutRequest, providerCode: provider.getCode(), ...result });
    return result;
  }

  async handleProviderWebhook({ method, country, providerCode, headers, payload }) {
    const provider = this.providerResolver.resolve({ method, country, providerCode });
    return provider.verifyWebhook(headers, payload);
  }

  async checkProviderHealth({ method, country, providerCode }) {
    const provider = this.providerResolver.resolve({ method, country, providerCode });
    return provider.healthCheck();
  }
}

module.exports = PaymentService;
