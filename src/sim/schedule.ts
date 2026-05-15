/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MINUTES_PER_TICK, SIM_START_MINUTES } from '../constants';
import { AircraftType, Flight, Gate, PassengerCohort } from './types';

interface FlightTemplate {
  airline: string;
  flightNumber: string;
  destination: string;
  aircraftTypeId: string;
  gateId: string;
  departureMinute: number;
  loadFloor: number;
  loadCeiling: number;
}

interface ScheduleSeed {
  aircraftTypes: Record<string, AircraftType>;
  flights: Flight[];
  gates: Gate[];
  passengerCohorts: PassengerCohort[];
}

const AIRCRAFT_TYPES: Record<string, AircraftType> = {
  e175: {
    id: 'e175',
    name: 'Embraer 175',
    seats: 76,
    boardingDurationTicks: 5,
    turnaroundTicks: 9,
  },
  a320: {
    id: 'a320',
    name: 'Airbus A320',
    seats: 162,
    boardingDurationTicks: 7,
    turnaroundTicks: 11,
  },
  b738: {
    id: 'b738',
    name: 'Boeing 737-800',
    seats: 174,
    boardingDurationTicks: 8,
    turnaroundTicks: 12,
  },
  b789: {
    id: 'b789',
    name: 'Boeing 787-9',
    seats: 252,
    boardingDurationTicks: 12,
    turnaroundTicks: 18,
  },
};

const GATES: Gate[] = [
  { id: 'B4', terminal: 'B' },
  { id: 'B6', terminal: 'B' },
  { id: 'B8', terminal: 'B' },
  { id: 'C10', terminal: 'C' },
  { id: 'C12', terminal: 'C' },
  { id: 'C14', terminal: 'C' },
];

const FLIGHT_TEMPLATES: FlightTemplate[] = [
  { airline: 'AeroLink', flightNumber: 'AL 402', destination: 'New York LGA', aircraftTypeId: 'a320', gateId: 'B4', departureMinute: 7 * 60, loadFloor: 0.78, loadCeiling: 0.94 },
  { airline: 'AeroLink', flightNumber: 'AL 118', destination: 'Boston', aircraftTypeId: 'e175', gateId: 'B6', departureMinute: 7 * 60 + 10, loadFloor: 0.7, loadCeiling: 0.88 },
  { airline: 'MetroJet', flightNumber: 'MJ 731', destination: 'Washington DCA', aircraftTypeId: 'b738', gateId: 'C10', departureMinute: 7 * 60 + 20, loadFloor: 0.8, loadCeiling: 0.96 },
  { airline: 'Lakeshore', flightNumber: 'LS 205', destination: 'Minneapolis', aircraftTypeId: 'e175', gateId: 'C12', departureMinute: 7 * 60 + 35, loadFloor: 0.64, loadCeiling: 0.84 },
  { airline: 'AeroLink', flightNumber: 'AL 514', destination: 'Denver', aircraftTypeId: 'a320', gateId: 'B8', departureMinute: 9 * 60 + 15, loadFloor: 0.72, loadCeiling: 0.92 },
  { airline: 'SunCoast', flightNumber: 'SC 887', destination: 'Orlando', aircraftTypeId: 'b738', gateId: 'C14', departureMinute: 10 * 60 + 5, loadFloor: 0.82, loadCeiling: 0.98 },
  { airline: 'MetroJet', flightNumber: 'MJ 604', destination: 'Dallas Fort Worth', aircraftTypeId: 'a320', gateId: 'C10', departureMinute: 11 * 60 + 20, loadFloor: 0.75, loadCeiling: 0.94 },
  { airline: 'AeroLink', flightNumber: 'AL 219', destination: 'San Francisco', aircraftTypeId: 'b789', gateId: 'B4', departureMinute: 12 * 60, loadFloor: 0.8, loadCeiling: 0.97 },
  { airline: 'Lakeshore', flightNumber: 'LS 340', destination: 'Detroit', aircraftTypeId: 'e175', gateId: 'C12', departureMinute: 13 * 60 + 30, loadFloor: 0.58, loadCeiling: 0.78 },
  { airline: 'AeroLink', flightNumber: 'AL 906', destination: 'Seattle', aircraftTypeId: 'b738', gateId: 'B8', departureMinute: 16 * 60 + 5, loadFloor: 0.76, loadCeiling: 0.95 },
  { airline: 'SunCoast', flightNumber: 'SC 144', destination: 'Phoenix', aircraftTypeId: 'a320', gateId: 'C14', departureMinute: 16 * 60 + 20, loadFloor: 0.74, loadCeiling: 0.93 },
  { airline: 'MetroJet', flightNumber: 'MJ 810', destination: 'Atlanta', aircraftTypeId: 'b738', gateId: 'C10', departureMinute: 16 * 60 + 40, loadFloor: 0.82, loadCeiling: 0.98 },
  { airline: 'AeroLink', flightNumber: 'AL 677', destination: 'Los Angeles', aircraftTypeId: 'b789', gateId: 'B4', departureMinute: 17 * 60, loadFloor: 0.84, loadCeiling: 0.98 },
  { airline: 'Lakeshore', flightNumber: 'LS 421', destination: 'St. Louis', aircraftTypeId: 'e175', gateId: 'B6', departureMinute: 18 * 60 + 10, loadFloor: 0.62, loadCeiling: 0.84 },
];

