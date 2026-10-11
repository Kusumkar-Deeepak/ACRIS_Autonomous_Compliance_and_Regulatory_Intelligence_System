from datetime import datetime, timezone

from chroma_store import get_embedding_version, query_similar
from shared import (
    emit_error,
    emit_json,
    get_db,
    object_id,
    read_input_json,
    scoped_find_one,
)


def relevance(distance: float | None) -> float:
    if distance is None:
        return 0.0
    score = 1 - float(distance)
    return max(0.0, min(1.0, score))


def main():
    payload = read_input_json()
    regulation_id = payload.get("regulation_id")
    if not regulation_id:
        emit_error("regulation_id is required")

    db = get_db()
    organization_id = payload.get("organization_id")
    job_id = payload.get("job_id")
    if not organization_id or not job_id:
        emit_error("organization_id and job_id are required")

    regulation = scoped_find_one(db, "regulations", organization_id, {"_id": object_id(regulation_id)})
    if not regulation:
        emit_error("Regulation not found")

    changes = regulation.get("changes", [])
    persisted_organization_id = regulation.get("organizationId")
    if str(persisted_organization_id) != str(object_id(organization_id)):
        emit_error("organizationId does not match persisted regulation")
    embedding_version = get_embedding_version()
    relevance_threshold = float(payload.get("relevance_threshold", 0.50))
    aggregate = {}

    for change in changes:
        clause_text = change.get("new_text") or change.get("old_text") or change.get("clause", "")
        if not clause_text:
            continue

        results = query_similar(
            organization_id,
            clause_text,
            embedding_version,
            k=5,
        )
        ids = results.get("ids", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for index, doc_id in enumerate(ids):
            score = relevance(distances[index] if index < len(distances) else None)
            if score < relevance_threshold:
                continue

            metadata = metadatas[index] if index < len(metadatas) else {}
            doc_name = metadata.get("name") if isinstance(metadata, dict) else str(doc_id)
            document_id = metadata.get("documentId") if isinstance(metadata, dict) else None
            entry = aggregate.setdefault(document_id or doc_id, {
                "doc_name": doc_name,
                "relevance_score": 0.0,
                "affected_clauses": [],
                "chunk_ids": [],
                "document_version_id": metadata.get("documentVersionId") if isinstance(metadata, dict) else None,
            })
            entry["relevance_score"] = max(entry["relevance_score"], score)
            if isinstance(metadata, dict) and metadata.get("chunkId"):
                entry["chunk_ids"].append(metadata["chunkId"])
            if change.get("clause") not in entry["affected_clauses"]:
                entry["affected_clauses"].append(change.get("clause"))

    mappings_output = []

    for doc_id, entry in aggregate.items():
        try:
            document_object_id = object_id(doc_id)
        except Exception:
            continue

        doc = scoped_find_one(db, "companydocuments", organization_id, {"_id": document_object_id})
        if not doc:
            continue

        document_version_id = entry.get("document_version_id") or doc.get("currentVersionId")
        if not document_version_id:
            continue
        document_version = scoped_find_one(
            db,
            "companydocumentversions",
            organization_id,
            {
                "_id": object_id(document_version_id),
                "documentId": doc["_id"],
                "isCurrent": True,
            },
        )
        if not document_version:
            continue

        change_clauses = [change for change in changes if change.get("clause") in entry["affected_clauses"]]
        first_change = change_clauses[0] if change_clauses else {}
        clause_id = first_change.get("clauseId") or first_change.get("clause")
        if not clause_id:
            continue
        policy_version_number = document_version.get("versionNumber", 1)
        regulation_version_number = regulation.get("version", 1)
        source_evidence = {
            "regulationVersionId": str(regulation["_id"]),
            "policyVersionId": str(document_version["_id"]),
            "chunkIds": entry.get("chunk_ids", []),
        }

        db.impactmappings.update_one(
            {
                "organizationId": persisted_organization_id,
                "regulation_id": object_id(regulation_id),
                "doc_id": doc["_id"],
                "regulationVersionId": regulation["_id"],
            },
            {
                "$set": {
                    "organizationId": persisted_organization_id,
                    "regulation_id": object_id(regulation_id),
                    "doc_id": doc["_id"],
                    "jobId": object_id(job_id),
                    "regulationId": regulation["_id"],
                    "regulationVersionId": regulation["_id"],
                    "regulationVersionNumber": regulation_version_number,
                    "regulationVersion": regulation_version_number,
                    "policyDocumentId": doc["_id"],
                    "policyVersionId": document_version["_id"],
                    "policyVersionNumber": policy_version_number,
                    "relevance_score": entry["relevance_score"],
                    "relevanceScore": entry["relevance_score"],
                    "relevanceThreshold": relevance_threshold,
                    "affected_clauses": entry["affected_clauses"],
                    "clauseId": clause_id,
                    "clause": first_change.get("clause", ""),
                    "clause_text": first_change.get("new_text") or first_change.get("old_text") or "",
                    "old_text": first_change.get("old_text", ""),
                    "new_text": first_change.get("new_text", ""),
                    "policy_section": doc.get("name", ""),
                    "documentVersionId": document_version["_id"],
                    "sourceDocumentHash": document_version.get("contentHash", ""),
                    "embeddingVersion": embedding_version,
                    "chunkingVersion": document_version.get("chunkingVersion", "paragraph-v1"),
                    "retrievedChunkIds": entry.get("chunk_ids", []),
                    "sourceEvidence": source_evidence,
                    "generatedAt": datetime.now(timezone.utc),
                    "lineageComplete": True,
                    "confidence": entry["relevance_score"],
                    "model": payload.get("model") or "pending-drafting",
                    "promptVersion": payload.get("prompt_version") or "drafting-amendment-v1",
                    "draft_source": "fallback",
                    "reviewStatus": "pending",
                },
                "$setOnInsert": {
                    "draft_amendment": "",
                    "reviewed_by": "",
                },
            },
            upsert=True,
        )

        mappings_output.append({
            "doc_id": str(doc["_id"]),
            "doc_name": doc.get("name", entry["doc_name"]),
            "relevance_score": round(entry["relevance_score"], 2),
            "affected_clauses": entry["affected_clauses"],
        })

    db.regulations.update_one(
        {"_id": object_id(regulation_id), "organizationId": persisted_organization_id},
        {"$set": {"status": "pending_draft"}},
    )

    emit_json({
        "regulation_id": regulation_id,
        "mappings": mappings_output,
        "status": "pending_draft",
    })


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit_error(str(error))