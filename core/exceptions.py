"""One error format for the whole API (C5). Owner: A (lead).

Every error response is {"error": {"code": "...", "message": "..."}}.
Status codes in use: 400, 401, 404, 422, 502 (AI failure).
"""

from rest_framework import status
from rest_framework.exceptions import APIException, ErrorDetail
from rest_framework.response import Response
from rest_framework.views import exception_handler


class InvalidCredentials(APIException):
    """Wrong email or password at login. DRF's AuthenticationFailed turns into a 403 on a view
    without authenticators, so login raises this instead."""

    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Wrong email or password."
    default_code = "invalid_credentials"


class Unprocessable(APIException):
    """The request was well formed but cannot be processed (for example an unreadable file)."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "The request could not be processed."
    default_code = "unprocessable"


class AIFailure(APIException):
    """R17: raised after the LLM retries are exhausted."""

    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "The AI service did not return a usable answer. Please try again."
    default_code = "ai_failure"


def _first_detail(detail: object, field: str | None = None) -> tuple[ErrorDetail | str, str | None]:
    """Walk a DRF error detail down to its first message, remembering the field it sits under."""
    if isinstance(detail, dict):
        key, value = next(iter(detail.items()))
        return _first_detail(value, str(key))
    if isinstance(detail, list | tuple):
        return _first_detail(detail[0], field)
    return detail, field


def api_exception_handler(exc: Exception, context: dict) -> Response | None:
    response = exception_handler(exc, context)
    if response is None:
        return None

    detail, field = _first_detail(response.data)
    message = str(detail)
    if field and field not in {"detail", "non_field_errors"}:
        message = f"{field}: {message}"
    code = getattr(detail, "code", None) or "error"
    response.data = {"error": {"code": code, "message": message}}
    return response
