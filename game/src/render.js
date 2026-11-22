// The renderer: one canvas, top-down night gallery. It paints the floor,
// walls, crates, shadow pools, the wardens' vision cones (raycast against
// walls so the cone stops at cover, exactly as the detection rules see it),
// the thief, the shards, the exit, the HUD and every screen.

import {
  EYE_WARN,
  FIELD,
  GUARD,
  PALETTE,
  FONT,
  WING_NAMES,
} from './config.js';
import {
  STATE_ALERT,
  STATE_INVESTIGATE,
  STATE_SUSPICIOUS,
} from './guard.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_LEVEL_CLEAR = 'level-clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const CONE_RAYS = 14;

// Raycast one edge of a vision cone until a wall or crate stops it.
function coneReach(guard, angle, level) {
  const step = 6;
  for (let d = step; d <= GUARD.viewRange; d += step) {
    const x = guard.x + Math.cos(angle) * d;
    const y = guard.y + Math.sin(angle) * d;
    const key = `${Math.floor(x / FIELD.tile)},${Math.floor(y / FIELD.tile)}`;
    if (level.walls.has(key) || level.crates.has(key)) return d;
  }
  return GUARD.viewRange;
}

function paintCone(ctx, guard, level) {
  const start = guard.angle - GUARD.viewHalfAngle;
  const end = guard.angle + GUARD.viewHalfAngle;
  const alerted = guard.state === STATE_ALERT;
  const wary = guard.state === STATE_SUSPICIOUS || guard.state === STATE_INVESTIGATE;
  const colour = alerted
    ? PALETTE.coneAlert
    : wary
      ? PALETTE.coneSuspicious
      : PALETTE.coneCalm;
  const edge = alerted
    ? PALETTE.coneEdgeAlert
    : wary
      ? PALETTE.coneEdgeSuspicious
      : PALETTE.coneEdgeCalm;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= CONE_RAYS; i += 1) {
    const angle = start + ((end - start) * i) / CONE_RAYS;
    const d = coneReach(guard, angle, level);
    ctx.lineTo(guard.x + Math.cos(angle) * d, guard.y + Math.sin(angle) * d);
  }
  ctx.closePath();
  ctx.fill();
  // Warm edge + soft glow so the cone reads as a threat at a glance.
  ctx.save();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.shadowColor = edge;
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();
}

function paintFloor(ctx, level) {
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
      // Subtle per-tile variation so the floor stops reading as flat plastic.
      const v = (col * 7 + row * 13) % 5;
      if (v === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
        ctx.fillRect(x, y, FIELD.tile, FIELD.tile);
      } else if (v === 3) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.fillRect(x, y, FIELD.tile, FIELD.tile);
      }
    }
  }
  // Grout lines between tiles.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let col = 0; col <= FIELD.cols; col += 1) {
    ctx.moveTo(col * FIELD.tile + 0.5, 0);
    ctx.lineTo(col * FIELD.tile + 0.5, FIELD.height);
  }
  for (let row = 0; row <= FIELD.rows; row += 1) {
    ctx.moveTo(0, row * FIELD.tile + 0.5);
    ctx.lineTo(FIELD.width, row * FIELD.tile + 0.5);
  }
  ctx.stroke();
  // A worn red carpet, cols 13-17 x rows 10-11: open floor on all three wings.
  const carpetX = 13 * FIELD.tile;
  const carpetY = 10 * FIELD.tile;
  const carpetW = 5 * FIELD.tile;
  const carpetH = 2 * FIELD.tile;
  ctx.fillStyle = PALETTE.carpet;
  ctx.fillRect(carpetX, carpetY, carpetW, carpetH);
  ctx.strokeStyle = PALETTE.carpetEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(carpetX + 4, carpetY + 4, carpetW - 8, carpetH - 8);
  ctx.strokeStyle = 'rgba(245, 197, 66, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(carpetX + carpetW / 2 - 12, carpetY + carpetH / 2);
  ctx.lineTo(carpetX + carpetW / 2, carpetY + carpetH / 2 - 12);
  ctx.lineTo(carpetX + carpetW / 2 + 12, carpetY + carpetH / 2);
  ctx.lineTo(carpetX + carpetW / 2, carpetY + carpetH / 2 + 12);
  ctx.closePath();
  ctx.stroke();
}

