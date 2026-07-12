// Countdown-voice Slice A: sound on/off preference + single master-gain bus that ALL sfx route through
// (engine envelope + one-shots + countdown blips), and blips that a skip/dismiss sfxStop() cancels.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---- persisted preference (mirrors ov_theme/ov_wide) ----
const before=soundOn;
toggleSound();
check('toggleSound flips soundOn', soundOn===!before);
check('toggleSound persists ov_sound to localStorage', localStorage.getItem('ov_sound')===(soundOn?'1':'0'));
toggleSound();
check('toggleSound toggles back', soundOn===before);

// ---- sfxInit builds ONE master bus, gain gated by the preference ----
soundOn=true; sfxInit();
check('sfxInit creates the master bus', !!sfxBus);
check('bus gain is 1 when sound is on', sfxBus.gain.value===1);
const bus1=sfxBus;
soundOn=false; sfxInit();
check('the master bus is reused across re-init (one real master)', sfxBus===bus1);
check('bus gain is 0 when sound is off', sfxBus.gain.value===0);
soundOn=true; applySoundSetting();
let mutedThrew=false; soundOn=false; try{ applySoundSetting(); }catch(e){ mutedThrew=true; } soundOn=true;
check('applySoundSetting mutes the live bus without throwing', !mutedThrew);

// ---- countdown blip: queued for skip-cancel, cleared by sfxStop ----
sfxInit();
const n0=sfxEngNodes.length;
sfxBlip(988,0.11,0.16);
check('sfxBlip queues an oscillator (so a skip can cancel it)', sfxEngNodes.length===n0+1);
sfxStop();
check('sfxStop clears queued blips — no dangling tones after skip/dismiss', sfxEngNodes.length===0);

// ---- every one-shot still runs (now routed through the bus, not straight to destination) ----
let threw=false;
try{ sfxSep(); sfxBoom(); sfxSplash(); sfxBurn(0.5); }catch(e){ threw=true; console.log(e.stack); }
check('one-shots run through the master bus without throwing', !threw);

// ---- blip is safe (no-op) with no audio context ----
const savedCtx=sfxCtx, savedBus=sfxBus; sfxCtx=null; sfxBus=null;
let threw2=false; try{ sfxBlip(988,0.11,0.16); }catch(e){ threw2=true; }
check('sfxBlip is a safe no-op when there is no audio context', !threw2);
sfxCtx=savedCtx; sfxBus=savedBus;

// ---- external audio clips (Slice 1 plumbing): manifest + graceful procedural fallback ----
// Node has no `Audio`, so playClip exercises exactly the assets-missing / unsupported path: it must
// invoke the procedural fallback, never throw. (Same code path a browser hits when the file is absent.)
check('AUDIO_CLIPS manifest exposes the two real era clips', typeof AUDIO_CLIPS==='object'
  && /apollo11_countdown\.mp3$/.test(AUDIO_CLIPS.apollo11||'') && /sts135_countdown\.mp3$/.test(AUDIO_CLIPS.sts135||''));
check('AUDIO_CLIPS no longer carries the Slice-1 placeholder key', !('placeholder' in AUDIO_CLIPS));
let fbCalls=0;
playClip('apollo11', ()=>{ fbCalls++; });
check('playClip falls back to procedural when Audio is unavailable', fbCalls===1);
playClip('sts135', ()=>{ fbCalls++; });
check('playClip falls back for the other real clip too (headless)', fbCalls===2);
playClip('no_such_key', ()=>{ fbCalls++; });
check('playClip falls back for an unknown clip key', fbCalls===3);
let clipThrew=false; try{ playClip('apollo11'); }catch(e){ clipThrew=true; }
check('playClip never throws even with no fallback supplied', !clipThrew);
let stopThrew=false; try{ stopClips(); }catch(e){ stopThrew=true; }
check('stopClips is a safe no-op headless (used on every overlay-close path)', !stopThrew);

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
