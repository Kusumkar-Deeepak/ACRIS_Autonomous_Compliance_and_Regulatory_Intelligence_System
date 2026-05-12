from pathlib import Path

import fitz

from shared import emit_error, emit_json, get_db, object_id, normalize_text, read_input_json


def extract_pdf_text(pdf_path: str) -> tuple[str, int]:
    doc = fitz.open(pdf_path)
    page_texts = []
    for page in doc:
        text = page.get_text("text") or ""
        page_texts.append(normalize_text(text))
    combined = "\n\n".join(text for text in page_texts if text)
    return combined.strip(), len(doc)


def main():
    payload = read_input_json()
    regulation_id = payload.get("regulation_id")
    pdf_path = payload.get("pdf_path")

    if not regulation_id:
        emit_error("regulation_id is required")
    if not pdf_path or not Path(pdf_path).exists():
        emit_error("PDF file does not exist", extra={"pdf_path": pdf_path})

    text, pages = extract_pdf_text(pdf_path)
    word_count = len(text.split())
    db = get_db()
    db.regulations.update_one(
        {"_id": object_id(regulation_id)},
        {"$set": {"extracted_text": text, "status": "pending_diff"}},
    )

    emit_json({
        "regulation_id": regulation_id,
        "word_count": word_count,
        "pages": pages,
        "status": "pending_diff",
    })


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit_error(str(error))