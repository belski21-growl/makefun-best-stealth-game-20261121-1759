// Wardens: patrol, suspicion, chase. A warden walks its waypoints, pauses, and
// watches a cone in front of it. When it can see the thief its detection meter
// fills (faster up close, slower in shadow, slower still when the thief sneaks);
// at 35 it walks over to look, at 100 it chases. Noise — sprinting feet or a
// thrown pebble — pulls it to investigate. Lose sight for a while and it calms.

import { FIELD, GUARD, STEP } from './config.js';

export const STATE_PATROL = 'patrol';
export const STATE_SUSPICIOUS = 'suspicious';
export const STATE_ALERT = 'alert';
export const STATE_INVESTIGATE = 'investigate';

/** True when the straight line between two points crosses no wall or crate. */
export function lineOfSightClear(x1, y1, x2, y2, isSightBlocker) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / 8));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (isSightBlocker(x1 + dx * t, y1 + dy * t)) return false;
  }
  return true;
}

export function createGuard(patrol, random) {
  const waypoints = patrol.waypoints.map(([col, row]) => ({
    x: col * FIELD.tile + FIELD.tile / 2,
    y: row * FIELD.tile + FIELD.tile / 2,
  }));
  const start = waypoints[0];
  return {
    x: start.x,
    y: start.y,
    angle: 0,
    state: STATE_PATROL,
    waypointIndex: 1 % waypoints.length,
    pauseLeft: 0,
    meter: 0,
    lastSeen: null,
    investigateTarget: null,
    investigateLeft: 0,
    chaseLeft: 0,
    stepPhase: random() * Math.PI * 2,
    waypoints,
    pause: patrol.pause,
  };
}

function angleTo(guard, x, y) {
  return Math.atan2(y - guard.y, x - guard.x);
}

function turnToward(guard, targetAngle, maxTurn) {
  let diff = targetAngle - guard.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
  guard.angle += turn;
}

/** Move toward a point, sliding along walls; returns the distance left. */
function moveToward(guard, target, speed, dt, isBlocked) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return 0;
  const step = Math.min(distance, speed * dt);
  const nx = guard.x + (dx / distance) * step;
  const ny = guard.y + (dy / distance) * step;
  if (!isBlocked(nx, guard.y, GUARD.radius)) guard.x = nx;
  if (!isBlocked(guard.x, ny, GUARD.radius)) guard.y = ny;
  turnToward(guard, angleTo(guard, target.x, target.y), 6 * dt);
  return Math.hypot(target.x - guard.x, target.y - guard.y);
}

export function updateGuard(guard, dt, player, world) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const distance = Math.hypot(dx, dy);
  const facing = Math.atan2(dy, dx);
  let angleDiff = Math.abs(facing - guard.angle);
  if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
  const inCone = distance < GUARD.viewRange && angleDiff < GUARD.viewHalfAngle;
  const seen = inCone && world.lineOfSightClear(guard.x, guard.y, player.x, player.y);

  // Detection fills by closeness; shadow and sneaking both halve it.
  if (seen) {
    let rate = GUARD.detectRate * (1 - (distance / GUARD.viewRange) * 0.9);
    if (world.inShadow(player.x, player.y)) rate *= 0.5;
    if (player.sneaking) rate *= 0.5;
    guard.meter = Math.min(100, guard.meter + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
  } else {
    guard.meter = Math.max(0, guard.meter - GUARD.decayRate * dt);
  }

  // Footsteps: a loud gait inside earshot is heard even unseen.
  if (!seen && player.noiseRadius > 0 && distance < player.noiseRadius + 40) {
    if (guard.state === STATE_PATROL) {
      guard.state = STATE_INVESTIGATE;
      guard.investigateTarget = { x: player.x, y: player.y };
      guard.investigateLeft = GUARD.investigateTime;
    }
  }

  if (guard.meter >= 100 && guard.state !== STATE_ALERT) {
    guard.state = STATE_ALERT;
    guard.chaseLeft = GUARD.chaseMemory;
  } else if (guard.meter >= GUARD.suspiciousAt && guard.state === STATE_PATROL) {
    guard.state = STATE_SUSPICIOUS;
    guard.investigateTarget = guard.lastSeen ? { ...guard.lastSeen } : { x: player.x, y: player.y };
    guard.investigateLeft = GUARD.investigateTime;
  }

  if (guard.state === STATE_ALERT) {
    if (seen) {
      guard.chaseLeft = GUARD.chaseMemory;
      guard.lastSeen = { x: player.x, y: player.y };
    } else {
      guard.chaseLeft -= dt;
      if (guard.chaseLeft <= 0) {
        guard.state = STATE_INVESTIGATE;
        guard.investigateTarget = guard.lastSeen ? { ...guard.lastSeen } : { x: guard.x, y: guard.y };
        guard.investigateLeft = GUARD.investigateTime;
      }
    }
    const target = guard.lastSeen ?? { x: player.x, y: player.y };
    moveToward(guard, target, GUARD.chaseSpeed, dt, world.isBlocked);
    guard.stepPhase += dt * 11;
  } else if (guard.state === STATE_SUSPICIOUS || guard.state === STATE_INVESTIGATE) {
    const target = guard.investigateTarget ?? { x: guard.x, y: guard.y };
    const left = moveToward(guard, target, GUARD.investigateSpeed, dt, world.isBlocked);
    guard.stepPhase += dt * 8;
    if (left < 10) {
      guard.investigateLeft -= dt;
      // Look around while staring at the spot.
      guard.angle += Math.sin(guard.investigateLeft * 3) * 1.4 * dt;
      if (guard.investigateLeft <= 0) {
        guard.state = STATE_PATROL;
        guard.meter = Math.max(0, guard.meter - 30);
      }
    }
  } else {
    // Patrol: walk to the next waypoint, pause, turn to the next leg.
    if (guard.pauseLeft > 0) {
      guard.pauseLeft -= dt;
      if (guard.pauseLeft <= 0) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      }
    } else {
      const target = guard.waypoints[guard.waypointIndex];
      const left = moveToward(guard, target, GUARD.patrolSpeed, dt, world.isBlocked);
      guard.stepPhase += dt * 6;
      if (left < 8) guard.pauseLeft = guard.pause;
    }
  }

  return guard;
}

/** A pebble landing nearby pulls a patrolling or suspicious warden over to look. */
export function distractGuard(guard, x, y) {
  const distance = Math.hypot(x - guard.x, y - guard.y);
  if (guard.state === STATE_ALERT) return;
  if (distance < 260) {
    guard.state = STATE_INVESTIGATE;
    guard.investigateTarget = { x, y };
    guard.investigateLeft = GUARD.investigateTime;
    guard.meter = Math.max(guard.meter, 30);
  }
}

export { STEP };
