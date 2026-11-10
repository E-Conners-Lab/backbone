// Region data (constitution C6): content, not logic. Coordinates are city-centre approximations.
import type { Region } from "../sim/world";

export const REGION_NA: Region = {
  id: "na",
  name: "North America",
  sites: [
    { code: "SEA", name: "Seattle", lon: -122.33, lat: 47.61, weight: 2 },
    { code: "SFO", name: "San Francisco", lon: -122.42, lat: 37.77, weight: 3 },
    { code: "LAX", name: "Los Angeles", lon: -118.24, lat: 34.05, weight: 3 },
    { code: "PHX", name: "Phoenix", lon: -112.07, lat: 33.45, weight: 2 },
    { code: "SLC", name: "Salt Lake City", lon: -111.89, lat: 40.76, weight: 1 },
    { code: "DEN", name: "Denver", lon: -104.99, lat: 39.74, weight: 2 },
    { code: "DFW", name: "Dallas", lon: -96.8, lat: 32.78, weight: 3 },
    { code: "HOU", name: "Houston", lon: -95.37, lat: 29.76, weight: 2 },
    { code: "MSP", name: "Minneapolis", lon: -93.27, lat: 44.98, weight: 1 },
    { code: "MCI", name: "Kansas City", lon: -94.58, lat: 39.1, weight: 1 },
    { code: "CHI", name: "Chicago", lon: -87.63, lat: 41.88, weight: 3 },
    { code: "ATL", name: "Atlanta", lon: -84.39, lat: 33.75, weight: 3 },
    { code: "MIA", name: "Miami", lon: -80.19, lat: 25.76, weight: 2 },
    { code: "IAD", name: "Washington", lon: -77.04, lat: 38.91, weight: 3 },
    { code: "NYC", name: "New York", lon: -74.01, lat: 40.71, weight: 3 },
    { code: "BOS", name: "Boston", lon: -71.06, lat: 42.36, weight: 2 },
    { code: "YYZ", name: "Toronto", lon: -79.38, lat: 43.65, weight: 2 },
    { code: "YUL", name: "Montreal", lon: -73.57, lat: 45.5, weight: 1 },
  ],
};
