// Screenshot staging: deterministic scenes rendered by the real flight model and renderer.
import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { nextRing } from './world.js';

function autopilot(state, world) {
  const ring = nextRing(world);
  const targetX = ring ? ring.x : 0;
  const targetY = ring ? ring.y : 150;
  return {
    throttle: state.speed < 150 ? 1 : 0.25,
    pitch: state.y < targetY - 25 ? 0.75 : state.y > targetY + 35 ? -0.55 : 0.05,
    roll: Math.max(-1, Math.min(1, (targetX - state.x) / 420 - state.roll * 0.6)),
  };
}
export function stageShot(name, flight, world) {
  flight.reset(name === 'storm' ? 2 : 0);
  const state = flight.state;
  if (name === 'start') {
    state.throttle = 0.68; state.speed = 152; state.y = 238; state.z = 4300; state.x = -180; state.airborne = true; state.ringsHit = 1; state.score = 410; state.fuel = 88; state.message = 'Dawn ring ahead.';
    world.rings[0].hit = true;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'cockpit') {
    state.camera = 'cockpit'; state.z = 7600; state.y = 255; state.speed = 164; state.throttle = 0.66; state.airborne = true; state.ringsHit = 3; state.score = 820;
    world.rings.slice(0, 3).forEach((ring) => { ring.hit = true; });
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'landing') {
    state.z = 22400; state.y = 150; state.speed = 118; state.throttle = 0.28; state.airborne = true; state.ringsHit = 7; state.score = 1980; state.fuel = 46; state.message = 'Final approach. Gentle hands.';
    world.rings.slice(0, 7).forEach((ring) => { ring.hit = true; });
    return { screen: SCREEN_PLAY, best: 0 };
  }
  for (let i = 0; i < 26 / STEP; i++) flight.step(STEP, autopilot(state, world), world);
  return { screen: state.crashed || state.landed ? SCREEN_OVER : SCREEN_PLAY, best: Math.floor(state.score) };
}
