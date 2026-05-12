import json
from difflib import SequenceMatcher

from llm import try_generate
from shared import best_match, emit_error, emit_json, get_db, normalize_text, object_id, read_input_json, split_clauses


def parse_json_response(response: str) -> dict:
    try:
        return json.loads(response)
    except Exception:
        return {}


def compare_clause(old_text: str, new_text: str) -> dict:
    prompt = (
        "Compare these two regulatory clause texts. Identify if the clause was added, removed, or modified. "
        "If modified, summarise what changed concisely. Respond in JSON: {\"change_type\": \"added|removed|modified\", \"summary\": \"...\"}.\n\n"
        f"OLD TEXT:\n{old_text}\n\nNEW TEXT:\n{new_text}"
    )
    fallback_summary = "Clause updated to reflect the latest regulatory language."
    response = try_generate(prompt, json.dumps({"change_type": "modified", "summary": fallback_summary}))
    parsed = parse_json_response(response)
    if not parsed.get("change_type"):
        parsed = {"change_type": "modified", "summary": fallback_summary}
    return parsed


def summarize_for_business(change_type: str, clause: str, old_text: str, new_text: str) -> str:
    prompt = (
        "You are helping non-technical employees understand a regulation update. "
        "Write 1-2 simple sentences in plain English. Avoid legal jargon, avoid bullets, and be specific.\n\n"
        f"Change type: {change_type}\n"
        f"Clause label: {clause}\n\n"
        f"Previous text:\n{old_text or 'Not available'}\n\n"
        f"Current text:\n{new_text or 'Not available'}"
    )

    fallback = {
        "added": "A new requirement was introduced in this clause and should be reviewed for policy updates.",
        "removed": "An older requirement has been removed from this clause, so related internal guidance may need cleanup.",
        "modified": "This clause has been updated, so teams should compare old and new wording and adjust procedures where needed.",
    }.get(change_type, "This clause has changed and should be reviewed for policy impact.")

    return try_generate(prompt, fallback)


def main():
    payload = read_input_json()
    regulation_id = payload.get("regulation_id")
    if not regulation_id:
        emit_error("regulation_id is required")

    db = get_db()
    regulation = db.regulations.find_one({"_id": object_id(regulation_id)})
    if not regulation:
        emit_error("Regulation not found")

    new_text = regulation.get("extracted_text", "") or ""
    new_clauses = split_clauses(new_text)

    previous = db.regulations.find_one(
        {
            "source": regulation.get("source"),
            "title": regulation.get("title"),
            "version": {"$lt": regulation.get("version", 1)},
        },
        sort=[("version", -1)],
    )

    changes = []

    if not previous or not previous.get("extracted_text"):
        for clause in new_clauses:
            summary = summarize_for_business("added", clause["clause"], "", clause["text"])
            changes.append({
                "clause": clause["clause"],
                "old_text": "",
                "new_text": clause["text"],
                "change_type": "added",
                "summary": summary,
            })
    else:
        old_clauses = split_clauses(previous.get("extracted_text", ""))
        matched_old_indexes = set()

        for clause in new_clauses:
            exact_old = next((item for item in old_clauses if item["clause"].lower() == clause["clause"].lower()), None)
            candidate = exact_old or best_match(clause["text"], old_clauses)

            if candidate:
                old_index = old_clauses.index(candidate)
                matched_old_indexes.add(old_index)
                if normalize_text(candidate["text"]) != normalize_text(clause["text"]):
                    diff_result = compare_clause(candidate["text"], clause["text"])
                    changes.append({
                        "clause": clause["clause"],
                        "old_text": candidate["text"],
                        "new_text": clause["text"],
                        "change_type": diff_result.get("change_type", "modified"),
                        "summary": diff_result.get("summary", "Clause updated."),
                    })
            else:
                summary = summarize_for_business("added", clause["clause"], "", clause["text"])
                changes.append({
                    "clause": clause["clause"],
                    "old_text": "",
                    "new_text": clause["text"],
                    "change_type": "added",
                    "summary": summary,
                })

        for index, clause in enumerate(old_clauses):
            if index not in matched_old_indexes:
                summary = summarize_for_business("removed", clause["clause"], clause["text"], "")
                changes.append({
                    "clause": clause["clause"],
                    "old_text": clause["text"],
                    "new_text": "",
                    "change_type": "removed",
                    "summary": summary,
                })

    db.regulations.update_one(
        {"_id": object_id(regulation_id)},
        {"$set": {"changes": changes, "status": "pending_map"}},
    )

    emit_json({
        "regulation_id": regulation_id,
        "changes": changes,
        "total_changes": len(changes),
        "status": "pending_map",
    })


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit_error(str(error))