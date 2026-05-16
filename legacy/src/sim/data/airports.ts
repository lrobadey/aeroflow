/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Airport {
  iata: string;
  city: string;
  state: string;
}

export const HOME_AIRPORT: Airport = {
  iata: 'CLT',
  city: 'Charlotte',
  state: 'NC',
};

export const DESTINATIONS: Airport[] = [
  // Northeast
  { iata: 'JFK', city: 'New York JFK', state: 'NY' },
  { iata: 'LGA', city: 'New York LaGuardia', state: 'NY' },
  { iata: 'BOS', city: 'Boston', state: 'MA' },
  { iata: 'PHL', city: 'Philadelphia', state: 'PA' },
  { iata: 'DCA', city: 'Washington Reagan', state: 'DC' },
  { iata: 'IAD', city: 'Washington Dulles', state: 'VA' },
  // Midwest
  { iata: 'ORD', city: "Chicago O'Hare", state: 'IL' },
  { iata: 'DTW', city: 'Detroit', state: 'MI' },
  { iata: 'MSP', city: 'Minneapolis', state: 'MN' },
  { iata: 'STL', city: 'St. Louis', state: 'MO' },
  { iata: 'MKE', city: 'Milwaukee', state: 'WI' },
  // Southeast
  { iata: 'ATL', city: 'Atlanta', state: 'GA' },
  { iata: 'MIA', city: 'Miami', state: 'FL' },
  { iata: 'TPA', city: 'Tampa', state: 'FL' },
  { iata: 'MCO', city: 'Orlando', state: 'FL' },
  { iata: 'BNA', city: 'Nashville', state: 'TN' },
  { iata: 'RDU', city: 'Raleigh-Durham', state: 'NC' },
  // Central / Southwest
  { iata: 'DFW', city: 'Dallas Fort Worth', state: 'TX' },
  { iata: 'DEN', city: 'Denver', state: 'CO' },
  { iata: 'PHX', city: 'Phoenix', state: 'AZ' },
  { iata: 'LAS', city: 'Las Vegas', state: 'NV' },
  // West Coast
  { iata: 'LAX', city: 'Los Angeles', state: 'CA' },
  { iata: 'SFO', city: 'San Francisco', state: 'CA' },
  { iata: 'SEA', city: 'Seattle', state: 'WA' },
  { iata: 'PDX', city: 'Portland', state: 'OR' },
];

export const DESTINATION_MAP: Record<string, Airport> = Object.fromEntries(
  DESTINATIONS.map(a => [a.iata, a]),
);
