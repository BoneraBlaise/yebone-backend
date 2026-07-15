const CommissionConfig = require("./CommissionConfig");
const CommissionRuleResolver = require("./CommissionRuleResolver");
const CommissionCalculator = require("./CommissionCalculator");
const CommissionEngine = require("./CommissionEngine");

/**
 * Factory for wiring Module 7 Commission Engine via DI.
 * Not auto-wired into PaymentModule.
 */
function createCommissionEngine(options = {}) {
  const config = options.config || CommissionConfig;
  const resolver = options.resolver || new CommissionRuleResolver({ config });

  if (options.rules) {
    resolver.registerAll(options.rules);
  }

  const calculator = options.calculator || new CommissionCalculator({ config });
  const engine = options.engine
    || new CommissionEngine({ resolver, calculator, config });

  return Object.freeze({
    engine,
    resolver,
    calculator,
    config,
  });
}

module.exports = createCommissionEngine;
