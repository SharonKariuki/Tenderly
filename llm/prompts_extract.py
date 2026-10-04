"""Extraction prompts. Owner: B. Named constants only (C2); bump the version when a prompt
changes, so cached answers of the old prompt are not reused (R11)."""

DOCUMENT_PROMPT_VERSION = "v2"
DOCUMENT_PROMPT = """You read one business document from a Kenyan supplier, such as a tax \
compliance certificate, a certificate of incorporation or business registration, an AGPO \
certificate, a CR12, a national identity card, audited accounts, a bank statement or a \
county business permit.

Report only what is printed in the document.
- document_type: the type of the document. Use "other" when it is none of the listed types.
- holder_name: the business or person the document was issued to, exactly as printed.
- kra_pin: the KRA PIN, if one is printed.
- registration_number: the company or business registration number, if one is printed.
  Never an identity card number, a certificate number or a KRA PIN.
- issued_on and expires_on: dates as YYYY-MM-DD. A document with no expiry date has
  expires_on null. Never work out an expiry date that is not printed.
- directors: the full names of the directors, only if the document lists them.
- confidence: from 0 to 1, how sure you are that every field above is read correctly. Use a
  low value for a blurred scan, a photo taken at an angle or a document you do not recognise.

A field that is not visible in the document is null. Never guess and never fill a field from
general knowledge."""

TENDER_PROMPT_VERSION = "v1"
TENDER_PROMPT = """You read one Kenyan public procurement document. It is either a tender \
document or an addendum that amends a tender.

Report only what is written in the document.
- title: the name of the tender, in a few words.
- published_on: the date the document was issued, as YYYY-MM-DD, if it is printed.
- deadline: the closing date and time for submitting tenders, as YYYY-MM-DDTHH:MM in East
  African Time. In an addendum, report the new closing date if the addendum sets one.
- requirements: every requirement a bidder must meet. For a tender document, list all of
  them. For an addendum, list only the requirements the addendum adds. For each one:
  - label: a short plain-language name, such as "Valid Tax Compliance Certificate".
  - requirement_type: one of the allowed values.
  - required_doc_type: the document that proves it, from the allowed values, or null when
    no single document proves it.
  - mandatory: false only when the document says the requirement is optional.
  - source_quote: the sentence of the document that states the requirement, copied word
    for word. Do not shorten it, correct it or join two sentences.
  - page: the page number the sentence is on, counting the first page as 1.
- summary_en: three to five plain English sentences a small business owner can understand:
  what is being bought, who may bid and when it closes.

Anything that is not in the document is null. Never invent a requirement."""

SUMMARY_SW_PROMPT_VERSION = "v1"
SUMMARY_SW_PROMPT = """Translate the following tender summary into clear, natural Kiswahili for a
small business owner in Kenya. Keep all dates and facts unchanged. Do not add information or
omit a requirement. Return the translation in the summary field.

English summary:
{summary}"""
