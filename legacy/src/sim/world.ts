/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  INITIAL_FUNDS,
  INITIAL_NODES,
  SATISFACTION_START,
  STAFF_COST_PER_TICK,
} from '../constants';
import { AIRCRAFT_TYPES } from './data/aircraft';
import { scheduleNewFlights } from './scheduler';
import { arrivalSource } from './systems/arrival';
import { queueStage } from './systems/queueStage';
import { FlowEdge, Gate, SystemInstance, World } from './types';

export const ARRIVAL_ID = 'arrivals';

const GATES: Gate[] = [
  { id: 'B4',  terminal: 'B' },
  { id: 'B6',  terminal: 'B' },
  { id: 'B8',  terminal: 'B' },
  { id: 'C10', terminal: 'C' },
  { id: 'C12', terminal: 'C' },
  { id: 'C14', terminal: 'C' },
];

export function initialWorld(): World {
  const queueSystems: SystemInstance<any>[] = Object.values(INITIAL_NODES).map(node =>
    queueStage(
      {
        id: node.id,
        name: node.name,
        capacity: node.capacity,
        staff: node.staff,
        processingRate: node.processingRate,
        queue: node.queue,
        satisfactionImpact: node.satisfactionImpact,
        batches: [],
      },
      STAFF_COST_PER_TICK,
    ),
  );

  const flows: FlowEdge[] = [
    { from: ARRIVAL_ID, to: 'checkIn' },
    { from: 'checkIn',  to: 'security' },
    { from: 'security', to: 'lounge' },
    { from: 'lounge',   to: 'boarding' },
  ];

  // Build the skeleton world so the scheduler can inspect gates + rotations
  const skeleton: World = {
    tick: 0,
    dayNumber: 1,
    funds: INITIAL_FUNDS,
    totalPassengersProcessed: 0,
    overallSatisfaction: SATISFACTION_START,
    aircraftTypes: AIRCRAFT_TYPES,
    flights: [],
    gates: GATES,
    gateRotations: Object.fromEntries(GATES.map(g => [g.id, { gateId: g.id, sequenceNumber: 1 }])),
    passengerCohorts: [],
    flightEvents: [],
    systems: [],
    flows,
    signals: [],
    emergence: {
      facts: [],
      policy: { inflowThrottle: 1, staffingHints: {} },
    },
    history: [],
    alerts: [],
  };

  // Seed initial flights for all gates
  const { newFlights, newCohorts, gateRotations, dayNumber } = scheduleNewFlights(skeleton);

  const arrival = arrivalSource({ id: ARRIVAL_ID, cohorts: newCohorts });

  return {
    ...skeleton,
    dayNumber,
    flights: newFlights,
    gateRotations,
    passengerCohorts: newCohorts,
    systems: [arrival, ...queueSystems],
  };
}
