"""Checks a pull request against the team Git rules (README, G1-G13).

Run by .github/workflows/conventions.yml. Reads the PR from environment variables
and the changed files from git, prints every broken rule and exits 1 if any.
"""

import os
import re
import subprocess
import sys

LEAD = "sharonkariuki"

# G8: paths each member may touch. The lead may touch everything.
OWNED_PATHS = {
    "brenda031-create": ("llm/", "documents/", "tenders/", "sample_data/documents/"),
    "stephiewahome-hue": (
        "versions/",
        "alerts/",
        "insight/",
        "sample_data/tenders/",
        "scripts/",
    ),
}
SHARED_PATHS = ("tests/", "docs/", ".env.example")

BRANCH_RE = re.compile(r"^((feat|fix)/[abc]-[a-z0-9][a-z0-9-]*|chore/[a-z0-9][a-z0-9-]*)$")
MESSAGE_RE = re.compile(
    r"^(feat|fix|chore|docs|test|refactor|ci|style|perf|build)(\([a-z0-9_-]+\))?: \S.*$"
)
REQUIRED_SECTIONS = (
    "What was implemented",
    "Milestone and owner",
    "Files, apps and modules touched",
    "API changes",
    "Migrations / env changes",
    "Canonical rules touched",
    "How to test",
    "Evidence",
    "Known limitations",
)
ENV_FILE_RE = re.compile(r"(^|/)\.env(\.(?!example$)[^/]*)?$")
MIGRATION_RE = re.compile(r"^[^/]+/migrations/\d[^/]*\.py$")


def check_base(head: str, base: str) -> list[str]:
    if base == "dev":
        return []
    if base == "main" and head == "dev":
        return []
    return [f"G1/G2: PRs go to dev. Only dev may be merged into main (base is '{base}')."]


def check_branch_name(head: str) -> list[str]:
    if BRANCH_RE.match(head):
        return []
    return [
        f"G5: branch '{head}' must be named feat/<a, b or c>-<topic> or fix/<a, b or c>-<topic>."
    ]


def check_messages(title: str, subjects: list[str]) -> list[str]:
    errors = []
    if not MESSAGE_RE.match(title):
        errors.append(f"G9: PR title '{title}' must look like type(scope): message.")
    for subject in subjects:
        if not MESSAGE_RE.match(subject):
            errors.append(f"G9: commit '{subject}' must look like type(scope): message.")
    return errors


def section_bodies(body: str) -> dict[str, str]:
    text = re.sub(r"<!--.*?-->", "", body, flags=re.DOTALL)
    sections: dict[str, str] = {}
    current = None
    for line in text.splitlines():
        if line.startswith("## "):
            current = line[3:].strip()
            sections[current] = ""
        elif current is not None:
            sections[current] += line + "\n"
    return sections


def check_description(body: str) -> list[str]:
    errors = []
    sections = section_bodies(body)
    for name in REQUIRED_SECTIONS:
        content = sections.get(name, "").strip()
        if not content or content.lower() in {"wip", "todo", "tbd"}:
            errors.append(f"G6: section '{name}' of the PR template is missing or empty.")
    unticked = re.findall(r"^\s*- \[ \] (.+)$", sections.get("Checklist", ""), flags=re.MULTILINE)
    if "Checklist" not in sections:
        errors.append("G6: the PR template checklist is missing.")
    for item in unticked:
        errors.append(f"G7: checklist item not ticked: {item.strip()}")
    return errors


def check_files(author: str, changes: list[tuple[str, str]]) -> list[str]:
    errors = []
    allowed = OWNED_PATHS.get(author, ()) + SHARED_PATHS
    for status, path in changes:
        if ENV_FILE_RE.search(path) and status != "D":
            errors.append(f"G7: '{path}' looks like an env file. Never commit .env.")
        if MIGRATION_RE.match(path) and status in {"M", "D", "R"}:
            errors.append(f"G13: '{path}' is already on the base branch; never edit or delete it.")
        if author != LEAD and not path.startswith(allowed):
            errors.append(f"G8: '{path}' is not in an app you own. Ask the lead in chat.")
    return errors


def git_lines(*args: str) -> list[str]:
    result = subprocess.run(["git", *args], capture_output=True, text=True, check=True)
    return [line for line in result.stdout.splitlines() if line.strip()]


def main() -> int:
    title = os.environ["PR_TITLE"]
    body = os.environ.get("PR_BODY", "")
    author = os.environ["PR_AUTHOR"].lower()
    head = os.environ["HEAD_REF"]
    base = os.environ["BASE_REF"]
    commit_range = f"{os.environ['BASE_SHA']}..{os.environ['HEAD_SHA']}"

    errors = check_base(head, base)
    if head == "dev" and base == "main":
        # The lead's freeze merge: its commits were already checked on the way into dev.
        if author != LEAD:
            errors.append("G4: only the lead opens and merges the dev to main PR.")
        if not body.strip():
            errors.append("G6: the PR description is empty.")
    else:
        merges = git_lines("log", "--merges", "--format=%s", commit_range)
        subjects = git_lines("log", "--no-merges", "--format=%s", commit_range)
        changes = [
            (line.split("\t")[0][0], line.split("\t")[-1])
            for line in git_lines("diff", "--name-status", commit_range.replace("..", "..."))
        ]
        errors += check_branch_name(head)
        errors += check_messages(title, subjects)
        errors += [f"G10: merge commit '{m}' found. Rebase on dev instead." for m in merges]
        errors += check_description(body)
        errors += check_files(author, changes)

    if errors:
        print("This PR breaks the team rules (see README):\n")
        for error in errors:
            print(f"  - {error}")
        return 1
    print("All PR conventions are followed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
