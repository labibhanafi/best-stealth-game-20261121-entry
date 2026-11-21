// Lantern Heist — canvas renderer.
// Paints the museum at night: checkerboard floor, lantern light pools,
// crates and bushes you can read at a glance, guards with bright vision
// cones (yellow calm, orange suspicious, red alarm), a glowing green exit,
// and a HUD with the alert meter, gems, pebbles and lives.
import { CANVAS_H, CANVAS_W, COLS, GUARD_VIEW_DIST, HUD_H, ROWS, TILE } from './config.js';
import { isBush, isShadow } from './levels.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_INTRO = 'intro';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

function coneColor(guard, alarm) {
  if (alarm > 0 || guard.state === 'chase') return { fill: 'rgba(255, 64, 48, 0.42)', edge: 'rgba(255, 90, 70, 0.9)' };
  if (guard.state === 'suspicious' || guard.state === 'search' || guard.suspicion > 35) {
    return { fill: 'rgba(255, 166, 40, 0.38)', edge: 'rgba(255, 180, 60, 0.85)' };
  }
  return { fill: 'rgba(255, 214, 90, 0.30)', edge: 'rgba(255, 220, 110, 0.7)' };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  function drawFloor(state) {
    for (let ty = 0; ty < ROWS; ty += 1) {
      for (let tx = 0; tx < COLS; tx += 1) {
        const x = tx * TILE;
        const y = HUD_H + ty * TILE;
        const ch = state.grid[ty][tx];
        if (ch === '#') {
          ctx.fillStyle = '#232a3a';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#313b52';
          ctx.fillRect(x, y, TILE, 5);
          ctx.fillStyle = '#171c28';
          ctx.fillRect(x, y + TILE - 4, TILE, 4);
          continue;
        }
        const even = (tx + ty) % 2 === 0;
        ctx.fillStyle = even ? '#2b3247' : '#272e42';
        ctx.fillRect(x, y, TILE, TILE);
        if (ch === 'S') {
          ctx.fillStyle = 'rgba(10, 14, 30, 0.55)';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = 'rgba(120, 150, 255, 0.16)';
          ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        }
        if (ch === 'B') {
          ctx.fillStyle = '#1d3a24';
          ctx.fillRect(x, y, TILE, TILE);
        }
        if (ch === 'C') {
          ctx.fillStyle = '#4a3421';
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          ctx.strokeStyle = '#6b4c2f';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 5, y + 5, TILE - 10, TILE - 10);
          ctx.beginPath();
          ctx.moveTo(x + 5, y + 5);
          ctx.lineTo(x + TILE - 5, y + TILE - 5);
          ctx.moveTo(x + TILE - 5, y + 5);
          ctx.lineTo(x + 5, y + TILE - 5);
          ctx.stroke();
        }
      }
    }
  }

  function drawLightPools(state, now) {
    // A few warm lantern pools so the dark floor reads as a museum at night.
    const pools = [
      { x: 200, y: HUD_H + 120 }, { x: 640, y: HUD_H + 300 },
      { x: 1080, y: HUD_H + 120 }, { x: 420, y: HUD_H + 620 },
      { x: 940, y: HUD_H + 620 },
    ];
    for (const pool of pools) {
      const flicker = 0.85 + Math.sin(now / 700 + pool.x) * 0.05;
      const r = 150 * flicker;
      const g = ctx.createRadialGradient(pool.x, pool.y, 8, pool.x, pool.y, r);
      g.addColorStop(0, 'rgba(255, 196, 90, 0.13)');
      g.addColorStop(1, 'rgba(255, 196, 90, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(pool.x - r, pool.y - r, r * 2, r * 2);
    }
  }

  function drawGems(state, now) {
    for (const gem of state.gems) {
      if (gem.taken) continue;
      const bob = Math.sin(now / 350 + gem.px) * 3;
      const gx = gem.px;
      const gy = gem.py + bob;
      const glow = ctx.createRadialGradient(gx, gy, 2, gx, gy, 26);
      glow.addColorStop(0, 'rgba(80, 220, 255, 0.5)');
      glow.addColorStop(1, 'rgba(80, 220, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(gx - 26, gy - 26, 52, 52);
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#5ee6ff';
      ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = '#b8f4ff';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
  }

  function drawExit(state, now) {
    const pulse = 0.5 + Math.sin(now / 300) * 0.18;
    const { x, y } = state.exit;
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 64);
    glow.addColorStop(0, `rgba(80, 255, 140, ${0.45 * pulse + 0.2})`);
    glow.addColorStop(1, 'rgba(80, 255, 140, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 64, y - 64, 128, 128);
    ctx.fillStyle = '#0d3a1e';
    ctx.fillRect(x - 17, y - 19, 34, 38);
    ctx.strokeStyle = '#54ff8f';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 17, y - 19, 34, 38);
    ctx.fillStyle = '#54ff8f';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', x, y + 4);
    ctx.beginPath();
    ctx.arc(x, y, 26 + Math.sin(now / 300) * 3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(84, 255, 143, ${0.5 * pulse + 0.2})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawCones(state, conePolys) {
    for (let i = 0; i < state.guards.length; i += 1) {
      const guard = state.guards[i];
      const poly = conePolys[i];
      if (!poly || poly.length < 3) continue;
      const c = coneColor(guard, state.alarmT);
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let k = 1; k < poly.length; k += 1) ctx.lineTo(poly[k].x, poly[k].y);
      ctx.closePath();
      ctx.fillStyle = c.fill;
      ctx.fill();
      ctx.strokeStyle = c.edge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawGuard(guard, now) {
    const alerted = guard.state === 'chase' || guard.state === 'search';
    // Body: a night-watchman in a dark red coat, helmet catching the light.
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
    ctx.fillStyle = alerted ? '#a1271f' : '#7a2b24';
    ctx.fill();
    ctx.strokeStyle = '#e8b64c';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#e8c96a';
    ctx.fill();
    // Facing tick.
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * 20, guard.y + Math.sin(guard.angle) * 20);
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Suspicion arc + mark above the head.
    if (guard.suspicion > 4) {
      const frac = guard.suspicion / 100;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y - 20, 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.strokeStyle = frac > 0.7 ? '#ff4030' : '#ffb43c';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (guard.state === 'chase' || guard.suspicion >= 100) {
      ctx.fillStyle = '#ff4030';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - 30);
    } else if (guard.suspicion > 35 || guard.state === 'suspicious') {
      ctx.fillStyle = '#ffb43c';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', guard.x, guard.y - 30);
    }
  }

  function drawPlayer(state, now) {
    const p = state.player;
    const { tx, ty } = { tx: Math.floor(p.x / TILE), ty: Math.floor((p.y - HUD_H) / TILE) };
    const hidden = isBush(state.grid, tx, ty);
    // Lantern glow around the thief.
    const glow = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 70);
    glow.addColorStop(0, 'rgba(255, 200, 100, 0.20)');
    glow.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - 70, p.y - 70, 140, 140);
    ctx.save();
    if (hidden) ctx.globalAlpha = 0.85;
    // Cloak.
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.sneaking ? 11 : 13, 0, Math.PI * 2);
    ctx.fillStyle = '#2f7f6f';
    ctx.fill();
    ctx.strokeStyle = '#8ff5dd';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Hood + face.
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#123b32';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.angle) * 6, p.y + Math.sin(p.angle) * 6, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe9a8';
    ctx.fill();
    ctx.restore();
    if (p.sneaking) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(143, 245, 221, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (hidden) {
      // A few leaves over the thief's edges: visible, but clearly inside the bush.
      ctx.fillStyle = '#2c5a34';
      for (const [ox, oy, r] of [[-9, -9, 6], [9, -8, 5], [-10, 8, 5], [10, 9, 4]]) {
        ctx.beginPath();
        ctx.arc(p.x + ox, p.y + oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawBushCanopy(state) {
    // Leaves over anyone standing in a bush, so hiding reads as hiding.
    for (let ty = 0; ty < ROWS; ty += 1) {
      for (let tx = 0; tx < COLS; tx += 1) {
        if (state.grid[ty][tx] !== 'B') continue;
        const x = tx * TILE;
        const y = HUD_H + ty * TILE;
        ctx.fillStyle = '#2c5a34';
        for (const [ox, oy, r] of [[10, 12, 9], [24, 8, 10], [30, 22, 9], [12, 28, 8], [26, 32, 7]]) {
          ctx.beginPath();
          ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#3f7d47';
        for (const [ox, oy, r] of [[16, 10, 5], [28, 16, 5], [10, 24, 4]]) {
          ctx.beginPath();
          ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawNoises(state) {
    for (const n of state.noises) {
      const frac = 1 - n.ttl / 0.9;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 8 + frac * n.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 230, 140, ${0.7 * (1 - frac)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawHud(state, view, now) {
    ctx.fillStyle = '#10141f';
    ctx.fillRect(0, 0, CANVAS_W, HUD_H);
    ctx.fillStyle = '#1d2436';
    ctx.fillRect(0, HUD_H - 2, CANVAS_W, 2);
    ctx.fillStyle = '#e8ecf5';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(state.levelName, 16, 26);
    ctx.fillStyle = '#9aa7c4';
    ctx.font = '13px sans-serif';
    ctx.fillText(state.levelSub, 16, 46);
    // Gems.
    ctx.fillStyle = '#5ee6ff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`◆ ${state.gemsGot}/${state.gemsTotal}`, 470, 26);
    ctx.fillStyle = '#9aa7c4';
    ctx.font = '13px sans-serif';
    ctx.fillText(`Pebbles ${state.pebbles} (click to throw)`, 470, 46);
    // Lives.
    ctx.font = '17px sans-serif';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('♥'.repeat(Math.max(0, state.lives)), 640, 26);
    ctx.fillStyle = '#9aa7c4';
    ctx.font = '13px sans-serif';
    ctx.fillText(state.player.sneaking ? 'SNEAKING — slow & quiet' : 'WASD move · Shift sneak', 640, 46);
    // Alert meter.
    const alert = Math.max(0, ...state.guards.map((g) => g.suspicion));
    const ax = 880;
    ctx.fillStyle = '#9aa7c4';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(state.alarmT > 0 ? 'ALARM!' : 'ALERT', ax, 20);
    ctx.fillStyle = '#222a3d';
    ctx.fillRect(ax, 26, 180, 12);
    ctx.fillStyle = state.alarmT > 0 ? '#ff4030' : alert > 35 ? '#ffb43c' : '#ffd65a';
    ctx.fillRect(ax, 26, 180 * (alert / 100), 12);
    ctx.strokeStyle = '#3a4560';
    ctx.strokeRect(ax, 26, 180, 12);
    // Score + time.
    ctx.fillStyle = '#e8ecf5';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Score ${state.score}`, CANVAS_W - 16, 26);
    ctx.fillStyle = '#9aa7c4';
    ctx.font = '13px sans-serif';
    const mins = Math.floor(state.levelTime / 60);
    const secs = Math.floor(state.levelTime % 60);
    ctx.fillText(`Time ${mins}:${String(secs).padStart(2, '0')}  ·  Best ${view.best}`, CANVAS_W - 16, 46);
    ctx.textAlign = 'left';
    // Bottom hint lip.
    ctx.fillStyle = '#10141f';
    ctx.fillRect(0, CANVAS_H - 16, CANVAS_W, 16);
    ctx.fillStyle = '#7c8aa8';
    ctx.font = '11px sans-serif';
    ctx.fillText('Steal gems, reach the green EXIT unseen. Bushes hide you · shadows slow detection · running is loud · Shift sneaks.', 12, CANVAS_H - 4);
  }

  function panel(title, lines, accent) {
    ctx.fillStyle = 'rgba(8, 10, 18, 0.72)';
    ctx.fillRect(0, HUD_H, CANVAS_W, CANVAS_H - HUD_H - 16);
    const w = 640;
    const h = 92 + lines.length * 30;
    const x = (CANVAS_W - w) / 2;
    const y = (CANVAS_H - h) / 2;
    ctx.fillStyle = '#141a29';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = accent;
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, CANVAS_W / 2, y + 48);
    ctx.fillStyle = '#dfe6f5';
    ctx.font = '16px sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, CANVAS_W / 2, y + 88 + i * 30));
    ctx.textAlign = 'left';
  }

  function drawTitle(state, view, now) {
    ctx.fillStyle = '#0c0f18';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Title over a live museum: draw the level dimmed behind the panel.
    ctx.save();
    ctx.globalAlpha = 0.45;
    drawFloor(state);
    drawLightPools(state, now);
    drawGems(state, now);
    drawExit(state, now);
    ctx.restore();
    ctx.fillStyle = 'rgba(8, 10, 18, 0.55)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd65a';
    ctx.font = 'bold 58px sans-serif';
    ctx.fillText('LANTERN HEIST', CANVAS_W / 2, 190);
    ctx.fillStyle = '#8ff5dd';
    ctx.font = '20px sans-serif';
    ctx.fillText('A stealth game in the Ember Museum — steal, hide, vanish.', CANVAS_W / 2, 228);
    ctx.fillStyle = '#dfe6f5';
    ctx.font = '17px sans-serif';
    const lines = [
      'You are Wren, a thief after the Ember Star. Three wings, up to five guards a wing.',
      'WASD / arrows to move · Shift to sneak · Click to throw a pebble and lure a guard.',
      'Stay out of the yellow cones. Bushes hide you, shadows slow their eyes,',
      'running is loud. Reach the green EXIT unseen — gems are a bonus.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, CANVAS_W / 2, 300 + i * 28));
    ctx.fillStyle = '#ffd65a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(now % 1000 < 500 ? 'Press ENTER or click to begin' : ' ', CANVAS_W / 2, 470);
    ctx.fillStyle = '#9aa7c4';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Best score ${view.best}   ·   P pause · R restart level · M mute`, CANVAS_W / 2, 510);
    ctx.textAlign = 'left';
  }

  return {
    draw(state, view, now, conePolys) {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      if (view.screen === SCREEN_TITLE) {
        drawTitle(state, view, now);
        return;
      }
      drawFloor(state);
      drawLightPools(state, now);
      drawGems(state, now);
      drawExit(state, now);
      drawCones(state, conePolys);
      for (const guard of state.guards) drawGuard(guard, now);
      drawBushCanopy(state);
      drawPlayer(state, now);
      drawNoises(state);
      drawHud(state, view, now);
      if (view.screen === SCREEN_INTRO) {
        panel(state.levelName, [state.levelSub, 'Press ENTER to slip in.'], '#8ff5dd');
      } else if (view.screen === SCREEN_PAUSED) {
        panel('PAUSED', ['The guards wait. Press P or ENTER to keep sneaking.'], '#9aa7c4');
      } else if (view.screen === SCREEN_CAUGHT) {
        panel('CAUGHT!', [
          `A guard grabbed Wren. ${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left.`,
          'Press ENTER to try this wing again.',
        ], '#ff4030');
      } else if (view.screen === SCREEN_CLEAR) {
        panel('WING CLEARED — UNSEEN', [
          view.clearLine || '',
          `Score ${state.score} · Gems ${state.gemsGot}/${state.gemsTotal}`,
          'Press ENTER for the next wing.',
        ], '#54ff8f');
      } else if (view.screen === SCREEN_WIN) {
        panel('THE EMBER STAR IS YOURS', [
          `Final score ${state.score} · Best ${view.best}`,
          'Wren slipped out into the night, unseen by every guard.',
          'Press ENTER to play again.',
        ], '#ffd65a');
      } else if (view.screen === SCREEN_OVER) {
        panel('THE HEIST IS OVER', [
          `Final score ${state.score} · Best ${view.best}`,
          'The museum keeps its Star — this time. Press ENTER to retry.',
        ], '#ff4030');
      }
    },
  };
}
