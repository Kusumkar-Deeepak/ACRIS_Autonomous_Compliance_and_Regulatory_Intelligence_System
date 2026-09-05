# Versioned registry for LLM Prompts used by the Python agents.

# --- DIFF AGENT PROMPTS ---
DIFF_COMPARE_V1 = """Compare these two regulatory clause texts. Identify if the clause was added, removed, or modified. If modified, summarise what changed concisely. Respond in JSON: {{"change_type": "added|removed|modified", "summary": "..."}}.

OLD TEXT:
{old_text}

NEW TEXT:
{new_text}"""

DIFF_BUSINESS_SUMMARY_V1 = """You are helping non-technical employees understand a regulation update. Write 1-2 simple sentences in plain English. Avoid legal jargon, avoid bullets, and be specific.

Change type: {change_type}
Clause label: {clause}

Previous text:
{old_text}

Current text:
{new_text}"""

# --- DRAFTING AGENT PROMPTS ---
DRAFTING_AMENDMENT_V1 = """You are a compliance expert. A regulatory clause has changed.
REGULATORY CLAUSE: {clause}

OLD REGULATION:
{old_text}

NEW REGULATION:
{new_text}

CURRENT POLICY SECTION: {policy_section}

POLICY TEXT:
{policy_text}

Write a concise, professional amendment to update the policy section to comply with the new regulation. Start with the section reference."""
