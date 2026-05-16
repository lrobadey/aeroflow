/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AircraftType,
  Flight,
  FlightEvent,
  FlightStatus,
  Gate,
  PassengerBatch,
  PassengerCohort,
  QueueState,
  Signal,
  SystemId,
} from '../types';

interface FlightLifecycleInput {
  tick: number;
  aircraftTypes: Record<string, AircraftType>;
  flights: Flight[];
  gates: Gate[];
  passengerCohorts: PassengerCohort[];
  queueStates: Record<SystemId, QueueState>;
  boardedBatches: PassengerBatch[];
}

interface FlightLifecycleOutput {
  flights: Flight[];
  gates: Gate[];
  passengerCohorts: PassengerCohort[];
  events: FlightEvent[];
  signals: Signal[];
  boardedPassengers: number;
}

const CHECK_IN_OPEN_TICKS = 36;
const DELAY_DEPARTURE_THRESHOLD = 0.88;
const MAX_HOLD_TICKS = 6;

export function advanceFlights(input: FlightLifecycleInput): FlightLifecycleOutput {
  const {
    tick,
    aircraftTypes,
    flights,
    gates,
    passengerCohorts,
    queueStates,
    boardedBatches,
  } = input;

  const boardableFlightIds = new Set(
    flights
      .filter(flight => flight.status !== 'departed' && flight.status !== 'cancelled')
      .map(flight => flight.id),
  );
  const acceptedBoardedBatches = boardedBatches.filter(batch => boardableFlightIds.has(batch.flightId));
  const boardedNowByFlight = countBatchesByFlight(acceptedBoardedBatches);
  const boardingQueueByFlight = countBatchesByFlight(queueStates.boarding?.batches ?? []);
  const terminalByFlight = countTerminalBatchesByFlight(queueStates);
  const events: FlightEvent[] = [];
  const signals: Signal[] = [];

  const nextFlights = flights.map(flight => {
    if (flight.status === 'departed' || flight.status === 'cancelled') return flight;

    const aircraft = aircraftTypes[flight.aircraftTypeId];
    const boardedPassengers = Math.min(
      flight.bookedPassengers,
      flight.boardedPassengers + (boardedNowByFlight[flight.id] ?? 0),
    );
    const boardingStartTick = flight.scheduledDepartureTick - aircraft.boardingDurationTicks;
    const checkInOpenTick = flight.scheduledDepartureTick - CHECK_IN_OPEN_TICKS;
    const readyOrBoarded = boardedPassengers + (boardingQueueByFlight[flight.id] ?? 0);
    const readyRatio = readyOrBoarded / Math.max(1, flight.bookedPassengers);
    const timeToDeparture = flight.scheduledDepartureTick - tick;
    const delayRisk = calculateDelayRisk(readyRatio, timeToDeparture, terminalByFlight[flight.id] ?? 0);

    let status: FlightStatus = flight.status;
    let actualDepartureTick = flight.actualDepartureTick;
    let missedPassengers = flight.missedPassengers;
    let delayTicks = Math.max(0, tick - flight.scheduledDepartureTick);

    if (tick >= flight.scheduledDepartureTick) {
      const forcedDeparture = flight.status === 'delayed' && delayTicks >= MAX_HOLD_TICKS;
      const enoughBoarded = boardedPassengers / Math.max(1, flight.bookedPassengers) >= DELAY_DEPARTURE_THRESHOLD;

      if (enoughBoarded || forcedDeparture) {
        status = 'departed';
        actualDepartureTick = tick;
        missedPassengers = Math.max(0, flight.bookedPassengers - boardedPassengers);
      } else {
        status = 'delayed';
      }
    } else if (tick >= boardingStartTick) {
      status = 'boarding';
      delayTicks = 0;
    } else if (tick >= checkInOpenTick) {
      status = 'checkInOpen';
      delayTicks = 0;
    } else {
      status = 'scheduled';
      delayTicks = 0;
    }

    if (status !== flight.status) {
      events.push(createStatusEvent(tick, flight, status, missedPassengers));
    }

    if (status === 'departed' && missedPassengers > 0) {
      events.push({
        tick,
        flightId: flight.id,
        type: 'missedPassengers',
        message: `${flight.flightNumber} departed with ${missedPassengers} missed passengers`,
        level: missedPassengers > flight.bookedPassengers * 0.12 ? 'crit' : 'warn',
      });
    }

    if (delayRisk > 0.2 && status !== 'departed') {
      signals.push({ source: flight.id, kind: 'delayRisk', value: delayRisk, tick });
    }
    if (status === 'boarding') {
      signals.push({
        source: flight.id,
        kind: 'boardingPressure',
        value: Math.max(0, 1 - readyRatio),
        tick,
      });
    }
    if (missedPassengers > flight.missedPassengers) {
      signals.push({
        source: flight.id,
        kind: 'missedPassengers',
        value: missedPassengers - flight.missedPassengers,
        tick,
      });
    }

    return {
      ...flight,
      status,
      actualDepartureTick,
      boardedPassengers,
      missedPassengers,
      delayTicks,
      delayRisk,
    };
  });

  const activeBank = nextFlights.filter(
    flight =>
      flight.status !== 'departed' &&
      flight.status !== 'cancelled' &&
      flight.scheduledDepartureTick >= tick &&
      flight.scheduledDepartureTick <= tick + 12,
  );
  if (activeBank.length >= 3) {
    signals.push({
      source: 'flightBank',
      kind: 'bankPressure',
      value: activeBank.length / Math.max(1, gates.length),
      tick,
    });
  }

  return {
    flights: nextFlights,
    gates: occupyGates(gates, nextFlights),
    passengerCohorts: updateCohortStatuses(passengerCohorts, queueStates, acceptedBoardedBatches, nextFlights),
    events,
    signals,
    boardedPassengers: acceptedBoardedBatches.reduce((sum, batch) => sum + batch.count, 0),
  };
}

