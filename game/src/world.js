// Lantern Heist — the world: player movement, guard patrols, vision cones,
// line of sight, suspicion, alarm and chase, noise, gems and the exit.
// Guards think in states: patrol -> suspicious -> chase (alarm) -> search -> return.
import {
  ALARM_SECONDS, BUSH_HIDE_RANGE, CAUGHT_RADIUS, DETECT_BASE_RATE,
  DETECT_CLOSE_RANGE, DETECT_DECAY_RATE, GEM_SCORE, GHOST_BONUS,
  GUARD_CHASE_SPEED, GUARD_PATROL_SPEED, GUARD_SEARCH_SPEED,
  GUARD_VIEW_DIST, GUARD_VIEW_HALF_ANGLE, HUD_H, LEVEL_CLEAR_SCORE,
  LIVES_START, MOVING_RATE, NOISE_HEAR_RANGE, NOISE_PEBBLE_RADIUS,
  NOISE_WALK_RADIUS, PEBBLES_START, PLAYER_RADIUS, PLAYER_SNEAK_SPEED,
  PLAYER_WALK_SPEED, SHADOW_RATE, SNEAK_RATE, TILE,
} from './config.js';
import { isBush, isShadow, isSolid, LEVELS, parseLevel } from './levels.js';

export const EVENT_GEM = 1;
export const EVENT_SUSPICIOUS = 2;
export const EVENT_ALARM = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_CLEAR = 16;
export const EVENT_PEBBLE = 32;

const TAU = Math.PI * 2;

export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: HUD_H + ty * TILE + TILE / 2 };
}

function tileAt(grid, px, py) {
  return { tx: Math.floor(px / TILE), ty: Math.floor((py - HUD_H) / TILE) };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

/** True when no wall or crate stands between the two points. */
export function hasLineOfSight(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const { tx, ty } = tileAt(grid, x0 + dx * t, y0 + dy * t);
    if (isSolid(grid, tx, ty)) return false;
  }
  return true;
}

/** Raycast from (x, y) along angle until a wall or maxDist; returns the hit point. */
export function castRay(grid, x, y, angle, maxDist) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const step = 5;
  for (let d = step; d <= maxDist; d += step) {
    const px = x + dx * d;
    const py = y + dy * d;
    const { tx, ty } = tileAt(grid, px, py);
    if (isSolid(grid, tx, ty)) return { x: px, y: py, dist: d };
  }
  return { x: x + dx * maxDist, y: y + dy * maxDist, dist: maxDist };
}

/** The vision cone as a polygon: the guard plus one raycast per slice. */
export function conePolygon(grid, guard) {
  const slices = 14;
  const pts = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= slices; i += 1) {
    const a = guard.angle - GUARD_VIEW_HALF_ANGLE
      + (2 * GUARD_VIEW_HALF_ANGLE * i) / slices;
    const hit = castRay(grid, guard.x, guard.y, a, GUARD_VIEW_DIST);
    pts.push({ x: hit.x, y: hit.y });
  }
  return pts;
}

function moveCircle(grid, obj, dx, dy, radius) {
  // Axis-separated slide: try x, then y, so corners never trap the walker.
  let nx = obj.x + dx;
  if (!circleHitsWall(grid, nx, obj.y, radius)) obj.x = nx;
  let ny = obj.y + dy;
  if (!circleHitsWall(grid, obj.x, ny, radius)) obj.y = ny;
}

function circleHitsWall(grid, px, py, radius) {
  const { tx, ty } = tileAt(grid, px, py);
  for (let y = ty - 1; y <= ty + 1; y += 1) {
    for (let x = tx - 1; x <= tx + 1; x += 1) {
      if (!isSolid(grid, x, y)) continue;
      const cx = Math.max(x * TILE, Math.min(px, x * TILE + TILE));
      const cy = Math.max(HUD_H + y * TILE, Math.min(py, HUD_H + y * TILE + TILE));
      if ((px - cx) ** 2 + (py - cy) ** 2 < radius * radius) return true;
    }
  }
  return false;
}

