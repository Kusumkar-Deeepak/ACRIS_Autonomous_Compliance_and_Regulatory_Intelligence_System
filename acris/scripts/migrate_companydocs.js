import mongoose from "mongoose";

import CompanyDocument from "../backend/models/CompanyDocument.js";
import CompanyDocumentVersion from "../backend/models/CompanyDocumentVersion.js";
import ImpactMapping from "../backend/models/ImpactMapping.js";
import config from "../backend/config/index.js";
import { hashDocumentText } from "../backend/services/documentVersionService.js";

const dryRun = process.argv.includes("--dry-run");

export async function migrateCompanyDocs({ db = mongoose.connection } = {}) {
  const legacyCollection = db.collection("companydocs");
  const legacyDocs = await legacyCollection.find({}).toArray();
  const summary = { legacyDocs: legacyDocs.length, documents: 0, versions: 0, mappings: 0 };

  for (const legacy of legacyDocs) {
    if (!legacy.organizationId) continue;
    const identity = { organizationId: legacy.organizationId, name: legacy.name };
    let document = await CompanyDocument.findOne(identity);
    if (!document) {
      if (!dryRun) {
        document = await CompanyDocument.create({
          ...identity,
          documentType: legacy.type || "policy",
          ownerTeam: legacy.owner_team || "Compliance",
          source: legacy.source || "manual",
          sourceType: "manual-upload",
          syncStatus: "synced",
          lastModifiedAt: legacy.last_updated || new Date(),
        });
      }
      summary.documents += 1;
    }

    if (dryRun) continue;
    const contentHash = hashDocumentText(legacy.content_text || "");
    let version = await CompanyDocumentVersion.findOne({
      documentId: document._id,
      versionNumber: 1,
    });
    if (!version) {
      version = await CompanyDocumentVersion.create({
        organizationId: legacy.organizationId,
        documentId: document._id,
        versionNumber: 1,
        contentHash,
        storageKey: legacy.file_path || "",
        extractedText: legacy.content_text || "",
        source: legacy.source || "manual",
        sourceType: "manual-upload",
        name: legacy.name || "",
        createdAt: legacy.last_updated || new Date(),
        isCurrent: true,
      });
      summary.versions += 1;
      await CompanyDocument.updateOne(
        { _id: document._id },
        { $set: { currentVersionId: version._id, syncStatus: "synced" } },
      );
    }

    await ImpactMapping.updateMany(
      { organizationId: legacy.organizationId, doc_id: legacy._id },
      {
        $set: {
          doc_id: document._id,
          legacyDocId: legacy._id,
          lineageComplete: false,
          implementationStatus: "blocked",
          staleReason: "pre_lineage_record",
        },
      },
    );
    summary.mappings += await ImpactMapping.countDocuments({
      organizationId: legacy.organizationId,
      legacyDocId: legacy._id,
    });
  }

  return summary;
}

if (import.meta.url === `file://${process.argv[1].replaceAll("\\", "/")}`) {
  await mongoose.connect(config.mongoUri);
  try {
    console.log(JSON.stringify({ dryRun, ...(await migrateCompanyDocs()) }));
  } finally {
    await mongoose.disconnect();
  }
}
