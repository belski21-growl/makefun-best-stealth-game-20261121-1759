# Goldfish review r2 — best-stealth-game-20261121-1759 ("Lumen Heist")

Reviewed 22 Nov 2026 ~03:40 WIB (pre-submit gate, heavy track).
Trigger: re-shoot of all 4 screenshots from the CURRENT code (post-open tuning),
ordered by the coordinator after r1. The re-shoot closes the stale-screenshot
finding from the fix round (frozen JPEGs were shot under pre-revision tuning).
Attachments read in full: `top10-analysis.md` (22 Nov ~02:25 WIB) +
`goldfish-review.md` r1 (22 Nov ~02:45 WIB) + the 4 BARU frames supplied
in the task + the 4 files on disk.

## Verdict: LAYAK SUBMIT — as re-shot, no further reshoot, no rebuild

No blocking issue, and no new issue introduced by the re-shoot. The one
defect r1 left open (screenshots stale vs shipped tuning) is now closed:
the disk files ARE the BARU frames, shot from the current code. Submit after
the user's approval.

## BARU vs disk — identity check (done by eye + file facts)

The 4 BARU frames supplied in the task match the 4 files on disk in every
checkable element (HUD values, shard counts, wing names, overlay texts,
player/warden/cone/shard positions):

| Shot | Disk file | Size | SHA256 (short) | Match |
|---|---|---|---|---|
| 1-play | 1-play.jpg | 31,767 B | da33d897… | exact content match |
| 2-start | 2-start.jpg | 51,074 B | 2999a043… | exact content match |
| 3-caught | 3-caught.jpg | 29,947 B | 2ae23f78… | exact content match |
| 4-win | 4-win.jpg | 41,230 B | 39fb4b00… | exact content match |

- All 4 are 1280x720 RGB JPEG, each < 256 KiB.
- Sizes match the build-log re-shoot record (03:33 WIB) byte-for-byte.
- mtimes: screenshots 20:33 UTC 21 Nov (= 03:33 WIB 22 Nov), AFTER all game
  code (latest code mtime 20:20 UTC = 03:20 WIB; revision files
  config/guard/world 20:19–20:20 UTC). No code was touched after the
  re-shoot (build-log confirms). So the frames are renders of the shipped
  tuning (suspiciousAt 25, falloff 0.9, stamina 30/26), not of the old one.
- Build-log capture note stands: all 4 scenes ready=true, 0 console errors,
  second capture run SHA256-identical per scene (deterministic).

## BARU vs r1 — what actually changed per shot

### 1-play.jpg (cover) — CHANGED, small net improvement, r1 weakness NOT fixed
- Same HUD state as r1: Atrium, 1/4 shards, 3 tries, sprint full,
  SUSPICIOUS ~70% amber, LOCKED exit bottom-right.
- What moved (new tuning simulation state): the player is now centre-left
  (~29% across, mid-height), larger with a highlight ring, sitting right at
  the tip/edge of the amber cone — the near-miss reads clearly. A "?"
  marker now sits above the contact point, signalling the warden noticed
  something. The warden's face (left, yellow) is clearly visible next to
  its cone. In r1 the player was "a small yellow dot at the cone's edge";
  it now reads as the protagonist of the frame, not a dot.
- What did NOT change: the composition. The right ~40% is still empty dark
  floor, and the second warden's big red cone still dominates the
  bottom-right while its warden is small. The cover was NOT reframed — the
  re-shoot re-ran the same shot query (?shot=play&seed=1) under new tuning,
  so the framing is the same by design. r1's #1 pairwise risk (cover
  thumbnail legibility vs #1/#2, which show the whole level) is narrowed
  but still the top risk. Fixing it would need a reframe/redesign, not
  another re-shoot of the same query — and per the top-10 analysis that is
  not worth a rebuild.

### 2-start.jpg (title) — UNCHANGED
- Pixel-identical to the r1 frame (build-log pixel check PASSES, mean 1.0).
  "LUMEN HEIST" mint green crisp, controls listed plainly, "Three wings of
  the Velmora Gallery await." Same muddy-dark dimmed level behind the
  title, same as r1. Still GOOD; no change, no new note.

