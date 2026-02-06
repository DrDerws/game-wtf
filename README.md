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
- **WASD**: Move relative to the camera on the ground plane
- **Shift**: Sprint
- **Q/E**: Quick camera turn
- **Right Mouse (drag)**: Rotate camera
- **Mouse Wheel**: Zoom
- **Left Click**: Target enemy
- **Tab**: Cycle nearby targets
- **1-8**: Cast abilities
- **F**: Interact / Talk
- **I**: Inventory
- **J**: Quest log
- **H**: Toggle help panel
- **O**: Manual save

## Game Data
Static data is kept in JSON files under `/docs/data/` so you can expand content without touching logic:
- `items.json`: item definitions (id, stats, rarity, value)
- `spells.json`: spell definitions and hotbar keys
- `quests.json`: quest definitions with steps and rewards
- `npcs.json`: NPC placements, dialogue IDs, and merchant stock

To add new items or quests, add a new entry to the relevant JSON file and reference the `id` in quests or vendors.

## Notes
- Three.js is loaded via CDN.
- All visuals are procedural low-poly primitives.
- Game data lives in `/docs` for GitHub Pages compatibility.
