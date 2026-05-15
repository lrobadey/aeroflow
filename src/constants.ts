/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AirportNode } from './types';

export const INITIAL_FUNDS = 50000;
export const TICK_RATE_MS = 500; // 0.5s real time = 1 simulation tick (e.g., 5 mins)
export const ARRIVAL_RATE_BASE = 5; // Base passengers arriving per tick
export const SATISFACTION_START = 1;
export const STAFF_COST_PER_TICK = 100;
export const REVENUE_PER_PASSENGER = 200;

export const INITIAL_NODES: Record<string, AirportNode> = {
  checkIn: {
    id: 'checkIn',
    name: 'Check-In',
    capacity: 20,
    staff: 2,
    processingRate: 2, // per staff member
    queue: 0,
    satisfactionImpact: 0.001,
  },
  security: {
    id: 'security',
    name: 'Security',
    capacity: 15,
    staff: 2,
    processingRate: 1.5,
    queue: 0,
    satisfactionImpact: 0.002,
  },
  lounge: {
    id: 'lounge',
    name: 'Departure Lounge',
    capacity: 50,
    staff: 1,
    processingRate: 5, // Just moving through
    queue: 0,
    satisfactionImpact: 0.0005,
  },
  boarding: {
    id: 'boarding',
    name: 'Boarding Gate',
    capacity: 30,
    staff: 1,
    processingRate: 3,
    queue: 0,
    satisfactionImpact: 0.001,
  }
};

export const UPGRADE_COSTS = {
  STAFF: 1000,
  CAPACITY: 5000,
};