### 3-caught.jpg (CAUGHT!) — effectively UNCHANGED
- Same frame as r1: big red CAUGHT!, "2 tries left in The Atrium. The
  gallery resets. Learn the patrol and try again.", red wash, tries ●●○,
  player top-left. Build-log: visually identical to the frozen frame.
  Still the STRONGEST text legibility of the four. No notes.

### 4-win.jpg (win) — CHANGED slightly, same cosmetic note
- Same content as r1: "THE STARLIGHT IS YOURS", "Every wing cleared, every
  shard stolen, never once seen.", 6/6 shards, The Star Vault, player at
  the EXIT bottom-right with the highlight ring. Guard/player positions
  moved slightly with the new tuning (build-log mean 2.7 vs old frame).
- r1's cosmetic inconsistency PERSISTS unchanged: HUD says "6/6 shards"
  (the Star Vault wing's count) while the win text says "Every wing
  cleared, every shard stolen" — the game total is 15 shards (4+5+6).
  Still cosmetic only; leave it. A further re-shoot cannot fix wording.

## Top-10 analysis — still applies unchanged

- Field per the 02:25 analysis: 2,208 entries, 2,195 at 12-0 provisional.
  Nothing in the re-shoot changes our competitive position: same visual
  grammar (dark gallery, yellow raycast cones, HUD detection eye, glowing
  shards, 3 wings / 9 wardens / 15 shards), same in-band scale, same
  moth/light family crowding (#1 Mothlight, #8 Mothwing, #11 Mothlight).
- The re-shoot's purpose was accuracy (screenshots = shipped code), and it
  achieves that. It was never a cover-redesign lever, and the cover
  legibility gap vs the top covers remains the only material pairwise risk.
- No resubmit-round lever was spent here: this was a correction re-shoot,
  not a redesign. If a resubmit round is ever used, the lever is still the
  one r1 named: reframe the cover so player + cone + more of the level read
  at thumbnail size.

## Mechanics / game-realness — unchanged from r1

No game code was touched in the re-shoot step, so r1's findings stand
without re-verification: 3 wings, guard patrol/suspicion/chase, raycast
cones, noise + pebble, stamina/sneak/sprint, 3 tries per wing, 7 screens,
synthesised audio; autopilot wins all 3 wings 0 catches on seeds 1/2/3/7/42
after the post-open revision; reckless pilot still gets caught. The
screenshots are now real renders of the CURRENT code, which is the
improvement over r1's baseline (then they were renders of pre-revision
tuning).

## Risks (ranked, updated)

1. Cover thumbnail legibility — narrowed by the bigger, more central
   player + "?" cue, but the empty right side + dominant red cone remain.
   Still the only material pairwise risk.
2. Field saturation: 2,195-way tie at 12-0; final top 10 decided by later
   matches. Nothing to fix.
3. Win-screen 6/6 vs 15-total wording — cosmetic, unchanged, leave it.
4. Theme family crowding (moth/light) — differentiated enough, leave it.
5. ~~Stale screenshots vs shipped tuning~~ — CLOSED by this re-shoot.

## Gate checklist (r2)

- [x] Top-10 analysis read in full and attached to this verdict
- [x] Goldfish r1 read in full; every r1 note re-checked against BARU frames
- [x] All 4 BARU frames inspected and matched to disk files (content +
      sizes + 1280x720 + < 256 KiB + mtimes after all game code)
- [x] Screenshots are real renders of the CURRENT code (re-shoot 03:33 WIB,
      deterministic, 0 console errors per build-log capture note)
- [x] Game is real: winnable (autopilot, 5 seeds, 0 catches) + losable
      (r1 findings stand; no code touched since)
- [x] No disqualifying issue (no placeholder art, no copied assets, no
      pay-to-win, no external dependency)
- [x] No new issue introduced by the re-shoot

## Decision

**LAYAK SUBMIT.** Submit the re-shot set as built once the user approves.
Do not reshoot again, do not rebuild, do not chase the provisional top 10.
