/**
 * Environment loader abstraction — reads from injected source, not globals.
 */
class EnvironmentLoader {
  constructor(source = {}) {
    this._source = { ...source };
  }

  load() {
    return { ...this._source };
  }

  get(key, defaultValue = undefined) {
    const value = this._source[key];
    if (value === undefined || value === null || String(value).trim() === "") {
      return defaultValue;
    }
    return value;
  }

  set(key, value) {
    this._source[key] = value;
    return this;
  }

  merge(values = {}) {
    this._source = { ...this._source, ...values };
    return this;
  }

  has(key) {
    const value = this._source[key];
    return value !== undefined && value !== null && String(value).trim() !== "";
  }
}

module.exports = EnvironmentLoader;