export function createWorld() {
  const state = {
    levelIndex: 0,
    score: 0,
    lives: LIVES_START,
    gemsTotal: 0,
    gemsGot: 0,
    pebbles: PEBBLES_START,
    levelTime: 0,
    alarmT: 0,
    ghost: true, // stays true while no alarm has sounded this level
    caught: false,
    cleared: false,
    player: { x: 0, y: 0, angle: 0, moving: false, sneaking: false, stepT: 0 },
    guards: [],
    grid: [],
    exit: { x: 0, y: 0 },
    gems: [],
    noises: [],
    levelName: '',
    levelSub: '',
  };

  function loadLevel(index) {
    const def = LEVELS[index];
    const parsed = parseLevel(def);
    state.levelIndex = index;
    state.grid = parsed.grid;
    state.exit = tileCenter(parsed.exit.x, parsed.exit.y);
    state.gems = parsed.gems.map((g) => ({ ...g, px: tileCenter(g.x, g.y).x, py: tileCenter(g.x, g.y).y }));
    state.gemsTotal = state.gems.length;
    state.gemsGot = 0;
    state.pebbles = PEBBLES_START;
    state.levelTime = 0;
    state.alarmT = 0;
    state.ghost = true;
    state.caught = false;
    state.cleared = false;
    state.noises = [];
    state.levelName = def.name;
    state.levelSub = def.sub;
    const start = tileCenter(parsed.player.x, parsed.player.y);
    state.player.x = start.x;
    state.player.y = start.y;
    state.player.angle = 0;
    state.guards = def.guards.map((g) => {
      const first = tileCenter(g.path[0][0], g.path[0][1]);
      const second = tileCenter(g.path[1][0], g.path[1][1]);
      return {
        x: first.x,
        y: first.y,
        angle: Math.atan2(second.y - first.y, second.x - first.x),
        state: 'patrol',
        wpIndex: 1,
        pauseT: 0,
        suspicion: 0,
        lastSeen: null,
        searchT: 0,
        scanAngle: 0,
        speedMul: def.speedMul,
        pause: g.pause,
        path: g.path.map(([tx, ty]) => tileCenter(tx, ty)),
        stuckT: 0,
      };
    });
  }

  function playerTileFlags() {
    const { tx, ty } = tileAt(state.grid, state.player.x, state.player.y);
    return { bush: isBush(state.grid, tx, ty), shadow: isShadow(state.grid, tx, ty) };
  }

  /** How fast this guard's suspicion rises right now (0 when it cannot see you). */
  function detectionRate(guard) {
    const dx = state.player.x - guard.x;
    const dy = state.player.y - guard.y;
    const dist = Math.hypot(dx, dy);
    const { bush, shadow } = playerTileFlags();
    if (bush && dist > BUSH_HIDE_RANGE) return 0;
    if (dist > GUARD_VIEW_DIST) return 0;
    const ang = Math.atan2(dy, dx);
    const off = Math.abs(angleDiff(ang, guard.angle));
    if (off > GUARD_VIEW_HALF_ANGLE && dist > DETECT_CLOSE_RANGE) return 0;
    if (!hasLineOfSight(state.grid, guard.x, guard.y, state.player.x, state.player.y)) return 0;
    const closeness = 1 - dist / GUARD_VIEW_DIST;
    const centred = 1 - off / GUARD_VIEW_HALF_ANGLE;
    let rate = DETECT_BASE_RATE * (0.35 + 0.65 * closeness) * (0.5 + 0.5 * centred);
    if (dist < DETECT_CLOSE_RANGE) rate = Math.max(rate, 42); // point blank: they feel you
    if (shadow) rate *= SHADOW_RATE;
    if (state.player.sneaking) rate *= SNEAK_RATE;
    else if (state.player.moving) rate *= MOVING_RATE;
    return rate;
  }

  function guardHears(guard, noise) {
    return Math.hypot(guard.x - noise.x, guard.y - noise.y) < NOISE_HEAR_RANGE
      && Math.hypot(guard.x - noise.x, guard.y - noise.y) < noise.radius + 60;
  }

  function stepGuard(guard, dt) {
    let out = 0;
    const prevSuspicion = guard.suspicion;
    const rate = detectionRate(guard);
    if (rate > 0) {
      guard.suspicion = Math.min(100, guard.suspicion + rate * dt);
      guard.lastSeen = { x: state.player.x, y: state.player.y };
      if (guard.suspicion >= 100 && state.alarmT <= 0) {
        state.alarmT = ALARM_SECONDS;
        state.ghost = false;
        for (const g of state.guards) g.state = 'chase';
        return EVENT_ALARM;
      }
      if (guard.suspicion > 35 && guard.state === 'patrol') {
        guard.state = 'suspicious';
        out |= EVENT_SUSPICIOUS;
      }
    } else {
      guard.suspicion = Math.max(0, guard.suspicion - DETECT_DECAY_RATE * dt);
      if (guard.state === 'suspicious' && guard.suspicion < 8) guard.state = 'return';
    }
    if (prevSuspicion < 35 && guard.suspicion >= 35 && guard.state === 'patrol') {
      guard.state = 'suspicious';
      out |= EVENT_SUSPICIOUS;
    }

    // Hearing: a fresh noise pulls patrolling guards over to look.
    for (const noise of state.noises) {
      if (noise.fresh && guardHears(guard, noise) && guard.state === 'patrol') {
        guard.state = 'suspicious';
        guard.lastSeen = { x: noise.x, y: noise.y };
        guard.suspicion = Math.max(guard.suspicion, 30);
      }
    }

    // Movement by state.
    let target = null;
    let speed = 0;
    if (state.alarmT > 0) {
      guard.state = 'chase';
      target = { x: state.player.x, y: state.player.y };
      speed = GUARD_CHASE_SPEED * guard.speedMul;
    } else if (guard.state === 'suspicious' && guard.lastSeen) {
      target = guard.lastSeen;
      speed = GUARD_SEARCH_SPEED * guard.speedMul;
    } else if (guard.state === 'return') {
      target = guard.path[guard.wpIndex];
      speed = GUARD_PATROL_SPEED * guard.speedMul;
      if (Math.hypot(target.x - guard.x, target.y - guard.y) < 10) guard.state = 'patrol';
    } else if (guard.state === 'search' && guard.lastSeen) {
      target = guard.lastSeen;
      speed = GUARD_SEARCH_SPEED * guard.speedMul;
    } else if (guard.state === 'patrol') {
      if (guard.pauseT > 0) {
        guard.pauseT -= dt;
        // Scan the room while waiting at a waypoint.
        guard.scanAngle += dt * 1.4;
        guard.angle += Math.sin(guard.scanAngle) * dt * 1.1;
      } else {
        target = guard.path[guard.wpIndex];
        speed = GUARD_PATROL_SPEED * guard.speedMul;
      }
    }

    if (target) {
      const dx = target.x - guard.x;
      const dy = target.y - guard.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 8) {
        if (guard.state === 'patrol') {
          guard.wpIndex = (guard.wpIndex + 1) % guard.path.length;
          guard.pauseT = guard.pause;
        } else if (guard.state === 'suspicious' || guard.state === 'search') {
          guard.state = 'search';
          guard.searchT = 2.2;
          guard.lastSeen = null;
        } else if (guard.state === 'return') {
          guard.state = 'patrol';
        }
      } else {
        const want = Math.atan2(dy, dx);
        guard.angle += angleDiff(want, guard.angle) * Math.min(1, dt * 8);
        const before = { x: guard.x, y: guard.y };
        moveCircle(state.grid, guard, (dx / dist) * speed * dt, (dy / dist) * speed * dt, 12);
        if (Math.hypot(guard.x - before.x, guard.y - before.y) < speed * dt * 0.15) {
          // Wedged on a wall: give up on this leg, take the next waypoint.
          guard.stuckT += dt;
          if (guard.stuckT > 0.6) {
            guard.stuckT = 0;
            if (guard.state === 'patrol') guard.wpIndex = (guard.wpIndex + 1) % guard.path.length;
            else guard.state = 'search';
          }
        } else {
          guard.stuckT = 0;
        }
      }
    }

    if (guard.state === 'search') {
      guard.searchT -= dt;
      guard.angle += dt * 2.2; // sweep the room looking for you
      if (guard.searchT <= 0) guard.state = 'return';
    }
    return out;
  }

  loadLevel(0);

  return {
    state,
    loadLevel,
    tileAt,
    hasLineOfSight,
    conePolygon: (guard) => conePolygon(state.grid, guard),

    /** Advance the world one fixed step. Returns an events bitmask. */
    step(dt, dir, throwPebbleAt) {
      let events = 0;
      if (state.caught || state.cleared) return events;
      state.levelTime += dt;
      if (state.alarmT > 0) state.alarmT -= dt;

      // --- Player movement ---
      const p = state.player;
      const speed = dir.sneak ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
      p.sneaking = dir.sneak;
      p.moving = dir.x !== 0 || dir.y !== 0;
      if (p.moving) {
        p.angle = Math.atan2(dir.y, dir.x);
        moveCircle(state.grid, p, dir.x * speed * dt, dir.y * speed * dt, PLAYER_RADIUS);
        p.stepT -= dt;
        if (p.stepT <= 0) {
          p.stepT = dir.sneak ? 0.55 : 0.38;
          if (!dir.sneak) {
            state.noises.push({ x: p.x, y: p.y, radius: NOISE_WALK_RADIUS, ttl: 0.4, fresh: true });
          }
        }
      }

      // --- Pebble throw (mouse click) ---
      if (throwPebbleAt && state.pebbles > 0) {
        state.pebbles -= 1;
        state.noises.push({ x: throwPebbleAt.x, y: throwPebbleAt.y, radius: NOISE_PEBBLE_RADIUS, ttl: 0.9, fresh: true });
        events |= EVENT_PEBBLE;
      }

      // --- Gems ---
      for (const gem of state.gems) {
        if (!gem.taken && Math.hypot(gem.px - p.x, gem.py - p.y) < 22) {
          gem.taken = true;
          state.gemsGot += 1;
          state.score += GEM_SCORE;
          events |= EVENT_GEM;
        }
      }

      // --- Exit ---
      if (Math.hypot(state.exit.x - p.x, state.exit.y - p.y) < 24) {
        state.cleared = true;
        const timeBonus = Math.max(0, 600 - Math.floor(state.levelTime) * 5);
        state.score += LEVEL_CLEAR_SCORE + timeBonus;
        if (state.ghost) state.score += GHOST_BONUS;
        return events | EVENT_CLEAR;
      }

      // --- Guards ---
      for (const guard of state.guards) {
        events |= stepGuard(guard, dt);
        // Caught: a guard close enough to grab you while it knows you are there.
        const d = Math.hypot(guard.x - p.x, guard.y - p.y);
        if (d < CAUGHT_RADIUS && (state.alarmT > 0 || guard.suspicion > 50 || guard.state === 'chase')) {
          state.caught = true;
          state.lives -= 1;
          return events | EVENT_CAUGHT;
        }
      }

      // Age noises; only the first frame counts as "fresh" for hearing.
      for (const n of state.noises) { n.ttl -= dt; n.fresh = false; }
      state.noises = state.noises.filter((n) => n.ttl > 0);
      return events;
    },
  };
}
