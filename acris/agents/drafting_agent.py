import os
from datetime import datetime, timezone

from llm import try_generate
from shared import (
    emit_error,
    emit_json,
    get_db,
    object_id,
    read_input_json,
    require_matching_organization,
    scoped_find,
    scoped_find_one,
)
from prompts_registry import DRAFTING_AMENDMENT_V1


def build_prompt(clause: str, old_text: str, new_text: str, policy_section: str, policy_text: str) -> str:
    return DRAFTING_AMENDMENT_V1.format(
        clause=clause,
        old_text=old_text or 'N/A',
        new_text=new_text or 'N/A',
        policy_section=policy_section,
        policy_text=policy_text
    )


def validate_draft(draft: str, fallback: str) -> tuple[str, str]:
    if not draft or draft == fallback:
        return fallback, "fallback"
        
    draft = draft.strip()
    # Check length constraints
    if len(draft) < 10 or len(draft) > 2000:
        return fallback, "fallback"
        
    # Check for leaked prompt text
    if "You are a compliance expert" in draft or "REGULATORY CLAUSE:" in draft:
        return fallback, "fallback"
        
    return draft, "llm"


def calculate_confidence(relevance_score: float, evidence_complete: bool, draft_source: str) -> float:
    """Confidence is derived from recorded inputs, not presented as model certainty."""
    source_score = {"llm": 1.0, "repair": 0.85, "fallback": 0.7}.get(draft_source, 0.0)
    evidence_score = 1.0 if evidence_complete else 0.0
    return round(max(0.0, min(1.0, (relevance_score * 0.6) + (evidence_score * 0.25) + (source_score * 0.15))), 4)


def main():
    payload = read_input_json()
    regulation_id = payload.get("regulation_id")
    if not regulation_id:
        emit_error("regulation_id is required")

    organization_id = payload.get("organization_id")
    if not organization_id:
        emit_error("organization_id is required")

    db = get_db()
    regulation = scoped_find_one(db, "regulations", organization_id, {"_id": object_id(regulation_id)})
    if not regulation:
        emit_error("Regulation not found")
    if payload.get("job_id"):
        require_matching_organization(db, "compliancejobs", payload["job_id"], organization_id)

    mappings = list(
        scoped_find(
            db,
            "impactmappings",
            organization_id,
            {"regulation_id": object_id(regulation_id), "reviewStatus": "pending"},
        ).sort("relevance_score", -1)
    )

    drafts = []
    for mapping in mappings:
        doc = scoped_find_one(db, "companydocuments", organization_id, {"_id": mapping.get("policyDocumentId") or mapping.get("doc_id")})
        policy_version = scoped_find_one(
            db,
            "companydocumentversions",
            organization_id,
            {
                "_id": mapping.get("policyVersionId") or mapping.get("documentVersionId"),
                "documentId": mapping.get("policyDocumentId") or mapping.get("doc_id"),
            },
        )
        if not doc or not policy_version:
            continue

        related_change = next(
            (change for change in regulation.get("changes", []) if change.get("clause") in mapping.get("affected_clauses", [])),
            {}
        )
        policy_text = policy_version.get("extractedText", "")[:3000]
        prompt = build_prompt(
            related_change.get("clause", mapping.get("clause", "")),
            related_change.get("old_text", mapping.get("old_text", "")),
            related_change.get("new_text", mapping.get("new_text", "")),
            doc.get("name", "Policy Section"),
            policy_text,
        )
        fallback = (
            f"{doc.get('name', 'Policy Section')} (revised): Align the policy with the new regulatory clause "
            f"{related_change.get('clause', mapping.get('clause', ''))}."
        )
        raw_amendment = try_generate(prompt, fallback)
        amendment_text, draft_source = validate_draft(raw_amendment, fallback)

        relevance_score = float(mapping.get("relevanceScore", mapping.get("relevance_score", 0)))
        chunk_ids = mapping.get("retrievedChunkIds", [])
        confidence = calculate_confidence(relevance_score, bool(chunk_ids), draft_source)
        db.impactmappings.update_one(
            {"_id": mapping["_id"], "organizationId": object_id(organization_id)},
            {
                "$set": {
                    "draft_amendment": amendment_text,
                    "reviewStatus": "pending",
                    "draft_source": draft_source,
                    "model": payload.get("model") or os.getenv("OLLAMA_MODEL", "llama3"),
                    "promptVersion": payload.get("prompt_version") or "drafting-amendment-v1",
                    "confidence": confidence,
                    "generatedAt": datetime.now(timezone.utc),
                },
            },
        )

        drafts.append({
            "mapping_id": str(mapping["_id"]),
            "doc_name": doc.get("name", ""),
            "amendment_text": amendment_text,
        })

    db.regulations.update_one(
        {"_id": object_id(regulation_id)},
        {"$set": {"status": "pending_draft"}},
    )

    emit_json({"drafts": drafts})


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit_error(str(error))