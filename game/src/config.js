// Lantern Heist — shared tuning constants.
// A top-down stealth game: one thief, patrolling guards with vision cones,
// crates and bushes to hide behind, and a glowing exit to reach unseen.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const HUD_H = 64;
export const VIEW_W = COLS * TILE; // 1280
export const VIEW_H = HUD_H + ROWS * TILE; // 784 -> canvas 1280x800, 16px bottom lip
export const CANVAS_W = 1280;
export const CANVAS_H = 800;

// Player movement (px per second).
export const PLAYER_WALK_SPEED = 168;
export const PLAYER_SNEAK_SPEED = 96;
export const PLAYER_RADIUS = 13;

// Guard sight: how far a cone reaches and how wide it opens.
export const GUARD_VIEW_DIST = 215;
export const GUARD_VIEW_HALF_ANGLE = 0.66; // ~38 degrees each side
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 148;
export const GUARD_SEARCH_SPEED = 92;

// Detection: suspicion 0..100. Reaching 100 sounds the alarm.
export const DETECT_BASE_RATE = 62; // per second, point blank, dead centre
export const DETECT_DECAY_RATE = 26; // per second while unseen
export const DETECT_CLOSE_RANGE = 52; // inside this, a guard senses you even off-cone
export const BUSH_HIDE_RANGE = 48; // a guard must be this close to spot you in a bush
export const SHADOW_RATE = 0.45; // detection multiplier while you stand in shadow
export const SNEAK_RATE = 0.7; // detection multiplier while sneaking
export const MOVING_RATE = 1.25; // detection multiplier while walking upright

// Noise: walking is faintly audible, a thrown pebble is loud.
export const NOISE_WALK_RADIUS = 64;
export const NOISE_PEBBLE_RADIUS = 150;
export const NOISE_HEAR_RANGE = 190;

// Alarm: how long every guard hunts you once suspicion maxes out.
export const ALARM_SECONDS = 6;
export const CAUGHT_RADIUS = 22;

// Scoring.
export const GEM_SCORE = 100;
export const LEVEL_CLEAR_SCORE = 500;
export const GHOST_BONUS = 300; // finish a level without ever raising the alarm

export const LIVES_START = 3;
export const PEBBLES_START = 3;
export const STEP = 1 / 60;

export const BEST_KEY = 'lantern-heist-best';
