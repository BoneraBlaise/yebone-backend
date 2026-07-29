const PreviewSession = require("../models/PreviewSession");

class PreviewSessionService {
  _defaultExpiry(days = 7) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  async create(session = {}) {
    const doc = await PreviewSession.create({
      sessionId: session.sessionId,
      vendorId: String(session.vendorId),
      customerId: session.customerId ? String(session.customerId) : null,
      productId: String(session.productId),
      previewType: String(session.previewType),
      status: session.status || "completed",
      progress: session.progress ?? 100,
      requestId: session.requestId || null,
      creditsConsumed: session.creditsConsumed || 0,
      imageGeneration: session.imageGeneration === true,
      result: session.result || null,
      metadata: session.metadata || {},
      expiresAt: session.expiresAt || this._defaultExpiry(),
    });
    return doc.toObject();
  }

  async getBySessionId(sessionId) {
    return PreviewSession.findOne({ sessionId: String(sessionId) }).lean();
  }

  async listByCustomer(customerId, limit = 20) {
    if (!customerId) return [];
    return PreviewSession.find({ customerId: String(customerId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async updateStatus(sessionId, { status, progress, result, metadata, creditsConsumed } = {}) {
    const update = {};
    if (status) update.status = status;
    if (progress != null) update.progress = progress;
    if (result != null) update.result = result;
    if (metadata) update.metadata = metadata;
    if (creditsConsumed != null) update.creditsConsumed = creditsConsumed;
    return PreviewSession.findOneAndUpdate({ sessionId: String(sessionId) }, { $set: update }, { new: true }).lean();
  }
}

module.exports = PreviewSessionService;
