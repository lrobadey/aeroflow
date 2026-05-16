"""Tests for deterministic sim seeding."""

from __future__ import annotations

import os
import subprocess
import sys

from aeroflow.sim.seeding import stable_u32


def test_stable_u32_is_repeatable_and_bounded():
    seed = stable_u32("flight", "B6123", "2026-01-12")

    assert seed == stable_u32("flight", "B6123", "2026-01-12")
    assert 0 <= seed <= 0xFFFFFFFF


def test_stable_u32_changes_when_parts_change():
    assert stable_u32("flight", "B6123") != stable_u32("flight", "B6124")


def test_stable_u32_is_stable_across_python_hash_seeds():
    code = "from aeroflow.sim.seeding import stable_u32; print(stable_u32('flight', 'B6123'))"

    env_a = {**os.environ, "PYTHONHASHSEED": "1"}
    env_b = {**os.environ, "PYTHONHASHSEED": "2"}

    result_a = subprocess.check_output([sys.executable, "-c", code], env=env_a, text=True).strip()
    result_b = subprocess.check_output([sys.executable, "-c", code], env=env_b, text=True).strip()

    assert result_a == result_b
