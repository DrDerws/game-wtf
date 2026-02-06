# Arcane Wayfarer Prototype

A minimalist, single-player 3D RPG prototype inspired by classic third-person MMO controls. It runs entirely as a static site with no build step.

## Run Locally
1. Clone or download this repository.
2. Open `docs/index.html` directly in a modern browser.

## Enable GitHub Pages
1. Go to **Settings → Pages** in your GitHub repository.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the `main` branch and the `/docs` folder.
4. Save. The Pages URL will load the game.

## Controls
- **WASD**: Move relative to camera
- **Q/E**: Rotate character
- **Right Mouse (hold + drag)**: Orbit camera / steer
- **Mouse Wheel**: Zoom
- **Left Click**: Target enemy
- **Tab**: Cycle targets
- **1–4**: Cast spells on hotbar
- **E**: Interact with NPCs

## Gameplay Loop
- Talk to Camp Guide Lyra to accept a quest.
- Clear six rift creatures in the wilds.
- Return to camp for a mana reward.
- Loot drops appear in the inventory panel.

## Tech Notes
- Three.js is loaded via CDN.
- All assets are simple geometry and colors generated in code.
- Files live in `/docs` for GitHub Pages compatibility.
