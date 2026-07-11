// S2: establish a baseline state so the UI renders, then ALWAYS ask on launch how to begin —
// Continue last game / Open a save file / New game (showStartup). The boot placeholder is never
// autosaved (guarded by _gameStarted) so it can't clobber the real save if the tab is just closed.
newGame();
render();
applyWide(); // restore the saved Wide-mode preference + sync the toolbar buttons
applyTheme(currentTheme); // restore the saved theme variant (Mission Dark / Control Room Green / Apollo Beige)
applyUiScale(uiScale); // restore the saved UI-scale zoom (E0.4 slice D; localStorage 'ov_uiscale', default 100%)
showStartup(); // the startup screen — the Production drill (new game) or the recap (continue/open) opens after the player chooses

