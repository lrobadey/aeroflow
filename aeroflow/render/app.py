"""Main pygame loop for AeroFlow."""

from __future__ import annotations

import os
from datetime import datetime

# Silence the audio subsystem — we don't use sound, and ALSA spam is noisy
# in containerized / headless environments.
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")

import pygame  # noqa: E402

from .. import config as cfg  # noqa: E402
from ..data.btv_carriers import BTV_ROUTES
from ..data.btv_layout import GATES, build_btv_zones
from ..data.name_pool import NamePool
from ..data.regulars import BTV_REGULARS
from ..sim.clock import SimClock
from ..sim.recap import DayRecap, build_day_recap
from ..sim.world import World
from .layout import draw_terminal, draw_tooltip, find_passenger_at, get_font
from .overlay import draw_recap_modal, draw_top_bar
from .panel import draw_panel


def _build_world(seed: int = 1) -> World:
    zones = build_btv_zones()
    name_pool = NamePool(seed=seed)
    start = datetime(2026, 1, 12, cfg.DAY_START_HOUR, 0)  # a winter Monday
    clock = SimClock(start_datetime=start, speed=1)
    world = World(
        clock=clock,
        zones=zones,
        routes=BTV_ROUTES,
        gates=GATES,
        regulars=BTV_REGULARS,
        name_pool=name_pool,
        seed=seed,
    )
    world.begin_day()
    return world


def run() -> None:
    pygame.init()
    pygame.display.set_caption("AeroFlow — BTV Observation Mode")
    surface = pygame.display.set_mode((cfg.WINDOW_WIDTH, cfg.WINDOW_HEIGHT))
    clock_pg = pygame.time.Clock()

    world = _build_world(seed=1)

    pending_recap: DayRecap | None = None
    button_rect: pygame.Rect | None = None

    def on_day_end(ending_day: int) -> None:
        nonlocal pending_recap
        pending_recap = build_day_recap(world, ending_day)
        world.clock.set_speed(0)

    world.clock.on_day_end = on_day_end

    inspected_pax_id: str | None = None
    panel_rect = pygame.Rect(
        cfg.WINDOW_WIDTH - cfg.SIDE_PANEL_WIDTH, 0,
        cfg.SIDE_PANEL_WIDTH, cfg.WINDOW_HEIGHT,
    )

    running = True
    last_pax_positions: dict[str, tuple[int, int]] = {}

    while running:
        dt_real = clock_pg.tick(cfg.FPS) / 1000.0
        mouse_pos = pygame.mouse.get_pos()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    world.clock.toggle_pause(fallback_speed=1)
                elif event.key == pygame.K_1:
                    world.clock.set_speed(1)
                elif event.key == pygame.K_2:
                    world.clock.set_speed(10)
                elif event.key == pygame.K_3:
                    world.clock.set_speed(60)
                elif event.key == pygame.K_ESCAPE:
                    running = False
            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                if pending_recap is not None:
                    if button_rect is not None and button_rect.collidepoint(event.pos):
                        # Begin next day: start fresh schedule.
                        pending_recap = None
                        world.begin_day()
                        world.clock.set_speed(1)
                    continue
                if panel_rect.collidepoint(event.pos):
                    pass  # ignore clicks in the panel
                else:
                    pid = find_passenger_at(event.pos, last_pax_positions)
                    inspected_pax_id = pid

        if pending_recap is None:
            world.tick(dt_real)

        # Render
        surface.fill(cfg.BG)
        last_pax_positions = draw_terminal(
            surface, world,
            inspected_pax_id=inspected_pax_id,
            hover_pax_id=find_passenger_at(mouse_pos, last_pax_positions),
        )
        draw_top_bar(surface, world, total_w=cfg.WINDOW_WIDTH - cfg.SIDE_PANEL_WIDTH)

        # Side panel
        inspected = world.passengers.get(inspected_pax_id) if inspected_pax_id else None
        flight = world.flights_by_id.get(inspected.assigned_flight_id) if inspected else None
        draw_panel(surface, panel_rect, inspected, flight)

        # Hover tooltip (only outside panel)
        if not panel_rect.collidepoint(mouse_pos):
            hover_id = find_passenger_at(mouse_pos, last_pax_positions)
            if hover_id and hover_id in world.passengers:
                draw_tooltip(surface, mouse_pos, world.passengers[hover_id].name)

        if pending_recap is not None:
            button_rect = draw_recap_modal(
                surface, pending_recap,
                cfg.WINDOW_WIDTH, cfg.WINDOW_HEIGHT,
            )

        pygame.display.flip()

    pygame.quit()
