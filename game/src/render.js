// The renderer: one canvas, top-down night gallery. It paints the floor, walls,
// crates, shadow pools, the wardens' vision cones (raycast against walls so the
// cone stops at cover, exactly as the detection rules see it), the thief, the
// shards, the exit, the HUD and every screen.

import { FIELD, GUARD, PALETTE, FONT } from './config.js';
import { STATE_ALERT, STATE_INVESTIGATE, STATE_SUSPICIOUS } from './guard.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_LEVEL_CLEAR = 'level-clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** Raycast one edge of a vision cone until a wall or crate stops it. */
function rayDistance(guard, angle, level) {
  const step = 6;
  for (let d = step; d <= GUARD.viewRange; d += step) {
    const x = guard.x + Math.cos(angle) * d;
    const y = guard.y + Math.sin(angle) * d;
    const key = `${Math.floor(x / FIELD.tile)},${Math.floor(y / FIELD.tile)}`;
    if (level.walls.has(key) || level.crates.has(key)) return d;
  }
  return GUARD.viewRange;
}

function drawCone(ctx, guard, level) {
  const rays = 14;
  const start = guard.angle - GUARD.viewHalfAngle;
  const end = guard.angle + GUARD.viewHalfAngle;
  const colour = guard.state === STATE_ALERT
    ? PALETTE.coneAlert
    : guard.state === STATE_SUSPICIOUS || guard.state === STATE_INVESTIGATE
      ? PALETTE.coneSuspicious
      : PALETTE.coneCalm;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= rays; i += 1) {
    const angle = start + ((end - start) * i) / rays;
    const d = rayDistance(guard, angle, level);
    ctx.lineTo(guard.x + Math.cos(angle) * d, guard.y + Math.sin(angle) * d);
  }
  ctx.closePath();
  ctx.fill();
}

function drawTileFloor(ctx, level) {
  for (let row = 0; row < FIELD.rows; row += 1) {
    for (let col = 0; col < FIELD.cols; col += 1) {
      const x = col * FIELD.tile;
      const y = row * FIELD.tile;
      const key = `${col},${row}`;
      if (level.walls.has(key)) continue;
      ctx.fillStyle = level.shadows.has(key)
        ? PALETTE.shadowFloor
        : (col + row) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
      ctx.fillRect(x, y, FIELD.tile, FIELD.tile);
    }
  }
}

function drawWallsAndCrates(ctx, level) {
  for (const key of level.walls) {
    const [col, row] = key.split(',').map(Number);
    const x = col * FIELD.tile;
    const y = row * FIELD.tile;
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(x, y, FIELD.tile, FIELD.tile);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(x, y, FIELD.tile, 5);
  }
  for (const key of level.crates) {
    const [col, row] = key.split(',').map(Number);
    const x = col * FIELD.tile + 3;
    const y = row * FIELD.tile + 3;
    ctx.fillStyle = PALETTE.crate;
    ctx.fillRect(x, y, FIELD.tile - 6, FIELD.tile - 6);
    ctx.fillStyle = PALETTE.crateTop;
    ctx.fillRect(x, y, FIELD.tile - 6, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, FIELD.tile - 8, FIELD.tile - 8);
  }
}

