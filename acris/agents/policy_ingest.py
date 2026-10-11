import hashlib
from datetime import datetime
from pathlib import Path
import re

import fitz
from chroma_store import (
    deactivate_version_vectors,
    embed_chunks,
    get_embedding_model,
    get_embedding_version,
)
from shared import emit_error, emit_json, get_db, normalize_text, object_id, read_input_json


CHUNKING_VERSION = "paragraph-v1"


def extract_text(pdf_path: str) -> str:
    doc = fitz.open(pdf_path)
    page_texts = []
    for page in doc:
        text = page.get_text("text") or ""
        page_texts.append(normalize_text(text))
    return "\n\n".join(page_texts).strip()


def content_hash(text: str) -> str:
    return hashlib.sha256(normalize_text(text).encode("utf-8")).hexdigest()


def split_chunks(text: str) -> list[dict]:
    blocks = [normalize_text(block) for block in re.split(r"\n{2,}", text) if normalize_text(block)]
    if not blocks and normalize_text(text):
        blocks = [normalize_text(text)]
    return [
        {"chunkIndex": index, "section": "", "page": None, "text": block}
        for index, block in enumerate(blocks)
    ]


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
    if not content_text:
        emit_error("Policy text extraction produced no content", extra={"code": "EMPTY_EXTRACTION"})

    db = get_db()
    organization_object_id = object_id(organization_id)
    current_hash = content_hash(content_text)
    document = db.companydocuments.find_one({
        "organizationId": organization_object_id,
        "name": name,
    })

    if document:
        current_version = db.companydocumentversions.find_one({
            "documentId": document["_id"],
            "isCurrent": True,
        })
        if current_version and current_version.get("contentHash") == current_hash:
            emit_json({
                "doc_id": str(document["_id"]),
                "document_id": str(document["_id"]),
                "document_version_id": str(current_version["_id"]),
                "version_number": current_version.get("versionNumber", 1),
                "is_new_version": False,
                "status": "unchanged",
                "characters": len(content_text),
            })
            return
        version_number = (current_version.get("versionNumber", 0) + 1) if current_version else 1
        previous_version_id = current_version["_id"] if current_version else None
        if current_version:
            db.companydocumentversions.update_one(
                {"_id": current_version["_id"], "documentId": document["_id"]},
                {"$set": {"isCurrent": False}},
            )
            deactivate_version_vectors(str(current_version["_id"]))
    else:
        document_result = db.companydocuments.insert_one({
            "organizationId": organization_object_id,
            "name": name,
            "documentType": doc_type,
            "ownerTeam": owner_team,
            "source": "manual",
            "sourceType": "manual-upload",
            "externalDocumentId": "",
            "sourceUrl": "",
            "currentVersionId": None,
            "syncStatus": "synced",
            "lastSyncedAt": datetime.utcnow(),
            "lastModifiedAt": datetime.utcnow(),
        })
        document = db.companydocuments.find_one({"_id": document_result.inserted_id})
        version_number = 1
        previous_version_id = None

    version_result = db.companydocumentversions.insert_one({
        "organizationId": organization_object_id,
        "documentId": document["_id"],
        "versionNumber": version_number,
        "contentHash": current_hash,
        "storageKey": pdf_path,
        "extractedText": content_text,
        "embeddingVersion": get_embedding_version(),
        "chunkingVersion": CHUNKING_VERSION,
        "source": "manual",
        "sourceType": "manual-upload",
        "name": name,
        "createdAt": datetime.utcnow(),
        "createdBy": "system",
        "isCurrent": True,
        "previousVersionId": previous_version_id,
    })
    version_id = version_result.inserted_id
    db.companydocuments.update_one(
        {"_id": document["_id"], "organizationId": organization_object_id},
        {
            "$set": {
                "currentVersionId": version_id,
                "syncStatus": "synced",
                "lastSyncedAt": datetime.utcnow(),
                "lastModifiedAt": datetime.utcnow(),
            },
        },
    )

    chunks = split_chunks(content_text)
    chunk_rows = []
    for chunk in chunks:
        chunk_rows.append({
            "organizationId": organization_object_id,
            "documentId": document["_id"],
            "documentVersionId": version_id,
            "chunkIndex": chunk["chunkIndex"],
            "section": chunk["section"],
            "page": chunk["page"],
            "text": chunk["text"],
            "embeddingModel": get_embedding_model(),
            "embeddingVersion": get_embedding_version(),
            "createdAt": datetime.utcnow(),
        })

    if chunk_rows:
        inserted_chunks = db.documentchunks.insert_many(chunk_rows)
        vector_chunks = []
        for chunk, chunk_id in zip(chunk_rows, inserted_chunks.inserted_ids):
            chunk["embeddingId"] = str(chunk_id)
            db.documentchunks.update_one(
                {"_id": chunk_id, "organizationId": organization_object_id},
                {"$set": {"embeddingId": str(chunk_id)}},
            )
            vector_chunks.append({
                "text": chunk["text"],
                "metadata": {
                    "name": name,
                    "organizationId": str(organization_id),
                    "documentId": str(document["_id"]),
                    "documentVersionId": str(version_id),
                    "chunkId": str(chunk_id),
                    "chunkIndex": chunk["chunkIndex"],
                    "section": chunk["section"],
                    "page": chunk["page"] if chunk["page"] is not None else -1,
                    "embeddingModel": get_embedding_model(),
                    "embeddingVersion": get_embedding_version(),
                    "isCurrentVersion": True,
                },
            })
        embed_chunks(vector_chunks)

    emit_json({
        "doc_id": str(document["_id"]),
        "document_id": str(document["_id"]),
        "document_version_id": str(version_id),
        "version_number": version_number,
        "is_new_version": True,
        "name": name,
        "status": "indexed",
        "characters": len(content_text),
        "chunk_count": len(chunk_rows),
    })


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit_error(str(error))