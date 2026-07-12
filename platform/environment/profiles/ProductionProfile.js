const BaseProfile = require("./BaseProfile");
class ProductionProfile extends BaseProfile {
  constructor() {
    super({ name: "production", strictValidation: true, logLevel: "info", enablePlaceholderSecrets: false, databasePoolSize: 10 });
  }
}
module.exports = ProductionProfile;
