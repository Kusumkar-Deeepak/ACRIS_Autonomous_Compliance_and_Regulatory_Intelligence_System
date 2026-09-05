import test from "node:test";
import assert from "node:assert/strict";
import { DashboardService } from "../services/dashboardService.js";

const repositoryStub = {
  countRegulationsDone: async () => 12,
  countPendingMappings: async () => 5,
  countCompanyDocs: async () => 21,
};

test("DashboardService aggregates dashboard stats from repository methods", async () => {
  const service = new DashboardService(repositoryStub);
  const stats = await service.getStats();

  assert.deepEqual(stats, {
    circulars_processed: 12,
    pending_actions: 5,
    docs_indexed: 21,
  });
});
