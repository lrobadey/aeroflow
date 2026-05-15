/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Route {
  destination: string;
  airlines: string[];
  aircraftTypes: string[];
  frequencyPerDay: number;
  peakLoadMin: number;
  peakLoadMax: number;
  offPeakLoadMin: number;
  offPeakLoadMax: number;
}

// Routes from CLT (Charlotte Douglas) — AA hub with regional and mainline mix
export const ROUTES: Route[] = [
  // Northeast — high frequency, high load
  { destination: 'JFK', airlines: ['AA', 'B6'], aircraftTypes: ['a320', 'a321'],        frequencyPerDay: 8, peakLoadMin: 0.88, peakLoadMax: 0.98, offPeakLoadMin: 0.72, offPeakLoadMax: 0.88 },
  { destination: 'LGA', airlines: ['AA'],        aircraftTypes: ['a319', 'a320'],        frequencyPerDay: 6, peakLoadMin: 0.84, peakLoadMax: 0.96, offPeakLoadMin: 0.68, offPeakLoadMax: 0.84 },
  { destination: 'BOS', airlines: ['AA', 'B6'], aircraftTypes: ['a319', 'a320'],        frequencyPerDay: 4, peakLoadMin: 0.82, peakLoadMax: 0.94, offPeakLoadMin: 0.65, offPeakLoadMax: 0.82 },
  { destination: 'PHL', airlines: ['AA'],        aircraftTypes: ['crj9', 'a319'],        frequencyPerDay: 5, peakLoadMin: 0.80, peakLoadMax: 0.92, offPeakLoadMin: 0.62, offPeakLoadMax: 0.80 },
  { destination: 'DCA', airlines: ['AA'],        aircraftTypes: ['a319', 'a320'],        frequencyPerDay: 6, peakLoadMin: 0.85, peakLoadMax: 0.96, offPeakLoadMin: 0.70, offPeakLoadMax: 0.85 },
  { destination: 'IAD', airlines: ['AA', 'UA'], aircraftTypes: ['e175', 'a319'],        frequencyPerDay: 3, peakLoadMin: 0.76, peakLoadMax: 0.90, offPeakLoadMin: 0.60, offPeakLoadMax: 0.78 },
  // Midwest
  { destination: 'ORD', airlines: ['AA', 'UA'], aircraftTypes: ['a320', 'a321', 'b738'], frequencyPerDay: 5, peakLoadMin: 0.80, peakLoadMax: 0.92, offPeakLoadMin: 0.64, offPeakLoadMax: 0.80 },
  { destination: 'DTW', airlines: ['AA', 'DL'], aircraftTypes: ['crj9', 'e175', 'a319'], frequencyPerDay: 3, peakLoadMin: 0.72, peakLoadMax: 0.88, offPeakLoadMin: 0.58, offPeakLoadMax: 0.74 },
  { destination: 'MSP', airlines: ['AA', 'DL'], aircraftTypes: ['a319', 'a320'],        frequencyPerDay: 3, peakLoadMin: 0.74, peakLoadMax: 0.88, offPeakLoadMin: 0.60, offPeakLoadMax: 0.76 },
  { destination: 'STL', airlines: ['AA', 'WN'], aircraftTypes: ['crj9', 'e175', 'b737'], frequencyPerDay: 3, peakLoadMin: 0.68, peakLoadMax: 0.84, offPeakLoadMin: 0.55, offPeakLoadMax: 0.70 },
  // Southeast
  { destination: 'ATL', airlines: ['AA', 'DL'], aircraftTypes: ['a319', 'a320'],        frequencyPerDay: 6, peakLoadMin: 0.82, peakLoadMax: 0.95, offPeakLoadMin: 0.66, offPeakLoadMax: 0.82 },
  { destination: 'MIA', airlines: ['AA'],        aircraftTypes: ['a319', 'a320', 'a321'], frequencyPerDay: 5, peakLoadMin: 0.78, peakLoadMax: 0.92, offPeakLoadMin: 0.64, offPeakLoadMax: 0.80 },
  { destination: 'MCO', airlines: ['AA', 'WN'], aircraftTypes: ['a319', 'b738'],        frequencyPerDay: 4, peakLoadMin: 0.84, peakLoadMax: 0.96, offPeakLoadMin: 0.70, offPeakLoadMax: 0.86 },
  { destination: 'TPA', airlines: ['AA', 'WN'], aircraftTypes: ['a319', 'b737'],        frequencyPerDay: 3, peakLoadMin: 0.80, peakLoadMax: 0.93, offPeakLoadMin: 0.66, offPeakLoadMax: 0.82 },
  { destination: 'BNA', airlines: ['AA', 'WN'], aircraftTypes: ['crj9', 'a319'],        frequencyPerDay: 3, peakLoadMin: 0.75, peakLoadMax: 0.90, offPeakLoadMin: 0.62, offPeakLoadMax: 0.78 },
  { destination: 'RDU', airlines: ['AA'],        aircraftTypes: ['crj9', 'e175'],        frequencyPerDay: 4, peakLoadMin: 0.72, peakLoadMax: 0.88, offPeakLoadMin: 0.60, offPeakLoadMax: 0.76 },
  // Central / Southwest
  { destination: 'DFW', airlines: ['AA'],        aircraftTypes: ['a319', 'a321', 'b789'], frequencyPerDay: 6, peakLoadMin: 0.82, peakLoadMax: 0.94, offPeakLoadMin: 0.68, offPeakLoadMax: 0.84 },
  { destination: 'DEN', airlines: ['AA', 'F9'], aircraftTypes: ['a319', 'a320'],        frequencyPerDay: 4, peakLoadMin: 0.75, peakLoadMax: 0.88, offPeakLoadMin: 0.62, offPeakLoadMax: 0.78 },
  { destination: 'PHX', airlines: ['AA', 'F9'], aircraftTypes: ['a319', 'a320'],        frequencyPerDay: 3, peakLoadMin: 0.74, peakLoadMax: 0.88, offPeakLoadMin: 0.60, offPeakLoadMax: 0.76 },
  { destination: 'LAS', airlines: ['AA', 'WN'], aircraftTypes: ['a320', 'b738'],        frequencyPerDay: 3, peakLoadMin: 0.82, peakLoadMax: 0.94, offPeakLoadMin: 0.68, offPeakLoadMax: 0.84 },
  // West Coast — long-haul, larger aircraft
  { destination: 'LAX', airlines: ['AA', 'AS'], aircraftTypes: ['a321', 'b789'],        frequencyPerDay: 4, peakLoadMin: 0.85, peakLoadMax: 0.96, offPeakLoadMin: 0.72, offPeakLoadMax: 0.87 },
  { destination: 'SFO', airlines: ['AA', 'UA'], aircraftTypes: ['a321', 'b789'],        frequencyPerDay: 3, peakLoadMin: 0.84, peakLoadMax: 0.95, offPeakLoadMin: 0.70, offPeakLoadMax: 0.85 },
  { destination: 'SEA', airlines: ['AA', 'AS'], aircraftTypes: ['b738', 'a321'],        frequencyPerDay: 2, peakLoadMin: 0.80, peakLoadMax: 0.92, offPeakLoadMin: 0.66, offPeakLoadMax: 0.82 },
  { destination: 'PDX', airlines: ['AA', 'AS'], aircraftTypes: ['b738', 'a321'],        frequencyPerDay: 2, peakLoadMin: 0.76, peakLoadMax: 0.90, offPeakLoadMin: 0.62, offPeakLoadMax: 0.78 },
];
