# Celestial texture attribution

The packaged `texture-*.jpg` maps are the 2K equirectangular Solar System Scope texture set by Solar System Scope, obtained through Wikimedia Commons. They are used for the Sun; Mercury; Venus; Earth; Earth's Moon; Mars; Jupiter; Saturn; Uranus; and Neptune.

- Source: https://commons.wikimedia.org/wiki/Category:Solar_System_Scope
- Creator: Solar System Scope
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- License text: https://creativecommons.org/licenses/by/4.0/

The maps are loaded locally from `assets/` at runtime and wrapped directly over their respective Three.js spheres.

# Cape 3D material textures

`cape-ground-albedo.png` and `cape-pavement-albedo.png` are original, project-owned seamless albedo textures generated with OpenAI's built-in image generation tool on 2026-07-18. They contain no third-party source imagery and are packaged locally for the Cape 3D scene.

- Ground prompt: seamless top-down coastal Florida scrub and pale sandy soil; neutral lighting and no baked shadows.
- Pavement prompt: seamless top-down weathered launch-pad concrete and charcoal asphalt; neutral lighting and no painted markings.

# Roboto Condensed (UI typeface)

`roboto-condensed-subset.woff2` is a subsetted build of Roboto Condensed, a variable font
(weight axis 100-900, no width axis) designed by Christian Robertson for Google.

- Source: https://github.com/google/fonts/tree/main/ofl/robotocondensed
- Copyright: Copyright 2011 Google Inc. All Rights Reserved.
- License: SIL Open Font License, Version 1.1
- License text: https://scripts.sil.org/OFL (the OFL permits bundling, subsetting, and
  redistribution as part of a larger software project, provided the font is not sold on its own)

Subsetted with fonttools (`pyftsubset`) to Basic Latin, Latin-1 Supplement, the specific
typographic punctuation the UI renders (en/em dash, curly quotes, bullet, ellipsis), the Greek
letters used inline as physics notation (Δv, γ, θ, etc.), and subscript digits — 459 glyphs,
78KB. Icon/dingbat Unicode ranges (arrows, warning signs, checkmarks) are intentionally excluded:
no text face carries them, so they already render via the system emoji font regardless of which
webfont is active. The subsetted file is embedded as a `data:` URI directly in the `@font-face`
rule in `src/shell.html` — the same pattern `build.js`'s `embeddedTextureScript()` uses for the
planet/Cape textures above, and for the same reason: the release build is opened via `file://`,
where Firefox can block a separately-fetched sub-resource, and a `data:` URI has no fetch to
block. This also means the font ships identically in both `orbital-ventures.html` (release) and
`index.html` (dev) with no separate build-step wiring, since both share `src/shell.html`.
