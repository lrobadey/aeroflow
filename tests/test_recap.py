"""Tests for the end-of-day recap builder."""

from datetime import datetime

from aeroflow.data.btv_carriers import BTV_ROUTES
from aeroflow.data.btv_layout import GATES, build_btv_zones
from aeroflow.data.name_pool import NamePool
from aeroflow.data.regulars import BTV_REGULARS
from aeroflow.sim.clock import SimClock
from aeroflow.sim.recap import build_day_recap
from aeroflow.sim.world import World, WorldEvent


def _fresh_world(seed: int = 1) -> World:
    zones = build_btv_zones()
    pool = NamePool(seed=seed)
    clock = SimClock(start_datetime=datetime(2026, 1, 12, 5, 0), speed=1)
    world = World(
        clock=clock,
        zones=zones,
        routes=BTV_ROUTES,
        gates=GATES,
        regulars=BTV_REGULARS,
        name_pool=pool,
        seed=seed,
    )
    world.begin_day()
    return world


def test_recap_builds_without_error_on_fresh_day():
    world = _fresh_world()
    recap = build_day_recap(world, ending_day=1)
    assert recap.day == 1
    assert recap.total_flights >= 1


def test_recap_surfaces_flight_delays():
    world = _fresh_world(seed=2)
    # Force-inject a delay event so we can assert it surfaces.
    world.events.append(WorldEvent(
        timestamp=world.clock.current_time,
        kind="FLIGHT_DELAYED",
        text="DL101 → DTW delayed 45 min.",
    ))
    recap = build_day_recap(world, ending_day=1)
    assert any("delayed" in m.lower() for m in recap.moments)


def test_recap_busiest_hour_matches_data():
    world = _fresh_world(seed=3)
    expected_hour = max(
        {f.actual_departure.hour for f in world.flights},
        key=lambda h: sum(1 for f in world.flights if f.actual_departure.hour == h),
    )
    recap = build_day_recap(world, ending_day=1)
    assert recap.busiest_hour is not None
    assert recap.busiest_hour[0] == expected_hour
