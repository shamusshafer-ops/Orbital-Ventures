# Orbital Ventures — Technical Audit (2026-07-13)

**Scope:** technical sections only (bugs, performance, memory/GC, save integrity, error handling, security, browser compat). Design/gameplay/UX excluded per prior triage into `EVALUATION-2026-07.md` / E0–E2.
**Target:** `src/` at commit `9a1c8d4b3f` ("E0.3 Slice 2: setHTML() memoize + focus/scroll fix") — 17,424 lines concatenated.
**Method:** full build + all 39 headless suites as baseline; ESLint (no-undef, dupes, unreachable, fallthrough, etc.) over the concatenated script so cross-module globals resolve; targeted pattern sweeps (timers, listeners, rAF lifecycle, JSON.parse, localStorage, innerHTML sinks); full read of `save.js`; headless perf/growth probe over a simulated 15-year campaign.

**Baseline:** build OK, syntax OK, **38/39 suites pass**. The one red suite (`test-progress-unify.js`, 24/34) is a *documented forward test* for unfinished F4 work (ROADMAP:2219) — not a regression.

---

## Findings

### HIGH

**H1 — Stored XSS via save file: unescaped livery name in vehicle pop-out title.**
`src/render.js:2917–2919` — `openVehPopout()` builds `title` from `curLivery().name` (user-editable free text, `setLiveryName`, sim.js:4754) and injects it into innerHTML **without `esc()`**: `<span class="vehpop-title">🚀 ${title}</span>`. The in-game input clamps to 24 chars (enough for `<img src=x onerror=…>`), but the **import path has no clamp or sanitization at all** — `loadSaveFromText` → `applyLoadedSave` accepts `livery.name` of any length. A shared/crafted save file therefore executes arbitrary script the moment the recipient opens the vehicle pop-out. Save-file sharing is normal EA-community behavior, so treat this as real, not theoretical.
The sibling station pop-out (render.js:3007) correctly does `esc(title)` — this is the one sink that missed the pattern.
**Fix:** `esc(title)` at 2919; clamp `livery.name` (`.slice(0,24)`) during load/import; add a harness check that a hostile `livery.name` renders inert. ~10 min.

### MEDIUM

**M1 — Dead alert: `resupplyShortfall` doesn't exist.**
`src/render.js:290` — the Station tab-badge path calls `resupplyShortfall()` behind a `typeof` guard, but the function is defined nowhere (confirmed via lint over the full concatenation). No crash, but the intended "Resupply shortfall" attention badge **can never fire** — a silently disabled safety net for exactly the starved-base situation badges exist for. Likely a leftover name from before the `facilitySupply`/`facilityStarved` system.
**Fix:** replace with a real check, e.g. any facility with `facilityStarved(id)` or `facilitySupply(id)<=2`. ~15 min.

**M2 — Autosave failure is permanently silent.**
`src/save.js:26–34` — `autosave()` wraps `writeSave()` in an empty catch. If `localStorage.setItem` starts throwing (quota, private-mode restrictions, storage eviction), every autosave fails silently, forever, with no player-visible signal. The IndexedDB ring mitigates (3-slot backup) but it warns **once, to the console only**, and its cadence is coarse (per-month + 3-real-minute gates). A player could lose a long session believing autosave was working.
**Fix:** count consecutive `writeSave` failures; on ~3rd, surface a one-time in-game toast/log line ("Autosave failing — export a save file") and point at Manage Saves. ~30 min.

**M3 — No forward-version guard on load.**
`applyLoadedSave` never checks `payload.v > SAVE_VERSION`. Loading a newer save into an older build silently applies it with newer migrations effectively un-run in reverse. The lazy-default convention makes *most* future fields harmless, but any future unit/semantic change of the v34 kind (months→days) would be silently misread, corrupting the save on the next write.
**Fix:** one guard — if `payload.v > SAVE_VERSION`, warn ("save from a newer version") and require confirmation before applying. ~15 min.

**M4 — Mobile/tab-kill save gap: `beforeunload` only.**
`src/save.js:35` — the forced flush rides `beforeunload`, which iOS Safari (and Android tab-discard) frequently never fires. Steady-state loss is small because `autosave()` fires from `advanceDays` (sim.js:660), but everything done **since the last time advance** — design-bench edits, purchases, hires — is unsaved until the next tick, and on mobile the flush that would catch it doesn't run.
**Fix:** also flush on `visibilitychange → hidden` and `pagehide` (`autosave(true)`), the platform-recommended lifecycle hooks. The existing hidden-pause handler (sim.js:2780) is the natural place. ~10 min.

**M5 — HEAD is red by design; make it distinguishable.**
`test-progress-unify.js` fails at HEAD for unfinished F4 (documented). While it's red, a genuine regression elsewhere in that suite is invisible, and "run everything" can't be used as a clean gate.
**Fix:** mark the suite (or the 10 F4-forward checks) as expected-fail/skipped with a `TODO(F4)` tag so the full run reports green until F4 lands. ~15 min.

