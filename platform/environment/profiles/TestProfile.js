const BaseProfile = require("./BaseProfile");
class TestProfile extends BaseProfile {
  constructor() {
    super({ name: "test", strictValidation: false, logLevel: "error", enablePlaceholderSecrets: true, databasePoolSize: 1 });
  }
}
module.exports = TestProfile;
