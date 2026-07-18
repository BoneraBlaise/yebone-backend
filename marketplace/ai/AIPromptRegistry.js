const { PROMPT_TEMPLATES, ACTIVE_VERSIONS } = require("./prompts/templates");

/**
 * Versioned prompt registry — provider-agnostic composition.
 */
class AIPromptRegistry {
  constructor(config = {}) {
    this.templates = { ...PROMPT_TEMPLATES };
    this.activeVersions = { ...ACTIVE_VERSIONS, ...(config.activeVersions || {}) };
  }

  _key(id, version) {
    const resolvedVersion = version || this.activeVersions[id];
    return `${id}@${resolvedVersion}`;
  }

  load(id, version = null) {
    const key = this._key(id, version);
    const template = this.templates[key];
    if (!template) {
      throw new Error(`AIPromptRegistry: unknown prompt ${key}`);
    }
    return { ...template, key };
  }

  render(id, variables = {}, version = null) {
    const template = this.load(id, version);
    let instruction = template.instruction;
    Object.entries(variables).forEach(([name, value]) => {
      instruction = instruction.replace(new RegExp(`\\{\\{${name}\\}\\}`, "g"), String(value ?? ""));
    });
    return {
      ...template,
      instruction,
      rendered: instruction,
    };
  }

  compose(layers = [], variables = {}) {
    const prompts = layers.map((layer) => this.render(layer, variables));
    const instruction = prompts.map((p) => p.instruction).filter(Boolean).join("\n\n");
    return {
      layers: prompts.map((p) => p.key),
      instruction,
      prompts,
    };
  }

  list() {
    return Object.values(this.templates).map(({ id, version, layer }) => ({
      id,
      version,
      layer,
      active: this.activeVersions[id] === version,
    }));
  }

  getActiveVersions() {
    return { ...this.activeVersions };
  }
}

module.exports = AIPromptRegistry;
