// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between seven screens: title, play,
// paused, caught, level-clear, game over and win.
//
// ?seed=N fixes the patrol jitter. ?shot=start|play|caught|win (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, stepWorld, EVENT_CAUGHT, EVENT_GAME_WON, EVENT_LEVEL_CLEAR, EVENT_SHARD, EVENT_THROW } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_THROW, createInput } from './input.js';
import { createRenderer, SCREEN_CAUGHT, SCREEN_LEVEL_CLEAR, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { STATE_ALERT } from './guard.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

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
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastAlerted = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    const fresh = createWorld(createRandom(Math.floor(Math.random() * 4294967296)));
    world.levelIndex = fresh.levelIndex;
    world.level = fresh.level;
    world.guards = fresh.guards;
    world.player.x = fresh.player.x;
    world.player.y = fresh.player.y;
    world.pebbles = [];
    world.triesLeft = fresh.triesLeft;
    world.shardsTaken = 0;
    world.time = 0;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Steal every shard, reach the exit unseen.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_THROW && screen === SCREEN_PLAY) {
      const click = input.takeClick();
      if (click && world.pebbleCooldown <= 0) {
        // The throw itself is applied in step(); stash the point on the world.
        world.pendingThrow = click;
        audio.unlock();
      }
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_CAUGHT && world.triesLeft > 0) screen = SCREEN_PLAY;
      else if (screen === SCREEN_CAUGHT) screen = SCREEN_OVER;
      else if (screen === SCREEN_LEVEL_CLEAR) screen = SCREEN_PLAY;
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    } else if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function step() {
    const direction = input.direction();
    let gait = 'walk';
    if (input.sneaking()) gait = 'sneak';
    else if (input.sprinting() && world.player.stamina > 0) gait = 'sprint';
    const throwAt = world.pendingThrow ?? null;
    world.pendingThrow = null;
    const events = stepWorld(world, STEP, direction, gait, throwAt);
    if (events & EVENT_THROW) audio.pebble();
    if (events & EVENT_SHARD) {
      audio.shard();
      announce(`${world.shardsTaken} of ${world.level.shards.length} shards.`);
    }
    const alerted = world.guards.some((guard) => guard.state === STATE_ALERT);
    if (alerted && !lastAlerted) {
      audio.alert();
      announce('Spotted! Run — break line of sight!');
    }
    lastAlerted = alerted;
    if (events & EVENT_CAUGHT) {
      audio.caught();
      if (world.triesLeft > 0) {
        screen = SCREEN_CAUGHT;
        announce(`Caught. ${world.triesLeft} tries left.`);
      } else {
        screen = SCREEN_OVER;
        announce('Game over. Out of tries.');
      }
    } else if (events & EVENT_LEVEL_CLEAR) {
      best = Math.max(best, world.levelIndex);
      saveBest(best);
      screen = SCREEN_LEVEL_CLEAR;
      announce(`Wing cleared. Next: ${world.level.name}.`);
    } else if (events & EVENT_GAME_WON) {
      best = 2;
      saveBest(best);
      audio.win();
      screen = SCREEN_WIN;
      announce('You stole the starlight. The heist is yours.');
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
    renderer.draw(world, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting wardens close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lumen Heist. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
