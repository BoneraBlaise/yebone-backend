const BaseProfile = require("./BaseProfile");
class DevelopmentProfile extends BaseProfile {
  constructor() {
    super({ name: "development", strictValidation: false, logLevel: "debug", enablePlaceholderSecrets: true, databasePoolSize: 2 });
  }
}
module.exports = DevelopmentProfile;
