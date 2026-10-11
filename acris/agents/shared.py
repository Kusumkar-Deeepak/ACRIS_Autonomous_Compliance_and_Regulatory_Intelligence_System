import json
import os
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient

PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")


def configure_stdio_encoding() -> None:
    """Ensure agent JSON output is UTF-8 across platforms (notably Windows)."""
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")


configure_stdio_encoding()


def resolve_path(value: str) -> str:
    if not value:
                return str(PROJECT_ROOT)
    target = Path(value)
    return str(target if target.is_absolute() else PROJECT_ROOT / target)


def get_mongo_client() -> MongoClient:
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/acris")
    return MongoClient(uri)


def get_db():
    client = get_mongo_client()
    database_name = os.getenv("MONGODB_DB", "acris")
    return client[database_name]


def read_input_json() -> dict:
    if len(sys.argv) > 1 and sys.argv[1].strip():
        return json.loads(sys.argv[1])

    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    return json.loads(raw)


def emit_json(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))


def emit_error(message: str, code: int = 1, extra: dict | None = None) -> None:
    payload = {"error": message}
    if extra:
        payload.update(extra)
    sys.stderr.write(json.dumps(payload, ensure_ascii=False))
    sys.exit(code)


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def split_clauses(text: str) -> list[dict]:
    normalized = text.replace("\r\n", "\n")
    blocks = [block.strip() for block in re.split(r"\n{2,}", normalized) if block.strip()]
    clauses: list[dict] = []

    for index, block in enumerate(blocks, start=1):
        first_line = block.split("\n", 1)[0].strip()
        clause_match = re.match(r"^(Section\s+[\w.-]+|Clause\s+[\w.-]+|\d+(?:\.\d+)*|[A-Z][\w\s/&-]{3,80}:)", first_line, re.IGNORECASE)
        clause_label = clause_match.group(1).rstrip(":") if clause_match else f"Clause {index}"
        clauses.append({
            "clause": normalize_text(clause_label),
            "clause_number": normalize_text(clause_label),
            "text": normalize_text(block)
        })

    if not clauses and normalized.strip():
        clauses.append({"clause": "Clause 1", "clause_number": "Clause 1", "text": normalize_text(normalized)})

    return clauses


def match_threshold() -> float:
    configured = os.getenv("DIFF_MATCH_THRESHOLD", "0.45")
    try:
        value = float(configured)
    except ValueError:
        value = 0.45
    return max(0.0, min(1.0, value))


def best_match_with_score(target_text: str, candidates: list[dict], threshold: float | None = None) -> tuple[dict | None, float]:
    if not candidates:
        return None, 0.0
    target = normalize_text(target_text)
    scored = []
    for candidate in candidates:
        score = SequenceMatcher(None, target.lower(), normalize_text(candidate["text"]).lower()).ratio()
        scored.append((score, candidate))
    scored.sort(key=lambda item: item[0], reverse=True)
    threshold = match_threshold() if threshold is None else threshold
    if not scored or scored[0][0] <= threshold:
        return None, scored[0][0] if scored else 0.0
    return scored[0][1], scored[0][0]


def best_match(target_text: str, candidates: list[dict], threshold: float | None = None) -> dict | None:
    return best_match_with_score(target_text, candidates, threshold)[0]


def object_id(value: str):
    return ObjectId(value)


def scoped_find_one(db, collection_name: str, organization_id, query: dict):
    if not organization_id:
        raise ValueError("organizationId is required for scoped queries")
    scoped_query = {**query, "organizationId": object_id(organization_id)
                    if isinstance(organization_id, str) else organization_id}
    return db[collection_name].find_one(scoped_query)


def scoped_find(db, collection_name: str, organization_id, query: dict):
    if not organization_id:
        raise ValueError("organizationId is required for scoped queries")
    scoped_query = {**query, "organizationId": object_id(organization_id)
                    if isinstance(organization_id, str) else organization_id}
    return db[collection_name].find(scoped_query)


def require_matching_organization(db, collection_name: str, resource_id, organization_id):
    resource = db[collection_name].find_one({"_id": object_id(resource_id)})
    if not resource:
        raise ValueError(f"{collection_name} not found")
    expected = object_id(organization_id) if isinstance(organization_id, str) else organization_id
    if resource.get("organizationId") != expected:
        raise ValueError("organizationId does not match persisted resource")
    return resource