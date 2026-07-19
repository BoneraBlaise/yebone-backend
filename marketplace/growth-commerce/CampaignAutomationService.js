class CampaignAutomationService {
  constructor({ repository, homepageService, audit } = {}) {
    this.repository = repository;
    this.homepageService = homepageService;
    this.audit = audit;
  }

  async processDueCampaigns({ actor = "automation", correlationId = null } = {}) {
    const now = new Date();
    const campaigns = await this.repository.list({});
    const changes = [];

    for (const campaign of campaigns) {
      const startDate = campaign.startDate ? new Date(campaign.startDate) : null;
      const endDate = campaign.endDate ? new Date(campaign.endDate) : null;

      if (campaign.status === "scheduled" && startDate && startDate <= now) {
        const updated = await this.repository.update(campaign.campaignId, { status: "active" });
        if (campaign.homepageSection && this.homepageService) {
          await this.homepageService.activateCampaignSection(campaign.homepageSection, campaign.campaignId);
        }
        changes.push({ campaignId: campaign.campaignId, from: "scheduled", to: "active" });
        if (this.audit) {
          await this.audit.record({
            platform: "growth-commerce",
            resource: campaign.campaignId,
            action: "campaign.automation_started",
            actor,
            correlationId,
            newValue: { status: updated.status },
          });
        }
      }

      if (["active", "paused"].includes(campaign.status) && endDate && endDate <= now) {
        const updated = await this.repository.update(campaign.campaignId, { status: "expired" });
        if (campaign.homepageSection && this.homepageService) {
          await this.homepageService.deactivateCampaignSection(campaign.homepageSection, campaign.campaignId);
        }
        changes.push({ campaignId: campaign.campaignId, from: campaign.status, to: "expired" });
        if (this.audit) {
          await this.audit.record({
            platform: "growth-commerce",
            resource: campaign.campaignId,
            action: "campaign.automation_expired",
            actor,
            correlationId,
            newValue: { status: updated.status },
          });
        }
      }
    }

    return { processed: changes.length, changes };
  }
}

module.exports = CampaignAutomationService;
