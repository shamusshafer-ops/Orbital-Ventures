# Gate 0 browser quarantine

This dependency-free W3C WebDriver harness exercises visible controls in real
Firefox/Chromium documents through synthetic DOM `click()` activation. It does
not claim pointer hit-testing, keyboard traversal, focus-order, occlusion, or
human onboarding measurements. The G0-B01 flow covers:

1. New Game → Engineer.
2. R&D → select **Static Fire Test Program** → click its real Research action →
   advance with the visible next-event control until it is researched.
3. Design Bench → Build & Launch → next event → Fly from hangar.
4. Skip before the forced future decision becomes visible.
5. Browser reload/Continue and an exact launched-hull ownership check.

The shipped dev panel supplies deterministic cash before research and forces the
future live call. It does not mark research complete: selection, purchase, time
advance, and completion all run through the player-facing R&D controls.

Immediately before Skip, the flow asserts that the pending future live call owns
the exact launched hull and is not held or visible. It then verifies that same
hull—not just any Hangar entry or any flight—has a resumable transaction,
visible pending decision, or Hangar record after reload. Hull status remains a
diagnostic only; an arbitrary terminal status or missing hull cannot make this
pre-decision interruption recoverable.

The separate G0-B08 flow holds one rendered **Build & Launch** DOM node and calls
that same node twice in one browser task. This is the player-facing duplicate-
delivery reproduction; the headless fixture's two direct API calls are only a
supporting mutation invariant.

Each result records end-to-end automated wall time, synthetic player-control and
dev-control activation counts, reload navigation count, the research completion
control used, and visible top-level navigation immediately after Engineer
startup. These are automation diagnostics, not human timing, click-count, or
accessibility assertions.

The expected result while `G0-B01` is open is `XFAIL`: the exact saved hull remains
`in-flight`, but neither the save nor the UI owns a resumable transaction. An
`XPASS` is deliberately an error so a fix must be promoted out of quarantine.
G0-B08 likewise remains XFAIL while the rapid same-control delivery creates two
orders/debits.

Run both required engines:

```bash
node tests/run-browser-gate0.js
```

Run one engine:

```bash
node tests/run-browser-gate0.js --browser firefox
node tests/run-browser-gate0.js --browser chromium
```

Emit machine-readable evidence, including runner/driver commands, WebDriver
status, negotiated browser capabilities and both flow results:

```bash
node tests/run-browser-gate0.js --browser firefox --json
```

Write the same structured report atomically to a durable path without requiring
shell redirection:

```bash
node tests/run-browser-gate0.js --browser firefox --json-output evidence/gate0-firefox.json
```

`--json` and `--json-output PATH` may be combined; stdout and the file contain
the exact same report. Evidence includes the base commit, porcelain worktree
status, OS/Node runtime, relevant `OV_*` browser settings, runner and driver
commands, requested session capabilities, negotiated capabilities, and results.

The runner starts `geckodriver` or `chromedriver` when found on `PATH`. An
already-running loopback driver can be supplied with
`OV_FIREFOX_WEBDRIVER_URL` or `OV_CHROMIUM_WEBDRIVER_URL`; only `http://` URLs
without embedded credentials are accepted. Non-loopback endpoints expose full
browser control and are rejected unless `OV_ALLOW_REMOTE_WEBDRIVER=1` explicitly
acknowledges a trusted network endpoint. Optional browser binary overrides are
`OV_FIREFOX_BINARY` and `OV_CHROMIUM_BINARY`.

Chromium retains its sandbox by default. Only an environment that cannot provide
the required kernel sandbox may explicitly set `OV_CHROMIUM_NO_SANDBOX=1`.
WebDriver requests have bounded time and response size, and managed drivers are
gracefully terminated with a bounded forced-shutdown fallback.

Missing engines are not silently green: the default exits 2 if either driver is
unavailable. `--allow-missing` exists only for local scaffold smoke-testing; it
does not satisfy Gate 0, which requires execution in Firefox and Chromium.

The browser fixture is generated in memory by `build.js#createBuildArtifacts`,
so it works from a clean clone without ignored `index.html` or `build/game.js`.
The local loopback server removes optional Phaser/Three CDN tags and exposes only
the test page plus non-dot files under `src/` and `assets/`; repository metadata
and all other paths are denied. It does not modify production files or gameplay
code.
