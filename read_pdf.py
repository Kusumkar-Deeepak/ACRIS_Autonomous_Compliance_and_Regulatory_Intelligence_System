from pathlib import Path

import fitz


def extract_text(pdf_path: str, output_path: str = "pdf_content.txt"):
    document = fitz.open(pdf_path)
    pages = []

    for page in document:
        page_text = page.get_text("text") or ""
        pages.append(page_text.strip())

    text = "\n\n".join(page for page in pages if page)
    Path(output_path).write_text(text, encoding="utf-8")
    print(f"Text extracted to {output_path}")


if __name__ == "__main__":
    sample_pdf = Path(__file__).resolve().parent / "acris" / "sample_pdfs" / "ACRIS (1).pdf"
    extract_text(str(sample_pdf))
