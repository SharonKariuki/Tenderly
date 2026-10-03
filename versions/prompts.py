"""Prompts for version comparison (C2). Owner: C.

Bump COMPARE_PROMPT_VERSION whenever COMPARE_PROMPT changes: it is part of the cache key (R11).
"""

COMPARE_PROMPT_VERSION = "v2"

COMPARE_PROMPT = """\
You compare a public tender document with a later addendum to it.

List every change the addendum makes to the tender. Go through the addendum item by item:
every numbered item or paragraph that changes, adds to, removes from or clarifies a term of
the tender is at least one change. That includes a clarification that makes something
mandatory, a new form to attach, a changed unit of issue, and a price schedule or table that
is replaced. For each change give:
- category: exactly one of
  deadline (the closing or submission date or time),
  eligibility (who may tender),
  required_documents (documents a tenderer must submit),
  specifications_quantities (what is being bought, how much, technical specifications),
  pricing_format (currency, taxes, price validity, how prices are quoted),
  submission_method (where or how tenders are submitted).
- old_quote: the exact sentence in the ORIGINAL TENDER that is changed or removed,
  copied word for word. Use null when the addendum adds something new.
- new_quote: the exact sentence in the ADDENDUM that states the new text, copied word for
  word. Use null when the addendum only removes something.
- explanation: one short plain-English sentence saying what changed, for a small business
  owner. No legal conclusions.

Rules:
- Copy quotes exactly. Do not paraphrase, shorten, translate or correct them.
- Only report changes the addendum states. Do not invent changes and do not report text
  that stays the same.
- If the addendum changes nothing, return an empty list.

ORIGINAL TENDER:
<<<
{old_text}
>>>

ADDENDUM:
<<<
{new_text}
>>>
"""
