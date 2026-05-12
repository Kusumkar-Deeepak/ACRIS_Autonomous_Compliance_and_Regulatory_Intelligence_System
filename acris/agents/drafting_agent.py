from llm import try_generate
from shared import emit_error, emit_json, get_db, object_id, read_input_json


def build_prompt(clause: str, old_text: str, new_text: str, policy_section: str, policy_text: str) -> str:
    return (
        "You are a compliance expert. A regulatory clause has changed.\n"
        f"REGULATORY CLAUSE: {clause}\n\n"
        f"OLD REGULATION:\n{old_text or 'N/A'}\n\n"
        f"NEW REGULATION:\n{new_text or 'N/A'}\n\n"
        f"CURRENT POLICY SECTION: {policy_section}\n\n"
        f"POLICY TEXT:\n{policy_text}\n\n"
        "Write a concise, professional amendment to update the policy section to comply with the new regulation. "
        "Start with the section reference."
    )


def main():
    payload = read_input_json()
    regulation_id = payload.get("regulation_id")
    if not regulation_id:
        emit_error("regulation_id is required")

    db = get_db()
    mappings = list(
        db.impactmappings.find({"regulation_id": object_id(regulation_id), "status": "pending"})
        .sort("relevance_score", -1)
    )

    drafts = []
    for mapping in mappings:
        doc = db.companydocs.find_one({"_id": mapping.get("doc_id")})
        regulation = db.regulations.find_one({"_id": object_id(regulation_id)})
        if not doc or not regulation:
            continue

        related_change = next(
            (change for change in regulation.get("changes", []) if change.get("clause") in mapping.get("affected_clauses", [])),
            {}
        )
        policy_text = doc.get("content_text", "")[:3000]
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
        amendment_text = try_generate(prompt, fallback)

        db.impactmappings.update_one(
            {"_id": mapping["_id"]},
            {"$set": {"draft_amendment": amendment_text, "status": "pending"}},
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