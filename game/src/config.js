// Skyline Courier: Dawn Run — tuning, palette, and mission constants.
export const VIEW = { width: 1280, height: 720, horizon: 318 };
export const STEP = 1 / 60;
export const WORLD = { length: 26000, width: 5200, runwayStart: 900, runwayLength: 2100, finishZ: 23800 };
export const PLANE = {
  stallSpeed: 54, maxSpeed: 238, cruiseThrottle: 0.62,
  pitchRate: 0.72, rollRate: 1.85, yawFromRoll: 0.46,
  lift: 0.0115, drag: 0.00042, gravity: 9.8,
  fuelCapacity: 100, fuelBurn: 0.42, damageLimit: 100,
};
export const MISSIONS = [
  { id: 'rings', name: 'Ring Run', brief: 'Thread every dawn ring, then land home.' },
  { id: 'coast', name: 'Coast Delivery', brief: 'Carry the parcel low along the coast; speed costs fuel.' },
  { id: 'storm', name: 'Storm Landing', brief: 'Crosswind gusts push the nose; bring her down gently.' },
];
export const PALETTE = {
  skyTop: '#79b7e8', skyMid: '#cfe8f7', skyLow: '#ffe3ae',
  sea: '#2e7fb8', seaDeep: '#1d5f94', sand: '#e8cf9a',
  field: '#7fae56', fieldDark: '#5d8f43', forest: '#38684a',
  rock: '#8a7f74', snow: '#f4f7f7', runway: '#39424e',
  ink: '#10233a', panel: 'rgba(8,22,38,0.78)', line: 'rgba(255,255,255,0.35)',
  amber: '#ffb340', red: '#e5534b', green: '#57d977', cyan: '#63e2ff', white: '#ffffff',
};
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'skyline-courier.best';
