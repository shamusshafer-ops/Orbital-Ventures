# Orbital Ventures — Godot Base Bench

This Godot 4 project is the editable source for the Base Bench technology test.
It began as an isolated interaction prototype and now also exports to
`../godot-base-bench/`, where Orbital Ventures loads it as a lazy, reversible
iframe integration.

The experiment is not the production default. The existing Three.js Base Bench
remains available whenever the Godot test is disabled.

## Controls

- Left-drag a module: reposition and snap to a cyan connection node.
- Right-drag or left-drag empty terrain: orbit the camera.
- Mouse wheel: zoom.
- `Q` / `E`: rotate the selected module by 90 degrees.
- `Delete`: return the selected module to the tray.
- Double-click empty terrain: reset the camera.

The HUD also exposes rotate, remove, clear-canvas, and reset-layout actions.

## Run

Open `project.godot` in Godot 4.7+ and press F6/F5, or run:

```text
godot --path C:\WINDOWS\system32\Orbital-Ventures\godot-base-bench-src
```

## Export and browser review

Install Godot's non-threaded Web release template, then export the `Web` preset:

```text
godot --headless --path C:\WINDOWS\system32\Orbital-Ventures\godot-base-bench-src --export-release Web C:\WINDOWS\system32\Orbital-Ventures\godot-base-bench\index.html
```

WebAssembly must be served over HTTP. From the repository root:

```text
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/orbital-ventures.html`, select **Base**, then select
**Godot test**.

See `../GODOT-BASE-BENCH-HANDOFF.md` for the bridge contract, measured results,
known limitations, and the recommended restart task.
