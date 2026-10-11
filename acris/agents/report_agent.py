from datetime import datetime, timezone
from pathlib import Path

import fitz
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from llm import try_generate
from shared import emit_error, emit_json, get_db, object_id, read_input_json, resolve_path, scoped_find, scoped_find_one


def chunk_text(value: str, max_chars: int = 520) -> list[str]:
    text = (value or "").strip()
    if not text:
        return ["-"]

    words = text.split()
    chunks: list[str] = []
    current = ""

    for word in words:
        candidate = f"{current} {word}".strip() if current else word
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                chunks.append(current)
            current = word

    if current:
        chunks.append(current)

    return chunks or ["-"]


def build_diff_rows(changes: list[dict], body_style: ParagraphStyle) -> list[list]:
    rows = [["Clause", "Old Text", "New Text", "Change Type"]]
    for change in changes:
        old_chunks = chunk_text(change.get("old_text", "") or "-")
        new_chunks = chunk_text(change.get("new_text", "") or "-")
        row_count = max(len(old_chunks), len(new_chunks))

        for index in range(row_count):
            clause_text = change.get("clause", "") if index == 0 else ""
            change_type = change.get("change_type", "") if index == 0 else ""
            old_text = old_chunks[index] if index < len(old_chunks) else ""
            new_text = new_chunks[index] if index < len(new_chunks) else ""
            rows.append([
                Paragraph(clause_text, body_style),
                Paragraph(old_text, body_style),
                Paragraph(new_text, body_style),
                Paragraph(change_type, body_style),
            ])

    return rows


def clip_text(value: str, max_chars: int = 700) -> str:
    text = (value or "").strip()
    if len(text) <= max_chars:
        return text
    return f"{text[:max_chars].strip()}..."


def clean_for_paragraph(value: str) -> str:
    text = (value or "").strip()
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return text


def build_report_narrative(company_name: str, regulation: dict, mappings: list[dict]) -> tuple[str, list[str]]:
    changes = regulation.get("changes", [])
    change_preview = []
    for change in changes[:8]:
        change_preview.append(
            "- "
            f"{change.get('clause', 'Clause')}: {change.get('change_type', 'modified')} | "
            f"summary: {clip_text(change.get('summary', ''), 140)}"
        )

    mapping_preview = []
    for mapping in mappings[:8]:
        mapping_preview.append(
            "- "
            f"Doc: {mapping.get('policy_section', 'Policy Document')} | "
            f"score: {mapping.get('relevance_score', 0):.2f} | "
            f"clauses: {', '.join(mapping.get('affected_clauses', [])) or 'None'}"
        )

    change_preview_text = "\n".join(change_preview) if change_preview else "- No clause changes"
    mapping_preview_text = "\n".join(mapping_preview) if mapping_preview else "- No mapped documents"

    summary_prompt = (
        "You are writing a short executive summary for a compliance dashboard for mixed technical and non-technical users. "
        "Write 3 to 4 simple sentences in plain English. Mention the risk level and immediate focus areas. "
        "Do not use markdown or bullet points.\n\n"
        f"Company: {company_name}\n"
        f"Regulation title: {regulation.get('title', 'Regulation')}\n"
        f"Source: {regulation.get('source', 'N/A')}\n"
        f"Total changes: {len(changes)}\n"
        f"Mapped policy docs: {len(mappings)}\n\n"
        "Top clause changes:\n"
        f"{change_preview_text}\n\n"
        "Top impacted documents:\n"
        f"{mapping_preview_text}"
    )

    actions_prompt = (
        "Based on this regulation impact, produce exactly 4 short action items for business teams. "
        "Return each action on a new line, no numbering and no markdown symbols. "
        "Keep each line under 100 characters.\n\n"
        f"Regulation: {regulation.get('title', 'Regulation')}\n"
        f"Total changes: {len(changes)}\n"
        f"Mapped docs: {len(mappings)}\n"
        "Top changes:\n"
        f"{change_preview_text}"
    )

    summary_fallback = (
        f"{regulation.get('title', 'This regulation')} introduces {len(changes)} detected clause changes. "
        f"ACRIS mapped {len(mappings)} company policy documents that may be impacted. "
        "Compliance, risk, and policy owners should review high-impact clauses first and align internal procedures."
    )
    actions_fallback = [
        "Review high-impact clauses with Compliance and Policy owners.",
        "Map each impacted clause to current policy sections.",
        "Update draft amendments and obtain reviewer approvals.",
        "Track implementation dates and communicate changes to teams.",
    ]

    summary = try_generate(summary_prompt, summary_fallback).strip()
    action_text = try_generate(actions_prompt, "\n".join(actions_fallback)).strip()
    actions = [line.strip(" -\t") for line in action_text.splitlines() if line.strip()]
    if not actions:
        actions = actions_fallback
    return summary, actions[:4]


