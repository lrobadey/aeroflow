/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MINUTES_PER_TICK, SIM_START_MINUTES } from '../constants';

export function tickToMinutes(tick: number): number {
  return SIM_START_MINUTES + tick * MINUTES_PER_TICK;
}

export function formatTickTime(tick: number): string {
  const minutes = tickToMinutes(tick) % (24 * 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
