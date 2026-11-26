// Flight model: throttle, pitch, roll, lift, stall, fuel, damage, rings, and landing judgement.
import { PLANE, WORLD } from './config.js';
import { clamp } from './random.js';
import { terrainHeight } from './world.js';

export const EVENT_RING = 1;
export const EVENT_HIT = 2;
export const EVENT_LANDED = 4;
export const EVENT_CRASH = 8;
export const EVENT_STALL = 16;

export function createFlight() {
  const state = {
    x: 0, y: 4, z: 500, speed: 0, throttle: 0, pitch: 0, roll: 0, heading: 0,
    vy: 0, fuel: PLANE.fuelCapacity, damage: 0, score: 0, ringsHit: 0, time: 0,
    airborne: false, landed: false, crashed: false, message: 'Throttle up with W. Rotate near 70 kt.',
    mission: 0, camera: 'chase', gust: 0,
  };
  function reset(mission = 0) {
    Object.assign(state, { x: 0, y: 4, z: 500, speed: 0, throttle: 0, pitch: 0, roll: 0, heading: 0, vy: 0, fuel: PLANE.fuelCapacity, damage: 0, score: 0, ringsHit: 0, time: 0, airborne: false, landed: false, crashed: false, mission, gust: 0 });
    state.message = mission === 2 ? 'Storm gusts ahead. Keep the nose honest.' : 'Throttle up with W. Rotate near 70 kt.';
  }
  function step(dt, input, world) {
    if (state.landed || state.crashed) return 0;
    let events = 0;
    state.time += dt;
    state.gust = state.mission === 2 ? Math.sin(state.time * 0.9) * 0.16 + Math.sin(state.time * 2.7) * 0.05 : Math.sin(state.time * 0.35) * 0.015;
    state.throttle = clamp(state.throttle + input.throttle * dt * 0.55, 0, 1);
    state.pitch = clamp(state.pitch + input.pitch * PLANE.pitchRate * dt, -0.42, 0.48);
    state.roll = clamp(state.roll + input.roll * PLANE.rollRate * dt - state.roll * dt * 1.7, -0.85, 0.85);
    state.heading += (state.roll * PLANE.yawFromRoll + state.gust * 0.25) * dt;
    const thrust = state.fuel > 0 ? state.throttle * 58 : 0;
    const drag = PLANE.drag * state.speed * state.speed + Math.abs(state.pitch) * 3.2;
    state.speed = clamp(state.speed + (thrust - drag - state.pitch * 18) * dt, 0, PLANE.maxSpeed);
    state.fuel = clamp(state.fuel - state.throttle * PLANE.fuelBurn * dt * (state.mission === 1 ? 1.25 : 1), 0, PLANE.fuelCapacity);
    const lift = PLANE.lift * state.speed * state.speed * Math.cos(state.roll);
    const targetVy = clamp((lift - PLANE.gravity) * 0.055 + state.pitch * state.speed * 0.055, -34, 34);
    state.vy += (targetVy - state.vy) * Math.min(1, dt * 2.4);
    if (state.speed < PLANE.stallSpeed && state.airborne) { events |= EVENT_STALL; state.message = 'Stall warning — lower the nose, add power.'; }
    const forward = state.speed * 2.35 * dt;
    state.z += forward * Math.cos(state.heading);
    state.x += forward * Math.sin(state.heading) + state.gust * forward * 0.35;
    state.y += state.vy * dt;
    const ground = terrainHeight(state.x, state.z) + 4;
    if (!state.airborne && state.y > ground + 2 && state.speed > 62) { state.airborne = true; state.message = 'Airborne. Chase the amber rings.'; }
    for (const ring of world.rings) {
      if (!ring.hit && Math.abs(state.z - ring.z) < 55 && Math.hypot(state.x - ring.x, state.y - ring.y) < ring.r) {
        ring.hit = true; state.ringsHit += 1; state.score += 250; events |= EVENT_RING; state.message = `Ring ${state.ringsHit} clean. +250`;
      }
    }
    for (const tower of world.towers) {
      if (Math.abs(state.z - tower.z) < 36 && Math.abs(state.x - tower.x) < 34 && state.y < tower.h) {
        state.damage = clamp(state.damage + 34, 0, PLANE.damageLimit); events |= EVENT_HIT; state.message = 'Tower strike! Damage rising.';
      }
    }
    if (state.y <= ground) {
      const onRunway = Math.abs(state.x) < 95 && ((state.z > WORLD.runwayStart && state.z < WORLD.runwayStart + WORLD.runwayLength) || state.z > WORLD.finishZ - 1700);
      const gentle = state.vy > -9 && Math.abs(state.roll) < 0.24 && state.speed < 150;
      state.y = ground;
      if (state.airborne && onRunway && gentle && state.ringsHit >= 5) {
        state.landed = true; state.score += Math.round(state.fuel * 4 + (100 - state.damage) * 3); events |= EVENT_LANDED; state.message = 'Touchdown. Dawn run complete.';
      } else if (state.airborne) {
        state.crashed = true; state.damage = PLANE.damageLimit; events |= EVENT_CRASH; state.message = onRunway ? 'Hard arrival. The gear folds.' : 'Terrain wins this round.';
      } else {
        state.vy = 0; state.pitch = Math.max(0, state.pitch);
      }
    }
    if (state.damage >= PLANE.damageLimit && !state.landed) { state.crashed = true; events |= EVENT_CRASH; }
    state.score += dt * (state.airborne ? 2 : 0);
    return events;
  }
  return { state, reset, step };
}
