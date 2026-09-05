export class DashboardService {
  constructor(repository) {
    this.repository = repository;
  }

  async getStats(organizationId) {
    const [circularsProcessed, pendingActions, docsIndexed] = await Promise.all(
      [
        this.repository.countRegulationsDone(organizationId),
        this.repository.countPendingMappings(organizationId),
        this.repository.countCompanyDocs(organizationId),
      ],
    );

    return {
      circulars_processed: circularsProcessed,
      pending_actions: pendingActions,
      docs_indexed: docsIndexed,
    };
  }
}
