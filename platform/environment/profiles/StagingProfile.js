const BaseProfile = require("./BaseProfile");
class StagingProfile extends BaseProfile {
  constructor() {
    super({ name: "staging", strictValidation: true, logLevel: "info", enablePlaceholderSecrets: false, databasePoolSize: 5 });
  }
}
module.exports = StagingProfile;
