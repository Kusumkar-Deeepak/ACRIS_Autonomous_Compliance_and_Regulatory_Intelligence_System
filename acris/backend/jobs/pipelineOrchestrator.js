import { runAgent } from "../utils/runAgent.js";
import ComplianceJob from "../models/ComplianceJob.js";
import Regulation from "../models/Regulation.js";
import { reportsDir } from "../utils/paths.js";

export async function runPipeline(jobId, regulationId, pdfPath, companyName, organizationId) {
  try {
    // 1. Mark Job as running
    await ComplianceJob.findByIdAndUpdate(jobId, {
      status: "running",
      startedAt: new Date(),
    });

    const runStage = async (stageName, scriptName, input, regulationStatus) => {
      // Update Job stage
      await ComplianceJob.updateOne(
        { _id: jobId, "stages.name": stageName },
        {
          $set: {
            "stages.$.status": "running",
            "stages.$.startedAt": new Date(),
            currentStage: stageName,
          },
        }
      );

      // Run agent with a timeout of 120 seconds (Phase 8)
      const TIMEOUT_MS = 120000;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Stage ${stageName} timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
      });
      const output = await Promise.race([
        runAgent(scriptName, input),
        timeoutPromise
      ]);

      // Update Regulation Status
      if (regulationStatus) {
        await Regulation.findByIdAndUpdate(regulationId, { status: regulationStatus });
      }

      // Complete stage
      await ComplianceJob.updateOne(
        { _id: jobId, "stages.name": stageName },
        {
          $set: {
            "stages.$.status": "completed",
            "stages.$.completedAt": new Date(),
          },
        }
      );

      return output;
    };

    // Parser Agent
    await runStage("parser", "parser_agent.py", { regulation_id: regulationId, pdf_path: pdfPath }, "pending_diff");

    // Diff Agent
    await runStage("diff", "diff_agent.py", { regulation_id: regulationId }, "pending_map");

    // Mapping Agent
    const agentContext = {
      organization_id: organizationId,
      job_id: jobId,
      prompt_version: "drafting-amendment-v1",
    };
    await runStage("mapping", "mapping_agent.py", {
      regulation_id: regulationId,
      ...agentContext,
    }, "pending_draft");

    // Drafting Agent
    await runStage("drafting", "drafting_agent.py", {
      regulation_id: regulationId,
      ...agentContext,
    }, "pending_draft");

    // Report Agent
    const reportPath = `${reportsDir}/${regulationId}.pdf`;
    await runStage("report", "report_agent.py", {
      regulation_id: regulationId,
      organization_id: organizationId,
      company_name: companyName,
      output_path: reportPath,
    }, "done");

    // Job done
    await ComplianceJob.findByIdAndUpdate(jobId, {
      status: "completed",
      completedAt: new Date(),
      progress: 100,
    });
  } catch (error) {
    console.error(`Pipeline failed for Job ${jobId}:`, error);
    await ComplianceJob.findByIdAndUpdate(jobId, {
      status: "failed",
      failedAt: new Date(),
      "error.message": error.message,
    });
    // Optional: mark regulation as error
    await Regulation.findByIdAndUpdate(regulationId, { status: "error" });
  }
}