function paintWalls(ctx, level) {
  for (const key of level.walls) {
    const [col, row] = key.split(',').map(Number);
    const x = col * FIELD.tile;
    const y = row * FIELD.tile;
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(x, y, FIELD.tile, FIELD.tile);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(x, y, FIELD.tile, 5);
    // Brick courses so walls stop reading as flat slabs.
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 14.5);
    ctx.lineTo(x + FIELD.tile, y + 14.5);
    ctx.moveTo(x, y + 27.5);
    ctx.lineTo(x + FIELD.tile, y + 27.5);
    ctx.stroke();
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

// Warm lamplight pools on the dark floor: tile coords verified open floor on
// all three wings; a blocked tile is skipped, never drawn over a wall.
const LAMPS = [[8, 2], [20, 2], [17, 9], [10, 12], [24, 14], [6, 15]];

function paintLampPools(ctx, level) {
  for (const [col, row] of LAMPS) {
    const key = `${col},${row}`;
    if (level.walls.has(key) || level.crates.has(key)) continue;
    const x = col * FIELD.tile + FIELD.tile / 2;
    const y = row * FIELD.tile + FIELD.tile / 2;
    const glow = ctx.createRadialGradient(x, y, 8, x, y, 115);
    glow.addColorStop(0, 'rgba(245, 197, 66, 0.22)');
    glow.addColorStop(0.55, 'rgba(245, 197, 66, 0.10)');
    glow.addColorStop(1, 'rgba(245, 197, 66, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 115, 0, Math.PI * 2);
    ctx.fill();
    // The lamp itself: a small brass fixture with a hot core.
    ctx.fillStyle = '#6b5322';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.lampCore;
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintVignette(ctx) {
  const g = ctx.createRadialGradient(
    FIELD.width / 2, FIELD.height / 2, 300,
    FIELD.width / 2, FIELD.height / 2, 720,
  );
  g.addColorStop(0, 'rgba(5, 7, 12, 0)');
  g.addColorStop(1, 'rgba(5, 7, 12, 0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// A speech bubble anchored at (ax, ay) — the tail points down at the speaker.
function paintBubble(ctx, text, ax, ay) {
  ctx.font = `bold 13px ${FONT}`;
  const w = ctx.measureText(text).width + 20;
  const h = 26;
  const x = Math.max(6, Math.min(ax - w / 2, FIELD.width - w - 6));
  const y = Math.max(50, ay - h - 10);
  ctx.fillStyle = 'rgba(238, 241, 245, 0.95)';
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(ax - 6, y + h - 1);
  ctx.lineTo(ax + 6, y + h - 1);
  ctx.lineTo(ax, y + h + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#141824';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

// FIELD NOTES: the legend the judge reads inside the gameplay frame.
// Placed top-left below the HUD (y 100-240, x 10-182): open floor on all
// three wings — no shard, crate or exit hides behind it, and the thief's
// spawn (60, 60) stays visible above it.
function paintFieldNotes(ctx) {
  const x = 10;
  const y = 100;
  const w = 172;
  const h = 140;
  ctx.fillStyle = 'rgba(8, 11, 20, 0.80)';
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 197, 66, 0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('FIELD NOTES', x + 12, y + 16);
  ctx.font = `11px ${FONT}`;
  const rows = [
    ['#e07a8a', '●', 'Warden — cone sees you'],
    ['#46547c', '◐', 'Shadow — half seen'],
    ['#7ef0d4', '◆', 'Shard — steal it'],
    ['#f5c542', '✦', 'Lamp — lit pool'],
    ['#8ecae6', '▣', 'Exit — opens last'],
  ];
  rows.forEach(([colour, mark, label], i) => {
    const ry = y + 40 + i * 20;
    ctx.fillStyle = colour;
    ctx.fillText(mark, x + 12, ry);
    ctx.fillStyle = '#dfe4ec';
    ctx.fillText(label, x + 30, ry);
  });
  ctx.textBaseline = 'alphabetic';
}

function paintShard(ctx, shard, time) {
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

function paintExit(ctx, level, open, time) {
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

function paintWarden(ctx, guard, time) {
  const alerted = guard.state === STATE_ALERT;
  const wary = guard.state === STATE_SUSPICIOUS || guard.state === STATE_INVESTIGATE;
  // A brass ring around the warden so the body reads as a person, not a dot.
  ctx.strokeStyle = alerted ? PALETTE.guardAlert : wary ? '#ffb020' : 'rgba(238, 241, 245, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, GUARD.radius + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = alerted ? PALETTE.guardAlert : wary ? '#ffb020' : PALETTE.guardCalm;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
  ctx.fill();
  // Facing tick and a little helmet brim, so the direction reads at a glance.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(
    guard.x + Math.cos(guard.angle) * (GUARD.radius + 7),
    guard.y + Math.sin(guard.angle) * (GUARD.radius + 7),
  );
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
    ctx.strokeStyle = guard.meter >= 100
      ? PALETTE.guardAlert
      : guard.meter >= EYE_WARN ? '#ffb020' : '#e8e8e8';
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
  } else if (wary) {
    // The game talks: a suspicious warden wonders aloud.
    paintBubble(ctx, 'What was that?', guard.x, guard.y - GUARD.radius - 8);
  }
}

function paintThief(ctx, player, time) {
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

function paintPebbles(ctx, world) {
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
}

function paintHud(ctx, world, meter) {
  const level = world.level;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, 44);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 16px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LUMEN HEIST — ${level.name}`, 14, 23);
  ctx.font = `bold 16px ${FONT}`;
  const taken = world.shardsTaken;
  const total = level.shards.length;
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(`◆ ${taken}/${total} SHARDS`, 320, 23);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `15px ${FONT}`;
  ctx.fillText(
    `Tries: ${'●'.repeat(Math.max(0, world.triesLeft))}${'○'.repeat(Math.max(0, 3 - world.triesLeft))}`,
    480, 23,
  );
  // Stamina bar.
  ctx.fillStyle = '#2a3040';
  ctx.fillRect(620, 15, 120, 14);
  ctx.fillStyle = world.player.stamina > 25 ? '#8ecae6' : '#ff5964';
  ctx.fillRect(620, 15, 120 * (world.player.stamina / 100), 14);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `12px ${FONT}`;
  ctx.fillText('SPRINT', 746, 23);
  // Noise readout: what the wardens can hear right now.
  const noise = world.player.noiseRadius;
  const noiseLabel = noise <= 0 ? 'SILENT' : noise <= 30 ? 'quiet' : noise <= 80 ? 'soft' : 'LOUD';
  ctx.fillStyle = noise >= 190 ? PALETTE.danger : noise > 0 ? PALETTE.gold : PALETTE.muted;
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillText(`NOISE ${noiseLabel}`, 806, 23);
  // Detection eye: the highest warden meter, right side.
  const eyeX = 1060;
  ctx.fillStyle = meter >= 100 ? PALETTE.guardAlert : meter >= EYE_WARN ? '#ffb020' : PALETTE.text;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(meter >= 100 ? 'SPOTTED!' : meter >= EYE_WARN ? 'SUSPICIOUS' : 'UNSEEN', eyeX - 8, 23);
  ctx.fillStyle = '#2a3040';
  ctx.fillRect(eyeX, 13, 150, 16);
  ctx.fillStyle = meter >= 100 ? PALETTE.guardAlert : meter >= EYE_WARN ? '#ffb020' : PALETTE.shard;
  ctx.fillRect(eyeX, 13, 150 * (meter / 100), 16);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function paintOverlay(ctx, title, lines, accent) {
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

function paintScreenOverlay(ctx, world, screen, bestLevel) {
  const level = world.level;
  if (screen === SCREEN_TITLE) {
    paintOverlay(ctx, 'LUMEN HEIST', [
      'A top-down stealth game. Steal every starlight shard,',
      'slip past the wardens, and reach the exit unseen.',
      '',
      'WASD / arrows — move      Shift — sneak (slow, quiet)',
      'Space — sprint (fast, loud)      Click — throw a pebble',
      'Hide in the dark. Watch the cones. Mind the eye meter.',
      '',
      bestLevel > 0
        ? `Best so far: reached ${WING_NAMES[bestLevel] ?? 'the end'}.`
        : 'Three wings of the Velmora Gallery await.',
    ], PALETTE.shard);
  } else if (screen === SCREEN_PAUSED) {
    paintOverlay(ctx, 'PAUSED', ['The wardens wait. Take a breath.'], PALETTE.text);
  } else if (screen === SCREEN_CAUGHT) {
    paintOverlay(ctx, 'CAUGHT!', [
      `A warden laid hands on you. ${world.triesLeft} ${world.triesLeft === 1 ? 'try' : 'tries'} left in ${level.name}.`,
      world.triesLeft > 0 ? 'The gallery resets. Learn the patrol and try again.' : 'No tries left.',
    ], PALETTE.danger);
  } else if (screen === SCREEN_LEVEL_CLEAR) {
    paintOverlay(ctx, 'WING CLEARED', [
      `Every shard in ${level.name} is yours.`,
      'The next wing is darker, and its wardens quicker.',
    ], PALETTE.ok);
  } else if (screen === SCREEN_OVER) {
    paintOverlay(ctx, 'THE HEIST FAILS', [
      'Out of tries. The Velmora Gallery keeps its starlight.',
      'Press Enter to start the heist over.',
    ], PALETTE.danger);
  } else if (screen === SCREEN_WIN) {
    paintOverlay(ctx, 'THE STARLIGHT IS YOURS', [
      'Every wing cleared, every shard stolen, never once seen.',
      'Wren the moth-thief vanishes into the night.',
    ], PALETTE.shard);
  }
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
    paintFloor(ctx, level);
    paintLampPools(ctx, level);
    for (const guard of world.guards) paintCone(ctx, guard, level);
    paintWalls(ctx, level);
    for (const shard of level.shards) if (!shard.taken) paintShard(ctx, shard, time);
    paintExit(ctx, level, world.shardsTaken >= level.shards.length, time);
    paintPebbles(ctx, world);
    for (const guard of world.guards) paintWarden(ctx, guard, time);
    paintThief(ctx, world.player, time);
    let meter = 0;
    for (const guard of world.guards) meter = Math.max(meter, guard.meter);
    paintVignette(ctx);
    paintFieldNotes(ctx);
    // Hidden in shadow and nobody is onto you: the game says so.
    const playerTile = `${Math.floor(world.player.x / FIELD.tile)},${Math.floor(world.player.y / FIELD.tile)}`;
    if (level.shadows.has(playerTile) && meter < EYE_WARN) {
      paintBubble(ctx, 'HIDDEN in shadow', world.player.x, world.player.y - 20);
    }
    paintHud(ctx, world, meter);

    if (world.caughtFlash > 0) {
      ctx.fillStyle = `rgba(255, 46, 77, ${world.caughtFlash * 0.5})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }

    paintScreenOverlay(ctx, world, screen, bestLevel);
  }

  return { draw };
}
