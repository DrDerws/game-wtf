# Arctic Survival Prototype (Godot)

A third-person, arctic survival prototype built in Godot 4.6. The gameplay focuses on scavenging, crafting a campfire, and surviving the night while managing hunger, thirst, fatigue, and body temperature.

## Run Locally
1. Open the project in Godot 4.6 (or newer).
2. Press **F5** to run the main scene.

## Troubleshooting
- **Unexpected identifier in class body**: This error usually means a stray token was typed at the top level of a `.gd` file (for example, a random word like `dwa`). Open the script and remove any standalone identifiers that are not part of `var`, `func`, `signal`, or `const` declarations. Line numbers in the error message map to the script shown in Godot's debugger output, so jump to that line and delete the stray text.

## Controls
- **WASD**: Move relative to the camera
- **Right Mouse (hold)**: Capture mouse to rotate camera
- **Mouse Wheel**: Zoom
- **E**: Interact / gather resources / add campfire fuel
- **I**: Toggle inventory
- **C**: Toggle crafting
- **Page Up**: Save game
- **Page Down**: Load game

## Gameplay Loop
- Gather sticks and tinder from the world.
- Craft and place a campfire kit.
- Light the campfire and keep it fueled to stay warm.
- Survive until morning.
