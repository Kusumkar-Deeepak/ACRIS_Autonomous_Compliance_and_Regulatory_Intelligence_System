import json
from difflib import SequenceMatcher

from llm import try_generate
from shared import best_match, emit_error, emit_json, get_db, normalize_text, object_id, read_input_json, split_clauses
from prompts_registry import DIFF_COMPARE_V1, DIFF_BUSINESS_SUMMARY_V1


def parse_json_response(response: str) -> dict:
    try:
        return json.loads(response)
    except Exception:
        return {}


def compare_clause(old_text: str, new_text: str) -> dict:
    prompt = DIFF_COMPARE_V1.format(old_text=old_text, new_text=new_text)
    fallback_summary = "Clause updated to reflect the latest regulatory language."
    response = try_generate(prompt, json.dumps({"change_type": "modified", "summary": fallback_summary}))
    parsed = parse_json_response(response)
    if not parsed.get("change_type"):
        parsed = {"change_type": "modified", "summary": fallback_summary}
    return parsed


def summarize_for_business(change_type: str, clause: str, old_text: str, new_text: str) -> str:
    prompt = DIFF_BUSINESS_SUMMARY_V1.format(
        change_type=change_type,
        clause=clause,
        old_text=old_text or 'Not available',
        new_text=new_text or 'Not available'
    )

    fallback = {
        "added": f"A new requirement was introduced in {clause} and should be reviewed for policy updates.",
        "removed": f"An older requirement has been removed from {clause}, so related internal guidance may need cleanup.",
        "modified": f"{clause} has been updated, so teams should compare old and new wording and adjust procedures where needed.",
    }.get(change_type, f"{clause} has changed and should be reviewed for policy impact.")

    return try_generate(prompt, fallback)


import time
from concurrent.futures import ThreadPoolExecutor, as_completed

def process_added(clause_dict):
    start = time.time()
    summary = summarize_for_business("added", clause_dict["clause"], "", clause_dict["text"])
    elapsed_ms = int((time.time() - start) * 1000)
    return {
        "clause": clause_dict["clause"],
        "old_text": "",
        "new_text": clause_dict["text"],
        "change_type": "added",
        "summary": summary,
        "processing_time_ms": elapsed_ms,
    }

def process_modified(clause_dict, candidate_dict):
    start = time.time()
    diff_result = compare_clause(candidate_dict["text"], clause_dict["text"])
    elapsed_ms = int((time.time() - start) * 1000)
    return {
        "clause": clause_dict["clause"],
        "old_text": candidate_dict["text"],
        "new_text": clause_dict["text"],
        "change_type": diff_result.get("change_type", "modified"),
        "summary": diff_result.get("summary", "Clause updated."),
        "processing_time_ms": elapsed_ms,
    }

def process_removed(clause_dict):
    start = time.time()
    summary = summarize_for_business("removed", clause_dict["clause"], clause_dict["text"], "")
    elapsed_ms = int((time.time() - start) * 1000)
    return {
        "clause": clause_dict["clause"],
        "old_text": clause_dict["text"],
        "new_text": "",
        "change_type": "removed",
        "summary": summary,
        "processing_time_ms": elapsed_ms,
    }

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
            "organizationId": regulation.get("organizationId"),
            "source": regulation.get("source"),
            "title": regulation.get("title"),
            "version": {"$lt": regulation.get("version", 1)},
        },
        sort=[("version", -1)],
    )

    changes = []
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = []
        if not previous or not previous.get("extracted_text"):
            for clause in new_clauses:
                futures.append(executor.submit(process_added, clause))
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
                        futures.append(executor.submit(process_modified, clause, candidate))
                else:
                    futures.append(executor.submit(process_added, clause))

            for index, clause in enumerate(old_clauses):
                if index not in matched_old_indexes:
                    futures.append(executor.submit(process_removed, clause))

        for future in futures:
            try:
                result = future.result()
                changes.append(result)
            except Exception as e:
                pass # partial failure isolation

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