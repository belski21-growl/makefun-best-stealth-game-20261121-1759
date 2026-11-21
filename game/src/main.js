// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between seven screens: title,
// play, paused, caught, level-clear, game over and win.
//
// ?seed=N fixes the patrol jitter. ?shot=start|play|caught|win (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  stepWorld,
  EVENT_CAUGHT,
  EVENT_GAME_WON,
  EVENT_LEVEL_CLEAR,
  EVENT_SHARD,
  EVENT_THROW,
} from './world.js';
import {
  ACTION_CONFIRM,
  ACTION_PAUSE,
  ACTION_THROW,
  createInput,
} from './input.js';
import {
  createRenderer,
  SCREEN_CAUGHT,
  SCREEN_LEVEL_CLEAR,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
} from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { STATE_ALERT } from './guard.js';

// The longest frame the loop catches up on; a longer stall is dropped, not replayed.
const FRAME_CAP = 0.25;

const query = new URLSearchParams(window.location.search);
const shotName = query.get('shot');
const seedText = Number.parseInt(query.get('seed') ?? '', 10);
const seedValue = Number.isInteger(seedText) ? seedText : randomSeed();

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const game = createWorld(createRandom(seedValue));
const painter = createRenderer(canvas);
const sound = createAudio();

function randomSeed() {
  return Math.floor(Math.random() * 4294967296);
}

function loadBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function storeBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function playShot(name) {
  const scene = stageShot(name, game);
  let painted = 0;
  function paint() {
    painter.draw(game, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function playGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = loadBest();
  let bank = 0;
  let prevNow = performance.now();
  let wasAlerted = false;

  function say(message) {
    statusLine.textContent = message;
  }

  function freshGame() {
    const fresh = createWorld(createRandom(randomSeed()));
    game.levelIndex = fresh.levelIndex;
    game.level = fresh.level;
    game.guards = fresh.guards;
    game.player.x = fresh.player.x;
    game.player.y = fresh.player.y;
    game.pebbles = [];
    game.triesLeft = fresh.triesLeft;
    game.shardsTaken = 0;
    game.time = 0;
    bank = 0;
    screen = SCREEN_PLAY;
    say('Playing. Steal every shard, reach the exit unseen.');
  }

  function pollActions() {
    const actions = input.takeActions();
    if (actions & ACTION_THROW && screen === SCREEN_PLAY) {
      const click = input.takeClick();
      if (click && game.pebbleCooldown <= 0) {
        // The throw itself is applied in step(); stash the point on the world.
        game.pendingThrow = click;
        sound.unlock();
      }
    }
    if (actions & ACTION_CONFIRM) {
      sound.unlock();
      const restarts = [SCREEN_TITLE, SCREEN_OVER, SCREEN_WIN];
      if (restarts.includes(screen)) freshGame();
      else if (screen === SCREEN_CAUGHT && game.triesLeft > 0) screen = SCREEN_PLAY;
      else if (screen === SCREEN_CAUGHT) screen = SCREEN_OVER;
      else if (screen === SCREEN_LEVEL_CLEAR) screen = SCREEN_PLAY;
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    } else if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        say('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        say('Playing.');
      }
    }
  }

  function advance() {
    const direction = input.direction();
    let gait = 'walk';
    if (input.sneaking()) gait = 'sneak';
    else if (input.sprinting() && game.player.stamina > 0) gait = 'sprint';
    const throwAt = game.pendingThrow ?? null;
    game.pendingThrow = null;
    const events = stepWorld(game, STEP, direction, gait, throwAt);
    if (events & EVENT_THROW) sound.pebble();
    if (events & EVENT_SHARD) {
      sound.shard();
      say(`${game.shardsTaken} of ${game.level.shards.length} shards.`);
    }
    const alerted = game.guards.some((guard) => guard.state === STATE_ALERT);
    if (alerted && !wasAlerted) {
      sound.alert();
      say('Spotted! Run — break line of sight!');
    }
    wasAlerted = alerted;
    if (events & EVENT_CAUGHT) {
      sound.caught();
      if (game.triesLeft > 0) {
        screen = SCREEN_CAUGHT;
        say(`Caught. ${game.triesLeft} tries left.`);
      } else {
        screen = SCREEN_OVER;
        say('Game over. Out of tries.');
      }
    } else if (events & EVENT_LEVEL_CLEAR) {
      best = Math.max(best, game.levelIndex);
      storeBest(best);
      screen = SCREEN_LEVEL_CLEAR;
      say(`Wing cleared. Next: ${game.level.name}.`);
    } else if (events & EVENT_GAME_WON) {
      best = 2;
      storeBest(best);
      sound.win();
      screen = SCREEN_WIN;
      say('You stole the starlight. The heist is yours.');
    }
  }

  function tick(now) {
    requestAnimationFrame(tick);
    bank += Math.min((now - prevNow) / 1000, FRAME_CAP);
    prevNow = now;
    pollActions();
    if (screen === SCREEN_PLAY) {
      while (bank >= STEP && screen === SCREEN_PLAY) {
        advance();
        bank -= STEP;
      }
    } else {
      bank = 0;
    }
    painter.draw(game, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting wardens close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      say('Paused.');
    }
  });

  say('Lumen Heist. Press Space or click to start.');
  requestAnimationFrame(tick);
}

if (shotName) playShot(shotName);
else playGame();
