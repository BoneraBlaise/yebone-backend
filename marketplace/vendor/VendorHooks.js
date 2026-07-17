/**
 * Vendor lifecycle hooks — extension points for future phases.
 */
class VendorHooks {
  constructor({ lifecycle } = {}) {
    this.lifecycle = lifecycle;
    this.handlers = {
      onRegistrationPending: [],
      onActivated: [],
      onVerified: [],
      onProfileUpdated: [],
    };
  }

  afterRegistrationPending(payload) {
    return this._emit("onRegistrationPending", payload);
  }

  afterActivated(payload) {
    return this._emit("onActivated", {
      ...payload,
      lifecycle: this.lifecycle.afterActivation(payload.shop || {}),
    });
  }

  afterVerified(payload) {
    return this._emit("onVerified", payload);
  }

  afterProfileUpdated(payload) {
    return this._emit("onProfileUpdated", payload);
  }

  _emit(event, payload) {
    for (const handler of this.handlers[event] || []) {
      handler(payload);
    }
    return payload;
  }
}

module.exports = VendorHooks;
