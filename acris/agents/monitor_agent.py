from datetime import datetime, timezone
from pathlib import Path

from shared import emit_error, emit_json, get_db, normalize_text, read_input_json


def main():
    payload = read_input_json()
    pdf_path = payload.get("pdf_path")
    source = payload.get("source")
    title = payload.get("title")

    if not pdf_path:
        emit_error("pdf_path is required")
    if not Path(pdf_path).exists():
        emit_error("PDF file does not exist", extra={"pdf_path": pdf_path})
    if not source or not title:
        emit_error("source and title are required")

    db = get_db()
    latest = db.regulations.find_one(
        {"source": source, "title": title},
        sort=[("version", -1)],
    )
    version = (latest.get("version", 0) + 1) if latest else 1

    document = {
        "source": source,
        "title": normalize_text(title),
        "published_date": datetime.now(timezone.utc),
        "pdf_url": pdf_path,
        "extracted_text": "",
        "version": version,
        "status": "pending_parse",
        "changes": [],
    }

    result = db.regulations.insert_one(document)
    emit_json({
        "regulation_id": str(result.inserted_id),
        "status": "pending_parse",
        "pdf_path": pdf_path,
    })


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit_error(str(error))