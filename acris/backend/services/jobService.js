import ComplianceJob from "../models/ComplianceJob.js";

export const createJob = async (organizationId, regulationId, fileHash) => {
  // Check idempotency: if job with same fileHash exists and is not failed/cancelled
  const existingJob = await ComplianceJob.findOne({
    organizationId,
    fileHash,
    status: { $in: ["queued", "running", "retrying", "completed"] },
  }).sort({ createdAt: -1 });

  if (existingJob) {
    return existingJob;
  }

  const job = new ComplianceJob({
    organizationId,
    regulationId,
    fileHash,
    status: "queued",
    stages: [
      { name: "monitor" },
      { name: "parser" },
      { name: "diff" },
      { name: "mapping" },
      { name: "drafting" },
      { name: "report" },
    ],
  });

  await job.save();
  return job;
};

export const getJobById = async (jobId, organizationId) => {
  return await ComplianceJob.findOne({ _id: jobId, organizationId });
};
