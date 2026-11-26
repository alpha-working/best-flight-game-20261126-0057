// Renderer: dawn sky, projected terrain, runway, rings, aircraft, cockpit instruments, and HUD.
import { FONT, MISSIONS, PALETTE, VIEW, WORLD } from './config.js';
import { clamp } from './random.js';
import { terrainHeight, terrainKind } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
const COLORS = { sea: PALETTE.sea, sand: PALETTE.sand, field: PALETTE.field, fieldDark: PALETTE.fieldDark, forest: PALETTE.forest, rock: PALETTE.rock, snow: PALETTE.snow };

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    view.x = (canvas.width - VIEW.width * view.scale) / 2;
    view.y = (canvas.height - VIEW.height * view.scale) / 2;
  }
  function text(value, x, y, size, color, align = 'left', weight = 600) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(value, x, y);
  }
  function project(state, x, y, z) {
    const dz = Math.max(60, z - state.z + 420);
    const scale = 760 / dz;
    const horizon = VIEW.horizon - state.pitch * 120;
    return { x: VIEW.width / 2 + (x - state.x) * scale - state.roll * 90, y: horizon + (state.y - y + 120) * scale * 0.72, s: scale, dz };
  }
  function sky(state) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    g.addColorStop(0, PALETTE.skyTop); g.addColorStop(0.48, PALETTE.skyMid); g.addColorStop(0.72, PALETTE.skyLow); g.addColorStop(1, '#f7c98b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = 'rgba(255,244,190,0.95)';
    ctx.beginPath(); ctx.arc(1050, 92, 42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 18; i++) {
      const x = (i * 173 + state.z * 0.01) % 1400 - 60;
      const y = 55 + (i % 5) * 34;
      ctx.beginPath(); ctx.ellipse(x, y, 58, 13, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  function terrain(state) {
    const rows = 26;
    for (let r = rows - 1; r >= 0; r--) {
      const z0 = state.z + r * 260;
      const z1 = z0 + 260;
      for (let c = -8; c < 8; c++) {
        const x0 = c * 420;
        const x1 = x0 + 420;
        const a = project(state, x0, terrainHeight(x0, z0), z0);
        const b = project(state, x1, terrainHeight(x1, z0), z0);
        const c2 = project(state, x1, terrainHeight(x1, z1), z1);
        const d = project(state, x0, terrainHeight(x0, z1), z1);
        ctx.fillStyle = COLORS[terrainKind((x0 + x1) / 2, (z0 + z1) / 2)] || PALETTE.field;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
      }
    }
    // River ribbon and coast sparkle.
    ctx.strokeStyle = 'rgba(120,210,255,0.75)'; ctx.lineWidth = 5; ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const z = state.z + i * 300;
      const p = project(state, Math.sin(z * 0.0008) * 500 - 900, terrainHeight(-900, z) + 3, z);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  function runway(state) {
    const starts = [WORLD.runwayStart, WORLD.finishZ - 1700];
    for (const start of starts) {
      const a = project(state, -95, 5, start);
      const b = project(state, 95, 5, start);
      const c = project(state, 95, 5, start + WORLD.runwayLength);
      const d = project(state, -95, 5, start + WORLD.runwayLength);
      ctx.fillStyle = PALETTE.runway;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(1, a.s * 3);
      ctx.beginPath(); ctx.moveTo((a.x + b.x) / 2, a.y); ctx.lineTo((d.x + c.x) / 2, d.y); ctx.stroke();
      ctx.fillStyle = PALETTE.amber;
      for (let i = 0; i < 8; i++) { const p = project(state, -95, 8, start + i * 260); ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.5, p.s * 5), 0, Math.PI * 2); ctx.fill(); }
    }
  }
  function objects(state, world) {
    for (const ring of world.rings) {
      if (ring.z < state.z - 100 || ring.z > state.z + 9000) continue;
      const p = project(state, ring.x, ring.y, ring.z);
      ctx.strokeStyle = ring.hit ? PALETTE.green : PALETTE.amber;
      ctx.lineWidth = Math.max(2, p.s * 10);
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(8, ring.r * p.s), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; text(ring.hit ? '✓' : '◎', p.x, p.y, Math.max(12, p.s * 28), PALETTE.white, 'center', 800);
    }
    for (const tower of world.towers) {
      if (tower.z < state.z || tower.z > state.z + 7000) continue;
      const base = project(state, tower.x, terrainHeight(tower.x, tower.z), tower.z);
      const top = project(state, tower.x, tower.h, tower.z);
      ctx.strokeStyle = '#5b4636'; ctx.lineWidth = Math.max(1, base.s * 5);
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      ctx.fillStyle = PALETTE.red; ctx.beginPath(); ctx.arc(top.x, top.y, Math.max(2, top.s * 7), 0, Math.PI * 2); ctx.fill();
    }
    for (const balloon of world.balloons) {
      if (balloon.z < state.z || balloon.z > state.z + 8000) continue;
      const p = project(state, balloon.x + Math.sin(state.time * 0.4 + balloon.drift) * 30, balloon.y, balloon.z);
      ctx.fillStyle = '#ff7a59'; ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(5, p.s * 34), Math.max(7, p.s * 46), 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6b4226'; ctx.fillRect(p.x - p.s * 8, p.y + p.s * 42, p.s * 16, p.s * 12);
    }
  }
  function aircraft(state) {
    const cx = VIEW.width / 2;
    const cy = state.camera === 'cockpit' ? 560 : 500 + state.pitch * 30;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(state.roll * 0.55);
    if (state.camera === 'cockpit') {
      ctx.fillStyle = '#16283d'; ctx.fillRect(-430, 54, 860, 150);
      ctx.fillStyle = '#223a56'; ctx.fillRect(-360, 72, 720, 92);
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? PALETTE.cyan : PALETTE.amber; ctx.beginPath(); ctx.arc(-240 + i * 120, 116, 28, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-430, 54); ctx.lineTo(-120, -70); ctx.lineTo(120, -70); ctx.lineTo(430, 54); ctx.stroke();
    } else {
      ctx.fillStyle = '#e8eef4'; ctx.beginPath(); ctx.ellipse(0, 18, 54, 96, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2f6f9f'; ctx.beginPath(); ctx.moveTo(-250, 34); ctx.lineTo(-44, -8); ctx.lineTo(44, -8); ctx.lineTo(250, 34); ctx.lineTo(210, 58); ctx.lineTo(-210, 58); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffb340'; ctx.fillRect(-18, -92, 36, 70);
      ctx.fillStyle = '#17324d'; ctx.beginPath(); ctx.ellipse(0, -28, 30, 42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(20,30,40,0.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 112, 54, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  function gauge(x, y, label, value, max, color) {
    ctx.fillStyle = PALETTE.panel; ctx.fillRect(x, y, 178, 58);
    ctx.strokeStyle = PALETTE.line; ctx.strokeRect(x, y, 178, 58);
    text(label, x + 10, y + 16, 15, '#bcd6ea', 'left', 700);
    text(value, x + 168, y + 16, 19, PALETTE.white, 'right', 800);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 10, y + 38, 158, 8);
    ctx.fillStyle = color; ctx.fillRect(x + 10, y + 38, 158 * clamp(value / max, 0, 1), 8);
  }
  function hud(state) {
    const alt = Math.max(0, Math.round(state.y * 3.2));
    const spd = Math.round(state.speed);
    const hdg = String(Math.round(((state.heading * 180 / Math.PI) % 360 + 360) % 360)).padStart(3, '0');
    gauge(22, 20, 'ALT ft', alt, 1600, PALETTE.cyan);
    gauge(22, 88, 'SPD kt', spd, 240, PALETTE.green);
    gauge(1080, 20, 'HDG', hdg, 360, PALETTE.amber);
    gauge(1080, 88, 'FUEL', Math.round(state.fuel), 100, state.fuel < 25 ? PALETTE.red : PALETTE.amber);
    gauge(1080, 156, 'DAMAGE', Math.round(state.damage), 100, PALETTE.red);
    ctx.fillStyle = PALETTE.panel; ctx.fillRect(430, 18, 420, 64); ctx.strokeStyle = PALETTE.line; ctx.strokeRect(430, 18, 420, 64);
    text(MISSIONS[state.mission].name, 640, 38, 22, PALETTE.white, 'center', 800);
    text(`Rings ${state.ringsHit}/9 · Score ${Math.floor(state.score)} · ${state.message}`, 640, 64, 16, '#d7e9f7', 'center', 600);
    // Artificial horizon.
    ctx.save(); ctx.translate(640, 132); ctx.rotate(-state.roll * 0.7);
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#69b7e8'; ctx.fillRect(-40, -40, 80, 40); ctx.fillStyle = '#8a6b45'; ctx.fillRect(-40, 0, 80, 40);
    ctx.strokeStyle = PALETTE.white; ctx.beginPath(); ctx.moveTo(-40, state.pitch * 34); ctx.lineTo(40, state.pitch * 34); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(640, 132, 36, 0, Math.PI * 2); ctx.stroke();
  }
  function panel(title, lines, prompt) {
    ctx.fillStyle = 'rgba(5,16,30,0.72)'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = PALETTE.panel; ctx.fillRect(290, 150, 700, 420); ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 2; ctx.strokeRect(290, 150, 700, 420);
    text(title, 640, 215, 52, PALETTE.white, 'center', 900);
    lines.forEach((line, i) => text(line, 640, 285 + i * 38, 23, '#d7e9f7', 'center', 600));
    text(prompt, 640, 515, 24, PALETTE.amber, 'center', 800);
  }
  function draw(state, world, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0b1626'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    sky(state); terrain(state); runway(state); objects(state, world); aircraft(state); hud(state);
    if (screen === SCREEN_TITLE) panel('Skyline Courier', ['Dawn Run over coast, river, and ridge.', 'W/S throttle · Arrows pitch · A/D roll · Mouse steers', 'C cockpit/chase · M mission · P pause', `Best score ${best}`], 'Press Space or click to fly');
    if (screen === SCREEN_PAUSED) panel('Paused', ['The dawn waits.'], 'Press P to resume');
    if (screen === SCREEN_OVER) panel(state.landed ? 'Sortie Complete' : 'Flight Ended', [`Score ${Math.floor(state.score)}`, `Rings ${state.ringsHit}/9 · Fuel ${Math.round(state.fuel)} · Damage ${Math.round(state.damage)}`, state.message], 'Press Space to fly again');
  }
  resize(); window.addEventListener('resize', resize);
  return { draw };
}
