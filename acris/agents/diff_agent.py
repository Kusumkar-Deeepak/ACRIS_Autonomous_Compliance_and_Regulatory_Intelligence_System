import json
import hashlib
import time
from concurrent.futures import ThreadPoolExecutor

from llm import try_generate
from shared import (
    best_match_with_score,
    emit_error,
    emit_json,
    get_db,
    match_threshold,
    normalize_text,
    object_id,
    read_input_json,
    split_clauses,
)
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


def clause_id(regulation_key: str, clause_dict: dict) -> str:
    label = normalize_text(clause_dict.get("clause_number") or clause_dict.get("clause", ""))
    if label and not label.lower().startswith("clause "):
        return label.lower().replace(" ", "-")
    digest = hashlib.sha256(
        f"{regulation_key}:{normalize_text(clause_dict.get('text', ''))}".encode("utf-8")
    ).hexdigest()
    return f"clause-{digest[:16]}"


def base_row(clause_dict, regulation_key, from_version, to_version, from_id, to_id, threshold, ratio):
    return {
        "clause": clause_dict.get("clause", ""),
        "clauseId": clause_id(regulation_key, clause_dict),
        "clauseNumber": clause_dict.get("clause_number", clause_dict.get("clause", "")),
        "old_text": "",
        "new_text": clause_dict.get("text", ""),
        "oldText": "",
        "newText": clause_dict.get("text", ""),
        "matchRatio": ratio,
        "matchThreshold": threshold,
        "fromVersion": from_version,
        "toVersion": to_version,
        "fromRegulationId": str(from_id) if from_id else None,
        "toRegulationId": str(to_id),
        "detectionMethod": "deterministic",
    }


def process_added(clause_dict, metadata=None):
    metadata = metadata or {
        "regulation_key": "",
        "from_version": None,
        "to_version": None,
        "from_id": None,
        "to_id": None,
        "threshold": match_threshold(),
    }
    start = time.time()
    summary = summarize_for_business("added", clause_dict["clause"], "", clause_dict["text"])
    elapsed_ms = int((time.time() - start) * 1000)
    row = base_row(clause_dict, **metadata, ratio=0.0)
    row.update({"change_type": "added", "changeType": "added", "summary": summary, "processing_time_ms": elapsed_ms})
    return row

def process_modified(clause_dict, candidate_dict, metadata, ratio):
    start = time.time()
    diff_result = compare_clause(candidate_dict["text"], clause_dict["text"])
    elapsed_ms = int((time.time() - start) * 1000)
    row = base_row(clause_dict, **metadata, ratio=ratio)
    row.update({
        "old_text": candidate_dict["text"],
        "oldText": candidate_dict["text"],
        "change_type": "modified",
        "changeType": "modified",
        "summary": diff_result.get("summary", "Clause updated."),
        "processing_time_ms": elapsed_ms,
        "detectionMethod": "llm-assisted",
    })
    return row

def process_removed(clause_dict, metadata):
    start = time.time()
    summary = summarize_for_business("removed", clause_dict["clause"], clause_dict["text"], "")
    elapsed_ms = int((time.time() - start) * 1000)
    row = base_row(clause_dict, **metadata, ratio=0.0)
    row.update({
        "old_text": clause_dict["text"],
        "oldText": clause_dict["text"],
        "new_text": "",
        "newText": "",
        "change_type": "removed",
        "changeType": "removed",
        "summary": summary,
        "processing_time_ms": elapsed_ms,
    })
    return row


