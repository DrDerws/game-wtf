# Wayfarer Arcanist: Wilds Prototype

A single-player, browser-playable 3D RPG prototype with a third-person camera, targeting, hotbar abilities, quests, and a compact exploration zone. Built as a static site with Three.js via CDN.

## Run Locally
1. Clone or download this repository.
2. Open `docs/index.html` directly in a modern browser.

## Enable GitHub Pages
1. In your GitHub repo, go to **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose the `main` branch and `/docs` folder, then save.
4. GitHub Pages will publish the site at the provided URL.

## Controls
- **WASD**: Move relative to camera
- **Q/E**: Rotate player
- **Right Mouse (drag)**: Rotate camera
- **Right Mouse (hold)**: Steer and auto-face camera direction
- **Mouse Wheel**: Zoom
- **Left Click**: Target enemy
- **Tab**: Cycle nearby targets
- **1-6**: Cast abilities
- **F**: Interact / Talk
- **J**: Quest log
- **H**: Toggle help panel
- **O**: Manual save

## Notes
- Three.js is loaded via CDN.
- All visuals are procedural low-poly primitives.
- Game data lives in `/docs` for GitHub Pages compatibility.
