// Boot and fixed-step loop for Skyline Courier: Dawn Run.
import { BEST_KEY, STEP } from './config.js';
import { createFlight, EVENT_CRASH, EVENT_LANDED, EVENT_RING } from './flight.js';
import { ACTION_CAMERA, ACTION_CONFIRM, ACTION_MISSION, ACTION_PAUSE, createInput } from './input.js';
import { createRandom } from './random.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { createWorld } from './world.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261126;
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const flight = createFlight();
const renderer = createRenderer(canvas);

function readBest() { try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; } }
function saveBest(value) { try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* private mode */ } }
function runShot(name) {
  const scene = stageShot(name, flight, world);
  let painted = 0;
  const paint = () => {
    renderer.draw(flight.state, world, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      if (params.get('export') === '1') document.body.textContent = canvas.toDataURL('image/png');
    }
  };
  requestAnimationFrame(paint);
}
function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let mission = 0;
  let accumulator = 0;
  let last = performance.now();
  const announce = (message) => { status.textContent = message; };
  function start() { flight.reset(mission); world.rings.forEach((ring) => { ring.hit = false; }); screen = SCREEN_PLAY; announce('Flight started. Throttle up.'); }
  function finish() { screen = SCREEN_OVER; if (flight.state.score > best) { best = Math.floor(flight.state.score); saveBest(best); } announce(flight.state.landed ? 'Sortie complete.' : 'Flight ended.'); }
  function actions() {
    const a = input.takeActions();
    if (a & ACTION_CAMERA) flight.state.camera = flight.state.camera === 'chase' ? 'cockpit' : 'chase';
    if (a & ACTION_MISSION) { mission = (mission + 1) % 3; flight.state.mission = mission; flight.state.message = ['Ring Run selected.', 'Coast Delivery selected.', 'Storm Landing selected.'][mission]; announce(flight.state.message); }
    if (a & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) start();
    else if (a & ACTION_PAUSE && screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
    else if (a & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME); last = now; actions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        const events = flight.step(STEP, input.read(), world);
        if (events & EVENT_RING) announce(flight.state.message);
        if (events & (EVENT_LANDED | EVENT_CRASH)) finish();
        accumulator -= STEP;
      }
    } else accumulator = 0;
    renderer.draw(flight.state, world, screen, best);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === SCREEN_PLAY) screen = SCREEN_PAUSED; });
  announce('Skyline Courier. Press Space or click to fly.');
  requestAnimationFrame(frame);
}
if (shot) runShot(shot); else runGame();
