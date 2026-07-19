const { CAMPAIGN_STATUSES } = require("./GrowthCommerceSettingsDefaults");

class CampaignStateMachine {
  static ALLOWED = Object.freeze({
    draft: ["scheduled", "archived"],
    scheduled: ["active", "paused", "archived"],
    active: ["paused", "expired"],
    paused: ["active", "archived"],
    expired: ["archived"],
    archived: [],
  });

  assertTransition(currentStatus, nextStatus) {
    const current = String(currentStatus || "").toLowerCase();
    const next = String(nextStatus || "").toLowerCase();

    if (!CAMPAIGN_STATUSES.includes(current) || !CAMPAIGN_STATUSES.includes(next)) {
      return { valid: false, reason: "UNKNOWN_STATUS", message: `Invalid campaign status: ${current} -> ${next}` };
    }
    if (current === next) return { valid: true, status: next };

    const allowed = CampaignStateMachine.ALLOWED[current] || [];
    if (!allowed.includes(next)) {
      return { valid: false, reason: "INVALID_TRANSITION", message: `Invalid transition: ${current} -> ${next}` };
    }
    return { valid: true, status: next };
  }
}

module.exports = CampaignStateMachine;
