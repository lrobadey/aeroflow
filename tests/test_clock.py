"""Tests for SimClock: speed multipliers, day boundary callback."""

from datetime import datetime

from aeroflow.sim.clock import SimClock


def test_pause_does_not_advance():
    c = SimClock(start_datetime=datetime(2026, 1, 12, 5, 0), speed=0)
    c.tick(1.0)
    assert c.current_time == datetime(2026, 1, 12, 5, 0)


def test_1x_advances_one_minute_per_real_second():
    c = SimClock(start_datetime=datetime(2026, 1, 12, 5, 0), speed=1)
    c.tick(1.0)
    assert (c.current_time - datetime(2026, 1, 12, 5, 0)).total_seconds() == 60.0


def test_60x_advances_one_hour_per_real_second():
    c = SimClock(start_datetime=datetime(2026, 1, 12, 5, 0), speed=60)
    c.tick(1.0)
    assert (c.current_time - datetime(2026, 1, 12, 5, 0)).total_seconds() == 3600.0


def test_day_boundary_fires_callback_once():
    fired = []
    c = SimClock(
        start_datetime=datetime(2026, 1, 12, 23, 59),
        speed=1,
        on_day_end=lambda day: fired.append(day),
    )
    # Advance 2 minutes of sim time → cross midnight.
    c.tick(2.0)
    assert fired == [1]
    assert c.day == 2
    assert c.current_time.date() == datetime(2026, 1, 13).date()


def test_set_speed_and_toggle_pause():
    c = SimClock(start_datetime=datetime(2026, 1, 12, 5, 0), speed=10)
    c.toggle_pause()
    assert c.speed == 0
    c.toggle_pause(fallback_speed=10)
    assert c.speed == 10
    c.set_speed(60)
    assert c.speed == 60