function countBatchesByFlight(batches: PassengerBatch[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const batch of batches) {
    counts[batch.flightId] = (counts[batch.flightId] ?? 0) + batch.count;
  }
  return counts;
}

function countTerminalBatchesByFlight(queueStates: Record<SystemId, QueueState>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const state of Object.values(queueStates)) {
    for (const batch of state.batches) {
      counts[batch.flightId] = (counts[batch.flightId] ?? 0) + batch.count;
    }
  }
  return counts;
}

function calculateDelayRisk(readyRatio: number, timeToDeparture: number, stillInTerminal: number): number {
  const timePressure = timeToDeparture < 12 ? (12 - timeToDeparture) / 12 : 0;
  const readinessGap = Math.max(0, DELAY_DEPARTURE_THRESHOLD - readyRatio);
  const upstreamPenalty = stillInTerminal > 0 && timeToDeparture < 8 ? 0.15 : 0;
  return clamp01(readinessGap + timePressure * 0.45 + upstreamPenalty);
}

function createStatusEvent(
  tick: number,
  flight: Flight,
  status: Flight['status'],
  missedPassengers: number,
): FlightEvent {
  switch (status) {
    case 'checkInOpen':
      return {
        tick,
        flightId: flight.id,
        type: 'checkInOpened',
        message: `${flight.flightNumber} check-in open for ${flight.destination}`,
        level: 'info',
      };
    case 'boarding':
      return {
        tick,
        flightId: flight.id,
        type: 'boardingStarted',
        message: `${flight.flightNumber} boarding at gate ${flight.gateId}`,
        level: 'info',
      };
    case 'delayed':
      return {
        tick,
        flightId: flight.id,
        type: 'delayed',
        message: `${flight.flightNumber} delayed by passenger readiness`,
        level: 'warn',
      };
    case 'departed':
      return {
        tick,
        flightId: flight.id,
        type: 'departed',
        message: `${flight.flightNumber} departed${missedPassengers > 0 ? ` with ${missedPassengers} missed` : ''}`,
        level: missedPassengers > 0 ? 'warn' : 'info',
      };
    case 'scheduled':
    case 'cancelled':
      return {
        tick,
        flightId: flight.id,
        type: 'delayed',
        message: `${flight.flightNumber} status changed to ${status}`,
        level: 'info',
      };
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function occupyGates(gates: Gate[], flights: Flight[]): Gate[] {
  return gates.map(gate => {
    const occupying = flights.find(
      flight =>
        flight.gateId === gate.id &&
        (flight.status === 'boarding' || flight.status === 'delayed'),
    );
    return { ...gate, occupiedByFlightId: occupying?.id };
  });
}

function updateCohortStatuses(
  passengerCohorts: PassengerCohort[],
  queueStates: Record<SystemId, QueueState>,
  boardedBatches: PassengerBatch[],
  flights: Flight[],
): PassengerCohort[] {
  const queueLocationByCohort: Record<string, SystemId> = {};
  for (const state of Object.values(queueStates)) {
    for (const batch of state.batches) {
      queueLocationByCohort[batch.cohortId] = state.id;
    }
  }

  const boardedCohorts = new Set(boardedBatches.map(batch => batch.cohortId));
  const departedFlightIds = new Set(flights.filter(flight => flight.status === 'departed').map(flight => flight.id));

  return passengerCohorts.map(cohort => {
    if (cohort.status === 'noShow' || cohort.status === 'boarded' || cohort.status === 'missed') return cohort;
    if (departedFlightIds.has(cohort.flightId)) return { ...cohort, status: 'missed' as const };
    if (queueLocationByCohort[cohort.id] === 'boarding') return { ...cohort, status: 'readyToBoard' as const };
    if (queueLocationByCohort[cohort.id]) return { ...cohort, status: 'inTerminal' as const };
    if (boardedCohorts.has(cohort.id)) return { ...cohort, status: 'boarded' as const };
    return cohort;
  });
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
