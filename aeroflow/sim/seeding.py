"""Stable seed helpers for deterministic simulation generation."""

from __future__ import annotations

import hashlib


def stable_u32(*parts: object) -> int:
    """Return a process-stable 32-bit seed from arbitrary values.

    Python's built-in ``hash()`` is intentionally randomized between interpreter
    processes, so it should not be used for replayable simulation seeds.
    """
    h = hashlib.blake2s(digest_size=4)
    for part in parts:
        h.update(str(part).encode("utf-8"))
        h.update(b"\0")
    return int.from_bytes(h.digest(), "big")
