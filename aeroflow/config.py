"""Global tunables and palette for the AeroFlow renderer + sim."""

from __future__ import annotations


WINDOW_WIDTH = 1600
WINDOW_HEIGHT = 900
SIDE_PANEL_WIDTH = 360
TOP_BAR_HEIGHT = 56
FPS = 60

# Sim time mapping. At 1x, 1 real second = SIM_SECONDS_PER_REAL_SECOND_BASE sim seconds.
# Speeds available to the user are 1x, 10x, 60x (plus pause).
SIM_SECONDS_PER_REAL_SECOND_BASE = 60  # 1 real sec = 1 sim minute at 1x
SIM_SPEEDS = (0, 1, 10, 60)

# A sim day runs from DAY_START_HOUR to midnight, then a recap fires.
DAY_START_HOUR = 5

# Palette (RGB)
BG = (18, 22, 28)
PANEL_BG = (28, 33, 41)
ZONE_FILL = (38, 45, 56)
ZONE_BORDER = (70, 82, 100)
ZONE_LABEL = (200, 210, 224)
TEXT = (220, 226, 235)
TEXT_DIM = (140, 152, 170)
ACCENT = (240, 200, 90)  # gold ring for regulars

# Traveler-type colors
TRAVELER_COLORS = {
    "BUSINESS": (90, 140, 220),
    "LEISURE": (90, 200, 180),
    "CONNECTING": (200, 130, 200),
    "VFR": (230, 170, 110),
}

# Carrier accents
CARRIER_COLORS = {
    "B6": (50, 96, 184),
    "DL": (192, 64, 80),
    "UA": (40, 80, 170),
    "AA": (180, 60, 70),
    "G4": (240, 130, 40),  # Allegiant (seasonal)
}
