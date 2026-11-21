// Lumen Heist — every tuning number, colour and shared constant in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, tile: 40, cols: 32, rows: 18 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 165,
  sneakSpeed: 95,
  sprintSpeed: 250,
  staminaMax: 100,
  staminaDrain: 30,
  staminaRegen: 26,
  /** Noise radius (px) each gait broadcasts; guards inside it hear the player. */
  noiseWalk: 70,
  noiseSneak: 26,
  noiseSprint: 190,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 78,
  chaseSpeed: 168,
  investigateSpeed: 118,
  /** Vision cone: how far a warden sees, and its half-angle in radians. */
  viewRange: 250,
  viewHalfAngle: 0.62,
  /** Detection meter (0..100) fills per second at point blank, scaled by distance. */
  detectRate: 55,
  decayRate: 26,
  /** Meter at which a warden stops patrolling and walks over to look. */
  suspiciousAt: 25,
  /** Seconds a warden keeps chasing after losing sight before giving up. */
  chaseMemory: 4,
  /** Seconds a warden stares at an investigated spot before resuming patrol. */
  investigateTime: 2.6,
  /** Touching the player while alerted ends the level. */
  catchDistance: 26,
};

export const SHARD = { radius: 12 };
export const PEBBLE = { radius: 8, noiseRadius: 220, cooldown: 2.5 };

export const TRIES_PER_LEVEL = 3;

export const PALETTE = {
  backdrop: '#0a0d16',
  floor: '#171c2b',
  floorAlt: '#1a2032',
  shadowFloor: '#101527',
  wall: '#2e3752',
  wallTop: '#46547c',
  crate: '#5a4632',
  crateTop: '#7d6547',
  player: '#ffd166',
  playerSneak: '#e8b64c',
  guard: '#ef476f',
  guardCalm: '#e07a8a',
  guardAlert: '#ff2e4d',
  coneCalm: 'rgba(239, 71, 111, 0.16)',
  coneSuspicious: 'rgba(255, 176, 32, 0.30)',
  coneAlert: 'rgba(255, 46, 77, 0.38)',
  shard: '#7ef0d4',
  exit: '#8ecae6',
  exitGlow: 'rgba(142, 202, 230, 0.25)',
  text: '#eef1f5',
  muted: '#8b93a3',
  panel: 'rgba(10, 13, 22, 0.82)',
  danger: '#ff5964',
  ok: '#7ef0d4',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const BEST_KEY = 'lumen-heist.best-level';
