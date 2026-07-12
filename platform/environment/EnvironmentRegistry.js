/**
 * Registry of environment profiles and loaded values.
 */
class EnvironmentRegistry {
  constructor() {
    this._profiles = new Map();
    this._activeProfile = "development";
    this._values = {};
  }

  registerProfile(name, profile) {
    this._profiles.set(name, profile);
    return this;
  }

  setActiveProfile(name) {
    if (!this._profiles.has(name)) {
      throw new Error(`Unknown environment profile: ${name}`);
    }
    this._activeProfile = name;
    return this;
  }

  getActiveProfile() {
    return this._activeProfile;
  }

  getProfile(name) {
    return this._profiles.get(name || this._activeProfile) || null;
  }

  setValues(values = {}) {
    this._values = { ...this._values, ...values };
    return this;
  }

  getValues() {
    return { ...this._values };
  }

  listProfiles() {
    return [...this._profiles.keys()];
  }
}

module.exports = EnvironmentRegistry;
