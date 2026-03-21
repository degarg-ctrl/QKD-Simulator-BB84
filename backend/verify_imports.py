"""
Run with: python verify_imports.py (venv must be active)
Run this before every coding session to confirm environment is healthy.
"""
checks = [
  ("fastapi", "FastAPI"),
  ("uvicorn", "Uvicorn"),
  ("pydantic", "Pydantic"),
  ("numpy", "NumPy"),
  ("scipy", "SciPy"),
]
all_ok = True
for module, name in checks:
  try:
    m = __import__(module)
    version = getattr(m, '__version__', 'unknown')
    print(f"  OK  {name}: {version}")
  except ImportError as e:
    print(f"  FAIL {name}: {e}")
    all_ok = False
if all_ok:
  print("\nAll backend dependencies verified. Safe to write code.")
else:
  print("\nFix failed imports before writing any code.")
