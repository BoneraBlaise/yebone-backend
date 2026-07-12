const StartupChecks = require("./StartupChecks");
const DeploymentValidator = require("./DeploymentValidator");

class ProductionBootstrap {
  static create({ container, environmentProvider, configuration, profile = "production" } = {}) {
    const startupChecks = new StartupChecks({ container });
    const deploymentValidator = new DeploymentValidator({ environmentProvider, configuration });
    const validation = deploymentValidator.validate(profile);

    return {
      startupChecks,
      deploymentValidator,
      validation,
      async runStartupChecks() {
        return startupChecks.runAll();
      },
      validateDeployment() {
        return deploymentValidator.validate(profile);
      },
    };
  }
}

module.exports = ProductionBootstrap;