function drawShard(ctx, shard, time) {
  const pulse = 0.7 + 0.3 * Math.sin(time * 3 + shard.x);
  ctx.save();
  ctx.translate(shard.x, shard.y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = PALETTE.shard;
  ctx.globalAlpha = pulse;
  const s = 10;
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = PALETTE.shard;
  ctx.lineWidth = 2;
  ctx.strokeRect(-s / 2 - 4, -s / 2 - 4, s + 8, s + 8);
  ctx.restore();
}

function drawExit(ctx, level, open, time) {
  const { x, y } = level.exit;
  const glow = 0.5 + 0.3 * Math.sin(time * 2);
  ctx.fillStyle = open ? `rgba(142, 202, 230, ${glow})` : 'rgba(142, 202, 230, 0.12)';
  ctx.beginPath();
  ctx.arc(x, y, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.exit;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 14, y - 18, 28, 36);
  ctx.fillStyle = open ? PALETTE.exit : PALETTE.muted;
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', x, y + 32);
}

function drawGuard(ctx, guard, time) {
  const alerted = guard.state === STATE_ALERT;
  const suspicious = guard.state === STATE_SUSPICIOUS || guard.state === STATE_INVESTIGATE;
  ctx.fillStyle = alerted ? PALETTE.guardAlert : suspicious ? '#ffb020' : PALETTE.guardCalm;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
  ctx.fill();
  // Facing tick and a little helmet brim, so the direction reads at a glance.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.angle) * (GUARD.radius + 7), guard.y + Math.sin(guard.angle) * (GUARD.radius + 7));
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(guard.x - Math.sin(guard.angle) * 4, guard.y + Math.cos(guard.angle) * 4, 2.5, 0, Math.PI * 2);
  ctx.arc(guard.x + Math.sin(guard.angle) * 4, guard.y - Math.cos(guard.angle) * 4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Footstep dots trail behind a moving warden: sound you can see.
  const bob = Math.sin(guard.stepPhase) * 3;
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(guard.x - Math.cos(guard.angle) * 20, guard.y - Math.sin(guard.angle) * 20 + bob, 2, 0, Math.PI * 2);
  ctx.fill();
  // Detection meter arc over the warden's head.
  if (guard.meter > 2) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius + 7, -Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();
    ctx.strokeStyle = guard.meter >= 100 ? PALETTE.guardAlert : guard.meter >= 35 ? '#ffb020' : '#e8e8e8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius + 7, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * guard.meter) / 100);
    ctx.stroke();
  }
  if (alerted) {
    ctx.fillStyle = PALETTE.guardAlert;
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - GUARD.radius - 12);
  } else if (suspicious) {
    ctx.fillStyle = '#ffb020';
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - GUARD.radius - 12);
  }
}

