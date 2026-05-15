/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AirportNode } from './types';

export const INITIAL_FUNDS = 50000;
export const TICK_RATE_MS = 500; // 0.5s real time = 1 simulation tick (e.g., 5 mins)
export const MINUTES_PER_TICK = 5;
export const SIM_START_MINUTES = 5 * 60;
export const SATISFACTION_START = 1;
export const STAFF_COST_PER_TICK = 100;
export const REVENUE_PER_PASSENGER = 200;

export const INITIAL_NODES: Record<string, AirportNode> = {
  checkIn: {
    id: 'checkIn',
    name: 'Check-In',
    capacity: 120,
    staff: 6,
    processingRate: 4, // per staff member per tick
    queue: 0,
    satisfactionImpact: 0.001,
  },
  security: {
    id: 'security',
    name: 'Security',
    capacity: 90,
    staff: 5,
    processingRate: 3,
    queue: 0,
    satisfactionImpact: 0.002,
  },
  lounge: {
    id: 'lounge',
    name: 'Departure Lounge',
    capacity: 280,
    staff: 2,
    processingRate: 14, // Just moving through
    queue: 0,
    satisfactionImpact: 0.0005,
  },
  boarding: {
    id: 'boarding',
    name: 'Boarding Gate',
    capacity: 140,
    staff: 4,
    processingRate: 8,
    queue: 0,
    satisfactionImpact: 0.001,
  }
};

export const UPGRADE_COSTS = {
  STAFF: 1000,
  CAPACITY: 5000,
};
