# Goldfish review — best-stealth-game-20261121-1759 ("Lumen Heist")

Reviewed 22 Nov 2026 ~02:45 WIB (pre-submit gate, heavy track).
Attachments read in full: `top10-analysis.md` (22 Nov ~02:25 WIB) + all 4
screenshots (verified on disk: 1280x720 JPEG, 39–62 KiB each).
Sources checked: `README.md`, `build-log.md` (incl. post-open revision),
`main.ts` + `game/src/*` (1,517 lines total).

## Verdict: LAYAK SUBMIT — as built, no rebuild

No blocking issue. The entry is a real, complete stealth game whose
screenshots are real renders of its own code, and its visual grammar sits in
the top band the leaderboard shows. Submit after the user's approval; do not
spend a rebuild chasing the provisional ranks.

## How the judge actually sees this entry

- The judge compares screenshots pairwise + a source outline; it never plays
  the game. Cover legibility and visible stealth readability decide, not the
  mechanics list.
- Early field: 2,208 entries, 2,195 at 12-0. The top 20 are a tie-break, not a
  quality gap. This entry is a lottery ticket among many strong-looking
  covers — a submit is justified, a top-10 finish is not provable from
  anything in the early leaderboard.

## Screenshot-by-screenshot

### 1-play.jpg (cover) — mid-heist, SUSPICIOUS — GOOD, with one weakness
- What reads at thumbnail size: amber SUSPICIOUS meter ~70% filled, bright
  yellow raycast cone, HUD (title, 1/4 shards, 3 tries, sprint bar), glowing
  shard diamonds, LOCKED exit bottom-right. The stealth readability is there:
  cone + detection state + objective in one frame.
- Weakness (the single biggest pairwise risk): the player is a small yellow
  dot at the cone's edge, and ~40% of the frame (right side) is empty dark
  floor; the second warden's big red cone dominates the bottom-right while
  the warden itself is small. Top covers (#1/#2) show the whole level
  legibly; ours shows a dramatic moment but less of the level.
- Not a blocker, and no reshoot is planned (screenshots frozen). If a
  resubmit round is ever used, THIS is the lever: reframe the cover so the
  player + cone + more of the level read at thumbnail size — not more
  mechanics.

### 2-start.jpg (title) — GOOD
- "LUMEN HEIST" in mint green is crisp; controls are listed plainly
  (WASD / Shift sneak / Space sprint / Click pebble); "Three wings of the
  Velmora Gallery await." sets scale. The dimmed level behind is muddy-dark
  at thumbnail size, but the title carries the frame. Fine as shot 2.

### 3-caught.jpg (CAUGHT!) — STRONGEST text legibility of the four
- Big red CAUGHT!, clear message ("2 tries left in The Atrium. The gallery
  resets. Learn the patrol and try again."), red wash over the level. A
  failure state most entries never show. No notes.

### 4-win.jpg (win, 6/6 shards) — GOOD, one cosmetic inconsistency
- "THE STARLIGHT IS YOURS" mint green, "never once seen", player at the EXIT
  with the highlight ring — a clean win moment, and the Star Vault wing
  reads as the finale.
- Minor: HUD says "6/6 shards" (the Star Vault wing's count) while the win
  text says "Every wing cleared, every shard stolen" — the game total is 15
  shards (4+5+6). A picky judge could read 6/6 as the whole game. Cosmetic
  only; fixing it would invalidate the screenshot, so leave it.

## Mechanics (from source + build log, for the outline)

Genuinely deep, and the depth is honest, not claimed:
- 3 wings (Atrium 2 wardens/4 shards, Vault Wing 3/5, Star Vault 4/6) —
  9 wardens, 15 shards total. In-band with the field's scale claims
  (#2: 5 heists/17 guards; #19: 12 wardens/3 vaults), not above them.
- Guard AI: patrol waypoints, raycast vision cones (range 250px, blocked by
  walls/crates), detection meter 0–100 with suspicion at 25 (investigate)
  and 100 = chase (4s memory), decay 26/s, shadow + sneak halve the fill
  rate, 3 tries per wing.
- Noise system (sprint feet 190px radius) + pebble distraction (click to
  throw, wardens investigate the clatter), stamina drain/regen, 7 screens,
  synthesised WebAudio, no network, no libraries.
- Proven winnable AND losable: greedy cone-avoiding autopilot wins all 3
  wings, 0 catches, on seeds 1/2/3/7/42 after the post-open revision;
  reckless pilot still gets caught. The build log honestly corrects its own
  pre-open "0 catches" claim (triesLeft resets per level, so the end value
  proved nothing) and ships the only 1 of 16 swept tunings that wins clean
  on all seeds. That correction is a strength, not a blemish.
- Caveat for the judge's view: pebble-throwing and sneak/shadow are NOT
  visible in any screenshot (sprint bar is; shadow modifier is not obvious).
  The dossier must carry them — it does (dossier.json ~319 KB, all 11 game
  sources in its text, cover present). No action needed.

## Identity / theme

- Moth-thief "Wren" stealing starlight shards from the Velmora Gallery:
  distinct name, art and story. It sits in the same moth/light family as
  #1 Mothlight, #8 Mothwing and #11 Mothlight — a crowded family, but ours
  is differentiated, not a copy. Not a demerit.

## Risks (ranked)

1. Cover thumbnail legibility (above) — the only material pairwise risk.
2. Field saturation: 2,195-way tie at 12-0; final top 10 decided by later
   matches. Nothing to fix; it is what it is.
3. Win-screen 6/6 vs 15-total wording — cosmetic, leave it.
4. Theme family crowding (moth/light) — differentiated enough, leave it.

## Gate checklist

- [x] Top-10 analysis read in full and attached to this verdict
- [x] All 4 screenshots inspected + verified on disk (1280x720, < 256 KiB)
- [x] Game is real: winnable (autopilot, 5 seeds, 0 catches) + losable
- [x] Screenshots are real renders, 0 console errors (headless smoke test)
- [x] No network / no libraries / stdlib-only main.ts, byte-identical output
- [x] Post-open revision validated (real pilots, catch-counting fixed)
- [x] No disqualifying issue (no placeholder art, no copied assets, no
      pay-to-win, no external dependency)

## Decision

**LAYAK SUBMIT.** Submit as built once the user approves. Do not rebuild,
do not reshoot, do not chase the provisional top 10.
