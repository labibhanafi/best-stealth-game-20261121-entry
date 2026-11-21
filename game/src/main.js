// Lantern Heist — boot and the one loop.
// The game moves between screens: title, level intro, play, paused, caught,
// wing cleared, win and game over. Input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there.
//
// ?shot=start|play|hide|clear stages that scene instead of running the
// loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { LEVELS } from './levels.js';
import { createAudio } from './audio.js';
import {
  ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput,
} from './input.js';
import {
  createWorld, EVENT_ALARM, EVENT_CAUGHT, EVENT_CLEAR, EVENT_GEM,
  EVENT_PEBBLE, EVENT_SUSPICIOUS,
} from './world.js';
import {
  createRenderer, SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_INTRO, SCREEN_OVER,
  SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN,
} from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const world = createWorld();
const renderer = createRenderer(canvas);
// Test hook: play-tests drive and inspect the live world through this.
window.__world = world;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function runShot(name) {
  const staged = stageShot(name, world);
  const best = readBest();
  let painted = 0;
  function paint() {
    const cones = world.state.guards.map((g) => world.conePolygon(g));
    renderer.draw(world.state, { screen: staged.screen, best, clearLine: staged.clearLine }, performance.now(), cones);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const s = world.state;
  let screen = SCREEN_TITLE;
  let best = readBest();
  let scoreAtLevelStart = 0;
  let clearLine = '';
  let accumulator = 0;
  let last = performance.now();
  let stepSoundT = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startLevel(index) {
    scoreAtLevelStart = s.score;
    world.loadLevel(index);
    screen = SCREEN_INTRO;
    announce(`${s.levelName}. ${s.levelSub}`);
  }

  function startGame() {
    s.score = 0;
    s.lives = 3;
    audio.unlock();
    startLevel(0);
  }

  function retryLevel() {
    s.score = scoreAtLevelStart;
    startLevel(s.levelIndex);
  }

  function handleEvents(events) {
    if (events & EVENT_GEM) audio.gem();
    if (events & EVENT_PEBBLE) audio.pebble();
    if (events & EVENT_SUSPICIOUS) audio.suspicious();
    if (events & EVENT_ALARM) {
      audio.alarm();
      announce('Alarm! Every guard is hunting you — break line of sight!');
    }
    if (events & EVENT_CAUGHT) {
      audio.caught();
      if (s.lives > 0) {
        screen = SCREEN_CAUGHT;
        announce(`Caught! ${s.lives} ${s.lives === 1 ? 'life' : 'lives'} left.`);
      } else {
        screen = SCREEN_OVER;
        if (s.score > best) { best = s.score; saveBest(best); }
        announce(`Game over. Final score ${s.score}.`);
      }
    }
    if (events & EVENT_CLEAR) {
      const lastLevel = s.levelIndex >= LEVELS.length - 1;
      if (lastLevel) {
        screen = SCREEN_WIN;
        audio.win();
        if (s.score > best) { best = s.score; saveBest(best); }
        announce(`You stole the Ember Star! Final score ${s.score}.`);
      } else {
        screen = SCREEN_CLEAR;
        audio.levelClear();
        clearLine = s.ghost
          ? 'Ghost bonus +300 — no alarm was raised.'
          : 'The alarm sounded — no ghost bonus this wing.';
        announce(`${s.levelName} cleared. Score ${s.score}.`);
      }
    }
  }

  function step() {
    const dir = input.direction();
    const click = input.takeClick();
    let throwAt = null;
    if (click && screen === SCREEN_PLAY && s.pebbles > 0) {
      // A click throws a pebble at the clicked floor point (inside the hall).
      throwAt = { x: click.x, y: click.y };
    }
    const events = world.step(STEP, dir, throwAt);
    if (s.player.moving && !s.player.sneaking) {
      stepSoundT -= STEP;
      if (stepSoundT <= 0) {
        stepSoundT = 0.38;
        audio.footstep(false);
      }
    }
    handleEvents(events);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART && screen === SCREEN_PLAY) {
      retryLevel();
      return;
    }
    if (!(actions & (ACTION_CONFIRM | ACTION_PAUSE))) return;
    audio.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_OVER) {
      startGame();
    } else if (screen === SCREEN_INTRO) {
      screen = SCREEN_PLAY;
      announce(`Playing ${s.levelName}. Reach the exit unseen.`);
    } else if (screen === SCREEN_CAUGHT) {
      retryLevel();
    } else if (screen === SCREEN_CLEAR) {
      startLevel(s.levelIndex + 1);
    } else if (screen === SCREEN_PLAY && (actions & ACTION_PAUSE)) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const cones = s.guards.map((g) => world.conePolygon(g));
    renderer.draw(s, { screen, best, clearLine }, now, cones);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lantern Heist. Press Enter or click to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
