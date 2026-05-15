/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AircraftType } from '../types';

export const AIRCRAFT_TYPES: Record<string, AircraftType> = {
  crj9: {
    id: 'crj9',
    name: 'Bombardier CRJ-900',
    seats: 76,
    boardingDurationTicks: 5,
    turnaroundTicks: 9,
  },
  e175: {
    id: 'e175',
    name: 'Embraer 175',
    seats: 76,
    boardingDurationTicks: 5,
    turnaroundTicks: 9,
  },
  a319: {
    id: 'a319',
    name: 'Airbus A319',
    seats: 128,
    boardingDurationTicks: 6,
    turnaroundTicks: 10,
  },
  a320: {
    id: 'a320',
    name: 'Airbus A320',
    seats: 162,
    boardingDurationTicks: 7,
    turnaroundTicks: 11,
  },
  a321: {
    id: 'a321',
    name: 'Airbus A321',
    seats: 185,
    boardingDurationTicks: 8,
    turnaroundTicks: 13,
  },
  b737: {
    id: 'b737',
    name: 'Boeing 737-700',
    seats: 143,
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
