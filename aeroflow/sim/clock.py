"""Sim-time clock with speed multipliers and day-boundary callback."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Callable


@dataclass
class SimClock:
    """Tracks sim time. Driven by real-time `tick(dt_real_seconds)` calls.

    speed is a multiplier on sim-seconds-per-real-second. speed=0 is pause.
    """

    start_datetime: datetime
    speed: int = 1
    sim_seconds_per_real_at_1x: int = 60  # 1 real sec = 1 sim min
    on_day_end: Callable[[int], None] | None = None
    current_time: datetime = field(init=False)
    day: int = field(init=False, default=1)
    _seconds_into_day: float = field(init=False, default=0.0)

    def __post_init__(self) -> None:
        self.current_time = self.start_datetime

    def tick(self, dt_real_seconds: float) -> None:
        if self.speed == 0:
            return
        dt_sim = dt_real_seconds * self.sim_seconds_per_real_at_1x * self.speed
        next_time = self.current_time + timedelta(seconds=dt_sim)
        if next_time.date() != self.current_time.date():
            # Day boundary crossed. Snap to midnight first, fire callback, then advance the rest.
            midnight = datetime.combine(next_time.date(), datetime.min.time())
            self.current_time = midnight
            ending_day = self.day
            self.day += 1
            if self.on_day_end is not None:
                self.on_day_end(ending_day)
            # Advance any leftover into the new day.
            remainder = (next_time - midnight).total_seconds()
            self.current_time = midnight + timedelta(seconds=remainder)
        else:
            self.current_time = next_time

    def set_speed(self, speed: int) -> None:
        self.speed = speed

    def toggle_pause(self, fallback_speed: int = 1) -> None:
        self.speed = 0 if self.speed != 0 else fallback_speed