def make_table(data, col_widths):
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("LEADING", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.HexColor("#F8FAFC")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def main():
    payload = read_input_json()
    regulation_id = payload.get("regulation_id")
    company_name = payload.get("company_name", "Your Company")
    organization_id = payload.get("organization_id")
    output_path = resolve_path(payload.get("output_path", f"./reports/{regulation_id}.pdf"))

    if not regulation_id:
        emit_error("regulation_id is required")
    if not organization_id:
        emit_error("organization_id is required")

    db = get_db()
    regulation = scoped_find_one(db, "regulations", organization_id, {"_id": object_id(regulation_id)})
    if not regulation:
        emit_error("Regulation not found")

    mappings = list(
        scoped_find(db, "impactmappings", organization_id, {"regulation_id": object_id(regulation_id)})
        .sort("relevance_score", -1)
    )
    for mapping in mappings:
        policy_document_id = mapping.get("policyDocumentId") or mapping.get("doc_id")
        policy_document = scoped_find_one(
            db,
            "companydocuments",
            organization_id,
            {"_id": policy_document_id},
        )
        if policy_document:
            mapping["policy_section"] = policy_document.get(
                "name",
                mapping.get("policy_section", "Policy Document"),
            )
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    narrative_summary, action_items = build_report_narrative(company_name, regulation, mappings)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="CenterTitle", parent=styles["Title"], alignment=TA_CENTER, fontSize=24, leading=28, textColor=colors.HexColor("#0F172A")))
    styles.add(ParagraphStyle(name="SectionHeading", parent=styles["Heading2"], textColor=colors.HexColor("#0F172A"), spaceAfter=8, spaceBefore=10))
    styles.add(ParagraphStyle(name="BodySmall", parent=styles["BodyText"], fontSize=9, leading=12, wordWrap="CJK"))

    story = []
    story.append(Spacer(1, 1.0 * inch))
    story.append(Paragraph("ACRIS Compliance Impact Report", styles["CenterTitle"]))
    story.append(Spacer(1, 0.25 * inch))
    story.append(Paragraph(f"{regulation.get('title', 'Regulation')}", styles["Heading1"]))
    story.append(Spacer(1, 0.08 * inch))
    story.append(Paragraph(f"Source: {regulation.get('source', 'N/A')} | Company: {company_name}", styles["BodyText"]))
    story.append(Paragraph(f"Published: {regulation.get('published_date', datetime.now(timezone.utc))}", styles["BodyText"]))
    story.append(Spacer(1, 0.35 * inch))
    story.append(Paragraph(
        "This report summarises the regulatory changes identified by the ACRIS pipeline and the company policy documents impacted by those changes.",
        styles["BodyText"],
    ))
    story.append(PageBreak())

    total_changes = len(regulation.get("changes", []))
    docs_affected = len(mappings)
    critical_count = sum(1 for mapping in mappings if mapping.get("relevance_score", 0) >= 0.9)

    story.append(Paragraph("Executive Summary", styles["SectionHeading"]))
    story.append(Paragraph(f"Total clause changes detected: <b>{total_changes}</b>", styles["BodyText"]))
    story.append(Paragraph(f"Company documents affected: <b>{docs_affected}</b>", styles["BodyText"]))
    story.append(Paragraph(f"High priority mappings: <b>{critical_count}</b>", styles["BodyText"]))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph("What This Means", styles["SectionHeading"]))
    story.append(Paragraph(clean_for_paragraph(narrative_summary), styles["BodyText"]))
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph("Recommended Next Actions", styles["Heading3"]))
    for item in action_items:
        story.append(Paragraph(f"- {clean_for_paragraph(item)}", styles["BodyText"]))
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("Clause Diffs", styles["SectionHeading"]))
    diff_rows = build_diff_rows(regulation.get("changes", []), styles["BodySmall"])
    story.append(make_table(diff_rows, [1.2 * inch, 2.25 * inch, 2.55 * inch, 0.9 * inch]))
    story.append(PageBreak())

    story.append(Paragraph("Impact Analysis", styles["SectionHeading"]))
    for mapping in mappings:
        doc = db.companydocs.find_one({"_id": mapping.get("doc_id")})
        doc_name = doc.get("name", "Unknown Document") if doc else mapping.get("policy_section", "Document")
        story.append(Paragraph(
            f"<b>{doc_name}</b> - relevance {mapping.get('relevance_score', 0):.2f}",
            styles["BodyText"],
        ))
        story.append(Paragraph(
            f"Affected clauses: {', '.join(mapping.get('affected_clauses', [])) or 'None'}",
            styles["BodySmall"],
        ))
        story.append(Spacer(1, 0.08 * inch))
    story.append(PageBreak())

    story.append(Paragraph("Draft Amendments", styles["SectionHeading"]))
    for mapping in mappings:
        doc = db.companydocs.find_one({"_id": mapping.get("doc_id")})
        section_name = doc.get("name", "Policy Section") if doc else mapping.get("policy_section", "Policy Section")
        story.append(Paragraph(section_name, styles["Heading3"]))
        story.append(Paragraph(mapping.get("draft_amendment", "No draft generated."), styles["BodyText"]))
        story.append(Spacer(1, 0.15 * inch))
    story.append(PageBreak())

    story.append(Paragraph("Deadline Tracker", styles["SectionHeading"]))
    story.append(Paragraph("Manual placeholder: confirm internal review deadline, approval owner, and implementation target date.", styles["BodyText"]))

    doc = SimpleDocTemplate(output_path, pagesize=A4, leftMargin=0.7 * inch, rightMargin=0.7 * inch, topMargin=0.7 * inch, bottomMargin=0.7 * inch)
    doc.build(story)

    page_count = 1
    try:
        page_count = len(fitz.open(output_path))
    except Exception:
        pass

    db.reports.insert_one({
        "organizationId": regulation.get("organizationId"),
        "regulation_ids": [object_id(regulation_id)],
        "generated_at": datetime.utcnow(),
        "pdf_path": output_path,
        "summary": {
            "total_changes": total_changes,
            "docs_affected": docs_affected,
            "critical_count": critical_count,
            "plain_language_summary": narrative_summary,
            "recommended_actions": action_items,
        },
        "status": "sent",
        "recipients": [],
    })
    db.regulations.update_one({"_id": object_id(regulation_id)}, {"$set": {"status": "done"}})

    emit_json({
        "report_path": output_path,
        "pages": page_count,
        "status": "sent",
    })


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit_error(str(error))