def process_static(change_type, clause_dict, candidate_dict, metadata, ratio):
    row = base_row(clause_dict, **metadata, ratio=ratio)
    row.update({
        "old_text": candidate_dict.get("text", "") if candidate_dict else "",
        "oldText": candidate_dict.get("text", "") if candidate_dict else "",
        "new_text": clause_dict.get("text", ""),
        "newText": clause_dict.get("text", ""),
        "change_type": change_type,
        "changeType": change_type,
        "summary": "Clause numbering changed without a substantive text change." if change_type == "renumbered" else "No substantive change detected.",
        "processing_time_ms": 0,
    })
    if change_type == "renumbered":
        row["oldClauseNumber"] = candidate_dict.get("clause_number", candidate_dict.get("clause", ""))
        row["newClauseNumber"] = clause_dict.get("clause_number", clause_dict.get("clause", ""))
    return row

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
    if not normalize_text(new_text):
        emit_error("Regulation extraction produced no content", extra={"code": "PRECONDITION_FAILED"})
    new_clauses = split_clauses(new_text)
    threshold = match_threshold()
    regulation_key = regulation.get("regulationKey") or f"{regulation.get('source', '')}:{normalize_text(regulation.get('title', '')).lower()}"

    previous = None
    if regulation.get("previousVersionId"):
        previous = db.regulations.find_one({"_id": regulation["previousVersionId"], "organizationId": regulation.get("organizationId"), "regulationKey": regulation_key})
    if not previous:
        previous = db.regulations.find_one(
            {"organizationId": regulation.get("organizationId"), "source": regulation.get("source"), "title": regulation.get("title"), "version": {"$lt": regulation.get("version", 1)}},
            sort=[("version", -1)],
        )

    if previous and not normalize_text(previous.get("extracted_text", "")):
        emit_error("Previous regulation extraction produced no content", extra={"code": "PRECONDITION_FAILED"})

    metadata = {
        "regulation_key": regulation_key,
        "from_version": previous.get("version") if previous else None,
        "to_version": regulation.get("version", 1),
        "from_id": previous.get("_id") if previous else None,
        "to_id": regulation.get("_id"),
        "threshold": threshold,
    }

    changes = []
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = []
        if not previous or not previous.get("extracted_text"):
            for clause in new_clauses:
                futures.append(executor.submit(process_added, clause, metadata))
        else:
            old_clauses = split_clauses(previous.get("extracted_text", ""))
            matched_old_indexes = set()

            for clause in new_clauses:
                available = [item for index, item in enumerate(old_clauses) if index not in matched_old_indexes]
                exact_old = next((item for item in available if item["clause"].lower() == clause["clause"].lower()), None)
                candidate, ratio = (exact_old, 1.0) if exact_old else best_match_with_score(clause["text"], available, threshold)

                if not candidate:
                    same_text = next((item for item in available if normalize_text(item["text"]) == normalize_text(clause["text"])), None)
                    if same_text:
                        candidate = same_text
                        ratio = 1.0

                if candidate:
                    old_index = old_clauses.index(candidate)
                    matched_old_indexes.add(old_index)
                    same_text = normalize_text(candidate["text"]) == normalize_text(clause["text"])
                    same_number = candidate.get("clause_number", candidate.get("clause")) == clause.get("clause_number", clause.get("clause"))
                    if same_text and same_number:
                        futures.append(executor.submit(process_static, "unchanged", clause, candidate, metadata, ratio))
                    elif same_text:
                        futures.append(executor.submit(process_static, "renumbered", clause, candidate, metadata, ratio))
                    else:
                        futures.append(executor.submit(process_modified, clause, candidate, metadata, ratio))
                else:
                    futures.append(executor.submit(process_added, clause, metadata))

            for index, clause in enumerate(old_clauses):
                if index not in matched_old_indexes:
                    futures.append(executor.submit(process_removed, clause, metadata))

        for future in futures:
            try:
                result = future.result()
                changes.append(result)
            except Exception:
                pass # partial failure isolation

    db.regulations.update_one(
        {"_id": object_id(regulation_id)},
        {"$set": {"changes": changes, "previousVersionId": previous.get("_id") if previous else None, "regulationKey": regulation_key, "status": "pending_map"}},
    )

    emit_json({
        "regulation_id": regulation_id,
        "changes": changes,
        "total_changes": sum(1 for change in changes if change.get("change_type") != "unchanged"),
        "counts": {change_type: sum(1 for change in changes if change.get("change_type") == change_type) for change_type in ("added", "modified", "removed", "renumbered", "unchanged")},
        "fromVersion": previous.get("version") if previous else None,
        "toVersion": regulation.get("version", 1),
        "previousRegulationId": str(previous["_id"]) if previous else None,
        "status": "pending_map",
    })


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit_error(str(error))