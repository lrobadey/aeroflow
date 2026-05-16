"""Procedural name generation, biased toward New England flavor."""

from __future__ import annotations

import random

from faker import Faker


# Curated New England / Vermont surnames to bias the pool toward.
NE_SURNAMES = [
    "Thibault", "Kovalenko", "Whitcomb", "Fontaine", "Demeritte", "Hebert",
    "Pelletier", "Beaulieu", "Beaupre", "St. Pierre", "Champlain", "Lacroix",
    "Gagnon", "Bergeron", "Dubois", "Marcotte", "Tessier", "Dupont", "Lavoie",
    "Boucher", "Robichaud", "Demers", "Bouchard", "Caron", "Charbonneau",
    "Ouellette", "Cloutier", "Saucier", "Desjardins", "Goulet", "Roy",
    "Petersen", "Larson", "Carlson", "Olsen", "Magnusson",
    "O'Brien", "O'Connor", "Donnelly", "Quinn", "Sullivan", "Ryan",
    "Mendoza", "Okafor", "Patel", "Chen", "Nguyen", "Park", "Singh",
    "Dorsey", "McAllister", "MacDonald",
]

NE_BIAS = 0.30  # fraction of generated names that get a NE surname


class NamePool:
    """Wraps Faker with a New-England surname bias."""

    def __init__(self, seed: int | None = None):
        self.faker = Faker("en_US")
        if seed is not None:
            Faker.seed(seed)

    def next_name(self, rng: random.Random) -> str:
        first = self.faker.first_name()
        if rng.random() < NE_BIAS:
            last = rng.choice(NE_SURNAMES)
        else:
            last = self.faker.last_name()
        return f"{first} {last}"
