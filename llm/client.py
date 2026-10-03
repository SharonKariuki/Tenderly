"""The one door to the LLM. Owner: B.

generate_json sends a prompt (and optionally a file) to the model named in LLM_MODEL, asks
for JSON, validates it against a Pydantic schema (C1) and caches the result (R11).
"""

import json
import logging
import time

from django.conf import settings
from pydantic import BaseModel, ValidationError

from core.exceptions import AIFailure
from core.models import LLMCache

logger = logging.getLogger(__name__)

RETRIES = 2  # R17: two retries after the first attempt
BACKOFF_SECONDS = (1, 3)
# Per request. An addendum makes two calls (extract and compare) of up to three attempts
# each, so the gunicorn timeout in render.yaml must stay above 2 * (3 * 45 + 4) seconds.
TIMEOUT_MS = 45_000


class LLMError(AIFailure):
    """The model gave no usable answer after the retries. Rendered as a 502 (R17)."""


class LLMNotConfigured(LLMError):
    default_detail = "The AI service is not configured. Set GEMINI_API_KEY and LLM_MODEL."
    default_code = "ai_not_configured"


def task_of(cache_key: str | None) -> str:
    """Cache keys look like "<task>:<prompt version>:<hash>"."""
    return (cache_key or "uncached").split(":", 1)[0][:50]


def with_schema(prompt: str, schema: type[BaseModel]) -> str:
    """The schema travels in the prompt, so the same call works on any JSON-mode model."""
    return (
        f"{prompt}\n\nReturn only one JSON object that matches this JSON Schema. "
        "Use null for anything that is not visible; never guess.\n"
        f"{json.dumps(schema.model_json_schema())}"
    )


def call_model(prompt: str, file_bytes: bytes | None, mime: str | None) -> str:
    """One request to the model in JSON mode. Returns the raw text of the answer."""
    from google import genai
    from google.genai import types

    client = genai.Client(
        api_key=settings.GEMINI_API_KEY, http_options=types.HttpOptions(timeout=TIMEOUT_MS)
    )
    contents: list = []
    if file_bytes:
        contents.append(types.Part.from_bytes(data=file_bytes, mime_type=mime))
    contents.append(prompt)
    response = client.models.generate_content(
        model=settings.LLM_MODEL,  # C4: never hard-coded
        contents=contents,
        config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0),
    )
    return response.text or ""


def generate_json(
    prompt: str,
    schema: type[BaseModel],
    file_bytes: bytes | None = None,
    mime: str | None = None,
    cache_key: str | None = None,
) -> dict:
    """Returns the validated answer as a plain dict. Raises LLMError (502) when the model
    fails or keeps answering with something that does not match the schema."""
    task = task_of(cache_key)
    if cache_key:
        cached = LLMCache.objects.filter(cache_key=cache_key).first()
        if cached is not None:
            return cached.result

    if not settings.GEMINI_API_KEY or not settings.LLM_MODEL:
        raise LLMNotConfigured()

    full_prompt = with_schema(prompt, schema)
    for attempt in range(RETRIES + 1):
        if attempt:
            time.sleep(BACKOFF_SECONDS[attempt - 1])
        started = time.monotonic()
        try:
            raw = call_model(full_prompt, file_bytes, mime)
            result = schema.model_validate(json.loads(raw)).model_dump(mode="json")
        except (ValidationError, ValueError) as error:
            failure = type(error).__name__  # the answer was not valid JSON for the schema
        except Exception as error:
            failure = type(error).__name__  # network, quota or service error
        else:
            # R16: task, attempt and timing only, never the prompt or the answer.
            logger.info(
                "llm ok task=%s attempt=%s seconds=%.2f",
                task,
                attempt + 1,
                time.monotonic() - started,
            )
            if cache_key:
                LLMCache.objects.update_or_create(
                    cache_key=cache_key, defaults={"task": task, "result": result}
                )
            return result
        logger.warning(
            "llm failed task=%s attempt=%s error=%s seconds=%.2f",
            task,
            attempt + 1,
            failure,
            time.monotonic() - started,
        )
    raise LLMError()
