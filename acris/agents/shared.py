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
            "text": normalize_text(block)
        })

    if not clauses and normalized.strip():
        clauses.append({"clause": "Clause 1", "text": normalize_text(normalized)})

    return clauses


def best_match(target_text: str, candidates: list[dict]) -> dict | None:
    if not candidates:
        return None
    target = normalize_text(target_text)
    scored = []
    for candidate in candidates:
        score = SequenceMatcher(None, target.lower(), normalize_text(candidate["text"]).lower()).ratio()
        scored.append((score, candidate))
    scored.sort(key=lambda item: item[0], reverse=True)
    return scored[0][1] if scored and scored[0][0] > 0.45 else None


def object_id(value: str):
    return ObjectId(value)