### LOW

**L1 — Tech-pane window listeners can orphan.** `render.js:5479–5495` — grab-to-pan wires `window.mousemove`/`mouseup` once per pane element (`el._zoomWired`). If that pane element is ever recreated (parent innerHTML rebuild), the flag resets and a new pair is added while the old pair persists on `window` (inert — closure `dragging=false` — but leaked, and they run per mouse move). Fix: keep handlers as named refs and remove on rewire, or use element-level pointer capture like `initVehPopZoom` does (that one is clean — its stage element is created and destroyed with the scrim, listeners die with it).

**L2 — `setHTML` cache pins detached elements.** `render.js:324–377` — the memo `Map` keys on elements and is only cleared on state swap; any cached element later removed from the DOM stays pinned along with its HTML string until new-game/load. Bounded and small in practice. Fix eventually: `WeakMap`.

**L3 — Auto-time keeps running under the flight overlay.** Launching doesn't call `timeInterrupt()`/`stopTimeAuto()`; the 1 s auto-tick continues under the animation, and a tick-triggered decision modal can appear beneath/behind it (stacking is limited to one because `showModal` interrupts the clock). Fix: `timeInterrupt()` when the flight overlay opens.

**L4 — Dead code (true positives from lint, after filtering the ~200 false-positive "unused" globals that are string-`onclick` handlers):** `thrSL` (13696), two `chk` locals (15062, 15130), `isEng` (15489), `mapScene`/`stationScene` assignments never read. Trivial cleanup. Worth adding an ESLint config with the onclick-handler globals listed so future no-undef runs are one command with zero noise — it's what caught H1's neighborhood and M1 here.

### CLEAN — checked and found solid (worth recording)

- **Phaser guarding:** all four scene classes lazily defined inside `phaserOK()`-gated `defineXScene()` functions; CDN failure degrades to the 2D/SVG fallbacks by construction. One residual: the fallbacks deserve a deliberate offline manual test (open the HTML with network blocked, visit Cape/Bench/Map/Station) — flagged for the EA checklist rather than as a bug.
- **`pendingCelebration`:** the previously flagged ReferenceError is fixed — properly declared at sim.js:4411, `finish()` closes over it. If the roadmap still carries the old flag, clear it.
- **Save architecture:** versioned (v52) with per-version documented lazy migrations, `rehydrateFlights()` corruption filters, boot-placeholder clobber guard, import safety-net ring snapshot, IDB ring with graceful in-memory degradation that can never throw into the game loop. Genuinely robust.
- **State growth:** all long-campaign arrays are ring-capped (log 40, metricHist 24/series, frontPages 26) — 15-year headless campaign showed no unbounded growth. No leak vectors in the rAF lifecycle (every persistent loop has a matching cancel; one-shot sweeps self-terminate).
- **Performance:** headless render 1.2–4.9 ms/call across all tabs at year 15; `stepTime(1)` sub-millisecond; 180-month advance in 409 ms. The remaining real-browser cost is the 77 direct `innerHTML` writes per render (DOM parse/layout, not string building) — exactly what E0.3's `setHTML` conversion (9 sites so far) is addressing. No new finding; continue E0.3.
- **Timers/listeners:** the single `setInterval` (auto-time) is properly cleared, paused on hidden tab; shell-level keydown handlers are boot-time one-offs; escaping (`esc`, `tlStrip/tlAttr`) is consistently applied at the timeline/log sinks and company name renders via `textContent`.
- **WebAudio:** one shared context, `webkitAudioContext` fallback, `resume()` on suspended, `sfxStop()` stops sources, empties the node list, and kills the master gain. No node leaks found.
- **Race/reentrancy:** `_flightResolving` lock is consistently acquired/released across launch, arrival pump, and defer paths; autosave respects it; smart-time interrupts fire from every decision surface.
- **Browser compat:** no risky modern APIs (`structuredClone`, `.at()`, `replaceAll`, `:has()`, OffscreenCanvas all absent). The floor is set by `??`/`?.` — Safari 13.1+/Chrome 80+ (~2020), fine for the audience; worth one line in the README/store page.

---

## Priority order

| # | Finding | Sev | Effort |
|---|---------|-----|--------|
| H1 | Livery-name XSS via save import | High | ~10 min |
| M1 | Dead resupply-shortfall badge | Med | ~15 min |
| M4 | pagehide/visibility autosave flush | Med | ~10 min |
| M2 | Surface persistent autosave failure | Med | ~30 min |
| M3 | Forward-version load guard | Med | ~15 min |
| M5 | Skip-mark the F4 forward test | Med | ~15 min |
| L1–L4 | Listener hygiene, WeakMap, overlay time-stop, dead code | Low | ~1 hr total |

Everything above is small; H1+M1+M4 together are under an hour and close the only finding with real player impact.
