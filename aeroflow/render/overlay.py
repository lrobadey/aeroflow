"""Top bar (clock, day, speed, totals, upcoming flights) and end-of-day modal."""

from __future__ import annotations

import pygame

from .. import config as cfg
from ..sim.recap import DayRecap
from ..sim.world import World
from .layout import get_font


SPEED_LABEL = {0: "PAUSE", 1: "1×", 10: "10×", 60: "60×"}


def draw_top_bar(surface: pygame.Surface, world: World, total_w: int) -> None:
    rect = pygame.Rect(0, 0, total_w, cfg.TOP_BAR_HEIGHT)
    pygame.draw.rect(surface, cfg.PANEL_BG, rect)
    pygame.draw.line(surface, cfg.ZONE_BORDER,
                     (0, cfg.TOP_BAR_HEIGHT), (total_w, cfg.TOP_BAR_HEIGHT), width=1)

    big = get_font(22, bold=True)
    small = get_font(13)

    clock_text = world.clock.current_time.strftime("%a %b %d  ·  %H:%M")
    clock_surface = big.render(clock_text, True, cfg.TEXT)
    surface.blit(clock_surface, (16, 14))

    day_text = f"Day {world.clock.day}"
    day_surface = small.render(day_text, True, cfg.TEXT_DIM)
    surface.blit(day_surface, (16, 38))

    speed_text = f"Speed: {SPEED_LABEL.get(world.clock.speed, str(world.clock.speed))}"
    speed_surface = small.render(speed_text, True, cfg.TEXT)
    surface.blit(speed_surface, (320, 14))

    total_text = f"In terminal: {world.total_in_terminal}"
    total_surface = small.render(total_text, True, cfg.TEXT)
    surface.blit(total_surface, (320, 32))

    # Upcoming flights (next hour)
    upcoming = world.upcoming_flights(within_minutes=60)[:5]
    label = small.render("Departing within 60 min:", True, cfg.TEXT_DIM)
    surface.blit(label, (520, 8))
    line_x = 520
    line_y = 24
    for f in upcoming:
        text = f"{f.display_code} → {f.destination}  {f.actual_departure.strftime('%H:%M')}  G{f.gate[1:]}"
        if f.delay_minutes:
            text += f"  (+{f.delay_minutes})"
        ts = small.render(text, True, cfg.TEXT)
        surface.blit(ts, (line_x, line_y))
        line_y += small.get_height() + 1
        if line_y > cfg.TOP_BAR_HEIGHT - 12:
            break


def draw_recap_modal(surface: pygame.Surface, recap: DayRecap, total_w: int, total_h: int) -> pygame.Rect:
    """Draw an end-of-day recap modal. Returns the 'Begin next day' button rect."""
    overlay = pygame.Surface((total_w, total_h), pygame.SRCALPHA)
    overlay.fill((0, 0, 0, 160))
    surface.blit(overlay, (0, 0))

    box_w, box_h = 720, 520
    box = pygame.Rect((total_w - box_w) // 2, (total_h - box_h) // 2, box_w, box_h)
    pygame.draw.rect(surface, cfg.PANEL_BG, box, border_radius=12)
    pygame.draw.rect(surface, cfg.ZONE_BORDER, box, width=2, border_radius=12)

    title_font = get_font(26, bold=True)
    sub_font = get_font(15)
    body_font = get_font(14)

    pad = 28
    x = box.left + pad
    y = box.top + pad

    title = title_font.render(f"Day {recap.day} — {recap.date_str}", True, cfg.TEXT)
    surface.blit(title, (x, y))
    y += title.get_height() + 8

    summary = sub_font.render(
        f"{recap.passengers_served} passengers served  ·  "
        f"{recap.on_time_pct:.0f}% on time  ·  "
        f"{recap.delayed_flights}/{recap.total_flights} flights delayed",
        True, cfg.TEXT_DIM,
    )
    surface.blit(summary, (x, y))
    y += summary.get_height() + 18

    if recap.busiest_hour is not None:
        h, count = recap.busiest_hour
        b = body_font.render(f"Busiest hour: {h:02d}:00  ({count} departures)", True, cfg.TEXT)
        surface.blit(b, (x, y))
        y += b.get_height() + 4
    if recap.peak_security_at:
        b = body_font.render(
            f"Peak security queue: {recap.peak_security_queue} at {recap.peak_security_at}",
            True, cfg.TEXT,
        )
        surface.blit(b, (x, y))
        y += b.get_height() + 4
    y += 12

    moments_title = sub_font.render("Moments", True, cfg.ACCENT)
    surface.blit(moments_title, (x, y))
    y += moments_title.get_height() + 6

    if not recap.moments:
        none = body_font.render("(a quiet day)", True, cfg.TEXT_DIM)
        surface.blit(none, (x, y))
        y += none.get_height() + 4
    else:
        for m in recap.moments:
            line = body_font.render(m, True, cfg.TEXT)
            surface.blit(line, (x, y))
            y += line.get_height() + 4

    # Button
    button_w, button_h = 200, 44
    button = pygame.Rect(box.right - pad - button_w, box.bottom - pad - button_h, button_w, button_h)
    pygame.draw.rect(surface, cfg.ACCENT, button, border_radius=8)
    label = sub_font.render("Begin next day  →", True, (20, 20, 20))
    surface.blit(label, (
        button.centerx - label.get_width() // 2,
        button.centery - label.get_height() // 2,
    ))
    return button
