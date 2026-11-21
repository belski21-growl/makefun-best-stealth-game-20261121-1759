// The screenshot scenes behind ?shot=start|play|caught|win. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a
// greedy autopilot: every step it scores the eight directions by "distance to the
// goal, plus a heavy penalty for standing in a warden's cone", and takes the best.
// The same seed always gives the same frame, so the screenshots are reproducible.

import { FIELD, GUARD, STEP } from './config.js';
import { stepWorld, EVENT_CAUGHT, EVENT_GAME_WON, EVENT_LEVEL_CLEAR } from './world.js';
import { STATE_ALERT } from './guard.js';
import { SCREEN_CAUGHT, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 34;
const CAUGHT_SECONDS = 40;
const WIN_LIMIT_SECONDS = 420;
const SAMPLE = 1 / 30;

/** Danger of standing at (x, y): 1 inside a warden's cone with line of sight. */
function dangerAt(world, x, y) {
  let danger = 0;
  for (const guard of world.guards) {
    const dx = x - guard.x;
    const dy = y - guard.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 260) continue;
    const facing = Math.atan2(dy, dx);
    let diff = Math.abs(facing - guard.angle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff >= GUARD.viewHalfAngle) continue;
    const queries = worldQueries(world);
    if (!queries.lineOfSightClear(guard.x, guard.y, x, y)) continue;
    danger += 1 - distance / 260;
  }
  return danger;
}

// world.js keeps its queries private; rebuild the same two here for the pilot.
function worldQueries(world) {
  const level = world.level;
  function tileKey(x, y) {
    return `${Math.floor(x / FIELD.tile)},${Math.floor(y / FIELD.tile)}`;
  }
  return {
    lineOfSightClear(x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const distance = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(distance / 8));
      for (let i = 1; i < steps; i += 1) {
        const key = tileKey(x1 + (dx * i) / steps, y1 + (dy * i) / steps);
        if (level.walls.has(key) || level.crates.has(key)) return false;
      }
      return true;
    },
  };
}

/** The pilot's goal: the nearest untaken shard, then the exit. */
function currentGoal(world) {
  let goal = null;
  let best = Infinity;
  for (const shard of world.level.shards) {
    if (shard.taken) continue;
    const d = Math.hypot(shard.x - world.player.x, shard.y - world.player.y);
    if (d < best) {
      best = d;
      goal = shard;
    }
  }
  if (goal) return { x: goal.x, y: goal.y, sneak: true };
  return { x: world.level.exit.x, y: world.level.exit.y, sneak: false };
}

const DIRECTIONS = [
  [0, -1], [1, -1], [1, 0], [1, 1],
  [0, 1], [-1, 1], [-1, 0], [-1, -1],
];

/** Pick the direction that gets closer to the goal while staying out of cones.
 * Standing in a cone, the pilot flees it first; standing safe with every way
 * forward watched, it waits the patrol out. An alerted warden nearby means
 * sprint away from it, not sneak toward the goal. */
function autopilot(world) {
  const goal = currentGoal(world);
  const player = world.player;
  const hereDanger = dangerAt(world, player.x, player.y);

  let alerted = null;
  for (const guard of world.guards) {
    if (guard.state === STATE_ALERT) {
      const d = Math.hypot(guard.x - player.x, guard.y - player.y);
      if (!alerted || d < alerted.d) alerted = { guard, d };
    }
  }
  if (alerted && alerted.d < 320) {
    const dx = player.x - alerted.guard.x;
    const dy = player.y - alerted.guard.y;
    const length = Math.hypot(dx, dy) || 1;
    return { move: { x: dx / length, y: dy / length }, gait: 'sprint' };
  }

  let bestScore = Infinity;
  let best = { x: 0, y: 0 };
  let bestDanger = Infinity;
  for (const [dx, dy] of DIRECTIONS) {
    const length = Math.hypot(dx, dy);
    const x = player.x + (dx / length) * 165 * SAMPLE;
    const y = player.y + (dy / length) * 165 * SAMPLE;
    if (x < 20 || x > FIELD.width - 20 || y < 60 || y > FIELD.height - 20) continue;
    const dist = Math.hypot(goal.x - x, goal.y - y);
    const danger = dangerAt(world, x, y);
    const score = dist + danger * 1200;
    if (score < bestScore) {
      bestScore = score;
      best = { x: dx / length, y: dy / length };
      bestDanger = danger;
    }
  }
  // In a cone now: take the least-watched way out, never stand still in it.
  if (hereDanger > 0.25) return { move: best, gait: 'sneak' };
  // Safe here but every step forward is watched: wait for the patrol to pass.
  if (bestDanger > 0.6) return { move: { x: 0, y: 0 }, gait: 'sneak' };
  return { move: best, gait: goal.sneak ? 'sneak' : 'walk' };
}

/** The caught scene's pilot walks straight at the nearest warden, on purpose —
 * and once close, stands still in front of it, staring, until it is caught. */
function recklessPilot(world) {
  let nearest = world.guards[0];
  for (const guard of world.guards) {
    if (Math.hypot(guard.x - world.player.x, guard.y - world.player.y)
      < Math.hypot(nearest.x - world.player.x, nearest.y - world.player.y)) nearest = guard;
  }
  const dx = nearest.x - world.player.x;
  const dy = nearest.y - world.player.y;
  const length = Math.hypot(dx, dy) || 1;
  if (length < 140) return { move: { x: 0, y: 0 }, gait: 'walk' };
  return { move: { x: dx / length, y: dy / length }, gait: 'sprint' };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best level to show. 'start' is the title over a settled level; 'play' is
 * mid-heist; 'caught' is the caught screen; 'win' plays all three wings.
 */
export function stageShot(name, world) {
  if (name !== 'play' && name !== 'caught' && name !== 'win') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      stepWorld(world, STEP, { x: 0, y: 0 }, 'walk', null);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'caught') {
    for (let i = 0; i < CAUGHT_SECONDS / STEP; i += 1) {
      const pilot = recklessPilot(world);
      const events = stepWorld(world, STEP, pilot.move, pilot.gait, null);
      if (events & EVENT_CAUGHT) return { screen: SCREEN_CAUGHT, best: 0 };
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'win') {
    for (let i = 0; i < WIN_LIMIT_SECONDS / STEP; i += 1) {
      const pilot = autopilot(world);
      const events = stepWorld(world, STEP, pilot.move, pilot.gait, null);
      if (events & EVENT_GAME_WON) return { screen: SCREEN_WIN, best: 2 };
      if (world.triesLeft <= 0) return { screen: SCREEN_OVER, best: world.levelIndex };
      if (events & EVENT_LEVEL_CLEAR) {
        // Keep playing the next wing with the same pilot.
      }
    }
    return { screen: SCREEN_PLAY, best: world.levelIndex };
  }
  for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
    const pilot = autopilot(world);
    stepWorld(world, STEP, pilot.move, pilot.gait, null);
  }
  const over = world.triesLeft === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: 0 };
}
