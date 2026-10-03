"""Send one test email through the configured Django email backend. Owner: C.

With the console backend (the default) the message is printed instead of sent, so this
never breaks in dev. For a real inbox set EMAIL_BACKEND to the smtp backend and fill in
EMAIL_HOST_USER and EMAIL_HOST_PASSWORD (a Gmail app password) in .env.

Usage: python scripts/send_test_email.py you@example.com
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tenderready.settings")

import django  # noqa: E402

django.setup()

from django.conf import settings  # noqa: E402
from django.core.mail import send_mail  # noqa: E402


def main() -> int:
    recipient = sys.argv[1] if len(sys.argv) > 1 else settings.EMAIL_HOST_USER
    if not recipient:
        print("Usage: python scripts/send_test_email.py you@example.com")
        return 2
    print(f"Backend: {settings.EMAIL_BACKEND}")
    try:
        sent = send_mail(
            subject="TenderReady test email",
            message="If you can read this, TenderReady can send alert emails.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
        )
    except Exception as exc:  # report the failure type only, never credentials (R16)
        print(f"Failed: {type(exc).__name__}")
        return 1
    print(f"Sent: {sent}")
    return 0 if sent else 1


if __name__ == "__main__":
    sys.exit(main())
