class PolicyService {
  constructor({ configStore }) {
    this.configStore = configStore;
  }

  getPolicies() {
    return this.configStore.getPolicies();
  }

  getTrustWeights() {
    return this.configStore.getTrustWeights();
  }

  async updatePolicies(partial, meta = {}) {
    return this.configStore.updateConfiguration({ policies: partial }, meta);
  }

  async updateTrustWeights(partial, meta = {}) {
    return this.configStore.updateConfiguration({ trustWeights: partial }, meta);
  }

  isCategoryEligible(category) {
    const policies = this.getPolicies();
    const categories = policies.eligibleCategories || [];
    if (categories.length === 0) return true;
    return categories.includes(String(category));
  }
}

module.exports = PolicyService;
