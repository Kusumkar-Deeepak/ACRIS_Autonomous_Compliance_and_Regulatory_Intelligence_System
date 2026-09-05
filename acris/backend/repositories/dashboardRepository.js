export class DashboardRepository {
  constructor({ Regulation, ImpactMapping, CompanyDoc }) {
    this.Regulation = Regulation;
    this.ImpactMapping = ImpactMapping;
    this.CompanyDoc = CompanyDoc;
  }

  async countRegulationsDone(organizationId) {
    return this.Regulation.countDocuments({
      organizationId,
      status: "done",
    });
  }

  async countPendingMappings(organizationId) {
    return this.ImpactMapping.countDocuments({
      organizationId,
      reviewStatus: "pending",
    });
  }

  async countCompanyDocs(organizationId) {
    return this.CompanyDoc.countDocuments({ organizationId });
  }
}
