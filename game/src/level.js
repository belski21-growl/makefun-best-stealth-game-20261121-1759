// The three levels of Lumen Heist, drawn as tile maps. One character per tile:
//   #  wall (blocks movement and sight)
//   C  crate (low cover: blocks sight, blocks movement)
//   ~  shadow floor (dark: wardens spot you half as fast here)
//   .  open floor
//   P  the thief's start
//   *  a starlight shard (objective)
//   E  the exit door (opens once every shard is taken)
//   G  a warden's patrol start; waypoints follow in the level's patrol list.
//
// Waypoints are tile coordinates [col, row]; a warden walks them in order, pausing
// at each one, and turns to face where it is going. Every patrol leg was checked
// to run through open tiles only (see build-log.md).

export const LEVELS = [
  {
    name: 'The Atrium',
    hint: 'Slip past the wardens. Shift sneaks, Space sprints, click throws a pebble.',
    map: [
      '################################',
      '#P...~....................~....#',
      '#....~..........*.........~.*..#',
      '#....~.............C......~....#',
      '#....~..##................~....#',
      '#....~..##................~....#',
      '#....~....................~....#',
      '#....~......C.............~....#',
      '#....~................##..~....#',
      '#..*.~................##..~....#',
      '#....~....................~....#',
      '#....~....................~....#',
      '#....C....................C....#',
      '#....~........##..........~....#',
      '#....~........##..........~....#',
      '#....~....................~.*..#',
      '#....~....................~...E#',
      '################################',
    ],
    patrols: [
      { start: [3, 3], waypoints: [[3, 3], [11, 3], [11, 14], [3, 14]], pause: 1.2 },
      { start: [19, 5], waypoints: [[19, 5], [28, 5], [28, 13], [19, 13]], pause: 0.9 },
    ],
  },
  {
    name: 'The Vault Wing',
    hint: 'Three wardens now. Shadows hide you; pebbles pull them away.',
    map: [
      '################################',
      '#P..~............~..........~..#',
      '#...~............~..........~*.#',
      '#...~..........##~..........~..#',
      '#...~..........##~..........~..#',
      '#...~.....##.....~..........~..#',
      '#...~.....##.....~.......C..~..#',
      '#...~............~..........~..#',
      '#.*.~............~..........~..#',
      '#...~.C..........~..........~*.#',
      '#...~............~..........~..#',
      '#...~............~..##......~..#',
      '#...~............~..##......~..#',
      '#...~............~..........~..#',
      '#..C~............~.........C~..#',
      '#...~...*....C...~......*...~..#',
      '#...~............~..........~.E#',
      '################################',
    ],
    patrols: [
      { start: [3, 3], waypoints: [[3, 3], [8, 3], [8, 13], [3, 13]], pause: 1.0 },
      { start: [19, 3], waypoints: [[19, 3], [26, 3], [26, 13], [19, 13]], pause: 0.8 },
      { start: [29, 4], waypoints: [[29, 4], [29, 11], [23, 11], [23, 4]], pause: 1.4 },
    ],
  },
  {
    name: 'The Star Vault',
    hint: 'Four wardens, tight halls. Patience wins — learn the patrols.',
    map: [
      '################################',
      '#P..~.............~........~...#',
      '#...~.......C.....~........~.*.#',
      '#...~.............~........~...#',
      '#...~.............~..##....~...#',
      '#...~C............~..##....~...#',
      '#...~.............~........~...#',
      '#...~....##.......~........~...#',
      '#.*.~....##.....*.~........~.*.#',
      '#...~.............~........~...#',
      '#...~.............~.......C~...#',
      '#...~.............~........~...#',
      '#...~.........##..~........~...#',
      '#...~.........##..~........~C..#',
      '#...~..C..........~........~...#',
      '#...~.*...........~C....*..~...#',
      '#...~.............~........~..E#',
      '################################',
    ],
    patrols: [
      { start: [3, 3], waypoints: [[3, 3], [8, 3], [8, 13], [3, 13]], pause: 0.9 },
      { start: [12, 5], waypoints: [[12, 5], [16, 5], [16, 14], [12, 14]], pause: 0.7 },
      { start: [20, 3], waypoints: [[20, 3], [25, 3], [25, 14], [20, 14]], pause: 1.2 },
      { start: [28, 4], waypoints: [[28, 4], [28, 12], [24, 12], [24, 4]], pause: 1.0 },
    ],
  },
];

/** Parse one level's map into walls, crates, shadows, shards, start and exit. */
export function parseLevel(def) {
  const walls = new Set();
  const crates = new Set();
  const shadows = new Set();
  const shards = [];
  let start = { x: 60, y: 60 };
  let exit = { x: 1200, y: 660 };
  for (let row = 0; row < def.map.length; row += 1) {
    for (let col = 0; col < def.map[row].length; col += 1) {
      const ch = def.map[row][col];
      const key = `${col},${row}`;
      const cx = col * 40 + 20;
      const cy = row * 40 + 20;
      if (ch === '#') walls.add(key);
      else if (ch === 'C') crates.add(key);
      else if (ch === '~') shadows.add(key);
      else if (ch === 'P') start = { x: cx, y: cy };
      else if (ch === '*') shards.push({ x: cx, y: cy, taken: false });
      else if (ch === 'E') exit = { x: cx, y: cy };
    }
  }
  return { ...def, walls, crates, shadows, shards, start, exit };
}
