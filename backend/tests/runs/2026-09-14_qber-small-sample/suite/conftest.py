"""
conftest.py — fixtures for the 2026-09-14 QBER small-sample (audit fix C1)
test suite.

Provides:
  - sys.path setup so `core.*` / `models.*` / `main` are importable.
  - a FastAPI TestClient fixture for the full router path.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

# Path setup: suite/ -> 2026-09-14.../ -> runs/ -> tests/ -> backend/
_SUITE_DIR   = Path(__file__).parent
_RUN_DIR     = _SUITE_DIR.parent
_RUNS_DIR    = _RUN_DIR.parent
_TESTS_DIR   = _RUNS_DIR.parent
_BACKEND_DIR = _TESTS_DIR.parent

for p in [str(_BACKEND_DIR), str(_SUITE_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)


@pytest.fixture(scope='session')
def client():
    """FastAPI TestClient bound to the real app (router + schemas)."""
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)
