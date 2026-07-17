/**
 * Commission hook registry — wraps affiliate program events.
 */
class CommissionHook {
  afterJoin({ referralCode }) {
    return Object.freeze({
      event: "commission.joined",
      referralCode,
    });
  }
}

module.exports = CommissionHook;
