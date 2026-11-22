// Lumen Heist — every number the game is tuned by, in one module.
// The playfield is a fixed logical 1280x720; the renderer scales it to the
// window, so no value below depends on the display size.

export const STEP = 1 / 60;
export const TRIES_PER_LEVEL = 3;
export const BEST_KEY = 'lumen-heist.best-level';
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

const TILE_PX = 40;
const GRID_COLS = 32;
const GRID_ROWS = 18;
export const FIELD = {
  width: GRID_COLS * TILE_PX, height: GRID_ROWS * TILE_PX,
  tile: TILE_PX, cols: GRID_COLS, rows: GRID_ROWS,
};

// The thief: body radius, the three gaits, stamina, and how far each gait
// carries sound. Sprint drains stamina; anything else lets it recover.
export const PLAYER = {
  radius: 13, walkSpeed: 165, sneakSpeed: 95, sprintSpeed: 250,
  staminaMax: 100, staminaDrain: 30, staminaRegen: 26,
  noiseWalk: 70, noiseSneak: 26, noiseSprint: 190,
};

// A warden: body radius, the three paces, and the vision cone — 250px reach,
// 0.62 rad half-angle. The meter fills 55/s point blank, decays 26/s unseen,
// turns suspicious at 25, and a chase is remembered for 4s after losing sight.
export const GUARD = {
  radius: 14, patrolSpeed: 78, chaseSpeed: 168, investigateSpeed: 118,
  viewRange: 250, viewHalfAngle: 0.62,
  detectRate: 55, decayRate: 26, suspiciousAt: 25,
  chaseMemory: 4, investigateTime: 2.6, catchDistance: 26,
};

export const SHARD = { radius: 12 };
export const PEBBLE = { radius: 8, noiseRadius: 220, cooldown: 2.5 };

// How much the two dampers soften detection: hiding in shadow, and sneaking.
export const SHADOW_DAMP = 0.5;
export const SNEAK_DAMP = 0.5;

// Meter level where the HUD eye and the warden arcs turn amber. This is a
// display threshold only — suspicion itself starts at GUARD.suspiciousAt.
export const EYE_WARN = 35;

// The three wings, in order, for the title screen's best-so-far line.
export const WING_NAMES = ['The Atrium', 'The Vault Wing', 'The Star Vault'];

export const PALETTE = {
  backdrop: '#0a0d16', floor: '#1b202e', floorAlt: '#1e2436',
  shadowFloor: '#12172a', wall: '#333d5c', wallTop: '#4d5c85',
  crate: '#5a4632', crateTop: '#7d6547',
  player: '#ffd166', playerSneak: '#e8b64c',
  guard: '#ef476f', guardCalm: '#e07a8a', guardAlert: '#ff2e4d',
  coneCalm: 'rgba(245, 197, 66, 0.30)',
  coneSuspicious: 'rgba(255, 176, 32, 0.40)',
  coneAlert: 'rgba(255, 46, 77, 0.42)',
  coneEdgeCalm: 'rgba(245, 197, 66, 0.60)',
  coneEdgeSuspicious: 'rgba(255, 176, 32, 0.75)',
  coneEdgeAlert: 'rgba(255, 46, 77, 0.75)',
  lampCore: '#ffd98a', lampGlow: 'rgba(245, 197, 66, 0.22)',
  carpet: '#4a2c33', carpetEdge: 'rgba(245, 197, 66, 0.55)',
  gold: '#f5c542',
  shard: '#7ef0d4', exit: '#8ecae6',
  exitGlow: 'rgba(142, 202, 230, 0.25)',
  text: '#eef1f5', muted: '#8b93a3',
  panel: 'rgba(10, 13, 22, 0.82)',
  danger: '#ff5964', ok: '#7ef0d4',
};
