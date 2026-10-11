import crypto from "crypto";
import mongoose from "mongoose";
import CompanyDocument from "../models/CompanyDocument.js";
import CompanyDocumentVersion from "../models/CompanyDocumentVersion.js";

export function normalizeDocumentText(text = "") {
  return String(text)
    .replace(/\s+/g, " ")
    .trim();
}

export function hashDocumentText(text = "") {
  return crypto.createHash("sha256").update(normalizeDocumentText(text), "utf8").digest("hex");
}

function assertOrganizationId(organizationId) {
  if (!organizationId) throw new Error("organizationId is required");
  if (!mongoose.isValidObjectId(organizationId)) throw new Error("organizationId is invalid");
}

export async function resolveVersion(
  organizationId,
  { name, externalDocumentId = "", documentType = "policy", ownerTeam = "Compliance", source = "manual", sourceType = "manual-upload", storageKey = "", extractedText = "", createdBy = "system", embeddingVersion = "" },
) {
  assertOrganizationId(organizationId);
  if (!name && !externalDocumentId) throw new Error("name or externalDocumentId is required");

  const organizationObjectId = new mongoose.Types.ObjectId(organizationId);
  const contentHash = hashDocumentText(extractedText);
  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const identity = externalDocumentId
        ? { organizationId: organizationObjectId, sourceType, externalDocumentId }
        : { organizationId: organizationObjectId, name };
      let document = await CompanyDocument.findOne(identity).session(session);

      if (!document) {
        document = await CompanyDocument.create([{
          organizationId: organizationObjectId,
          name: name || externalDocumentId,
          documentType,
          ownerTeam,
          source,
          sourceType,
          externalDocumentId,
          currentVersionId: null,
          syncStatus: "pending",
        }], { session }).then(([created]) => created);
      }

      const current = document.currentVersionId
        ? await CompanyDocumentVersion.findOne({
          _id: document.currentVersionId,
          documentId: document._id,
          organizationId: organizationObjectId,
        }).session(session)
        : await CompanyDocumentVersion.findOne({
          documentId: document._id,
          organizationId: organizationObjectId,
          isCurrent: true,
        }).session(session);

      if (current && current.contentHash === contentHash) {
        result = { document, version: current, isNew: false };
        return;
      }

      const version = await CompanyDocumentVersion.create([{
        organizationId: organizationObjectId,
        documentId: document._id,
        versionNumber: (current?.versionNumber || 0) + 1,
        contentHash,
        storageKey,
        extractedText,
        source,
        sourceType,
        name: document.name,
        embeddingVersion,
        createdBy,
        isCurrent: true,
        previousVersionId: current?._id || null,
      }], { session }).then(([created]) => created);

      if (current) {
        await CompanyDocumentVersion.updateOne(
          { _id: current._id, documentId: document._id, isCurrent: true },
          { $set: { isCurrent: false } },
          { session },
        );
      }

      document.currentVersionId = version._id;
      document.syncStatus = "synced";
      document.lastModifiedAt = new Date();
      await document.save({ session });
      result = { document, version, isNew: true };
    });
  } finally {
    await session.endSession();
  }

  return result;
}

export async function getCurrentVersion(organizationId, documentId) {
  assertOrganizationId(organizationId);
  return CompanyDocumentVersion.findOne({
    organizationId,
    documentId,
    isCurrent: true,
  });
}

export async function listVersions(organizationId, documentId) {
  assertOrganizationId(organizationId);
  return CompanyDocumentVersion.find({ organizationId, documentId })
    .sort({ versionNumber: 1 });
}
