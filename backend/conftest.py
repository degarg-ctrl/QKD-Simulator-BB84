"""Backend-wide pytest configuration.

The dated runs under ``tests/runs/`` each keep their own ``suite/conftest.py``
with run-specific helpers, and their test modules import those helpers with a
plain ``from conftest import ...``.  Because every suite directory is named
``suite``, collecting more than one suite in a single pytest session used to
leave a single top-level ``conftest`` module in ``sys.modules``; whichever
suite was imported first shadowed the rest, so ``from conftest import ...``
raised ``ImportError`` (e.g. 2026-05-04 tests picking up the 2026-09-14
conftest).  The default configuration therefore silently omitted important
suites.

Dropping the cached ``conftest`` module before each test module is imported
forces ``from conftest import ...`` to resolve against the sibling
``conftest.py`` (prepend import mode keeps the test's own directory first on
``sys.path``).  Fixtures are unaffected: pytest keeps its already-registered
conftest plugins even after the module is removed from ``sys.modules``.
"""

import sys


def pytest_pycollect_makemodule(module_path, parent):
    # Re-resolve `conftest` per suite so same-named run helpers do not clash.
    sys.modules.pop("conftest", None)
    return None
