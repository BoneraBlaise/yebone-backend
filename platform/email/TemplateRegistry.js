class TemplateRegistry {
  constructor() {
    this._templates = new Map();
  }

  register(id, template) {
    this._templates.set(id, { ...template, id, registeredAt: Date.now() });
    return this;
  }

  get(id) {
    return this._templates.get(id) || null;
  }

  has(id) {
    return this._templates.has(id);
  }

  list() {
    return [...this._templates.keys()];
  }

  render(id, data = {}) {
    const template = this.get(id);
    if (!template) {
      throw new Error(`Email template not found: ${id}`);
    }
    const subject = this._interpolate(template.subject, data);
    const body = this._interpolate(template.body, data);
    return { id, subject, body, data };
  }

  _interpolate(text, data) {
    return String(text).replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
  }
}

module.exports = TemplateRegistry;
