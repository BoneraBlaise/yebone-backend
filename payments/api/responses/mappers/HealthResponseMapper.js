const ApiResponse = require("../ApiResponse");

class HealthResponseMapper {
  static map(health) {
    return ApiResponse.success({
      status: health.healthy ? "healthy" : "degraded",
      checks: health.checks,
    });
  }
}

module.exports = HealthResponseMapper;
