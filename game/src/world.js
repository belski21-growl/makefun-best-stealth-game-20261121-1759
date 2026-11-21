// The world: one level at a time. It owns the thief, the shards, the exit,
// the pebbles, the tries left and the win/lose events; the wardens live in
// guard.js and ask the world whether a point is blocked, in shadow or in
// line of sight.

import {
  FIELD,
  GUARD,
  PEBBLE,
  PLAYER,
  SHARD,
  STEP,
  TRIES_PER_LEVEL,
} from './config.js';
import { LEVELS, parseLevel } from './level.js';
import {
  createGuard,
  distractGuard,
  updateGuard,
  STATE_ALERT,
} from './guard.js';

export const EVENT_CAUGHT = 1;
export const EVENT_LEVEL_CLEAR = 2;
export const EVENT_GAME_WON = 4;
export const EVENT_SHARD = 8;
export const EVENT_THROW = 16;

const EXIT_REACH = 34;
const PEBBLE_TTL = 1.6;

export function createWorld(random) {
  const world = {
    random,
    levelIndex: 0,
    level: null,
    player: {
      x: 60, y: 60, sneaking: false,
      noiseRadius: 0, stamina: PLAYER.staminaMax,
    },
    guards: [],
    pebbles: [],
    pebbleCooldown: 0,
    triesLeft: TRIES_PER_LEVEL,
    shardsTaken: 0,
    time: 0,
    caughtFlash: 0,
  };
  enterLevel(world, 0);
  return world;
}

function enterLevel(world, index) {
  world.levelIndex = index;
  world.level = parseLevel(LEVELS[index]);
  world.player.x = world.level.start.x;
  world.player.y = world.level.start.y;
  world.player.stamina = PLAYER.staminaMax;
  world.player.noiseRadius = 0;
  world.guards = world.level.patrols.map((patrol) => createGuard(patrol, world.random));
  world.pebbles = [];
  world.pebbleCooldown = 0;
  world.shardsTaken = 0;
  world.time = 0;
}

function tileIdAt(x, y) {
  const col = Math.floor(x / FIELD.tile);
  const row = Math.floor(y / FIELD.tile);
  return `${col},${row}`;
}

function circleBlocked(world, x, y, radius) {
  // Circle vs the solid tiles it overlaps: walls and crates both block.
  const minCol = Math.floor((x - radius) / FIELD.tile);
  const maxCol = Math.floor((x + radius) / FIELD.tile);
  const minRow = Math.floor((y - radius) / FIELD.tile);
  const maxRow = Math.floor((y + radius) / FIELD.tile);
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const key = `${col},${row}`;
      if (!world.level.walls.has(key) && !world.level.crates.has(key)) continue;
      const tileX = col * FIELD.tile;
      const tileY = row * FIELD.tile;
      const nearX = Math.max(tileX, Math.min(x, tileX + FIELD.tile));
      const nearY = Math.max(tileY, Math.min(y, tileY + FIELD.tile));
      if ((x - nearX) ** 2 + (y - nearY) ** 2 < radius * radius) return true;
    }
  }
  return false;
}

export function createWorldQueries(world) {
  return {
    isBlocked: (x, y, radius) => circleBlocked(world, x, y, radius),
    inShadow: (x, y) => world.level.shadows.has(tileIdAt(x, y)),
    lineOfSightClear: (x1, y1, x2, y2) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const reach = Math.hypot(dx, dy);
      const samples = Math.max(1, Math.ceil(reach / 8));
      for (let i = 1; i < samples; i += 1) {
        const t = i / samples;
        const key = tileIdAt(x1 + dx * t, y1 + dy * t);
        if (world.level.walls.has(key) || world.level.crates.has(key)) return false;
      }
      return true;
    },
  };
}

function respawnThief(world) {
  world.player.x = world.level.start.x;
  world.player.y = world.level.start.y;
  world.player.stamina = PLAYER.staminaMax;
  world.player.noiseRadius = 0;
  for (const guard of world.guards) {
    guard.meter = 0;
    guard.state = 'patrol';
    guard.lastSeen = null;
  }
}

