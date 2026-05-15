/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ARRIVAL_RATE_BASE,
  INITIAL_FUNDS,
  INITIAL_NODES,
  SATISFACTION_START,
  STAFF_COST_PER_TICK,
} from '../constants';
import { arrivalSource } from './systems/arrival';
import { queueStage } from './systems/queueStage';
import { FlowEdge, SystemInstance, World } from './types';

export const ARRIVAL_ID = 'arrivals';

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
      },
      STAFF_COST_PER_TICK,
    ),
  );

  const arrival = arrivalSource({ id: ARRIVAL_ID, baseRate: ARRIVAL_RATE_BASE });

  const flows: FlowEdge[] = [
    { from: ARRIVAL_ID, to: 'checkIn' },
    { from: 'checkIn', to: 'security' },
    { from: 'security', to: 'lounge' },
    { from: 'lounge', to: 'boarding' },
  ];

  return {
    tick: 0,
    funds: INITIAL_FUNDS,
    totalPassengersProcessed: 0,
    overallSatisfaction: SATISFACTION_START,
    systems: [arrival, ...queueSystems],
    flows,
    signals: [],
    emergence: {
      facts: [],
      policy: { inflowThrottle: 1, staffingHints: {} },
    },
    history: [],
    alerts: [],
  };
}
