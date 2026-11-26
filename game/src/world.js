// World layout: coast, river, fields, towers, balloons, rings, and the home runway.
import { WORLD } from './config.js';
import { clamp } from './random.js';

export function terrainHeight(x, z) {
  const coast = Math.sin(z * 0.00055) * 420 + Math.sin(z * 0.0017) * 120;
  const shore = x + coast;
  if (shore < -1500) return -8;
  const ridge = Math.max(0, Math.sin(z * 0.0009 + 1.2)) * 95 + Math.max(0, Math.sin(x * 0.0016 + z * 0.0004)) * 55;
  const valley = Math.exp(-Math.pow((x - Math.sin(z * 0.0008) * 500) / 520, 2)) * 42;
  return clamp(6 + ridge - valley, 0, 190);
}
export function terrainKind(x, z) {
  const coast = Math.sin(z * 0.00055) * 420 + Math.sin(z * 0.0017) * 120;
  if (x + coast < -1500) return 'sea';
  if (x + coast < -1180) return 'sand';
  const h = terrainHeight(x, z);
  if (h > 132) return 'snow';
  if (h > 92) return 'rock';
  if (Math.sin(x * 0.004 + z * 0.001) > 0.45) return 'forest';
  return Math.floor((x + 2600) / 520) % 2 === 0 ? 'field' : 'fieldDark';
}
export function createWorld(random) {
  const rings = [];
  for (let i = 0; i < 9; i++) {
    rings.push({ z: 3600 + i * 2150, x: Math.sin(i * 1.35) * 620, y: 190 + (i % 3) * 55, r: 92, hit: false });
  }
  const towers = [];
  for (let i = 0; i < 14; i++) towers.push({ z: 2600 + i * 1650 + random() * 500, x: (random() - 0.5) * 3600, h: 120 + random() * 130 });
  const balloons = [];
  for (let i = 0; i < 7; i++) balloons.push({ z: 5200 + i * 2600, x: (random() - 0.5) * 2400, y: 260 + random() * 180, drift: random() * 6.28 });
  const clouds = [];
  for (let i = 0; i < 26; i++) clouds.push({ z: random() * WORLD.length, x: (random() - 0.5) * 5200, y: 420 + random() * 260, s: 0.7 + random() * 1.4 });
  return { rings, towers, balloons, clouds };
}
export function nextRing(world) { return world.rings.find((ring) => !ring.hit) || null; }
