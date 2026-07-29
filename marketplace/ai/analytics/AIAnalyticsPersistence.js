const AIAnalyticsSnapshot = require("../models/AIAnalyticsSnapshot");

class AIAnalyticsPersistence {
  _periodKey(date, period) {
    const d = new Date(date);
    if (period === "monthly") {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    return d.toISOString().slice(0, 10);
  }

  async recordEvent({
    serviceType = "unknown",
    vendorId = null,
    userId = null,
    creditsUsed = 0,
    latencyMs = 0,
    success = true,
    providerCategory = "llm",
    revenue = 0,
    providerCost = 0,
    tokenUsage = null,
    inputTokens = 0,
    outputTokens = 0,
    totalTokens = 0,
  } = {}) {
    const resolvedInputTokens = tokenUsage?.inputTokens ?? inputTokens ?? 0;
    const resolvedOutputTokens = tokenUsage?.outputTokens ?? outputTokens ?? 0;
    const resolvedTotalTokens =
      tokenUsage?.totalTokens ??
      totalTokens ??
      resolvedInputTokens + resolvedOutputTokens;
    const now = new Date();
    const periods = [
      { period: "daily", periodKey: this._periodKey(now, "daily") },
      { period: "monthly", periodKey: this._periodKey(now, "monthly") },
    ];

    for (const { period, periodKey } of periods) {
      const inc = {
        requests: 1,
        creditsUsed,
        totalLatencyMs: latencyMs,
        revenue,
        providerCost,
        inputTokens: resolvedInputTokens,
        outputTokens: resolvedOutputTokens,
        totalTokens: resolvedTotalTokens,
        estimatedMargin: revenue - providerCost,
        [`serviceUsage.${serviceType}`]: 1,
        [`providerUsage.${providerCategory}`]: 1,
      };
      if (!success) inc.failures = 1;
      if (vendorId) inc[`vendorUsage.${vendorId}`] = 1;
      if (userId) inc[`customerUsage.${userId}`] = 1;

      await AIAnalyticsSnapshot.findOneAndUpdate(
        { period, periodKey },
        {
          $setOnInsert: { period, periodKey, date: now },
          $inc: inc,
        },
        { upsert: true, new: true }
      );
    }
  }

  async getSummary({ period = "daily", limit = 30 } = {}) {
    const snapshots = await AIAnalyticsSnapshot.find({ period })
      .sort({ date: -1 })
      .limit(limit)
      .lean();

    const totals = snapshots.reduce(
      (acc, row) => {
        acc.requests += row.requests || 0;
        acc.creditsUsed += row.creditsUsed || 0;
        acc.failures += row.failures || 0;
        acc.totalLatencyMs += row.totalLatencyMs || 0;
        acc.revenue += row.revenue || 0;
        acc.providerCost += row.providerCost || 0;
        acc.inputTokens += row.inputTokens || 0;
        acc.outputTokens += row.outputTokens || 0;
        acc.totalTokens += row.totalTokens || 0;
        acc.estimatedMargin += row.estimatedMargin || 0;
        return acc;
      },
      {
        requests: 0,
        creditsUsed: 0,
        failures: 0,
        totalLatencyMs: 0,
        revenue: 0,
        providerCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedMargin: 0,
      }
    );

    totals.avgLatencyMs =
      totals.requests > 0 ? Math.round(totals.totalLatencyMs / totals.requests) : 0;

    return {
      period,
      totals,
      snapshots,
      displayBrand: "YEBO AI",
    };
  }

  getSummarySyncFromMetrics(metricsSnapshot) {
    return {
      runtime: metricsSnapshot,
      persisted: false,
      displayBrand: "YEBO AI",
    };
  }
}

module.exports = AIAnalyticsPersistence;
