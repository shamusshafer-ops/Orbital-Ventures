# The LIST TO DO

## Remaining Roadmap Scope

- Colony population, typed construction, interplanetary logistics, and trade routes.
- Deep-space civilization: planetary economies, orbital shipyards, megaprojects, terraforming, interstellar missions.
- Political depth: budget shocks, shareholders/investors, stock market, media, mandates.
- Research depth: TRL, prototypes, testing, era research-capacity limits.
- Flight overlay: ascent abort decisions and transition/chrome polish. (In-overlay decision panels and telemetry are shipped -- `openFlightForDecision`/`drawDecisionPanel` in flight.js, E1.2 slices C/D.)
- Milestone spectacle: ambient/UI sound, countdown voice, milestone stingers. (Newspaper front-page coverage on firsts is shipped -- `frontPageHTML()`, wired to milestones/victory/budget-hearing modals.)
- Station resupply contracts, crew rotation, module maintenance/degradation, station science generation.
- Optional station manufacturing tie-in.
- Click-to-jump notifications, animated Command Center scene tiers, and map cost/ROI overlays. (Animated CC scene tiers are shipped -- `ccPhaserDetail`/`ccPhaserSmoke` in render.js; click-to-jump notifications and map cost/ROI overlays are not.)
- Colorblind-safe status indicators. (Reduced-motion support shipped 2026-08-11 via Gate 6 F6; a true Gregorian calendar and 4c duration re-authoring shipped 2026-08-12 via the Calendar epic Stages 1-3 -- see ROADMAP.md. Save migration for the calendar switch, Calendar Stage 4, is still open.)
- Optional recoverable solid boosters.
- Continue dirty-flag rendering on hot paths.
- Real-browser verification and commit/push cleanup for recent completed slices.
- Remove dead Station Phaser scene code (StationScene, render.js -- confirmed still present, 10 references) and remaining low-priority technical debt.
- Offline/manual fallback testing for Phaser scenes.

## Unclassified Backlog

- Floating money/reputation change deltas.
- Confirm-before-destructive-action previews.
- Undo the last vehicle-bench change.
- Searchable tech tree.
- Pin research goals and highlight prerequisite paths.
- Notification center and log text search.
- Side-by-side vehicle-family comparison.
- Purchase time-to-affordability estimates.
- Persistent date display during flight overlays.
- Autosave-frequency setting.
- Build sharecodes.
- In-game changelog and tutorial replay.
- FPS/performance debug overlay.
- Rival range conflicts and joint missions.
- Visible public-support drivers.
- Rival bankruptcy, mergers, espionage, leaks, sanctions, anniversaries, and era summaries.
- Veteran-versus-rookie crew assignment tradeoffs.
- Chief designer character and department-lead personalities.
- Staff aging, retirement, hiring quality, strikes, and morale events.
- Astronaut PR tours and named test pilots.
- Depot network visualization and resupply cargo choices.
- Sample-return market.
- Space telescope program.
- Orbital debris accumulation.
- Space tourism.
- Deep-space tracking-station requirements.
- Biology and human-factors research.
- Difficulty presets that change systems.
- Statistics records and superlatives.

## Deferred Possibilities

- Second launch site with inclination economics.
- Formal astronaut training pipeline.
- Lunar/Mars surface-base tiers.
- Satellite constellation management.
- Manufacturing learning curves.
- Alternate-history starts.
- Ironman mode.
- Fixed-seed challenge scenarios.
- Shareable campaign chronicle export.
- In-game encyclopedia.
- Localization framework.
- External JSON content packs/mod support.
- Steam achievements and cloud saves.
- Mobile support, currently excluded from 1.0.

## Design Questions Still Unresolved

- Starting nation/bloc and its effects.
- Founding-era selection and tradeoffs.
- Company archetype implementation.
- Desired level of exposed rocket-equation math.
- Single-player versus competitive emphasis.
- Player relationship with governments and national agencies.
