"""llm.client.generate_json with the model call faked. Owner: B."""

import json

import pytest
from pydantic import BaseModel

from core.models import LLMCache
from llm import client
from llm.client import LLMError, LLMNotConfigured, generate_json

pytestmark = pytest.mark.django_db


class Answer(BaseModel):
    name: str
    count: int = 0


@pytest.fixture(autouse=True)
def configured(settings, monkeypatch) -> None:
    settings.GEMINI_API_KEY = "test-key"
    settings.LLM_MODEL = "test-model"
    monkeypatch.setattr(client.time, "sleep", lambda seconds: None)


def answers(monkeypatch, *replies) -> list:
    """Make call_model return the replies in turn; an exception instance is raised."""
    calls = []
    queue = list(replies)

    def fake_call_model(prompt, file_bytes, mime):
        calls.append((prompt, file_bytes, mime))
        reply = queue.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply

    monkeypatch.setattr(client, "call_model", fake_call_model)
    return calls


def test_valid_answer_is_returned_and_cached(monkeypatch):
    calls = answers(monkeypatch, json.dumps({"name": "a", "count": 2}))

    result = generate_json("Read this.", Answer, b"%PDF", "application/pdf", "extract:v1:abc")

    assert result == {"name": "a", "count": 2}
    assert calls[0][1:] == (b"%PDF", "application/pdf")
    assert '"name"' in calls[0][0]  # the schema travels in the prompt
    cached = LLMCache.objects.get(cache_key="extract:v1:abc")
    assert cached.task == "extract" and cached.result == result


def test_cached_answer_makes_no_call(monkeypatch):
    LLMCache.objects.create(cache_key="extract:v1:abc", task="extract", result={"name": "kept"})
    calls = answers(monkeypatch)

    assert generate_json("Read this.", Answer, cache_key="extract:v1:abc") == {"name": "kept"}
    assert calls == []


def test_invalid_answers_are_retried_twice_then_502(monkeypatch):
    calls = answers(monkeypatch, "not json", json.dumps({"count": 1}), json.dumps({"x": 1}))

    with pytest.raises(LLMError) as raised:
        generate_json("Read this.", Answer, cache_key="extract:v1:abc")

    assert len(calls) == 3
    assert raised.value.status_code == 502
    assert not LLMCache.objects.exists()


def test_a_service_error_is_retried_and_can_recover(monkeypatch):
    calls = answers(monkeypatch, ConnectionError("down"), json.dumps({"name": "b"}))

    assert generate_json("Read this.", Answer) == {"name": "b", "count": 0}
    assert len(calls) == 2
    assert not LLMCache.objects.exists()  # no cache key, nothing cached


def test_missing_key_or_model_fails_at_once(monkeypatch, settings):
    settings.GEMINI_API_KEY = ""
    calls = answers(monkeypatch)

    with pytest.raises(LLMNotConfigured) as raised:
        generate_json("Read this.", Answer)

    assert calls == []
    assert raised.value.status_code == 502
    assert raised.value.detail.code == "ai_not_configured"


class Listing(BaseModel):
    changes: list[Answer] = []


def test_a_bare_list_is_wrapped_for_a_schema_with_one_list_field(monkeypatch):
    answers(monkeypatch, json.dumps([{"name": "a"}]))

    assert generate_json("Compare.", Listing) == {"changes": [{"name": "a", "count": 0}]}


def test_json_inside_a_code_fence_or_a_sentence_is_read(monkeypatch):
    answers(
        monkeypatch,
        '```json\n{"name": "a"}\n```',
        'Here is the answer: {"name": "b", "count": 2}. Done.',
    )

    assert generate_json("Read this.", Answer) == {"name": "a", "count": 0}
    assert generate_json("Read this.", Answer) == {"name": "b", "count": 2}


def test_nothing_from_the_answer_is_logged(monkeypatch, caplog):
    answers(monkeypatch, json.dumps({"name": "SECRET-PIN"}))

    with caplog.at_level("INFO"):
        generate_json("Read this.", Answer, cache_key="extract:v1:abc")

    assert "SECRET-PIN" not in caplog.text  # R16
