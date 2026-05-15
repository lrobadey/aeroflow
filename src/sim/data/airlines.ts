/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Airline {
  iata: string;
  name: string;
  fleetTypes: string[];
}

export const AIRLINES: Record<string, Airline> = {
  AA: { iata: 'AA', name: 'American Airlines',  fleetTypes: ['crj9', 'e175', 'a319', 'a320', 'a321', 'b789'] },
  DL: { iata: 'DL', name: 'Delta Air Lines',     fleetTypes: ['crj9', 'a320', 'b738'] },
  UA: { iata: 'UA', name: 'United Airlines',     fleetTypes: ['e175', 'a319', 'b738'] },
  WN: { iata: 'WN', name: 'Southwest Airlines',  fleetTypes: ['b737', 'b738'] },
  B6: { iata: 'B6', name: 'JetBlue Airways',     fleetTypes: ['a320', 'a321'] },
  AS: { iata: 'AS', name: 'Alaska Airlines',     fleetTypes: ['b738', 'a321'] },
  F9: { iata: 'F9', name: 'Frontier Airlines',   fleetTypes: ['a319', 'a320'] },
};
