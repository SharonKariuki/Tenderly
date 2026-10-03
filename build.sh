#!/usr/bin/env bash
# Render build step: install, collect static files, apply migrations to Neon.
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate --noinput
# Rejection Insight reference cases; idempotent, so every deploy can run it.
python manage.py seed_insight
