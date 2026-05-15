/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SystemId = string;

export type AlertLevel = 'info' | 'warn' | 'crit';

export type FlightStatus =
  | 'scheduled'
  | 'checkInOpen'
  | 'boarding'
  | 'delayed'
  | 'departed'
  | 'cancelled';

export type CohortProfile = 'earlyLeisure' | 'standard' | 'lateBusiness' | 'noShow';

export type CohortStatus =
  | 'waitingToArrive'
  | 'inTerminal'
  | 'readyToBoard'
  | 'boarded'
  | 'missed'
  | 'noShow';

export interface AircraftType {
  id: string;
  name: string;
  seats: number;
  boardingDurationTicks: number;
  turnaroundTicks: number;
}

export interface Gate {
  id: string;
  terminal: string;
  occupiedByFlightId?: string;
}

export interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  destination: string;
  scheduledDepartureTick: number;
  actualDepartureTick?: number;
  aircraftTypeId: string;
  gateId: string;
  status: FlightStatus;
  loadFactor: number;
  bookedPassengers: number;
  boardedPassengers: number;
  missedPassengers: number;
  delayTicks: number;
  delayRisk: number;
}

export interface PassengerCohort {
  id: string;
  flightId: string;
  profile: CohortProfile;
  passengerCount: number;
  arrivalTick: number;
  status: CohortStatus;
}

export interface PassengerBatch {
  cohortId: string;
  flightId: string;
  count: number;
}

export interface FlightEvent {
  tick: number;
  flightId: string;
  type: 'checkInOpened' | 'boardingStarted' | 'departed' | 'delayed' | 'missedPassengers';
  message: string;
  level: AlertLevel;
}

export interface QueueState {
  id: SystemId;
  name: string;
  capacity: number;
  staff: number;
  processingRate: number;
  queue: number;
  satisfactionImpact: number;
  batches: PassengerBatch[];
}

export interface ArrivalState {
  id: SystemId;
  cohorts: PassengerCohort[];
}

export type SignalKind =
  | 'load'
  | 'pressure'
  | 'throughput'
  | 'starvation'
  | 'delayRisk'
  | 'boardingPressure'
  | 'bankPressure'
  | 'gateConflict'
  | 'missedPassengers';

export interface Signal {
  source: SystemId;
  kind: SignalKind;
  value: number;
  tick: number;
}

export type FactKind =
  | 'bottleneck'
  | 'cascade'
  | 'oscillation'
  | 'starvation'
  | 'boardingRisk'
  | 'departureBank'
  | 'missedPassengers'
  | 'nominal';

export interface EmergenceFact {
  kind: FactKind;
  at?: SystemId;
  severity: number;
  message: string;
  tick: number;
  level: AlertLevel;
}

export interface Policy {
  inflowThrottle: number;
  staffingHints: Record<SystemId, number>;
}

export interface FlowEdge {
  from: SystemId;
  to: SystemId;
}

export interface StepContext<S> {
  state: S;
  inbox: number;
  inboundBatches: PassengerBatch[];
  tick: number;
  policy: Policy;
}

export interface StepResult<S> {
  state: S;
  outbox: number;
  outboxBatches: PassengerBatch[];
  signals: Signal[];
  revenue?: number;
  staffCost?: number;
}

export interface SystemInstance<S> {
  id: SystemId;
  kind: 'queue' | 'source' | 'sink';
  state: S;
  step: (ctx: StepContext<S>) => StepResult<S>;
}

export interface SimHistoryPoint {
  tick: number;
  funds: number;
  satisfaction: number;
  queues: Record<string, number>;
  inflowThrottle: number;
  delayedFlights: number;
  boardedPassengers: number;
}

export interface AlertEntry {
  msg: string;
  type: AlertLevel;
  tick: number;
}

export interface World {
  tick: number;
  funds: number;
  totalPassengersProcessed: number;
  overallSatisfaction: number;
  aircraftTypes: Record<string, AircraftType>;
  flights: Flight[];
  gates: Gate[];
  passengerCohorts: PassengerCohort[];
  flightEvents: FlightEvent[];
  systems: SystemInstance<any>[];
  flows: FlowEdge[];
  signals: Signal[];
  emergence: {
    facts: EmergenceFact[];
    policy: Policy;
  };
  history: SimHistoryPoint[];
  alerts: AlertEntry[];
}
