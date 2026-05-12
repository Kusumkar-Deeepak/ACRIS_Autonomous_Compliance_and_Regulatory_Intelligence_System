from chroma_store import query_similar
from shared import emit_error, emit_json, get_db, object_id, read_input_json


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
    regulation = db.regulations.find_one({"_id": object_id(regulation_id)})
    if not regulation:
        emit_error("Regulation not found")

    changes = regulation.get("changes", [])
    aggregate = {}

    for change in changes:
        clause_text = change.get("new_text") or change.get("old_text") or change.get("clause", "")
        if not clause_text:
            continue

        try:
            results = query_similar(clause_text, n_results=5)
            ids = results.get("ids", [[]])[0]
            metadatas = results.get("metadatas", [[]])[0]
            distances = results.get("distances", [[]])[0]
        except Exception:
            ids = []
            metadatas = []
            distances = []

        for index, doc_id in enumerate(ids):
            score = relevance(distances[index] if index < len(distances) else None)
            if score < 0.75:
                continue

            metadata = metadatas[index] if index < len(metadatas) else {}
            doc_name = metadata.get("name") if isinstance(metadata, dict) else str(doc_id)
            entry = aggregate.setdefault(doc_id, {
                "doc_name": doc_name,
                "relevance_score": 0.0,
                "affected_clauses": [],
            })
            entry["relevance_score"] = max(entry["relevance_score"], score)
            if change.get("clause") not in entry["affected_clauses"]:
                entry["affected_clauses"].append(change.get("clause"))

    mappings_output = []

    for doc_id, entry in aggregate.items():
        doc = db.companydocs.find_one({"embedding_id": doc_id}) or db.companydocs.find_one({"_id": object_id(doc_id)})
        if not doc:
            continue

        change_clauses = [change for change in changes if change.get("clause") in entry["affected_clauses"]]
        first_change = change_clauses[0] if change_clauses else {}

        db.impactmappings.update_one(
            {"regulation_id": object_id(regulation_id), "doc_id": doc["_id"]},
            {
                "$set": {
                    "regulation_id": object_id(regulation_id),
                    "doc_id": doc["_id"],
                    "relevance_score": entry["relevance_score"],
                    "affected_clauses": entry["affected_clauses"],
                    "clause": first_change.get("clause", ""),
                    "clause_text": first_change.get("new_text") or first_change.get("old_text") or "",
                    "old_text": first_change.get("old_text", ""),
                    "new_text": first_change.get("new_text", ""),
                    "policy_section": doc.get("name", ""),
                    "status": "pending",
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
        {"_id": object_id(regulation_id)},
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