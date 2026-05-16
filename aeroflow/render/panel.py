"""Right-side passenger inspection panel."""

from __future__ import annotations

import pygame

from .. import config as cfg
from ..sim.flight import Flight
from ..sim.passenger import FrequentFlyer, Mood, Passenger
from .layout import get_font


MOOD_GLYPH = {
    Mood.HAPPY: ":)",
    Mood.NEUTRAL: ":|",
    Mood.ANXIOUS: ":/",
    Mood.SOUR: ":(",
}

FF_LABEL = {
    FrequentFlyer.NONE: "—",
    FrequentFlyer.BASIC: "Basic",
    FrequentFlyer.SILVER: "Silver",
    FrequentFlyer.GOLD: "Gold",
    FrequentFlyer.PLATINUM: "Platinum",
}


def draw_panel(
    surface: pygame.Surface,
    panel_rect: pygame.Rect,
    passenger: Passenger | None,
    flight: Flight | None,
) -> None:
    pygame.draw.rect(surface, cfg.PANEL_BG, panel_rect)
    pygame.draw.line(surface, cfg.ZONE_BORDER,
                     (panel_rect.left, panel_rect.top),
                     (panel_rect.left, panel_rect.bottom), width=1)

    if passenger is None:
        _draw_placeholder(surface, panel_rect)
        return

    pad = 18
    x = panel_rect.left + pad
    y = panel_rect.top + pad

    # Name
    name_font = get_font(20, bold=True)
    name_surface = name_font.render(passenger.name, True, cfg.TEXT)
    surface.blit(name_surface, (x, y))
    y += name_surface.get_height() + 2

    # Age + traveler type
    sub_font = get_font(13)
    sub_text = f"Age {passenger.age}  ·  {passenger.traveler_type.value.title()}"
    sub_surface = sub_font.render(sub_text, True, cfg.TEXT_DIM)
    surface.blit(sub_surface, (x, y))
    y += sub_surface.get_height() + 12

    # Regular tag
    if passenger.is_regular:
        tag_font = get_font(12, bold=True)
        # We don't have the regular_def here directly, but the panel_tag is captured
        # in the story for procedural; for regulars we just badge it.
        tag_text = "★ REGULAR"
        tag_surface = tag_font.render(tag_text, True, cfg.ACCENT)
        surface.blit(tag_surface, (x, y))
        y += tag_surface.get_height() + 12

    # Flight info
    if flight is not None:
        flight_font = get_font(15, bold=True)
        flight_text = f"{flight.display_code} → {flight.destination}"
        flight_surface = flight_font.render(flight_text, True, cfg.TEXT)
        surface.blit(flight_surface, (x, y))
        y += flight_surface.get_height() + 2

        time_text = (f"Sched {flight.scheduled_departure.strftime('%H:%M')}"
                     + (f"  ·  +{flight.delay_minutes}m" if flight.delay_minutes else "")
                     + f"  ·  Gate {flight.gate}")
        time_surface = sub_font.render(time_text, True, cfg.TEXT_DIM)
        surface.blit(time_surface, (x, y))
        y += time_surface.get_height() + 14

    # Story
    story_font = get_font(13)
    y = _draw_wrapped(surface, passenger.story, story_font, cfg.TEXT,
                      x, y, panel_rect.width - pad * 2)
    y += 14

    # Attributes
    attr_font = get_font(12, bold=True)
    val_font = get_font(12)
    rows = [
        ("Mood", MOOD_GLYPH.get(passenger.attributes.mood, "?")),
        ("Patience", _bar(passenger.attributes.patience)),
        ("FF status", FF_LABEL.get(passenger.attributes.ff_status, "?")),
        ("Price sens.", _bar(passenger.attributes.price_sensitivity)),
    ]
    if passenger.attributes.dietary:
        rows.append(("Dietary", passenger.attributes.dietary))
    rows.append(("State", passenger.state.value.title()))

    for label, val in rows:
        label_surface = attr_font.render(label, True, cfg.TEXT_DIM)
        surface.blit(label_surface, (x, y))
        val_surface = val_font.render(val, True, cfg.TEXT)
        surface.blit(val_surface, (x + 110, y))
        y += val_surface.get_height() + 4


def _draw_placeholder(surface: pygame.Surface, panel_rect: pygame.Rect) -> None:
    title_font = get_font(15, bold=True)
    body_font = get_font(13)
    pad = 18
    x = panel_rect.left + pad
    y = panel_rect.top + pad

    title = title_font.render("BTV Observation Mode", True, cfg.TEXT)
    surface.blit(title, (x, y))
    y += title.get_height() + 8

    lines = [
        "Click any passenger dot to read",
        "their story and attributes.",
        "",
        "Color = traveler type:",
        "  ●  navy = business",
        "  ●  teal = leisure",
        "  ●  orange = visiting friends/family",
        "  ●  magenta = connecting",
        "",
        "Gold ring = recurring 'regular'.",
        "",
        "Controls:",
        "  space — pause",
        "  1 / 2 / 3 — 1× / 10× / 60×",
    ]
    for line in lines:
        surface.blit(body_font.render(line, True, cfg.TEXT_DIM), (x, y))
        y += body_font.get_height() + 2


def _bar(value: int, width: int = 22) -> str:
    value = max(0, min(100, value))
    filled = int(round(value * width / 100))
    return "█" * filled + "·" * (width - filled)


def _draw_wrapped(
    surface: pygame.Surface,
    text: str,
    font: pygame.font.Font,
    color: tuple[int, int, int],
    x: int,
    y: int,
    max_width: int,
) -> int:
    words = text.split()
    line = ""
    line_height = font.get_height() + 2
    for w in words:
        candidate = (line + " " + w).strip()
        if font.size(candidate)[0] <= max_width:
            line = candidate
        else:
            surface.blit(font.render(line, True, color), (x, y))
            y += line_height
            line = w
    if line:
        surface.blit(font.render(line, True, color), (x, y))
        y += line_height
    return y
