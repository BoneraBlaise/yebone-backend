const createCommissionEngine = require("./CommissionFactory");

module.exports = {
  CommissionConfig: require("./CommissionConfig"),
  CommissionRule: require("./CommissionRule"),
  CommissionRuleResolver: require("./CommissionRuleResolver"),
  CommissionCalculator: require("./CommissionCalculator"),
  CommissionBreakdown: require("./CommissionBreakdown"),
  CommissionSnapshot: require("./CommissionSnapshot"),
  CommissionDistribution: require("./CommissionDistribution"),
  CommissionEngine: require("./CommissionEngine"),
  CommissionHealthContract: require("./CommissionHealthContract"),
  RuleNotFoundError: require("./errors/RuleNotFoundError"),
  InvalidCommissionRuleError: require("./errors/InvalidCommissionRuleError"),
  CommissionCalculationError: require("./errors/CommissionCalculationError"),
  createCommissionEngine,
  CommissionFactory: createCommissionEngine,
};
