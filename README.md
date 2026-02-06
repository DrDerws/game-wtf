# Glassbound: A Wizard's Tale

## How to Play Locally
1. Open this repository on your computer.
2. Open `docs/index.html` in any modern browser (double-click it or drag it into the browser).

## Enable GitHub Pages
1. Go to **Settings → Pages** in your GitHub repository.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the `main` branch and the `/docs` folder.
4. Save. The Pages URL will load the game.

## Preview in Codespaces
- In Codespaces, open `docs/index.html` in the file explorer and use **Open with Live Preview** (or any static preview option provided by your editor).
- Alternatively, run `python -m http.server` in the repository root and open the forwarded port, then navigate to `/docs/index.html`.

## Content Overview
- **Tone:** Wonder, civic tension, and hopeful fantasy.
- **Length:** ~30–60 minutes with branching choices and multiple endings.

## How to Extend
- Story content lives in `docs/game.js` in the `scenes` object. Add new scene entries or expand choices.
- Spells are defined in the `spells` object in `docs/game.js`, and you can reference them in choice text or effects.
- The core rendering and state logic are in `renderScene`, `applyChoice`, and `handleRoll` inside `docs/game.js`.
