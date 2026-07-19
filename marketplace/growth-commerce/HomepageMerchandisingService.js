const { HOMEPAGE_SECTION_DEFAULTS } = require("./GrowthCommerceSettingsDefaults");

class HomepageMerchandisingService {
  constructor({ HomepageModel = null, campaignRepository, useMemoryOnly = false } = {}) {
    this.HomepageModel = HomepageModel;
    this.campaignRepository = campaignRepository;
    this.useMemoryOnly = useMemoryOnly;
    this.memory = structuredClone(HOMEPAGE_SECTION_DEFAULTS);
  }

  setModel(model) {
    this.HomepageModel = model;
  }

  async loadSections() {
    if (this.useMemoryOnly || !this.HomepageModel) {
      return structuredClone(this.memory);
    }

    let doc = await this.HomepageModel.findOne({ singletonKey: "default" }).lean();
    if (!doc) {
      doc = await this.HomepageModel.create({
        singletonKey: "default",
        sections: structuredClone(HOMEPAGE_SECTION_DEFAULTS),
      });
      doc = doc.toObject();
    }
    return { ...structuredClone(HOMEPAGE_SECTION_DEFAULTS), ...(doc.sections || {}) };
  }

  async updateSections(partial = {}, { admin = "system" } = {}) {
    const current = await this.loadSections();
    const next = { ...current, ...partial };

    if (this.useMemoryOnly || !this.HomepageModel) {
      this.memory = next;
      return next;
    }

    const doc = await this.HomepageModel.findOneAndUpdate(
      { singletonKey: "default" },
      { $set: { sections: next, updatedBy: admin } },
      { upsert: true, new: true }
    );
    return doc.sections;
  }

  async activateCampaignSection(sectionKey, campaignId) {
    const sections = await this.loadSections();
    if (!sections[sectionKey]) return sections;
    sections[sectionKey] = {
      ...sections[sectionKey],
      enabled: true,
      campaignId: String(campaignId),
    };
    return this.updateSections({ [sectionKey]: sections[sectionKey] });
  }

  async deactivateCampaignSection(sectionKey, campaignId) {
    const sections = await this.loadSections();
    if (!sections[sectionKey]) return sections;
    if (String(sections[sectionKey].campaignId) !== String(campaignId)) return sections;
    sections[sectionKey] = {
      ...sections[sectionKey],
      enabled: false,
      campaignId: null,
    };
    return this.updateSections({ [sectionKey]: sections[sectionKey] });
  }

  async resolvePublicHomepage() {
    const sections = await this.loadSections();
    const activeCampaigns = await this.campaignRepository.list({ status: "active" });
    const campaignMap = new Map(activeCampaigns.map((c) => [c.campaignId, c]));

    const resolved = {};
    for (const [key, config] of Object.entries(sections)) {
      const campaign = config.campaignId ? campaignMap.get(String(config.campaignId)) : null;
      resolved[key] = {
        ...config,
        campaign: campaign
          ? {
              campaignId: campaign.campaignId,
              name: campaign.name,
              type: campaign.type,
              banner: campaign.banner,
              discountType: campaign.discountType,
              discountValue: campaign.discountValue,
            }
          : null,
      };
    }

    return {
      sections: resolved,
      activeCampaigns: activeCampaigns.map((c) => ({
        campaignId: c.campaignId,
        name: c.name,
        type: c.type,
        banner: c.banner,
        discountType: c.discountType,
        discountValue: c.discountValue,
      })),
    };
  }
}

module.exports = HomepageMerchandisingService;
