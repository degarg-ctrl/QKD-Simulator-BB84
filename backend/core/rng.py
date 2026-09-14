"""
backend/core/rng.py

Central random-number-generation entry point for the BB84 simulator.

The simulation is stochastic by design: Alice's bits/bases, fiber loss,
detector clicks, dark counts, channel noise, Eve's intercept choices,
PNS draws, gate/probe disturbances and the QBER sampling shuffle, are
all random. Historically this randomness was drawn from the NumPy
legacy global RNG (np.random.*) in some modules and from independent
numpy.default_rng() generators in others, so no single seed could
reproduce a full simulation.

Architecture (audit fix H7)
---------------------------
* The router creates exactly ONE ``numpy.random.Generator`` per request
  via :func:`create_rng` and threads it through every pipeline stage
  (Alice -> Channel -> Eve -> PNS -> gates -> Bob -> Protocol).
* Components accept an optional ``rng``; when omitted they create a
  private ``default_rng()`` instance. This preserves unseeded
  stochastic behaviour and keeps each module usable standalone.
* No module draws from the NumPy global RNG anymore, so there is no
  hidden process-wide random state that could silently couple two
  concurrent simulations.

This is a PSEUDO-random generator (PCG64). It is suitable for
statistical simulation and for deterministic replay when a seed is
supplied. It is NOT a cryptographic RNG and NOT a quantum RNG; no
security guarantee is derived from it.
"""

from __future__ import annotations

from typing import Optional

import numpy as np


def create_rng(seed: Optional[int] = None) -> np.random.Generator:
    """
    Return the single RNG used by one simulation run.

    Args:
        seed: optional integer seed. ``None`` produces a fresh
              OS-entropy-seeded generator (non-deterministic run).
    Returns:
        ``numpy.random.Generator`` shared by all pipeline stages of the
        run, so identical seeds reproduce identical simulations.
    """
    return np.random.default_rng(seed)


def resolve_rng(rng: Optional[np.random.Generator]) -> np.random.Generator:
    """
    Return ``rng`` if given, else a fresh private generator.

    Used by pipeline components so a caller may either inject the
    run-level RNG (deterministic) or omit it (standalone/stochastic).
    """
    if rng is None:
        return np.random.default_rng()
    return rng

# Depends on: numpy
# Used by: routers/simulation.py and all core pipeline modules
