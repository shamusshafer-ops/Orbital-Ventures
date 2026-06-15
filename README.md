# Orbital Ventures

A hardcore, single-player space launch company simulation. Single-file HTML/JS — open `orbital-ventures.html` in any browser to play.

## Premise

Found and run a space launch company from the Pioneer era (1940s) through speculated future tech. Design every vehicle from first principles using the real rocket equation (`Δv = Isp · g₀ · ln(m₀/m_f)`), manage crew life support as a mass/power budget, fly multi-leg missions across the Solar System, and grow the tech tree from V-2-class motors to F-1-class super-heavy lift.

## Status — Milestones

- **M1** — Core loop: design bench (rocket equation), missions, R&D, economy. Pioneer era.
- **M2** — Crew & life support: ECLSS (open/partial/closed-loop tradeoffs), test campaigns, launch escape systems.
- **M3a** — Multi-leg missions: separate Transfer Stage and two-stage (Apollo-style) Lunar Lander, mission flight animations.
- **M3b-i** — Mars Flyby/Orbit, launch window planner (Earth–Mars synodic cycle), Solar System map with clickable Δv profiles per body.
- **M3b-ii** — *in progress*: refueling depots & ISRU.

## Design philosophy

- **Physically honest** — vehicle performance is computed, not assigned. Staging, mass fractions, and Isp tradeoffs are the actual gameplay.
- **Historical anchors** — every engine and tech node is tied to a real historical counterpart (V-2/A-4, Rocketdyne S-3D/H-1/J-2/F-1, Bell Agena, AJ10, etc.), and mission contracts reference real milestones (Sputnik, Gagarin, Apollo, Skylab).
- **Earned capability** — tech is cross-gated across propulsion, materials, avionics, recovery, and life support branches.

## Docs

- `orbital-ventures-design.md` — original full design document (tech tree, economy, personnel, Solar System map).
- `orbital-ventures-systems-spec.md` — deep dive on the rocket-equation vehicle design and ECLSS systems.

## Running it

Just open `orbital-ventures.html` in a browser. No build step, no dependencies.
