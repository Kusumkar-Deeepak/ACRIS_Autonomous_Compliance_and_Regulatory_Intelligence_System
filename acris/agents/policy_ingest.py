from datetime import datetime
from pathlib import Path

import fitz

from chroma_store import embed_document
from shared import emit_error, emit_json, get_db, normalize_text, object_id, read_input_json


def extract_text(pdf_path: str) -> str:
    doc = fitz.open(pdf_path)
    page_texts = []
    for page in doc:
        text = page.get_text("text") or ""
        page_texts.append(normalize_text(text))
    return "\n\n".join(page_texts).strip()


def main():
    payload = read_input_json()
    pdf_path = payload.get("pdf_path")
    name = payload.get("name")
    doc_type = payload.get("type", "policy")
    owner_team = payload.get("owner_team", "Compliance")
    organization_id = payload.get("organization_id")

    if not pdf_path or not Path(pdf_path).exists():
        emit_error("Policy PDF not found", extra={"pdf_path": pdf_path})
    if not name:
        emit_error("Policy name is required")
    if not organization_id:
        emit_error("organization_id is required")

    content_text = extract_text(pdf_path)
    db = get_db()
    doc = db.companydocs.insert_one({
        "organizationId": object_id(organization_id),
        "name": name,
        "type": doc_type,
        "content_text": content_text,
        "embedding_id": "",
        "file_path": pdf_path,
        "last_updated": datetime.utcnow(),
        "owner_team": owner_team,
    })

    doc_id = str(doc.inserted_id)
    embed_document(doc_id, name, content_text, {"type": doc_type, "owner_team": owner_team})
    db.companydocs.update_one({"_id": doc.inserted_id}, {"$set": {"embedding_id": doc_id}})

    emit_json({
        "doc_id": doc_id,
        "name": name,
        "status": "indexed",
        "characters": len(content_text),
    })


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit_error(str(error))