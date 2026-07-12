const EnvironmentLoader = require("./EnvironmentLoader");
const EnvironmentSchema = require("./EnvironmentSchema");
const EnvironmentValidator = require("./EnvironmentValidator");
const EnvironmentRegistry = require("./EnvironmentRegistry");
const ProcessEnvironmentProvider = require("./ProcessEnvironmentProvider");
const ProfileResolver = require("./ProfileResolver");

class EnvironmentBootstrap {
  static create({ source = {}, profile: profileName } = {}) {
    const loader = new EnvironmentLoader(source);
    const schema = EnvironmentSchema.create();
    const validator = new EnvironmentValidator(schema);
    const resolvedProfileName = profileName || loader.get("NODE_ENV", "development");
    const profile = ProfileResolver.resolve(resolvedProfileName);
    const validation = validator.validate(loader, profile.name);
    const registry = new EnvironmentRegistry();
    registry
      .registerProfile("development", ProfileResolver.resolve("development"))
      .registerProfile("production", ProfileResolver.resolve("production"))
      .registerProfile("staging", ProfileResolver.resolve("staging"))
      .registerProfile("test", ProfileResolver.resolve("test"))
      .setActiveProfile(profile.name)
      .setValues(loader.load());
    const provider = new ProcessEnvironmentProvider({ loader, profile: profile.name });
    return { loader, schema, validator, profile, validation, registry, provider };
  }
}
module.exports = EnvironmentBootstrap;