function drawPlayer(ctx, player, time) {
  // Noise ring: what the wardens can hear, drawn so the player can feel it.
  if (player.noiseRadius > 0) {
    const pulse = 0.25 + 0.1 * Math.sin(time * 6);
    ctx.strokeStyle = `rgba(255, 209, 102, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.noiseRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = player.sneaking ? PALETTE.playerSneak : PALETTE.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 13, 0, Math.PI * 2);
  ctx.fill();
  // Hood point and eyes, facing up by default: the thief is a small hooded moth.
  ctx.fillStyle = '#0a0d16';
  ctx.beginPath();
  ctx.arc(player.x - 4, player.y - 2, 2.2, 0, Math.PI * 2);
  ctx.arc(player.x + 4, player.y - 2, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.player;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x - 6, player.y - 9);
  ctx.lineTo(player.x, player.y - 14);
  ctx.lineTo(player.x + 6, player.y - 9);
  ctx.stroke();
}

function drawHud(ctx, world, meter) {
  const level = world.level;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, 44);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 16px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LUMEN HEIST — ${level.name}`, 14, 23);
  ctx.font = `15px ${FONT}`;
  const taken = world.shardsTaken;
  const total = level.shards.length;
  ctx.fillStyle = PALETTE.shard;
  ctx.fillText(`◆ ${taken}/${total} shards`, 330, 23);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`Tries: ${'●'.repeat(Math.max(0, world.triesLeft))}${'○'.repeat(Math.max(0, 3 - world.triesLeft))}`, 470, 23);
  // Stamina bar.
  ctx.fillStyle = '#2a3040';
  ctx.fillRect(620, 15, 120, 14);
  ctx.fillStyle = world.player.stamina > 25 ? '#8ecae6' : '#ff5964';
  ctx.fillRect(620, 15, 120 * (world.player.stamina / 100), 14);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `12px ${FONT}`;
  ctx.fillText('SPRINT', 746, 23);
  // Detection eye: the highest warden meter, right side.
  const eyeX = 1060;
  ctx.fillStyle = meter >= 100 ? PALETTE.guardAlert : meter >= 35 ? '#ffb020' : PALETTE.text;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(meter >= 100 ? 'SPOTTED!' : meter >= 35 ? 'SUSPICIOUS' : 'UNSEEN', eyeX - 8, 23);
  ctx.fillStyle = '#2a3040';
  ctx.fillRect(eyeX, 13, 150, 16);
  ctx.fillStyle = meter >= 100 ? PALETTE.guardAlert : meter >= 35 ? '#ffb020' : PALETTE.shard;
  ctx.fillRect(eyeX, 13, 150 * (meter / 100), 16);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 7, 12, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent ?? PALETTE.text;
  ctx.font = `bold 52px ${FONT}`;
  ctx.fillText(title, FIELD.width / 2, 300);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `19px ${FONT}`;
  lines.forEach((line, i) => {
    ctx.fillText(line, FIELD.width / 2, 352 + i * 32);
  });
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `15px ${FONT}`;
  ctx.fillText('Press Enter or click to continue', FIELD.width / 2, 352 + lines.length * 32 + 24);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  function draw(world, screen, bestLevel) {
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const level = world.level;
    const time = world.time;
    drawTileFloor(ctx, level);
    for (const guard of world.guards) drawCone(ctx, guard, level);
    drawWallsAndCrates(ctx, level);
    for (const shard of level.shards) if (!shard.taken) drawShard(ctx, shard, time);
    drawExit(ctx, level, world.shardsTaken >= level.shards.length, time);
    for (const pebble of world.pebbles) {
      ctx.fillStyle = '#cfd6e4';
      ctx.beginPath();
      ctx.arc(pebble.x, pebble.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(207, 214, 228, 0.5)';
      ctx.beginPath();
      ctx.arc(pebble.x, pebble.y, 22 * (1 - pebble.ttl / 1.6) + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const guard of world.guards) drawGuard(ctx, guard, time);
    drawPlayer(ctx, world.player, time);
    let meter = 0;
    for (const guard of world.guards) meter = Math.max(meter, guard.meter);
    drawHud(ctx, world, meter);

    if (world.caughtFlash > 0) {
      ctx.fillStyle = `rgba(255, 46, 77, ${world.caughtFlash * 0.5})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }

    if (screen === SCREEN_TITLE) {
      overlay(ctx, 'LUMEN HEIST', [
        'A top-down stealth game. Steal every starlight shard,',
        'slip past the wardens, and reach the exit unseen.',
        '',
        'WASD / arrows — move      Shift — sneak (slow, quiet)',
        'Space — sprint (fast, loud)      Click — throw a pebble',
        'Hide in the dark. Watch the cones. Mind the eye meter.',
        '',
        bestLevel > 0 ? `Best so far: reached ${['The Atrium', 'The Vault Wing', 'The Star Vault'][bestLevel] ?? 'the end'}.` : 'Three wings of the Velmora Gallery await.',
      ], PALETTE.shard);
    } else if (screen === SCREEN_PAUSED) {
      overlay(ctx, 'PAUSED', ['The wardens wait. Take a breath.'], PALETTE.text);
    } else if (screen === SCREEN_CAUGHT) {
      overlay(ctx, 'CAUGHT!', [
        `A warden laid hands on you. ${world.triesLeft} ${world.triesLeft === 1 ? 'try' : 'tries'} left in ${level.name}.`,
        world.triesLeft > 0 ? 'The gallery resets. Learn the patrol and try again.' : 'No tries left.',
      ], PALETTE.danger);
    } else if (screen === SCREEN_LEVEL_CLEAR) {
      overlay(ctx, 'WING CLEARED', [
        `Every shard in ${level.name} is yours.`,
        'The next wing is darker, and its wardens quicker.',
      ], PALETTE.ok);
    } else if (screen === SCREEN_OVER) {
      overlay(ctx, 'THE HEIST FAILS', [
        'Out of tries. The Velmora Gallery keeps its starlight.',
        'Press Enter to start the heist over.',
      ], PALETTE.danger);
    } else if (screen === SCREEN_WIN) {
      overlay(ctx, 'THE STARLIGHT IS YOURS', [
        'Every wing cleared, every shard stolen, never once seen.',
        'Wren the moth-thief vanishes into the night.',
      ], PALETTE.shard);
    }
  }

  return { draw };
}
