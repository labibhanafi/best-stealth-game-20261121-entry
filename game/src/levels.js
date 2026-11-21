// Lantern Heist — the three museum wings.
// Map legend: # wall | . floor | C crate (solid, blocks sight) |
// B bush (walk in, stay hidden) | S shadow (dark floor, harder to spot) |
// P player start | E exit door | G gem (optional loot).
// Guard waypoints are tile coordinates; every waypoint must sit on floor.
export const LEVELS = [
  {
    name: 'Level 1 — The Quiet Gallery',
    sub: 'Learn the patrols. Reach the green EXIT unseen.',
    speedMul: 1.0,
    map: [
      '################################',
      '#P....C.......#......G........E#',
      '#.....C.......#................#',
      '#..B...........#.....C....B....#',
      '#..............#.....C....B....#',
      '#..####.......#................#',
      '#..####....C.......#####.......#',
      '#..C......B........#####.......#',
      '#..C......B........#...#.......#',
      '#..................#...#...C...#',
      '#......######......#...#.......#',
      '#......#....#..................#',
      '#..B...#....#.....C........B...#',
      '#......#....#..................#',
      '#......######......#####.......#',
      '#.....................#........#',
      '#..C......G.....B....#....C....#',
      '################################',
    ],
    guards: [
      { path: [[17, 2], [29, 2]], pause: 1.0 },
      { path: [[25, 3], [25, 9]], pause: 1.2 },
      { path: [[5, 16], [14, 16]], pause: 1.0 },
    ],
  },
  {
    name: 'Level 2 — The Vault Wing',
    sub: 'More guards, tighter halls. Bushes are your friends.',
    speedMul: 1.12,
    map: [
      '################################',
      '#P..C.......#....G......#.....E#',
      '#...........#...........#......#',
      '#..B........#..C........#..B...#',
      '#...........#...........#......#',
      '#..#####....#.....####..#...C..#',
      '#..#####...........#...........#',
      '#......C....B......#.....####..#',
      '#..................#.....#..#..#',
      '#..####..........C.......#..#G.#',
      '#..####......S...........#.....#',
      '#......#........#####....#.....#',
      '#..B...#....C............#..B..#',
      '#......#.......................#',
      '#..#######.....C.....######....#',
      '#.......................#......#',
      '#..C.....G....B.....C...#..C...#',
      '################################',
    ],
    guards: [
      { path: [[13, 2], [23, 2]], pause: 1.0 },
      { path: [[26, 1], [26, 4]], pause: 0.8 },
      { path: [[8, 15], [23, 15]], pause: 1.4 },
      { path: [[29, 9], [29, 13]], pause: 1.1 },
    ],
  },
  {
    name: 'Level 3 — The Ember Vault',
    sub: 'The Ember Star is here. Five guards. No mistakes.',
    speedMul: 1.25,
    map: [
      '################################',
      '#P....#......C.....G....#.....E#',
      '#.....#.............#..#.......#',
      '#.B...#..C......B...#..#...B...#',
      '#.....#.............#..#.......#',
      '#.....#####.....#######..#..#..#',
      '#.....#..............#......#..#',
      '#.C...#..B......C....#...C..#..#',
      '#.....#...........#.#........#.#',
      '#.....#..#####....#.#.....####.#',
      '#.....#..#...#....#.....#..#...#',
      '#.B...#..#...#...C..#....#..#G.#',
      '#.....#..#...#......#....#..#..#',
      '#.....#..#####..S........#.....#',
      '#.....#........####..C..#...#..#',
      '#.....#..................#...#.#',
      '#..C.....G....B.....C....#..C..#',
      '################################',
    ],
    guards: [
      { path: [[7, 2], [19, 2]], pause: 0.8 },
      { path: [[7, 4], [19, 4]], pause: 0.7 },
      { path: [[15, 8], [15, 12]], pause: 1.2 },
      { path: [[7, 15], [24, 15]], pause: 0.9 },
      { path: [[8, 8], [8, 13]], pause: 1.0 },
    ],
  },
];

/** Parse one level map into a grid plus the things sitting on it. */
export function parseLevel(def) {
  const grid = def.map.map((row) => row.split(''));
  let player = { x: 1, y: 1 };
  let exit = { x: 30, y: 1 };
  const gems = [];
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      const ch = grid[y][x];
      if (ch === 'P') { player = { x, y }; grid[y][x] = '.'; }
      else if (ch === 'E') { exit = { x, y }; grid[y][x] = '.'; }
      else if (ch === 'G') { gems.push({ x, y, taken: false }); grid[y][x] = '.'; }
    }
  }
  return { def, grid, player, exit, gems };
}

/** True when tile (tx, ty) blocks movement and sight. */
export function isSolid(grid, tx, ty) {
  if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[0].length) return true;
  const ch = grid[ty][tx];
  return ch === '#' || ch === 'C';
}

/** True when tile (tx, ty) is a bush you can hide inside. */
export function isBush(grid, tx, ty) {
  if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[0].length) return false;
  return grid[ty][tx] === 'B';
}

/** True when tile (tx, ty) is shadow that halves detection. */
export function isShadow(grid, tx, ty) {
  if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[0].length) return false;
  return grid[ty][tx] === 'S';
}
