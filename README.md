# Rift Runner — Deluxe Edition

Enhanced Electron desktop arcade game built with HTML, CSS, JavaScript, and Canvas.

## Implemented features
- Polished crimson-and-gold responsive UI
- Gravity, thrust, cloak tilt, procedural barriers, collisions, particle effects
- Score, persistent personal best, local top-10 score history
- Difficulty selection: Relaxed, Normal, Intense
- Time Stone collectible with temporary slow motion
- Settings screen: master volume, sound effects, particle effects, screen shake, difficulty
- Settings and score history persist locally
- Pause/resume, auto-pause on blur, instructions, leaderboard, game-over screen
- Sound effects generated with Web Audio; mute toggle
- Electron security defaults and Electron Forge build configuration

## Run
Install Node.js LTS, extract the project, open a terminal in the folder, then:

```bash
npm install
npm start
```

## Controls
- Space: thrust (hold for continued lift)
- Click in gameplay: thrust (hold mouse for continued lift)
- Escape: pause/resume
- M: mute/unmute

## Package
```bash
npm run make
```
Forge writes platform artifacts to `out/`. Test on the target OS before distribution.

## GitHub
```bash
git init
git add .
git commit -m "Rift Runner deluxe edition"
git branch -M main
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

Replace `YOUR_REPOSITORY_URL` with the repository URL you create.

## Notes
Scores and settings are local to the current user profile. The leaderboard is a local high-score table, not an online multiplayer leaderboard. Fonts load from Google Fonts when internet is available and fall back to system fonts offline. Test the project on your target machine before submission.

## Audio

The game includes original, locally bundled synthesized audio in `assets/audio/`:
- `menu-ambience.wav` — atmospheric menu loop
- `gameplay-pulse.wav` — rhythmic gameplay loop
- `ui-click.wav`, `begin-run.wav`, `thrust.wav`, `score-ping.wav`, `time-stone.wav`, `collision.wav`, and `high-score.wav` — event sound effects

Audio starts after the first user interaction to comply with Chromium/Electron autoplay restrictions. Use the music-note button or **M** to mute/unmute. Music and effects respect the master and SFX volume settings.


## Abstract-aligned gameplay update
- Space or a click triggers one discrete Cloak of Levitation thrust; holding the key does not apply continuous lift.
- Gravity acts between thrust beats. The game ends on a barrier or screen-boundary collision.
- Passing each barrier pair awards one point. Barrier spacing and speed increase within defined limits.
- Collecting the Time Stone temporarily slows the simulation. Best score and recent run scores persist in local storage.
