/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MINUTES_PER_TICK, SIM_START_MINUTES } from '../constants';
import { AIRCRAFT_TYPES } from './data/aircraft';
import { AIRLINES } from './data/airlines';
import { DESTINATION_MAP } from './data/airports';
import { Route, ROUTES } from './data/routes';
import { Flight, GateRotation, PassengerCohort, World } from './types';

const TICKS_PER_DAY = (24 * 60) / MINUTES_PER_TICK; // 288
const MINUTES_PER_DAY = 24 * 60;
const CHECK_IN_OPEN_TICKS = 36; // must match flights.ts

// Banking phase: [startDailyTick, endDailyTick, density multiplier]
// Daily tick is ticks elapsed since midnight (5AM = tick 60, 10PM = tick 264)
const BANKING_PHASES: Array<{ start: number; end: number; density: number }> = [
  { start: 60,  end: 84,  density: 0.6 },  // 05:00–07:00 first bank
  { start: 84,  end: 120, density: 1.5 },  // 07:00–10:00 morning peak
  { start: 120, end: 156, density: 0.8 },  // 10:00–13:00 mid-morning
  { start: 156, end: 180, density: 1.0 },  // 13:00–15:00 noon bank
  { start: 180, end: 216, density: 0.7 },  // 15:00–18:00 afternoon
  { start: 216, end: 240, density: 1.4 },  // 18:00–20:00 evening peak
  { start: 240, end: 264, density: 0.5 },  // 20:00–22:00 wind-down
  // 22:00–05:00 (264–60 next day): night — no flights
];

function getDailyTick(simTick: number): number {
  const simMinutes = SIM_START_MINUTES + simTick * MINUTES_PER_TICK;
  return Math.floor((simMinutes % MINUTES_PER_DAY) / MINUTES_PER_TICK);
}

function getBankingDensity(dailyTick: number): number {
  for (const phase of BANKING_PHASES) {
    if (dailyTick >= phase.start && dailyTick < phase.end) return phase.density;
  }
  return 0;
}

function isNightWindow(simTick: number): boolean {
  return getBankingDensity(getDailyTick(simTick)) === 0;
}

// Returns the sim tick when 5AM next occurs after simTick
function nextMorningTick(simTick: number): number {
  const simMinutes = SIM_START_MINUTES + simTick * MINUTES_PER_TICK;
  const minuteOfDay = simMinutes % MINUTES_PER_DAY;
  // 5AM = 300 minutes from midnight
  const minutesToNext5AM = minuteOfDay < 300
    ? 300 - minuteOfDay
    : MINUTES_PER_DAY - minuteOfDay + 300;
  return simTick + Math.ceil(minutesToNext5AM / MINUTES_PER_TICK);
}

// Find the next valid departure tick (in a banking window, with enough prep time)
function findNextDepartureTick(availableAtTick: number): number {
  // Need CHECK_IN_OPEN_TICKS of pre-departure prep + 2 tick buffer
  const earliest = availableAtTick + CHECK_IN_OPEN_TICKS + 2;
  // Spread departures with a random jitter (0–11 ticks ≈ up to 55 min spread)
  const jitter = Math.floor(Math.random() * 12);
  const candidate = earliest + jitter;

  for (let offset = 0; offset < TICKS_PER_DAY * 2; offset++) {
    const t = candidate + offset;
    if (getBankingDensity(getDailyTick(t)) > 0) return t;
  }
  return candidate; // fallback (should never reach here)
}

function pickRoute(dailyTick: number): Route {
  const density = getBankingDensity(dailyTick);
  // Weight each route by frequency × current banking density
  const weights = ROUTES.map(r => r.frequencyPerDay * density);
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < ROUTES.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return ROUTES[i];
  }
  return ROUTES[ROUTES.length - 1];
}

function pickAirline(route: Route): string {
  return route.airlines[Math.floor(Math.random() * route.airlines.length)];
}

