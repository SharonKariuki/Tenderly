"""The pure parts of scripts/e2e_demo.py. The script itself needs a running API. Owner: C."""

import importlib.util
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "e2e_demo.py"
spec = importlib.util.spec_from_file_location("e2e_demo", SCRIPT)
e2e_demo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(e2e_demo)


def test_there_is_one_function_per_acceptance_step():
    assert len(e2e_demo.STEPS) == len(e2e_demo.STEP_FUNCTIONS) == 7


def test_multipart_carries_the_file_bytes_and_name(tmp_path):
    path = tmp_path / "tcc_dummy.pdf"
    path.write_bytes(b"%PDF-1.4 dummy")

    body, content_type = e2e_demo.multipart("file", path)

    boundary = content_type.split("boundary=")[1]
    assert content_type.startswith("multipart/form-data")
    assert body.startswith(f"--{boundary}\r\n".encode())
    assert b'name="file"; filename="tcc_dummy.pdf"' in body
    assert b"Content-Type: application/pdf\r\n\r\n%PDF-1.4 dummy\r\n" in body
    assert body.endswith(f"--{boundary}--\r\n".encode())


def test_expiring_item_needs_a_source_quote():
    check = {
        "items": [
            {"label": "A", "status": "expiring", "source_quote": None},
            {"label": "B", "status": "met", "source_quote": "quote"},
            {"label": "C", "status": "expiring", "source_quote": "quote"},
        ]
    }

    assert e2e_demo.expiring_item(check)["label"] == "C"
    assert e2e_demo.expiring_item({"items": []}) is None


def test_detected_counts_only_changes_with_a_quote():
    changes = [
        {"category": "deadline", "old_quote": "a", "new_quote": "b"},
        {"category": "required_documents", "old_quote": None, "new_quote": None},
    ]

    assert e2e_demo.detected(changes) == {"deadline"}


def test_real_flips_leave_out_new_requirements():
    flips = [
        {"requirement_id": "r1", "old_status": "met", "new_status": "expiring"},
        {"requirement_id": "v2-r1", "old_status": None, "new_status": "missing"},
    ]

    assert [flip["requirement_id"] for flip in e2e_demo.real_flips(flips)] == ["r1"]


def test_an_unreachable_api_fails_the_run_instead_of_crashing(tmp_path, capsys):
    for number in range(5):
        (tmp_path / f"doc{number}.pdf").write_bytes(b"x")

    assert e2e_demo.run_once("http://127.0.0.1:9", tmp_path, 0) is False
    assert "FAIL  1." in capsys.readouterr().out


def test_missing_dummy_documents_fail_step_one(tmp_path):
    with pytest.raises(e2e_demo.StepFailed, match="need 5 dummy documents"):
        e2e_demo.step_1(e2e_demo.Api("http://127.0.0.1:9"), {"documents_dir": tmp_path})
