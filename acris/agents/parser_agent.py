from pathlib import Path

import fitz
import os

from shared import emit_error, emit_json, get_db, object_id, read_input_json


def extract_pdf_text(pdf_path: str) -> tuple[str, int]:
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        emit_error(f"Failed to open PDF (file may be corrupted or password-protected): {str(e)}")

    if len(doc) > 100:
        emit_error("PDF exceeds maximum allowed page count (100 pages).")

    page_texts = []
    import re
    for page in doc:
        text = page.get_text("text") or ""
        # Clean up horizontal whitespace but preserve paragraphs/newlines
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        if text.strip():
            page_texts.append(text.strip())

    combined = "\n\n".join(page_texts)
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
    minimum_chars = int(os.getenv("MIN_EXTRACTED_CHARS", "20"))
    if len(text) < minimum_chars:
        emit_error("PDF extraction produced no usable text", extra={"code": "EMPTY_EXTRACTION"})
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