// How fast the thief moves in each gait, and what sprinting costs.
function gaitPace(gait, stamina) {
  if (gait === 'sneak') return PLAYER.sneakSpeed;
  if (gait === 'sprint' && stamina > 0) return PLAYER.sprintSpeed;
  return PLAYER.walkSpeed;
}

/**
 * Advance the world one fixed step. `move` is a normalised direction, `gait`
 * is 'walk' | 'sneak' | 'sprint', `throwAt` a playfield point or null. Returns
 * an event bitmask (EVENT_*); the caller switches screens on it.
 */
export function stepWorld(world, dt, move, gait, throwAt) {
  world.time += dt;
  world.pebbleCooldown = Math.max(0, world.pebbleCooldown - dt);
  world.caughtFlash = Math.max(0, world.caughtFlash - dt);
  let events = 0;

  const player = world.player;
  player.sneaking = gait === 'sneak';
  const speed = gaitPace(gait, player.stamina);
  if (gait === 'sprint' && player.stamina > 0) {
    player.stamina = Math.max(0, player.stamina - PLAYER.staminaDrain * dt);
  } else {
    player.stamina = Math.min(PLAYER.staminaMax, player.stamina + PLAYER.staminaRegen * dt);
  }
  const queries = createWorldQueries(world);
  const nx = player.x + move.x * speed * dt;
  const ny = player.y + move.y * speed * dt;
  if (!circleBlocked(world, nx, player.y, PLAYER.radius)) player.x = nx;
  if (!circleBlocked(world, player.x, ny, PLAYER.radius)) player.y = ny;
  player.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, player.x));
  player.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, player.y));

  const moving = move.x !== 0 || move.y !== 0;
  player.noiseRadius = !moving
    ? 0
    : gait === 'sneak' ? PLAYER.noiseSneak
    : gait === 'sprint' ? PLAYER.noiseSprint
    : PLAYER.noiseWalk;

  if (throwAt && world.pebbleCooldown <= 0) {
    world.pebbles.push({ x: throwAt.x, y: throwAt.y, ttl: PEBBLE_TTL });
    world.pebbleCooldown = PEBBLE.cooldown;
    for (const guard of world.guards) distractGuard(guard, throwAt.x, throwAt.y);
    events |= EVENT_THROW;
  }
  for (const pebble of world.pebbles) pebble.ttl -= dt;
  world.pebbles = world.pebbles.filter((pebble) => pebble.ttl > 0);

  for (const shard of world.level.shards) {
    if (!shard.taken && Math.hypot(shard.x - player.x, shard.y - player.y) < SHARD.radius + PLAYER.radius) {
      shard.taken = true;
      world.shardsTaken += 1;
      events |= EVENT_SHARD;
    }
  }

  for (const guard of world.guards) {
    updateGuard(guard, dt, player, queries);
    if (guard.state === STATE_ALERT && Math.hypot(guard.x - player.x, guard.y - player.y) < GUARD.catchDistance) {
      world.caughtFlash = 0.6;
      world.triesLeft -= 1;
      respawnThief(world);
      return events | EVENT_CAUGHT;
    }
  }

  const allTaken = world.shardsTaken >= world.level.shards.length;
  if (allTaken && Math.hypot(world.level.exit.x - player.x, world.level.exit.y - player.y) < EXIT_REACH) {
    if (world.levelIndex + 1 >= LEVELS.length) return events | EVENT_GAME_WON;
    enterLevel(world, world.levelIndex + 1);
    world.triesLeft = TRIES_PER_LEVEL;
    return events | EVENT_LEVEL_CLEAR;
  }

  return events;
}

// Highest detection meter among the wardens, for the HUD eye.
export function highestMeter(world) {
  let top = 0;
  for (const guard of world.guards) top = Math.max(top, guard.meter);
  return top;
}

export { STEP };
