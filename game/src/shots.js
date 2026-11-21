// Lantern Heist — staged scenes for the screenshots.
// Each shot poses the same live level-1 world so the screenshots are real
// renders of the game's own code: the title, a near-miss patrol, hiding in
// a bush with a cone overhead, and the wing cleared at the exit.
import { TILE } from './config.js';
import { tileCenter } from './world.js';
import { SCREEN_CLEAR, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function placeGuard(world, index, tx, ty, angleDeg, suspicion, guardState) {
  const guard = world.state.guards[index];
  const at = tileCenter(tx, ty);
  guard.x = at.x;
  guard.y = at.y;
  guard.angle = (angleDeg * Math.PI) / 180;
  guard.suspicion = suspicion;
  guard.state = guardState;
  guard.pauseT = 0;
  return guard;
}

function placePlayer(world, tx, ty, angleDeg) {
  const at = tileCenter(tx, ty);
  world.state.player.x = at.x;
  world.state.player.y = at.y;
  world.state.player.angle = (angleDeg * Math.PI) / 180;
  world.state.player.sneaking = true;
}

/** Pose the world for a named shot. Returns { screen, clearLine }. */
export function stageShot(name, world) {
  const s = world.state;
  if (name === 'play') {
    // Near miss: Wren crouched behind the crate row while a guard's cone
    // sweeps in, suspicion already past half.
    world.loadLevel(0);
    placePlayer(world, 20, 4, 180);
    s.gems[0].taken = true;
    s.gemsGot = 1;
    s.score = 100;
    s.pebbles = 2;
    s.levelTime = 74;
    placeGuard(world, 0, 24, 2, 135, 20, 'patrol');
    const hunter = placeGuard(world, 1, 25, 6, 160, 62, 'suspicious');
    hunter.lastSeen = { x: s.player.x - 30, y: s.player.y - 10 };
    placeGuard(world, 2, 9, 16, 0, 5, 'patrol');
    return { screen: SCREEN_PLAY, clearLine: '' };
  }
  if (name === 'hide') {
    // Deep in a bush while the nearest guard's cone passes overhead,
    // alert meter high, the green EXIT glowing across the hall.
    world.loadLevel(0);
    placePlayer(world, 26, 3, 90);
    s.gems[0].taken = true;
    s.gems[1].taken = true;
    s.gemsGot = 2;
    s.score = 200;
    s.pebbles = 2;
    s.levelTime = 132;
    placeGuard(world, 0, 20, 2, 90, 30, 'suspicious');
    placeGuard(world, 1, 25, 5, 80, 78, 'suspicious');
    placeGuard(world, 2, 9, 16, 0, 5, 'patrol');
    return { screen: SCREEN_PLAY, clearLine: '' };
  }
  if (name === 'clear') {
    // Wren at the exit door, wing cleared, ghost bonus intact.
    world.loadLevel(0);
    placePlayer(world, 30, 1, 0);
    s.gems[0].taken = true;
    s.gems[1].taken = true;
    s.gemsGot = 2;
    s.score = 900;
    s.levelTime = 188;
    s.cleared = true;
    return { screen: SCREEN_CLEAR, clearLine: 'Ghost bonus +300 — no alarm was raised.' };
  }
  // 'start' (and anything unknown): the title over the live gallery.
  world.loadLevel(0);
  placeGuard(world, 0, 22, 2, 180, 0, 'patrol');
  placeGuard(world, 1, 25, 6, 90, 0, 'patrol');
  placeGuard(world, 2, 9, 16, 0, 0, 'patrol');
  return { screen: SCREEN_TITLE, clearLine: '' };
}

export { TILE };
