const { HealthResponseMapper } = require("../responses");

class HealthController {
  constructor({ paymentModuleHealth }) {
    this.paymentModuleHealth = paymentModuleHealth;
  }

  async status(req, res, next) {
    try {
      const health = this.paymentModuleHealth.check();
      const statusCode = health.healthy ? 200 : 503;
      return res.status(statusCode).json(HealthResponseMapper.map(health));
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = HealthController;