export function createSchedule(seed = 7321): ScheduleSeed {
  const random = seededRandom(seed);

  const flights = FLIGHT_TEMPLATES.map((template, index) => {
    const aircraft = AIRCRAFT_TYPES[template.aircraftTypeId];
    const loadFactor = roundTo(randomBetween(random, template.loadFloor, template.loadCeiling), 2);
    const minuteJitter = Math.round(randomBetween(random, -5, 5) / MINUTES_PER_TICK) * MINUTES_PER_TICK;
    const scheduledDepartureTick = minuteToTick(template.departureMinute + minuteJitter);
    const bookedPassengers = Math.floor(aircraft.seats * loadFactor);
    const id = `flight-${index + 1}`;

    return {
      id,
      flightNumber: template.flightNumber,
      airline: template.airline,
      destination: template.destination,
      scheduledDepartureTick,
      aircraftTypeId: template.aircraftTypeId,
      gateId: template.gateId,
      status: 'scheduled' as const,
      loadFactor,
      bookedPassengers,
      boardedPassengers: 0,
      missedPassengers: 0,
      delayTicks: 0,
      delayRisk: 0,
    };
  });

  const passengerCohorts = flights.flatMap(flight =>
    createPassengerCohorts(flight, random),
  );

  return {
    aircraftTypes: AIRCRAFT_TYPES,
    flights,
    gates: GATES,
    passengerCohorts,
  };
}

export function tickToMinutes(tick: number): number {
  return SIM_START_MINUTES + tick * MINUTES_PER_TICK;
}

export function formatTickTime(tick: number): string {
  const minutes = tickToMinutes(tick) % (24 * 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function createPassengerCohorts(
  flight: Flight,
  random: () => number,
): PassengerCohort[] {
  const noShowCount = Math.floor(flight.bookedPassengers * randomBetween(random, 0.02, 0.05));
  const arrivingPassengers = flight.bookedPassengers - noShowCount;
  const earlyCount = Math.floor(arrivingPassengers * randomBetween(random, 0.24, 0.34));
  const standardCount = Math.floor(arrivingPassengers * randomBetween(random, 0.48, 0.58));
  const lateCount = arrivingPassengers - earlyCount - standardCount;

  const cohorts: PassengerCohort[] = [
    {
      id: `${flight.id}-early`,
      flightId: flight.id,
      profile: 'earlyLeisure',
      passengerCount: earlyCount,
      arrivalTick: flight.scheduledDepartureTick - Math.round(randomBetween(random, 24, 36)),
      status: 'waitingToArrive',
    },
    {
      id: `${flight.id}-standard`,
      flightId: flight.id,
      profile: 'standard',
      passengerCount: standardCount,
      arrivalTick: flight.scheduledDepartureTick - Math.round(randomBetween(random, 15, 24)),
      status: 'waitingToArrive',
    },
    {
      id: `${flight.id}-late`,
      flightId: flight.id,
      profile: 'lateBusiness',
      passengerCount: lateCount,
      arrivalTick: flight.scheduledDepartureTick - Math.round(randomBetween(random, 7, 14)),
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

  return cohorts.filter(cohort => cohort.passengerCount > 0);
}

function minuteToTick(minute: number): number {
  return Math.max(0, Math.round((minute - SIM_START_MINUTES) / MINUTES_PER_TICK));
}

function randomBetween(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

function roundTo(value: number, places: number): number {
  const multiplier = 10 ** places;
  return Math.round(value * multiplier) / multiplier;
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
