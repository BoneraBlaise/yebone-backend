const DevelopmentProfile = require("./profiles/DevelopmentProfile");
const ProductionProfile = require("./profiles/ProductionProfile");
const StagingProfile = require("./profiles/StagingProfile");
const TestProfile = require("./profiles/TestProfile");

class ProfileResolver {
  static resolve(nodeEnv = "development") {
    const normalized = String(nodeEnv || "development").toLowerCase();
    const map = { development: DevelopmentProfile, production: ProductionProfile, staging: StagingProfile, test: TestProfile };
    const ProfileClass = map[normalized] || DevelopmentProfile;
    return new ProfileClass();
  }
}
module.exports = ProfileResolver;
