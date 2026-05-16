"""Draws the BTV terminal: zones as rounded rectangles, passengers as colored dots."""

from __future__ import annotations

import math
from typing import Iterable

import pygame

from .. import config as cfg
from ..sim.passenger import Passenger
from ..sim.zone import Zone, ZoneType
from ..sim.world import World


# Cached fonts
_fonts: dict[tuple[str, int], pygame.font.Font] = {}


def get_font(size: int, bold: bool = False) -> pygame.font.Font:
    key = ("bold" if bold else "regular", size)
    if key not in _fonts:
        font = pygame.font.SysFont("helvetica,arial", size, bold=bold)
        _fonts[key] = font
    return _fonts[key]


def draw_terminal(
    surface: pygame.Surface,
    world: World,
    inspected_pax_id: str | None,
    hover_pax_id: str | None,
) -> dict[str, tuple[int, int]]:
    """Draw all zones and their passengers. Returns a map of pax_id → (x, y) screen position
    so that hit-testing for clicks/hovers can use it."""
    pax_positions: dict[str, tuple[int, int]] = {}
    for zone in world.zones.values():
        _draw_zone(surface, zone)
        positions = _draw_passengers(
            surface, zone, inspected_pax_id, hover_pax_id
        )
        pax_positions.update(positions)
    return pax_positions


def _draw_zone(surface: pygame.Surface, zone: Zone) -> None:
    rect = pygame.Rect(zone.rect.x, zone.rect.y, zone.rect.width, zone.rect.height)
    pygame.draw.rect(surface, cfg.ZONE_FILL, rect, border_radius=10)
    pygame.draw.rect(surface, cfg.ZONE_BORDER, rect, width=2, border_radius=10)

    # Label
    label_font = get_font(13, bold=True)
    label_surface = label_font.render(zone.label, True, cfg.ZONE_LABEL)
    surface.blit(label_surface, (rect.x + 10, rect.y + 6))

    # Count badge in top-right
    count_text = f"{zone.total_occupancy}"
    if zone.type in (ZoneType.CHECK_IN, ZoneType.SECURITY, ZoneType.JETWAY):
        count_text = f"{len(zone.queue)}q · {len(zone.in_service)}s"
    count_font = get_font(12)
    count_surface = count_font.render(count_text, True, cfg.TEXT_DIM)
    surface.blit(count_surface, (rect.right - count_surface.get_width() - 10, rect.y + 6))


def _draw_passengers(
    surface: pygame.Surface,
    zone: Zone,
    inspected_pax_id: str | None,
    hover_pax_id: str | None,
) -> dict[str, tuple[int, int]]:
    """Pack the zone's passengers as a dot grid inside its rectangle."""
    positions: dict[str, tuple[int, int]] = {}

    pax_list = list(zone.occupants())
    if not pax_list:
        return positions

    inner = pygame.Rect(
        zone.rect.x + 10,
        zone.rect.y + 26,  # below label
        zone.rect.width - 20,
        zone.rect.height - 36,
    )
    if inner.width <= 0 or inner.height <= 0:
        return positions

    dot_radius = 4
    spacing = 12
    cols = max(1, inner.width // spacing)
    rows = max(1, inner.height // spacing)
    capacity_visible = cols * rows

    # If we've got more pax than slots, draw the overflow count and only draw what fits.
    overflow = max(0, len(pax_list) - capacity_visible)
    pax_to_draw = pax_list[:capacity_visible]

    for i, pax in enumerate(pax_to_draw):
        col = i % cols
        row = i // cols
        cx = inner.x + col * spacing + spacing // 2
        cy = inner.y + row * spacing + spacing // 2
        positions[pax.id] = (cx, cy)
        color = cfg.TRAVELER_COLORS.get(pax.traveler_type.value, (200, 200, 200))
        pygame.draw.circle(surface, color, (cx, cy), dot_radius)
        if pax.is_regular:
            pygame.draw.circle(surface, cfg.ACCENT, (cx, cy), dot_radius + 2, width=1)
        if pax.id == inspected_pax_id:
            pygame.draw.circle(surface, cfg.TEXT, (cx, cy), dot_radius + 4, width=2)
        elif pax.id == hover_pax_id:
            pygame.draw.circle(surface, cfg.TEXT_DIM, (cx, cy), dot_radius + 3, width=1)

    if overflow:
        font = get_font(11)
        text = font.render(f"+{overflow}", True, cfg.TEXT_DIM)
        surface.blit(text, (inner.right - text.get_width(), inner.bottom - text.get_height()))

    return positions


def find_passenger_at(
    pos: tuple[int, int],
    pax_positions: dict[str, tuple[int, int]],
    radius: int = 8,
) -> str | None:
    px, py = pos
    best_id, best_dist2 = None, radius * radius
    for pid, (x, y) in pax_positions.items():
        d2 = (x - px) ** 2 + (y - py) ** 2
        if d2 < best_dist2:
            best_id, best_dist2 = pid, d2
    return best_id


def draw_tooltip(surface: pygame.Surface, pos: tuple[int, int], text: str) -> None:
    font = get_font(12)
    text_surface = font.render(text, True, cfg.TEXT)
    pad = 6
    rect = pygame.Rect(
        pos[0] + 12, pos[1] + 12,
        text_surface.get_width() + pad * 2,
        text_surface.get_height() + pad * 2,
    )
    pygame.draw.rect(surface, cfg.PANEL_BG, rect, border_radius=4)
    pygame.draw.rect(surface, cfg.ZONE_BORDER, rect, width=1, border_radius=4)
    surface.blit(text_surface, (rect.x + pad, rect.y + pad))