function pickAircraftType(route: Route, airlineCode: string): string {
  const airline = AIRLINES[airlineCode];
  const compatible = route.aircraftTypes.filter(t => airline?.fleetTypes.includes(t));
  const pool = compatible.length > 0 ? compatible : route.aircraftTypes;
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateLoadFactor(dailyTick: number, route: Route): number {
  const isPeak = getBankingDensity(dailyTick) >= 1.0;
  const min = isPeak ? route.peakLoadMin : route.offPeakLoadMin;
  const max = isPeak ? route.peakLoadMax : route.offPeakLoadMax;
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function buildPassengerCohorts(flight: Flight): PassengerCohort[] {
  const noShowRate = 0.02 + Math.random() * 0.03;
  const noShowCount = Math.floor(flight.bookedPassengers * noShowRate);
  const arriving = flight.bookedPassengers - noShowCount;

  const earlyCount = Math.floor(arriving * (0.24 + Math.random() * 0.10));
  const standardCount = Math.floor(arriving * (0.48 + Math.random() * 0.10));
  const lateCount = arriving - earlyCount - standardCount;

  const cohorts: PassengerCohort[] = [
    {
      id: `${flight.id}-early`,
      flightId: flight.id,
      profile: 'earlyLeisure',
      passengerCount: earlyCount,
      arrivalTick: flight.scheduledDepartureTick - Math.round(24 + Math.random() * 12),
      status: 'waitingToArrive',
    },
    {
      id: `${flight.id}-standard`,
      flightId: flight.id,
      profile: 'standard',
      passengerCount: standardCount,
      arrivalTick: flight.scheduledDepartureTick - Math.round(15 + Math.random() * 9),
      status: 'waitingToArrive',
    },
    {
      id: `${flight.id}-late`,
      flightId: flight.id,
      profile: 'lateBusiness',
      passengerCount: lateCount,
      arrivalTick: flight.scheduledDepartureTick - Math.round(7 + Math.random() * 7),
      status: 'waitingToArrive',
    },
    {
      id: `${flight.id}-noshow`,
      flightId: flight.id,
      profile: 'noShow',
      passengerCount: noShowCount,
      arrivalTick: Number.POSITIVE_INFINITY,
      status: 'noShow',
    },
  ];

  return cohorts.filter(c => c.passengerCount > 0);
}

export interface SchedulerResult {
  newFlights: Flight[];
  newCohorts: PassengerCohort[];
  gateRotations: Record<string, GateRotation>;
  dayNumber: number;
}

export function scheduleNewFlights(world: World): SchedulerResult {
  const tick = world.tick;
  const newFlights: Flight[] = [];
  const newCohorts: PassengerCohort[] = [];
  const gateRotations = { ...world.gateRotations };

  const dayNumber = Math.floor((tick * MINUTES_PER_TICK + SIM_START_MINUTES) / MINUTES_PER_DAY) + 1;

  for (const gate of world.gates) {
    // Gate is busy if any non-terminal flight is assigned to it
    const hasActiveFlight = world.flights.some(
      f => f.gateId === gate.id && f.status !== 'departed' && f.status !== 'cancelled',
    );
    if (hasActiveFlight) continue;

    // Respect turnaround time: last departed aircraft must have cleared the gate
    const lastDeparted = world.flights
      .filter(f => f.gateId === gate.id && f.status === 'departed' && f.actualDepartureTick !== undefined)
      .reduce<Flight | undefined>(
        (latest, f) => (!latest || f.actualDepartureTick! > latest.actualDepartureTick! ? f : latest),
        undefined,
      );

    if (lastDeparted) {
      const turnaround = world.aircraftTypes[lastDeparted.aircraftTypeId]?.turnaroundTicks ?? 12;
      if (lastDeparted.actualDepartureTick! + turnaround > tick) continue;
    }

    // Pick departure time (scheduler skips night window automatically via findNextDepartureTick)
    const departureTick = findNextDepartureTick(tick);
    const dailyTick = getDailyTick(departureTick);
    const route = pickRoute(dailyTick);
    const airlineCode = pickAirline(route);
    const aircraftTypeId = pickAircraftType(route, airlineCode);
    const aircraft = AIRCRAFT_TYPES[aircraftTypeId];
    const loadFactor = generateLoadFactor(dailyTick, route);
    const bookedPassengers = Math.floor(aircraft.seats * loadFactor);

    const rotation = gateRotations[gate.id] ?? { gateId: gate.id, sequenceNumber: 1 };
    const seq = rotation.sequenceNumber;
    const flightId = `d${dayNumber}-${gate.id}-${seq.toString().padStart(3, '0')}`;
    const flightNum = Math.floor(1000 + Math.random() * 8999);
    const dest = DESTINATION_MAP[route.destination];
    const destinationLabel = dest ? `${dest.city} ${route.destination}` : route.destination;

    const flight: Flight = {
      id: flightId,
      flightNumber: `${airlineCode} ${flightNum}`,
      airline: AIRLINES[airlineCode]?.name ?? airlineCode,
      destination: destinationLabel,
      scheduledDepartureTick: departureTick,
      aircraftTypeId,
      gateId: gate.id,
      status: 'scheduled',
      loadFactor,
      bookedPassengers,
      boardedPassengers: 0,
      missedPassengers: 0,
      delayTicks: 0,
      delayRisk: 0,
    };

    const cohorts = buildPassengerCohorts(flight);
    newFlights.push(flight);
    newCohorts.push(...cohorts);

    gateRotations[gate.id] = { gateId: gate.id, sequenceNumber: seq + 1 };
  }

  return { newFlights, newCohorts, gateRotations, dayNumber };
}

export { getDailyTick, getBankingDensity };

export function getDayPhaseLabel(simTick: number): string {
  const dt = getDailyTick(simTick);
  if (dt < 60 || dt >= 264) return 'Night';
  if (dt < 84)  return 'First Bank';
  if (dt < 120) return 'Morning Peak';
  if (dt < 156) return 'Mid-Morning';
  if (dt < 180) return 'Noon Bank';
  if (dt < 216) return 'Afternoon';
  if (dt < 240) return 'Evening Peak';
  return 'Wind-Down';
}
