"""Accommodation request letters for tender briefings and site visits. Owner: B.

Built from a fixed template, not the LLM, so the letter says only what the owner chose.
Plain, polite, sentence case. The owner edits it before sending.
"""

from dataclasses import dataclass
from datetime import datetime

from django.utils import timezone

from access.models import AccessNeed, EventKind

NEED_LINES = {
    "en": {
        AccessNeed.WHEELCHAIR_ACCESS: "Step-free access to the venue, suitable for a wheelchair.",
        AccessNeed.SIGN_LANGUAGE_INTERPRETER: "A Kenyan Sign Language interpreter.",
        AccessNeed.ACCESSIBLE_DOCUMENTS: (
            "The tender documents in an accessible format, such as a text PDF or a Word file."
        ),
        AccessNeed.REMOTE_ATTENDANCE: "The option to attend remotely, by video or phone.",
    },
    # TODO(review): Kiswahili wording to be checked by a native speaker before launch.
    "sw": {
        AccessNeed.WHEELCHAIR_ACCESS: "Njia ya kuingia bila ngazi, inayofaa kiti cha magurudumu.",
        AccessNeed.SIGN_LANGUAGE_INTERPRETER: "Mkalimani wa Lugha ya Ishara ya Kenya.",
        AccessNeed.ACCESSIBLE_DOCUMENTS: (
            "Nyaraka za zabuni katika muundo unaofikika, kama PDF ya maandishi au faili ya Word."
        ),
        AccessNeed.REMOTE_ATTENDANCE: "Nafasi ya kuhudhuria kwa mbali, kwa video au simu.",
    },
}

EVENT_NAMES = {
    "en": {EventKind.BRIEFING: "tender briefing", EventKind.SITE_VISIT: "site visit"},
    "sw": {
        EventKind.BRIEFING: "kikao cha maelezo ya zabuni",
        EventKind.SITE_VISIT: "ziara ya eneo",
    },
}

SW_MONTHS = [
    "Januari", "Februari", "Machi", "Aprili", "Mei", "Juni",
    "Julai", "Agosti", "Septemba", "Oktoba", "Novemba", "Desemba",
]  # fmt: skip


@dataclass
class LetterInput:
    entity_name: str
    event_kind: str
    event_title: str
    event_date: datetime
    needs: list[str]
    venue: str = ""
    tender_reference: str = ""
    other_need: str = ""
    owner_name: str = ""
    business_name: str = ""
    contact: str = ""
    language: str = "en"


def _date(value: datetime, language: str) -> str:
    if timezone.is_aware(value):
        value = timezone.localtime(value)  # the procuring entity reads Nairobi time
    time = value.strftime("%H:%M")
    if language == "sw":
        return f"{value.day} {SW_MONTHS[value.month - 1]} {value.year}, saa {time}"
    return f"{value.day} {value.strftime('%B %Y')}, at {time}"


def build_letter(data: LetterInput) -> str:
    language = data.language if data.language in NEED_LINES else "en"
    lines = NEED_LINES[language]
    needs = [f"- {lines[AccessNeed(need)]}" for need in data.needs]
    if data.other_need.strip():
        needs.append(f"- {data.other_need.strip()}")
    event = EVENT_NAMES[language][EventKind(data.event_kind)]
    reference = f" ({data.tender_reference})" if data.tender_reference else ""
    when = _date(data.event_date, language)
    signature = "\n".join(
        part for part in (data.owner_name, data.business_name, data.contact) if part
    )

    if language == "sw":
        where = f" katika {data.venue}" if data.venue else ""
        who = _who_sw(data)
        body = [
            f"Kwa: {data.entity_name}",
            "",
            "Kwa anayehusika,",
            "",
            f"Ombi la msaada wa ufikiaji: {data.event_title}{reference}",
            "",
            f"{who}Ninapanga kuhudhuria {event} tarehe {when}{where}.",
            "",
            "Ningeshukuru kama mngeweza kutoa msaada ufuatao ili niweze kushiriki kikamilifu:",
            *needs,
            "",
            "Tafadhali nijulishe mnachoweza kupanga, au nimwasiliane nani. "
            "Niko tayari kujadili njia nyingine.",
            "",
            "Asante kwa msaada wenu.",
            "",
            "Wako mwaminifu,",
        ]
    else:
        where = f" at {data.venue}" if data.venue else ""
        who = _who_en(data)
        body = [
            f"To: {data.entity_name}",
            "",
            "Dear Sir or Madam,",
            "",
            f"Request for access support: {data.event_title}{reference}",
            "",
            f"{who}I plan to attend the {event} on {when}{where}.",
            "",
            "I would be grateful if you could provide the following support, "
            "so that I can take part fully:",
            *needs,
            "",
            "Please let me know what you can arrange, or who I should contact. "
            "I am happy to discuss other options.",
            "",
            "Thank you for your help.",
            "",
            "Yours faithfully,",
        ]
    if signature:
        body.append(signature)
    return "\n".join(body)


def _who_en(data: LetterInput) -> str:
    if data.owner_name and data.business_name:
        return f"My name is {data.owner_name}, of {data.business_name}. "
    if data.owner_name or data.business_name:
        return f"My name is {data.owner_name or data.business_name}. "
    return ""


def _who_sw(data: LetterInput) -> str:
    if data.owner_name and data.business_name:
        return f"Jina langu ni {data.owner_name}, wa {data.business_name}. "
    if data.owner_name or data.business_name:
        return f"Jina langu ni {data.owner_name or data.business_name}. "
    return ""
