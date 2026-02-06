/* global THREE */

const canvas = document.getElementById("game-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f18);
scene.fog = new THREE.Fog(0x0a0f18, 30, 200);

const worldRoot = new THREE.Group();
worldRoot.name = "world-root";
scene.add(worldRoot);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
const clock = new THREE.Clock();

const ambient = new THREE.AmbientLight(0x8aa4d6, 0.45);
scene.add(ambient);
const keyLight = new THREE.DirectionalLight(0xf4f6ff, 0.85);
keyLight.position.set(40, 60, 25);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x4e7bd9, 0.35);
rimLight.position.set(-30, 40, -40);
scene.add(rimLight);

const dom = {
  hpFill: document.getElementById("hud-hp"),
  hpText: document.getElementById("hud-hp-text"),
  manaFill: document.getElementById("hud-mana"),
  manaText: document.getElementById("hud-mana-text"),
  fatigueFill: document.getElementById("hud-fatigue"),
  fatigueText: document.getElementById("hud-fatigue-text"),
  levelText: document.getElementById("hud-level"),
  xpText: document.getElementById("hud-xp"),
  goldText: document.getElementById("hud-gold"),
  zoneText: document.getElementById("hud-zone"),
  inventoryList: document.getElementById("inventory-list"),
  inventoryPanel: document.getElementById("inventory-panel"),
  inventoryFilter: document.getElementById("inventory-filter"),
  inventorySort: document.getElementById("inventory-sort"),
  equipStaff: document.getElementById("equip-staff"),
  equipRobe: document.getElementById("equip-robe"),
  equipRing: document.getElementById("equip-ring"),
  castBar: document.getElementById("cast-bar"),
  castFill: document.getElementById("cast-fill"),
  castLabel: document.getElementById("cast-label"),
  floatingText: document.getElementById("floating-text"),
  targetFrame: document.getElementById("target-frame"),
  targetName: document.getElementById("target-name"),
  targetHp: document.getElementById("target-hp"),
  questTracker: document.getElementById("quest-tracker-list"),
  questTrackerDetail: document.getElementById("quest-tracker-detail"),
  dialoguePanel: document.getElementById("dialogue-panel"),
  dialogueTitle: document.getElementById("dialogue-title"),
  dialogueText: document.getElementById("dialogue-text"),
  dialogueChoices: document.getElementById("dialogue-choices"),
  vendorPanel: document.getElementById("vendor-panel"),
  vendorBuy: document.getElementById("vendor-buy"),
  vendorSell: document.getElementById("vendor-sell"),
  questLog: document.getElementById("quest-log"),
  questLogList: document.getElementById("quest-log-list"),
  questLogDetail: document.getElementById("quest-log-detail"),
  hotbar: document.getElementById("hotbar"),
  minimap: document.getElementById("minimap"),
  helpOverlay: document.getElementById("help-overlay"),
  tutorialText: document.getElementById("tutorial-text"),
  warningPanel: document.getElementById("ui-warning"),
  tooltip: document.getElementById("item-tooltip"),
  combatLog: document.getElementById("combat-log-list"),
  compassArrow: document.getElementById("compass-arrow"),
  compassLabel: document.getElementById("compass-label"),
  closeVendor: document.getElementById("close-vendor"),
  closeQuestLog: document.getElementById("close-quest-log"),
  closeInventory: document.getElementById("close-inventory"),
  toggleInventory: document.getElementById("toggle-inventory"),
  toggleQuestLog: document.getElementById("toggle-quest-log"),
  closeHelp: document.getElementById("close-help"),
  debugHud: document.getElementById("debug-hud")
};

const minimapCtx = dom.minimap.getContext("2d");

const settings = {
  zoom: 11,
  minZoom: 6,
  maxZoom: 18,
  cameraYaw: Math.PI / 2,
  cameraPitch: 0.45,
  cameraYawTarget: Math.PI / 2,
  cameraPitchTarget: 0.45,
  holdRmb: false,
  rotating: false,
  cameraSmoothing: 6,
  turnSmoothing: 8,
  sprintMultiplier: 1.35
};

const audioState = {
  context: null
};

function initAudio() {
  if (!audioState.context) {
    audioState.context = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTone(freq, duration = 0.08, type = "sine", volume = 0.08) {
  if (!audioState.context) {
    return;
  }
  const oscillator = audioState.context.createOscillator();
  const gain = audioState.context.createGain();
  oscillator.frequency.value = freq;
  oscillator.type = type;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(audioState.context.destination);
  oscillator.start();
  oscillator.stop(audioState.context.currentTime + duration);
}

const materials = {
  ground: new THREE.MeshStandardMaterial({ color: 0x233141 }),
  path: new THREE.MeshStandardMaterial({ color: 0x2f3f4f }),
  camp: new THREE.MeshStandardMaterial({ color: 0x2c3b2f }),
  ruins: new THREE.MeshStandardMaterial({ color: 0x3a3447 }),
  lake: new THREE.MeshStandardMaterial({ color: 0x1a2c3b }),
  cave: new THREE.MeshStandardMaterial({ color: 0x2b2836 }),
  tree: new THREE.MeshStandardMaterial({ color: 0x2e4a31, flatShading: true }),
  bark: new THREE.MeshStandardMaterial({ color: 0x3a2a1c, flatShading: true }),
  rock: new THREE.MeshStandardMaterial({ color: 0x4b4f5c, flatShading: true }),
  cloth: new THREE.MeshStandardMaterial({ color: 0x5f6b84, flatShading: true }),
  player: new THREE.MeshStandardMaterial({ color: 0x7fd9ff, flatShading: true }),
  npc: new THREE.MeshStandardMaterial({ color: 0x9de3a3, flatShading: true }),
  enemyRed: new THREE.MeshStandardMaterial({ color: 0xff7b7b, flatShading: true }),
  enemyPurple: new THREE.MeshStandardMaterial({ color: 0xb07bff, flatShading: true }),
  enemyGold: new THREE.MeshStandardMaterial({ color: 0xffc96f, flatShading: true }),
  enemyGreen: new THREE.MeshStandardMaterial({ color: 0x7bffbc, flatShading: true }),
  enemyTeal: new THREE.MeshStandardMaterial({ color: 0x5ee0e6, flatShading: true }),
  enemyBlack: new THREE.MeshStandardMaterial({ color: 0x6c6c7b, flatShading: true }),
  glow: new THREE.MeshStandardMaterial({ color: 0x8cd3ff, emissive: 0x2a5a7a, emissiveIntensity: 0.6 })
};

const world = {
  size: 240,
  colliders: [],
  props: [],
  zones: [],
  markers: [],
  objectives: {
    cave_gate: new THREE.Vector3(0, 0, 70)
  }
};

const groundHeight = 1;

const input = {
  keys: new Set(),
  wheel: 0
};

const prng = {
  seed: 1337,
  random() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
};

const dataStore = {
  items: [],
  spells: [],
  quests: [],
  npcs: [],
  itemMap: new Map(),
  spellMap: new Map(),
  questMap: new Map(),
  npcMap: new Map()
};

function randRange(min, max) {
  return min + (max - min) * prng.random();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngle(a, b, t) {
  const diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + diff * t;
}

function approach(current, target, delta) {
  if (current < target) {
    return Math.min(target, current + delta);
  }
  return Math.max(target, current - delta);
}

function formatVec3(vec) {
  return `${vec.x.toFixed(2)}, ${vec.y.toFixed(2)}, ${vec.z.toFixed(2)}`;
}

function formatEuler(euler) {
  return `${THREE.MathUtils.radToDeg(euler.x).toFixed(1)}, ${THREE.MathUtils.radToDeg(euler.y).toFixed(1)}, ${THREE.MathUtils.radToDeg(euler.z).toFixed(1)}`;
}

function updateFallbackMessage(message) {
  fallbackCtx.clearRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
  fallbackCtx.fillStyle = "#12070f";
  fallbackCtx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
  fallbackCtx.fillStyle = "#f4d5e6";
  fallbackCtx.font = "bold 46px sans-serif";
  fallbackCtx.fillText("Render Error", 40, 120);
  fallbackCtx.fillStyle = "#f1e1f2";
  fallbackCtx.font = "24px sans-serif";
  const lines = [
    "The world failed to render. Check the debug HUD.",
    message ? `Last error: ${message}` : "No error detail available."
  ];
  lines.forEach((line, index) => {
    fallbackCtx.fillText(line, 40, 200 + index * 36);
  });
  fallbackTexture.needsUpdate = true;
}

function handleGlobalError(error, source) {
  const message = error?.message || error?.toString?.() || String(error);
  const detail = source ? `${source}: ${message}` : message;
  errorState.active = true;
  errorState.lastError = detail;
  errorState.lastErrorTime = clock.elapsedTime;
  console.error("Captured error:", detail, error);
  updateFallbackMessage(detail);
}

function getGameState() {
  if (!dom.dialoguePanel.classList.contains("hidden")) return "dialogue";
  if (!dom.vendorPanel.classList.contains("hidden")) return "vendor";
  if (!dom.questLog.classList.contains("hidden")) return "questLog";
  if (!dom.inventoryPanel.classList.contains("hidden")) return "inventory";
  if (!dom.helpOverlay.classList.contains("hidden")) return "help";
  return "inGame";
}

const groundGeo = new THREE.PlaneGeometry(world.size, world.size);
const ground = new THREE.Mesh(groundGeo, materials.ground);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
worldRoot.add(ground);

const boundary = new THREE.Mesh(
  new THREE.BoxGeometry(world.size, 10, world.size),
  new THREE.MeshStandardMaterial({ color: 0x101722, side: THREE.BackSide })
);
boundary.position.set(0, 5, 0);
worldRoot.add(boundary);

const targetRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.9, 0.08, 12, 36),
  new THREE.MeshStandardMaterial({ color: 0xff7bd6, emissive: 0x5c2142, emissiveIntensity: 0.8 })
);
targetRing.rotation.x = -Math.PI / 2;
targetRing.visible = false;
worldRoot.add(targetRing);

const particles = [];
const uiWarnings = [];
const combatLog = [];
const spawnPoint = new THREE.Vector3(0, 1, 0);
const errorState = {
  active: false,
  lastError: "None",
  lastErrorTime: 0
};

const fallbackCanvas = document.createElement("canvas");
fallbackCanvas.width = 1024;
fallbackCanvas.height = 512;
const fallbackCtx = fallbackCanvas.getContext("2d");
const fallbackTexture = new THREE.CanvasTexture(fallbackCanvas);
const fallbackScene = new THREE.Scene();
const fallbackCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
fallbackCamera.position.z = 2;
const fallbackPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 1),
  new THREE.MeshBasicMaterial({ map: fallbackTexture, transparent: true })
);
fallbackScene.add(fallbackPlane);
fallbackScene.background = new THREE.Color(0x12070f);

const player = {
  name: "Arcanist",
  pos: new THREE.Vector3(0, 1, 0),
  velocity: new THREE.Vector3(),
  yaw: 0,
  yawTarget: 0,
  radius: 0.6,
  speed: 7.2,
  accel: 22,
  decel: 20,
  baseHp: 120,
  baseMana: 100,
  hp: 120,
  maxHp: 120,
  mana: 100,
  maxMana: 100,
  fatigue: 0,
  maxFatigue: 100,
  baseManaRegen: 8,
  baseManaRegenOoc: 14,
  manaRegen: 8,
  manaRegenOoc: 14,
  fatigueDecay: 18,
  fatiguePenalty: 0,
  inCombatTimer: 0,
  xp: 0,
  level: 1,
  xpToNext: 120,
  gold: 20,
  shield: 0,
  talents: 0,
  spellPower: 1,
  perks: [],
  inventory: [],
  equipment: { staff: null, robe: null, ring: null },
  target: null,
  cast: null,
  globalCooldown: 0
};

const playerGroup = createHumanoid({
  body: materials.player,
  accent: materials.glow,
  height: 1.6,
  role: "player",
  staff: true
});
playerGroup.position.copy(player.pos);
scene.add(playerGroup);
player.mesh = playerGroup;

const enemies = [];
const npcs = [];
const lootDrops = [];
const projectiles = [];
const summoned = [];
const interactables = [];
const escort = {
  npc: null,
  destination: new THREE.Vector3(72, 1, 42)
};

const questState = {
  quests: {},
  active: [],
  completed: []
};

let abilities = [];
let abilityState = {};

const lootTable = [
  { id: "crystal_dust", chance: 0.45 },
  { id: "tarnished_charm", chance: 0.35 },
  { id: "seer_eye", chance: 0.2 },
  { id: "relic_shard", chance: 0.25 }
];

const dialogueLines = {
  scout: "The wilds are restless. Keep your eyes on the tree line.",
  archivist: "Knowledge is a shield. Gather what we have lost.",
  warden: "Stay sharp. The ruins do not forgive complacency.",
  trainer: "Breathe with the ley lines. Let them guide your casts.",
  courier: "A quick run and a quicker return keeps the camp alive.",
  hermit: "Storms carry secrets. Don't ignore what the wind whispers.",
  merchant: "Coin keeps the camp warm. Spend it wisely."
};

function showWarning(message) {
  uiWarnings.push({ message, timer: 4 });
}

function addCombatLog(message) {
  combatLog.unshift({ message, timer: 8 });
  if (combatLog.length > 6) {
    combatLog.pop();
  }
}

function getItemById(id) {
  const item = dataStore.itemMap.get(id);
  if (!item) {
    showWarning(`Missing item: ${id}`);
  }
  return item;
}

function getQuestById(id) {
  const quest = dataStore.questMap.get(id);
  if (!quest) {
    showWarning(`Missing quest: ${id}`);
  }
  return quest;
}

function getSpellById(id) {
  const spell = dataStore.spellMap.get(id);
  if (!spell) {
    showWarning(`Missing spell: ${id}`);
  }
  return spell;
}

function getNpcById(id) {
  const npc = dataStore.npcMap.get(id);
  if (!npc) {
    showWarning(`Missing NPC: ${id}`);
  }
  return npc;
}

function createHumanoid({ body, accent, height = 1.5, role = "npc", staff = false, scale = 1 }) {
  const group = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale, 0.4 * scale, height * 0.6, 6), body);
  torso.castShadow = true;
  torso.position.y = height * 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25 * scale, 12, 12), accent || body);
  head.castShadow = true;
  head.position.y = height * 0.95;
  const hip = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.25 * scale, 0.3 * scale), body);
  hip.castShadow = true;
  hip.position.y = height * 0.25;
  const armLeft = new THREE.Mesh(new THREE.BoxGeometry(0.15 * scale, height * 0.45, 0.15 * scale), body);
  const armRight = armLeft.clone();
  armLeft.position.set(-0.45 * scale, height * 0.55, 0);
  armRight.position.set(0.45 * scale, height * 0.55, 0);
  armLeft.castShadow = true;
  armRight.castShadow = true;
  const legLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, height * 0.45, 0.18 * scale), body);
  const legRight = legLeft.clone();
  legLeft.position.set(-0.18 * scale, height * 0.1, 0);
  legRight.position.set(0.18 * scale, height * 0.1, 0);
  legLeft.castShadow = true;
  legRight.castShadow = true;
  group.add(torso, head, hip, armLeft, armRight, legLeft, legRight);
  if (staff) {
    const staffMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, height * 0.9, 6), accent || body);
    staffMesh.position.set(0.6 * scale, height * 0.55, 0.2 * scale);
    staffMesh.rotation.z = Math.PI / 5;
    staffMesh.castShadow = true;
    group.add(staffMesh);
  }
  group.userData = {
    role,
    armLeft,
    armRight,
    legLeft,
    legRight,
    torso,
    head,
    baseY: group.position.y,
    torsoBase: torso.position.y
  };
  return group;
}

function addEnemyProps(group, type) {
  if (!group) return;
  if (type === "brute") {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 6), materials.enemyPurple);
    horn.position.set(0, 2.2, 0);
    group.add(horn);
  }
  if (type === "seer") {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), materials.glow);
    orb.position.set(0.6, 1.6, 0);
    group.add(orb);
  }
  if (type === "flying") {
    const wingLeft = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.3), materials.enemyBlack);
    const wingRight = wingLeft.clone();
    wingLeft.position.set(-0.8, 1.2, 0);
    wingRight.position.set(0.8, 1.2, 0);
    group.add(wingLeft, wingRight);
  }
  if (type === "guardian") {
    const mantle = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 0.8), materials.enemyGold);
    mantle.position.set(0, 1.7, 0);
    group.add(mantle);
  }
  if (type === "scout") {
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.8, 6), materials.enemyGreen);
    tail.position.set(0, 0.6, -0.4);
    tail.rotation.x = Math.PI / 4;
    group.add(tail);
  }
  if (type === "raider") {
    const spikes = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.2), materials.enemyRed);
    spikes.position.set(0, 1.6, -0.2);
    group.add(spikes);
  }
  if (type === "sprinter") {
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.4), materials.enemyGreen);
    crest.position.set(0, 1.7, 0.1);
    group.add(crest);
  }
  if (type === "channeler") {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 8, 16), materials.glow);
    halo.position.set(0, 1.9, 0);
    halo.rotation.x = Math.PI / 2;
    group.add(halo);
  }
}

function createPropBox(x, z, w, d, h, material = materials.rock, y = h / 2) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  worldRoot.add(mesh);
  world.props.push(mesh);
  world.colliders.push({ type: "box", pos: new THREE.Vector3(x, y, z), size: new THREE.Vector3(w / 2, h / 2, d / 2) });
  return mesh;
}

function createPropSphere(x, z, radius, material = materials.rock, y = radius) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 12), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  worldRoot.add(mesh);
  world.props.push(mesh);
  world.colliders.push({ type: "sphere", pos: mesh.position.clone(), radius });
  return mesh;
}

function createTree(x, z, height = 4) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, height, 6), materials.bark);
  trunk.position.set(x, height / 2, z);
  trunk.castShadow = true;
  const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 0), materials.tree);
  canopy.position.set(x, height + 0.4, z);
  canopy.castShadow = true;
  worldRoot.add(trunk, canopy);
  world.props.push(trunk, canopy);
  world.colliders.push({ type: "sphere", pos: new THREE.Vector3(x, height + 0.4, z), radius: 1.2 });
}

function createAreaPlane(x, z, w, d, material) {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(x, 0.01, z);
  plane.receiveShadow = true;
  worldRoot.add(plane);
}

function buildWorld() {
  createAreaPlane(-50, 0, 70, 50, materials.camp);
  createAreaPlane(30, -40, 90, 70, materials.path);
  createAreaPlane(60, -80, 70, 70, materials.lake);
  createAreaPlane(70, 50, 80, 80, materials.ruins);
  createAreaPlane(0, 70, 70, 70, materials.cave);

  world.zones = [
    { name: "Camp", center: new THREE.Vector3(-50, 0, 0), radius: 40 },
    { name: "Forest", center: new THREE.Vector3(10, 0, -20), radius: 60 },
    { name: "Ruins", center: new THREE.Vector3(70, 0, 50), radius: 45 },
    { name: "Cave Gate", center: new THREE.Vector3(0, 0, 70), radius: 35 },
    { name: "Lake Shore", center: new THREE.Vector3(60, 0, -80), radius: 45 }
  ];

  createPropBox(-30, -10, 8, 6, 3, materials.cloth, 1.5);
  createPropBox(-65, 5, 6, 6, 2.5, materials.rock, 1.2);
  createPropBox(-55, -12, 5, 5, 2.5, materials.rock, 1.2);
  createPropBox(-40, 12, 4, 4, 2, materials.rock, 1);
  createPropBox(-42, -6, 2, 6, 3, materials.cloth, 1.5);
  createPropBox(-60, -5, 3, 7, 3.5, materials.cloth, 1.7);

  createPropBox(10, -40, 6, 6, 4, materials.rock, 2);
  createPropBox(25, -30, 5, 5, 3, materials.rock, 1.5);
  createPropBox(20, -15, 4, 7, 3, materials.rock, 1.5);

  createPropBox(60, 50, 6, 12, 6, materials.ruins, 3);
  createPropBox(80, 45, 10, 6, 4, materials.ruins, 2);
  createPropBox(70, 65, 8, 8, 5, materials.ruins, 2.5);

  createPropBox(0, 70, 12, 8, 6, materials.cave, 3);
  createPropBox(-10, 65, 6, 6, 4, materials.cave, 2);

  createPropBox(60, -80, 6, 10, 2, materials.lake, 1);
  createPropBox(75, -90, 4, 6, 2, materials.lake, 1);

  for (let i = 0; i < 45; i += 1) {
    createTree(randRange(-5, 80), randRange(-15, -90));
  }
  for (let i = 0; i < 35; i += 1) {
    createTree(randRange(20, 100), randRange(10, 90), randRange(3, 5));
  }
  for (let i = 0; i < 20; i += 1) {
    createPropSphere(randRange(-20, 20), randRange(40, 90), randRange(1, 2.2));
  }
}

function createQuestMarker(text, color) {
  const size = 64;
  const canvasEl = document.createElement("canvas");
  canvasEl.width = size;
  canvasEl.height = size;
  const ctx = canvasEl.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0b0f18";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, size / 2, size / 2);
  const texture = new THREE.CanvasTexture(canvasEl);
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.4, 1.4, 1.4);
  return sprite;
}

function createEnemy(def) {
  const mesh = createHumanoid({ body: def.material, accent: materials.glow, height: def.height, role: "enemy" });
  addEnemyProps(mesh, def.type);
  mesh.position.set(def.pos.x, def.pos.y, def.pos.z);
  scene.add(mesh);
  const enemy = {
    id: def.id,
    name: def.name,
    type: def.type,
    mesh,
    pos: mesh.position,
    velocity: new THREE.Vector3(),
    hp: def.hp,
    maxHp: def.hp,
    damage: def.damage,
    range: def.range,
    speed: def.speed,
    leash: def.leash || 25,
    spawn: mesh.position.clone(),
    state: "patrol",
    patrol: def.patrol,
    patrolIndex: 0,
    attackTimer: 0,
    aggroRadius: def.aggro,
    target: null,
    slow: 0,
    dot: 0,
    dotTimer: 0,
    fleeing: false,
    telegraph: 0,
    respawn: 0,
    ranged: def.ranged || false
  };
  enemies.push(enemy);
  return enemy;
}

function createNpc(def) {
  const mesh = createHumanoid({ body: def.material || materials.npc, accent: materials.glow, height: 1.55, role: "npc", staff: def.staff });
  mesh.position.set(def.pos.x, def.pos.y, def.pos.z);
  scene.add(mesh);
  const npc = {
    id: def.id,
    name: def.name,
    role: def.role,
    mesh,
    pos: mesh.position,
    dialogue: def.dialogue,
    vendor: def.vendor,
    stock: def.stock || []
  };
  npcs.push(npc);
  dataStore.npcMap.set(def.id, npc);
  return npc;
}

function createInteractable(def) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 1.2), materials.glow);
  mesh.position.set(def.pos.x, 0.75, def.pos.z);
  mesh.castShadow = true;
  scene.add(mesh);
  interactables.push({ id: def.id, name: def.name, pos: mesh.position, mesh, type: def.type, order: def.order });
}

function setupActors() {
  dataStore.npcs.forEach((npcDef) => {
    const pos = new THREE.Vector3(...npcDef.pos);
    const npc = createNpc({ ...npcDef, pos });
    if (npc.id === "scribe") {
      escort.npc = npc;
    }
  });

  createInteractable({ id: "ritual1", name: "Ritual Stone", pos: new THREE.Vector3(55, 0, 55), type: "ritual", order: 1 });
  createInteractable({ id: "ritual2", name: "Ritual Stone", pos: new THREE.Vector3(68, 0, 70), type: "ritual", order: 2 });
  createInteractable({ id: "ritual3", name: "Ritual Stone", pos: new THREE.Vector3(85, 0, 50), type: "ritual", order: 3 });

  createInteractable({ id: "sample1", name: "Lake Sample", pos: new THREE.Vector3(55, 0, -80), type: "sample", order: 1 });
  createInteractable({ id: "sample2", name: "Lake Sample", pos: new THREE.Vector3(75, 0, -92), type: "sample", order: 2 });
}

function spawnEnemies() {
  const spawns = [
    { id: "stalker1", name: "Wild Stalker", type: "stalker", pos: new THREE.Vector3(0, 1, -25), material: materials.enemyRed, hp: 70, damage: 7, speed: 4.5, range: 2.2, aggro: 14, height: 1.5 },
    { id: "stalker2", name: "Wild Stalker", type: "stalker", pos: new THREE.Vector3(12, 1, -40), material: materials.enemyRed, hp: 70, damage: 7, speed: 4.5, range: 2.2, aggro: 14, height: 1.5 },
    { id: "scout1", name: "Razor Scout", type: "scout", pos: new THREE.Vector3(35, 1, -20), material: materials.enemyGreen, hp: 60, damage: 6, speed: 6.2, range: 2, aggro: 12, height: 1.45 },
    { id: "seer1", name: "Rogue Seer", type: "seer", pos: new THREE.Vector3(65, 1, -70), material: materials.enemyTeal, hp: 65, damage: 8, speed: 3.5, range: 14, aggro: 18, height: 1.6, ranged: true },
    { id: "seer2", name: "Rogue Seer", type: "seer", pos: new THREE.Vector3(75, 1, -90), material: materials.enemyTeal, hp: 65, damage: 8, speed: 3.5, range: 14, aggro: 18, height: 1.6, ranged: true },
    { id: "brute1", name: "Cave Brute", type: "brute", pos: new THREE.Vector3(-5, 1, 75), material: materials.enemyPurple, hp: 160, damage: 14, speed: 2.6, range: 2.8, aggro: 16, height: 1.9 },
    { id: "guardian", name: "Ruin Guardian", type: "guardian", pos: new THREE.Vector3(70, 1, 60), material: materials.enemyGold, hp: 120, damage: 11, speed: 3.1, range: 2.4, aggro: 16, height: 1.7 },
    { id: "shade", name: "Glide Shade", type: "flying", pos: new THREE.Vector3(50, 2, -10), material: materials.enemyBlack, hp: 55, damage: 7, speed: 4.4, range: 10, aggro: 16, height: 1.2, ranged: true },
    { id: "seer3", name: "Rogue Seer", type: "seer", pos: new THREE.Vector3(58, 1, -95), material: materials.enemyTeal, hp: 65, damage: 8, speed: 3.5, range: 14, aggro: 18, height: 1.6, ranged: true },
    { id: "raider", name: "Feral Raider", type: "raider", pos: new THREE.Vector3(20, 1, -60), material: materials.enemyRed, hp: 80, damage: 9, speed: 5.4, range: 2.2, aggro: 15, height: 1.55 },
    { id: "sprinter", name: "Wild Sprinter", type: "sprinter", pos: new THREE.Vector3(5, 1, -55), material: materials.enemyGreen, hp: 50, damage: 6, speed: 7.4, range: 1.8, aggro: 14, height: 1.4 },
    { id: "channeler", name: "Mist Channeler", type: "channeler", pos: new THREE.Vector3(80, 1, -75), material: materials.enemyGold, hp: 70, damage: 10, speed: 3, range: 16, aggro: 18, height: 1.6, ranged: true }
  ];

  spawns.forEach((spawn) => {
    spawn.patrol = [
      spawn.pos.clone().add(new THREE.Vector3(randRange(-6, 6), 0, randRange(-6, 6))),
      spawn.pos.clone().add(new THREE.Vector3(randRange(-6, 6), 0, randRange(-6, 6)))
    ];
    createEnemy(spawn);
  });
}

function setupHotbar() {
  dom.hotbar.innerHTML = "";
  abilities.forEach((ability) => {
    const slot = document.createElement("div");
    slot.className = "hotbar__slot";
    slot.dataset.id = ability.id;
    slot.innerHTML = `<span>${ability.key}</span>${ability.name}<div class="hotbar__mana">${ability.mana}</div><div class="hotbar__cooldown"></div>`;
    slot.addEventListener("click", () => attemptCast(ability));
    dom.hotbar.appendChild(slot);
  });
}

function showFloatingText(text, position) {
  const el = document.createElement("div");
  el.className = "floating";
  el.textContent = text;
  const coords = toScreenPosition(position);
  if (!coords) return;
  el.style.left = `${coords.x}px`;
  el.style.top = `${coords.y}px`;
  dom.floatingText.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function addQuestProgress(id, amount = 1) {
  const quest = getQuestById(id);
  if (!quest) return;
  const state = questState.quests[id];
  if (!state || state.status !== "active") return;
  const step = quest.steps[state.stepIndex];
  if (!step) return;
  state.progress = clamp(state.progress + amount, 0, step.count || 1);
  if (state.progress >= (step.count || 1)) {
    state.stepIndex += 1;
    state.progress = 0;
    if (state.stepIndex >= quest.steps.length) {
      state.status = "complete";
      questState.completed.push(id);
      addCombatLog(`Quest complete: ${quest.title}`);
    } else {
      addCombatLog(`Quest updated: ${quest.title}`);
    }
  }
}

function startQuest(id) {
  if (questState.quests[id]) return;
  const quest = getQuestById(id);
  if (!quest) return;
  questState.quests[id] = { status: "active", progress: 0, stepIndex: 0 };
  questState.active.push(id);
  addCombatLog(`Quest accepted: ${quest.title}`);
}

function turnInQuest(id) {
  const quest = getQuestById(id);
  if (!quest) return;
  const state = questState.quests[id];
  if (!state || state.status !== "complete") return;
  state.status = "turnedIn";
  player.gold += quest.reward.gold || 0;
  if (quest.reward.mana) player.baseMana += quest.reward.mana;
  if (quest.reward.xp) awardXp(quest.reward.xp);
  if (quest.reward.item) giveItem(quest.reward.item, 1);
  questState.active = questState.active.filter((activeId) => activeId !== id);
  recalcStats();
  addCombatLog(`Quest turned in: ${quest.title}`);
}

function awardXp(amount) {
  player.xp += amount;
  while (player.xp >= player.xpToNext && player.level < 10) {
    player.xp -= player.xpToNext;
    player.level += 1;
    player.xpToNext = Math.floor(player.xpToNext * 1.25);
    player.baseHp += 6;
    player.baseMana += 4;
    player.talents += player.level % 2 === 0 ? 1 : 0;
    recalcStats();
    if (player.talents > 0) showPerkChoice();
  }
}

function giveItem(id, quantity = 1) {
  const item = getItemById(id);
  if (!item) return;
  const entry = player.inventory.find((inv) => inv.id === id);
  if (entry) {
    entry.quantity += quantity;
  } else {
    player.inventory.push({ id, quantity });
  }
}

function removeItem(id, quantity = 1) {
  const index = player.inventory.findIndex((item) => item.id === id);
  if (index >= 0) {
    player.inventory[index].quantity -= quantity;
    if (player.inventory[index].quantity <= 0) {
      player.inventory.splice(index, 1);
    }
  }
}

function equipItem(itemId) {
  const item = getItemById(itemId);
  if (!item || !item.slot) return;
  player.equipment[item.slot] = item.id;
  addCombatLog(`Equipped: ${item.name}`);
  recalcStats();
}

function useItem(itemId) {
  const item = getItemById(itemId);
  if (!item || item.type !== "consumable") return;
  if (item.stats?.mana) player.mana = Math.min(player.maxMana, player.mana + item.stats.mana);
  if (item.stats?.hp) player.hp = Math.min(player.maxHp, player.hp + item.stats.hp);
  removeItem(itemId, 1);
  addCombatLog(`Used: ${item.name}`);
}

function recalcStats() {
  let bonusHp = 0;
  let bonusMana = 0;
  let bonusRegen = 0;
  let bonusSpellPower = 0;

  Object.values(player.equipment).forEach((itemId) => {
    if (!itemId) return;
    const item = getItemById(itemId);
    if (!item?.stats) return;
    bonusHp += item.stats.hp || 0;
    bonusMana += item.stats.mana || 0;
    bonusRegen += item.stats.manaRegen || 0;
    bonusSpellPower += item.stats.spellPower || 0;
  });

  player.maxHp = player.baseHp + bonusHp;
  player.maxMana = player.baseMana + bonusMana;
  player.manaRegen = player.baseManaRegen + bonusRegen;
  player.manaRegenOoc = player.baseManaRegenOoc + bonusRegen * 1.5;
  player.spellPower = 1 + bonusSpellPower;
  player.hp = clamp(player.hp, 0, player.maxHp);
  player.mana = clamp(player.mana, 0, player.maxMana);
}

function openVendor(npc) {
  openPanel("vendor");
  dom.vendorBuy.innerHTML = "";
  dom.vendorSell.innerHTML = "";
  const stock = npc.stock || [];
  stock.forEach((itemId) => {
    const item = getItemById(itemId);
    if (!item) return;
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.textContent = `${item.name} (${item.value}g)`;
    button.addEventListener("click", () => {
      if (player.gold >= item.value) {
        player.gold -= item.value;
        giveItem(item.id, 1);
        addCombatLog(`Purchased ${item.name}`);
      } else {
        showWarning("Not enough gold.");
      }
    });
    li.appendChild(button);
    dom.vendorBuy.appendChild(li);
  });

  player.inventory.forEach((entry) => {
    const item = getItemById(entry.id);
    if (!item) return;
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.textContent = `${item.name} x${entry.quantity} (${Math.floor(item.value / 2)}g)`;
    button.addEventListener("click", () => {
      removeItem(entry.id, 1);
      player.gold += Math.floor(item.value / 2);
      addCombatLog(`Sold ${item.name}`);
      openVendor(npc);
    });
    li.appendChild(button);
    dom.vendorSell.appendChild(li);
  });
}

function closeVendor() {
  dom.vendorPanel.classList.add("hidden");
}

function showPerkChoice() {
  dom.dialoguePanel.classList.remove("hidden");
  dom.dialogueTitle.textContent = "Perk Choice";
  dom.dialogueText.textContent = "Select a perk to refine your arcane path.";
  dom.dialogueChoices.innerHTML = "";
  const perks = [
    { name: "Focused Mind", effect: () => (player.baseMana += 10) },
    { name: "Ritual Guard", effect: () => (player.baseHp += 12) },
    { name: "Quickened", effect: () => (player.speed += 0.5) }
  ];
  perks.forEach((perk) => {
    const button = document.createElement("button");
    button.textContent = perk.name;
    button.addEventListener("click", () => {
      perk.effect();
      player.talents = Math.max(0, player.talents - 1);
      recalcStats();
      dom.dialoguePanel.classList.add("hidden");
    });
    dom.dialogueChoices.appendChild(button);
  });
}

function openDialogue(npc) {
  openPanel("dialogue");
  dom.dialogueTitle.textContent = `${npc.name} - ${npc.role}`;
  dom.dialogueChoices.innerHTML = "";
  const availableQuests = dataStore.quests.filter(
    (quest) => quest.giver === npc.id && !questState.quests[quest.id]
  );
  const completedQuests = dataStore.quests.filter(
    (quest) => quest.giver === npc.id && questState.quests[quest.id]?.status === "complete"
  );
  dom.dialogueText.textContent = dialogueLines[npc.dialogue] || "...";

  availableQuests.forEach((quest) => {
    const button = document.createElement("button");
    button.textContent = `Accept: ${quest.title}`;
    button.addEventListener("click", () => {
      startQuest(quest.id);
      dom.dialoguePanel.classList.add("hidden");
    });
    dom.dialogueChoices.appendChild(button);
  });
  completedQuests.forEach((quest) => {
    const button = document.createElement("button");
    button.textContent = `Complete: ${quest.title}`;
    button.addEventListener("click", () => {
      turnInQuest(quest.id);
      dom.dialoguePanel.classList.add("hidden");
    });
    dom.dialogueChoices.appendChild(button);
  });
  if (npc.vendor) {
    const button = document.createElement("button");
    button.textContent = "Browse goods";
    button.addEventListener("click", () => openVendor(npc));
    dom.dialogueChoices.appendChild(button);
  }
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => dom.dialoguePanel.classList.add("hidden"));
  dom.dialogueChoices.appendChild(closeBtn);
}

function updateQuestLog() {
  dom.questLogList.innerHTML = "";
  dom.questLogDetail.innerHTML = "";
  dataStore.quests.forEach((quest) => {
    const state = questState.quests[quest.id];
    if (!state) return;
    const entry = document.createElement("div");
    entry.className = "quest-log__entry";
    entry.textContent = `${quest.title} (${state.status})`;
    entry.addEventListener("click", () => {
      document.querySelectorAll(".quest-log__entry").forEach((el) => el.classList.remove("active"));
      entry.classList.add("active");
      renderQuestDetail(dom.questLogDetail, quest, state);
    });
    dom.questLogList.appendChild(entry);
  });
}

function renderQuestDetail(container, quest, state) {
  const step = quest.steps[state.stepIndex] || quest.steps[quest.steps.length - 1];
  container.innerHTML = `
    <h4>${quest.title}</h4>
    <p>${quest.premise}</p>
    <p><strong>Current:</strong> ${step?.text || ""}</p>
    <p><strong>Progress:</strong> ${state.progress}/${step?.count || 1}</p>
    <p><strong>Reward:</strong> ${quest.reward.gold || 0}g, ${quest.reward.xp || 0}xp</p>
  `;
}

function toggleQuestLog() {
  if (dom.questLog.classList.contains("hidden")) {
    openPanel("questLog");
    updateQuestLog();
  } else {
    dom.questLog.classList.add("hidden");
  }
}

function updateQuestTracker() {
  dom.questTracker.innerHTML = "";
  dom.questTrackerDetail.innerHTML = "";
  questState.active.forEach((id) => {
    const quest = getQuestById(id);
    if (!quest) return;
    const state = questState.quests[id];
    const step = quest.steps[state.stepIndex];
    const progress = step?.count ? `${state.progress}/${step.count}` : state.status;
    const item = document.createElement("div");
    item.className = "quest-item";
    item.textContent = `${quest.title}: ${progress}`;
    dom.questTracker.appendChild(item);
    if (!dom.questTrackerDetail.innerHTML) {
      dom.questTrackerDetail.innerHTML = `<strong>${step?.text || ""}</strong>`;
    }
  });
}

function handleQuestEvent(type, target) {
  questState.active.forEach((questId) => {
    const quest = getQuestById(questId);
    if (!quest) return;
    const state = questState.quests[questId];
    const step = quest.steps[state.stepIndex];
    if (!step || step.type !== type) return;
    if (step.target !== target) return;
    addQuestProgress(questId);
  });
}

function attemptCast(ability) {
  if (player.globalCooldown > 0 || player.cast) return;
  const state = abilityState[ability.id];
  if (!state || state.cooldown > 0) return;
  if (player.mana < ability.mana) {
    showWarning("Not enough mana.");
    return;
  }
  if (ability.requiresTarget) {
    if (!player.target || player.target.hp <= 0) return;
    if (player.pos.distanceTo(player.target.pos) > ability.range) return;
  }

  player.mana -= ability.mana;
  player.globalCooldown = 0.8;
  if (ability.cast > 0) {
    player.cast = {
      ability,
      timer: ability.cast
    };
  } else {
    executeAbility(ability);
  }
  abilityState[ability.id].cooldown = ability.cooldown;
  addCombatLog(`Cast ${ability.name}`);
}

function executeAbility(ability) {
  player.cast = null;
  if (ability.effect === "bolt") {
    spawnProjectile(player, player.target, 18, 22 * player.spellPower, 14, 0x8cd3ff);
  }
  if (ability.effect === "lance") {
    spawnProjectile(player, player.target, 20, 32 * player.spellPower, 20, 0xffa96b);
  }
  if (ability.effect === "snare") {
    applyDebuff(player.target, { slow: 0.5, duration: 4 });
    spawnSigil(player.target.pos, 0x5ecbff);
  }
  if (ability.effect === "shield") {
    player.shield = 40 * player.spellPower;
    spawnSigil(player.pos, 0x7dd7ff);
  }
  if (ability.effect === "nova") {
    enemies.forEach((enemy) => {
      if (enemy.hp > 0 && enemy.pos.distanceTo(player.pos) < 6) {
        applyDamage(enemy, 18 * player.spellPower);
      }
    });
    spawnNova(player.pos, 0x8cd3ff);
  }
  if (ability.effect === "dot") {
    applyDebuff(player.target, { dot: 4 * player.spellPower, duration: 6, tick: 1 });
    spawnSigil(player.target.pos, 0x9a7bff);
  }
  if (ability.effect === "blink") {
    const direction = new THREE.Vector3(Math.sin(settings.cameraYaw), 0, Math.cos(settings.cameraYaw));
    const targetPos = player.pos.clone().add(direction.multiplyScalar(6));
    if (!resolveCollisions(targetPos, player.radius)) {
      player.pos.copy(targetPos);
      player.mesh.position.copy(player.pos);
    }
    spawnSigil(player.pos, 0x7dd7ff);
  }
  if (ability.effect === "summon") {
    summonCompanion();
  }
}

function spawnProjectile(source, target, speed, damage, size, color) {
  if (!target) return;
  const geometry = new THREE.SphereGeometry(0.15, 8, 8);
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(source.pos).add(new THREE.Vector3(0, 1.1, 0));
  scene.add(mesh);
  const dir = target.pos.clone().sub(source.pos).setY(0).normalize();
  projectiles.push({ mesh, velocity: dir.multiplyScalar(speed), damage, source, target, life: 3 });
}

function spawnEnemyProjectile(source, target, speed, damage, color) {
  if (!target) return;
  const geometry = new THREE.SphereGeometry(0.18, 8, 8);
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(source.pos).add(new THREE.Vector3(0, 1.2, 0));
  scene.add(mesh);
  const dir = target.pos.clone().sub(source.pos).setY(0).normalize();
  projectiles.push({ mesh, velocity: dir.multiplyScalar(speed), damage, source, target, enemy: true, life: 3 });
}

function spawnSigil(position, color) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.08, 10, 20),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(position).setY(0.2);
  scene.add(ring);
  particles.push({ mesh: ring, life: 1, fade: true });
}

function spawnNova(position, color) {
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 10, 10),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, transparent: true, opacity: 0.8 })
  );
  sphere.position.copy(position).setY(1);
  scene.add(sphere);
  particles.push({ mesh: sphere, life: 0.6, expand: 6 });
}

function applyDebuff(target, { slow = 0, duration = 0, dot = 0, tick = 1 }) {
  if (!target) return;
  if (slow > 0) {
    target.slow = slow;
    target.slowTimer = duration;
  }
  if (dot > 0) {
    target.dot = dot;
    target.dotTimer = duration;
    target.dotTick = tick;
    target.dotTickTimer = tick;
  }
}

function applyDamage(target, amount) {
  if (!target || target.hp <= 0) return;
  target.hp -= amount;
  target.hp = Math.max(0, target.hp);
  player.inCombatTimer = 6;
  showFloatingText(`-${Math.floor(amount)}`, target.pos.clone().add(new THREE.Vector3(0, 1.6, 0)));
  if (target.hp <= 0) {
    if (target === player) {
      addCombatLog("You collapse and retreat to camp.");
      player.hp = Math.floor(player.maxHp * 0.6);
      player.mana = Math.floor(player.maxMana * 0.5);
      player.pos.set(-50, 1, 0);
      player.mesh.position.copy(player.pos);
      player.target = null;
    } else {
      handleEnemyDown(target);
    }
  }
}

function handleEnemyDown(enemy) {
  enemy.state = "down";
  enemy.mesh.visible = false;
  enemy.respawn = 15;
  addCombatLog(`${enemy.name} defeated.`);
  handleQuestEvent("kill", enemy.type);

  const drop = lootTable.find((item) => prng.random() < item.chance);
  if (drop) {
    const item = getItemById(drop.id);
    if (item) {
      lootDrops.push({ itemId: item.id, pos: enemy.pos.clone(), timer: 15 });
    }
  }
  player.gold += Math.floor(randRange(4, 9));
}

function toScreenPosition(position) {
  const vector = position.clone();
  vector.project(camera);
  if (vector.z > 1) return null;
  return {
    x: (vector.x * 0.5 + 0.5) * window.innerWidth,
    y: (-(vector.y * 0.5) + 0.5) * window.innerHeight
  };
}

function updateCamera(dt) {
  settings.cameraYaw = lerp(settings.cameraYaw, settings.cameraYawTarget, dt * settings.cameraSmoothing);
  settings.cameraPitch = lerp(settings.cameraPitch, settings.cameraPitchTarget, dt * settings.cameraSmoothing);

  const offset = new THREE.Vector3(
    Math.sin(settings.cameraYaw) * settings.zoom,
    settings.zoom * settings.cameraPitch,
    Math.cos(settings.cameraYaw) * settings.zoom
  );
  let desired = player.pos.clone().add(offset);
  const direction = desired.clone().sub(player.pos).normalize();
  const ray = new THREE.Raycaster(player.pos.clone().add(new THREE.Vector3(0, 1, 0)), direction, 0, settings.zoom);
  const hit = ray.intersectObjects(world.props, true)[0];
  if (hit) {
    desired = player.pos.clone().add(direction.multiplyScalar(Math.max(2.5, hit.distance - 0.4)));
  }

  camera.position.lerp(desired, dt * settings.cameraSmoothing);
  camera.lookAt(player.pos.clone().add(new THREE.Vector3(0, 1.2, 0)));
}

function resetCameraToSpawn() {
  player.pos.copy(spawnPoint);
  player.velocity.set(0, 0, 0);
  player.mesh.position.copy(player.pos);
  player.yawTarget = player.yaw;
  settings.cameraYawTarget = player.yaw + Math.PI;
  settings.cameraYaw = settings.cameraYawTarget;
  settings.cameraPitchTarget = 0.45;
  settings.cameraPitch = settings.cameraPitchTarget;
  settings.zoom = clamp(11, settings.minZoom, settings.maxZoom);
  showWarning("Camera reset to spawn.");
}

function ensureWorldVisibility() {
  if (!worldRoot.visible) {
    worldRoot.visible = true;
  }
  if (worldRoot.scale.lengthSq() === 0) {
    worldRoot.scale.set(1, 1, 1);
  }
}

function resolveCollisions(position, radius) {
  let collided = false;
  world.colliders.forEach((collider) => {
    if (collider.type === "sphere") {
      const dir = position.clone().sub(collider.pos);
      const dist = dir.length();
      const minDist = radius + collider.radius;
      if (dist < minDist) {
        const push = dir.normalize().multiplyScalar(minDist - dist + 0.01);
        position.add(push);
        collided = true;
      }
    } else if (collider.type === "box") {
      const closest = new THREE.Vector3(
        clamp(position.x, collider.pos.x - collider.size.x, collider.pos.x + collider.size.x),
        clamp(position.y, collider.pos.y - collider.size.y, collider.pos.y + collider.size.y),
        clamp(position.z, collider.pos.z - collider.size.z, collider.pos.z + collider.size.z)
      );
      const dist = position.distanceTo(closest);
      if (dist < radius) {
        const dir = position.clone().sub(closest).normalize();
        position.add(dir.multiplyScalar(radius - dist + 0.01));
        collided = true;
      }
    }
  });
  position.x = clamp(position.x, -world.size / 2 + radius, world.size / 2 - radius);
  position.z = clamp(position.z, -world.size / 2 + radius, world.size / 2 - radius);
  position.y = Math.max(groundHeight, position.y);
  return collided;
}

function updatePlayer(dt) {
  const move = new THREE.Vector3();
  const forward = new THREE.Vector3(Math.sin(settings.cameraYaw), 0, Math.cos(settings.cameraYaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  if (input.keys.has("KeyW")) move.add(forward);
  if (input.keys.has("KeyS")) move.sub(forward);
  if (input.keys.has("KeyA")) move.sub(right);
  if (input.keys.has("KeyD")) move.add(right);

  if (input.keys.has("KeyQ")) settings.cameraYawTarget += dt * 1.8;
  if (input.keys.has("KeyE")) settings.cameraYawTarget -= dt * 1.8;

  const sprinting = input.keys.has("ShiftLeft") || input.keys.has("ShiftRight");
  const targetSpeed = player.speed * (sprinting ? settings.sprintMultiplier : 1);

  if (move.lengthSq() > 0.01) {
    move.normalize();
    const desired = move.multiplyScalar(targetSpeed);
    player.velocity.x = approach(player.velocity.x, desired.x, player.accel * dt);
    player.velocity.z = approach(player.velocity.z, desired.z, player.accel * dt);
    player.yawTarget = Math.atan2(desired.x, desired.z);
  } else {
    player.velocity.x = approach(player.velocity.x, 0, player.decel * dt);
    player.velocity.z = approach(player.velocity.z, 0, player.decel * dt);
  }

  if (settings.holdRmb) {
    player.yawTarget = settings.cameraYaw;
  }

  player.yaw = lerpAngle(player.yaw, player.yawTarget, dt * settings.turnSmoothing);
  player.pos.add(new THREE.Vector3(player.velocity.x * dt, 0, player.velocity.z * dt));
  resolveCollisions(player.pos, player.radius);
  player.mesh.position.copy(player.pos);
  player.mesh.rotation.y = player.yaw;
}

function updateCasting(dt) {
  if (!player.cast) {
    dom.castBar.classList.add("hidden");
    return;
  }
  player.cast.timer -= dt;
  dom.castBar.classList.remove("hidden");
  dom.castLabel.textContent = player.cast.ability.name;
  dom.castFill.style.width = `${(1 - player.cast.timer / player.cast.ability.cast) * 100}%`;
  if (player.cast.timer <= 0) {
    executeAbility(player.cast.ability);
    player.cast = null;
  }
}

function updateCooldowns(dt) {
  player.globalCooldown = Math.max(0, player.globalCooldown - dt);
  abilities.forEach((ability) => {
    const state = abilityState[ability.id];
    state.cooldown = Math.max(0, state.cooldown - dt);
  });
}

function updateCombat(dt) {
  player.inCombatTimer = Math.max(0, player.inCombatTimer - dt);
  const regenRate = player.inCombatTimer > 0 ? player.manaRegen : player.manaRegenOoc;
  const fatiguePenalty = 1 - player.fatigue / player.maxFatigue * 0.6;
  player.mana = Math.min(player.maxMana, player.mana + regenRate * fatiguePenalty * dt);
  player.fatigue = Math.max(0, player.fatigue - player.fatigueDecay * dt);
}

function updateEnemies(dt) {
  enemies.forEach((enemy) => {
    if (enemy.hp <= 0) {
      enemy.respawn = Math.max(0, enemy.respawn - dt);
      if (enemy.respawn <= 0) {
        enemy.hp = enemy.maxHp;
        enemy.mesh.visible = true;
        enemy.state = "patrol";
        enemy.pos.copy(enemy.spawn);
      }
      return;
    }
    if (enemy.dotTimer > 0) {
      enemy.dotTimer -= dt;
      enemy.dotTickTimer -= dt;
      if (enemy.dotTickTimer <= 0) {
        enemy.dotTickTimer = enemy.dotTick;
        applyDamage(enemy, enemy.dot);
      }
    }
    if (enemy.slowTimer > 0) {
      enemy.slowTimer -= dt;
      if (enemy.slowTimer <= 0) {
        enemy.slow = 0;
      }
    }

    const distance = enemy.pos.distanceTo(player.pos);

    if (enemy.state === "patrol") {
      if (distance < enemy.aggroRadius) {
        enemy.state = "aggro";
        enemy.target = player;
      } else {
        patrolEnemy(enemy, dt);
      }
    }

    if (enemy.state === "aggro") {
      if (distance > enemy.leash) {
        enemy.state = "return";
        enemy.target = null;
      } else {
        chaseEnemy(enemy, dt, distance);
      }
    }

    if (enemy.state === "return") {
      const direction = enemy.spawn.clone().sub(enemy.pos);
      if (direction.length() < 1) {
        enemy.state = "patrol";
      } else {
        enemy.pos.add(direction.normalize().multiplyScalar(enemy.speed * dt));
      }
    }

    enemy.mesh.position.copy(enemy.pos);
    if (enemy.target) {
      enemy.mesh.rotation.y = Math.atan2(enemy.target.pos.x - enemy.pos.x, enemy.target.pos.z - enemy.pos.z);
    }
  });
}

function patrolEnemy(enemy, dt) {
  const target = enemy.patrol[enemy.patrolIndex];
  const direction = target.clone().sub(enemy.pos);
  if (direction.length() < 1) {
    enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrol.length;
  } else {
    enemy.pos.add(direction.normalize().multiplyScalar(enemy.speed * dt));
  }
}

function chaseEnemy(enemy, dt, distance) {
  const speed = enemy.speed * (1 - enemy.slow);
  if (enemy.ranged && distance < enemy.range * 0.8) {
    enemy.state = "kite";
  }

  if (enemy.state === "kite") {
    const away = enemy.pos.clone().sub(player.pos).setY(0).normalize();
    enemy.pos.add(away.multiplyScalar(speed * dt));
    if (distance > enemy.range) {
      enemy.state = "aggro";
    }
  } else {
    const direction = player.pos.clone().sub(enemy.pos).setY(0).normalize();
    enemy.pos.add(direction.multiplyScalar(speed * dt));
  }

  enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
  if (distance < enemy.range && enemy.attackTimer <= 0) {
    enemy.attackTimer = enemy.type === "brute" ? 2.4 : 1.4;
    if (enemy.type === "brute") {
      enemy.telegraph = 0.6;
      addCombatLog("Brute winds up a charge!");
    } else if (enemy.ranged) {
      spawnEnemyProjectile(enemy, player, 12, enemy.damage, 0xff7b7b);
      applyDamage(player, enemy.damage * 0.7);
    } else {
      applyDamage(player, enemy.damage);
    }
  }

  if (enemy.telegraph > 0) {
    enemy.telegraph -= dt;
    if (enemy.telegraph <= 0) {
      applyDamage(player, enemy.damage * 1.4);
      spawnNova(player.pos, 0xff7b7b);
    }
  }
}

function updateEscort(dt) {
  const state = questState.quests["escortScribe"];
  if (!state || state.status !== "active" || !escort.npc) return;
  const npc = escort.npc;
  const distance = npc.pos.distanceTo(player.pos);
  if (distance > 3) {
    const direction = player.pos.clone().sub(npc.pos).setY(0).normalize();
    npc.pos.add(direction.multiplyScalar(dt * 3));
    npc.mesh.position.copy(npc.pos);
    npc.mesh.rotation.y = Math.atan2(direction.x, direction.z);
  }
  if (npc.pos.distanceTo(escort.destination) < 3.5) {
    addQuestProgress("escortScribe");
  }
}

function updateProjectiles(dt) {
  projectiles.forEach((proj) => {
    proj.mesh.position.add(proj.velocity.clone().multiplyScalar(dt));
    proj.life -= dt;
    if (proj.life <= 0) {
      scene.remove(proj.mesh);
    }
    const target = proj.target;
    if (target && target.hp > 0 && proj.mesh.position.distanceTo(target.pos) < 0.8) {
      applyDamage(target, proj.damage);
      scene.remove(proj.mesh);
      proj.life = 0;
    }
  });
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    if (projectiles[i].life <= 0) projectiles.splice(i, 1);
  }
}

function updateSummons(dt) {
  summoned.forEach((pet) => {
    pet.timer -= dt;
    if (pet.timer <= 0) {
      scene.remove(pet.mesh);
      pet.dead = true;
      return;
    }
    const target = findNearestEnemy(10);
    if (target) {
      pet.mesh.position.lerp(target.pos, dt * 0.6);
      if (pet.attackTimer <= 0) {
        pet.attackTimer = 1.4;
        spawnProjectile({ pos: pet.mesh.position }, target, 16, 12, 12, 0x9fd7ff);
      }
    }
    pet.attackTimer = Math.max(0, pet.attackTimer - dt);
  });
  for (let i = summoned.length - 1; i >= 0; i -= 1) {
    if (summoned[i].dead) summoned.splice(i, 1);
  }
}

function updateParticles(dt) {
  particles.forEach((particle) => {
    particle.life -= dt;
    if (particle.expand) {
      particle.mesh.scale.addScalar(dt * particle.expand);
      particle.mesh.material.opacity = particle.life;
    }
    if (particle.fade) {
      particle.mesh.material.opacity = particle.life;
    }
  });
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) {
      scene.remove(particles[i].mesh);
      particles.splice(i, 1);
    }
  }
}

function summonCompanion() {
  const mesh = createHumanoid({ body: materials.glow, accent: materials.player, height: 1.3, role: "summon" });
  mesh.position.copy(player.pos).add(new THREE.Vector3(1.5, 0, 1.5));
  scene.add(mesh);
  summoned.push({ mesh, timer: 12, attackTimer: 0 });
}

function updateAnimations(time) {
  animateHumanoid(player.mesh, time, player.velocity.length());
  enemies.forEach((enemy) => animateHumanoid(enemy.mesh, time, enemy.velocity.length()));
  npcs.forEach((npc) => animateHumanoid(npc.mesh, time, 0));
  summoned.forEach((pet) => animateHumanoid(pet.mesh, time, 1));
}

function animateHumanoid(mesh, time, speed) {
  if (!mesh?.userData) return;
  const sway = Math.sin(time * 4) * 0.08 * clamp(speed, 0, 1);
  mesh.userData.armLeft.rotation.x = sway;
  mesh.userData.armRight.rotation.x = -sway;
  mesh.userData.legLeft.rotation.x = -sway;
  mesh.userData.legRight.rotation.x = sway;
  mesh.position.y = 1 + Math.sin(time * 2) * 0.04;
}

function updateUi(dt) {
  dom.hpFill.style.width = `${(player.hp / player.maxHp) * 100}%`;
  dom.hpText.textContent = `${Math.floor(player.hp)} / ${player.maxHp}`;
  dom.manaFill.style.width = `${(player.mana / player.maxMana) * 100}%`;
  dom.manaText.textContent = `${Math.floor(player.mana)} / ${player.maxMana}`;
  dom.fatigueFill.style.width = `${(player.fatigue / player.maxFatigue) * 100}%`;
  dom.fatigueText.textContent = `${Math.floor(player.fatigue)} / ${player.maxFatigue}`;
  dom.levelText.textContent = player.level;
  dom.xpText.textContent = `${player.xp} / ${player.xpToNext}`;
  dom.goldText.textContent = player.gold;

  const zone = world.zones.find((zoneInfo) => zoneInfo.center.distanceTo(player.pos) < zoneInfo.radius);
  dom.zoneText.textContent = zone ? zone.name : "Outlands";

  dom.targetFrame.classList.toggle("hidden", !player.target || player.target.hp <= 0);
  if (player.target && player.target.hp > 0) {
    dom.targetName.textContent = player.target.name;
    dom.targetHp.style.width = `${(player.target.hp / player.target.maxHp) * 100}%`;
    targetRing.visible = true;
    targetRing.position.copy(player.target.pos).setY(0.05);
  } else {
    targetRing.visible = false;
  }

  dom.equipStaff.textContent = player.equipment.staff ? getItemById(player.equipment.staff)?.name || "None" : "None";
  dom.equipRobe.textContent = player.equipment.robe ? getItemById(player.equipment.robe)?.name || "None" : "None";
  dom.equipRing.textContent = player.equipment.ring ? getItemById(player.equipment.ring)?.name || "None" : "None";

  dom.inventoryList.innerHTML = "";
  const filter = dom.inventoryFilter.value;
  const sort = dom.inventorySort.value;
  const items = player.inventory
    .map((entry) => ({ ...entry, item: getItemById(entry.id) }))
    .filter((entry) => entry.item)
    .filter((entry) => filter === "all" || entry.item.type === filter)
    .sort((a, b) => {
      if (sort === "value") return b.item.value - a.item.value;
      if (sort === "rarity") return (b.item.rarity || "").localeCompare(a.item.rarity || "");
      return a.item.name.localeCompare(b.item.name);
    });

  items.forEach((entry) => {
    const li = document.createElement("li");
    const item = entry.item;
    const button = document.createElement("button");
    button.textContent = `${item.name} x${entry.quantity}`;
    button.addEventListener("mouseenter", (event) => showTooltip(event, item));
    button.addEventListener("mouseleave", hideTooltip);
    button.addEventListener("click", () => {
      if (item.type === "consumable") {
        useItem(item.id);
      } else if (item.slot) {
        equipItem(item.id);
      }
    });
    li.appendChild(button);

    if (!item.slot && item.type !== "consumable") {
      const dropBtn = document.createElement("button");
      dropBtn.textContent = "Drop";
      dropBtn.addEventListener("click", () => removeItem(item.id, 1));
      li.appendChild(dropBtn);
    }

    dom.inventoryList.appendChild(li);
  });

  abilities.forEach((ability) => {
    const slot = dom.hotbar.querySelector(`[data-id="${ability.id}"]`);
    if (!slot) return;
    const cooldown = abilityState[ability.id].cooldown;
    slot.dataset.cooldown = cooldown > 0;
    const overlay = slot.querySelector(".hotbar__cooldown");
    const ratio = cooldown > 0 && ability.cooldown > 0 ? cooldown / ability.cooldown : 0;
    overlay.style.clipPath = `inset(${(1 - ratio) * 100}% 0 0 0)`;
  });

  uiWarnings.forEach((warning) => {
    warning.timer -= dt;
  });
  if (uiWarnings.length > 0) {
    const warning = uiWarnings[0];
    dom.warningPanel.textContent = warning.message;
    dom.warningPanel.classList.toggle("hidden", warning.timer <= 0);
    if (warning.timer <= 0) uiWarnings.shift();
  } else {
    dom.warningPanel.classList.add("hidden");
  }

  dom.combatLog.innerHTML = "";
  combatLog.forEach((entry) => {
    entry.timer -= dt;
    if (entry.timer <= 0) return;
    const line = document.createElement("div");
    line.textContent = entry.message;
    dom.combatLog.appendChild(line);
  });

  updateQuestMarkers();
  updateCompass();
}

function updateDebugHud() {
  if (!dom.debugHud) return;
  const cameraPos = formatVec3(camera.position);
  const cameraRot = formatEuler(camera.rotation);
  const playerPos = formatVec3(player.pos);
  const state = getGameState();
  const errorMessage = errorState.lastError || "None";
  dom.debugHud.textContent = [
    "DEBUG HUD",
    `Camera pos: ${cameraPos}`,
    `Camera rot: ${cameraRot}`,
    `Player pos: ${playerPos}`,
    `Scene children: ${scene.children.length}`,
    `Game state: ${state}`,
    `Last error: ${errorMessage}`
  ].join("\n");
}

function showTooltip(event, item) {
  dom.tooltip.classList.remove("hidden");
  dom.tooltip.style.left = `${event.clientX + 12}px`;
  dom.tooltip.style.top = `${event.clientY + 12}px`;
  dom.tooltip.innerHTML = `
    <div class="tooltip__title">${item.name}</div>
    <div class="tooltip__rarity rarity-${item.rarity}">${item.rarity}</div>
    <div>${item.description}</div>
  `;
}

function hideTooltip() {
  dom.tooltip.classList.add("hidden");
}

function updateQuestMarkers() {
  world.markers.forEach((marker) => {
    marker.visible = false;
  });

  npcs.forEach((npc) => {
    const available = dataStore.quests.find((quest) => quest.giver === npc.id && !questState.quests[quest.id]);
    const turnIn = dataStore.quests.find((quest) => quest.giver === npc.id && questState.quests[quest.id]?.status === "complete");
    if (turnIn && npc.markerTurnIn) {
      npc.markerTurnIn.visible = true;
      npc.markerTurnIn.position.copy(npc.pos).setY(2.8);
    } else if (available && npc.markerAvailable) {
      npc.markerAvailable.visible = true;
      npc.markerAvailable.position.copy(npc.pos).setY(2.8);
    }
  });

  questState.active.forEach((questId) => {
    const quest = getQuestById(questId);
    if (!quest) return;
    const state = questState.quests[questId];
    const step = quest.steps[state.stepIndex];
    if (!step) return;
    if (step.type === "interact" || step.type === "sequence") {
      interactables.forEach((obj) => {
        if (step.target === obj.type && obj.marker) {
          obj.marker.visible = true;
          obj.marker.position.copy(obj.pos).setY(2.2);
        }
      });
    }
  });
}

function updateCompass() {
  if (questState.active.length === 0) {
    dom.compassLabel.textContent = "";
    return;
  }
  const questId = questState.active[0];
  const quest = getQuestById(questId);
  const state = questState.quests[questId];
  const step = quest?.steps[state.stepIndex];
  if (!step) return;
  let targetPos = null;
  if (step.type === "reach") {
    targetPos = world.objectives[step.target];
  }
  if (step.type === "talk") {
    const npc = getNpcById(step.target);
    if (npc) targetPos = npc.pos;
  }
  if (step.type === "interact") {
    const obj = interactables.find((entry) => entry.type === step.target);
    if (obj) targetPos = obj.pos;
  }
  if (step.type === "kill") {
    const enemy = enemies.find((entry) => entry.type === step.target && entry.hp > 0);
    if (enemy) targetPos = enemy.pos;
  }

  if (!targetPos) {
    dom.compassLabel.textContent = "";
    return;
  }

  const toTarget = targetPos.clone().sub(player.pos);
  const angle = Math.atan2(toTarget.x, toTarget.z) - settings.cameraYaw;
  dom.compassArrow.style.transform = `translateX(-50%) rotate(${angle}rad)`;
  dom.compassLabel.textContent = `${step.text} (${Math.floor(toTarget.length())}m)`;
}

function updateMinimap() {
  minimapCtx.clearRect(0, 0, dom.minimap.width, dom.minimap.height);
  minimapCtx.fillStyle = "rgba(10, 16, 28, 0.7)";
  minimapCtx.fillRect(0, 0, dom.minimap.width, dom.minimap.height);
  const scale = dom.minimap.width / world.size;
  const center = dom.minimap.width / 2;

  minimapCtx.fillStyle = "#7fd9ff";
  minimapCtx.beginPath();
  minimapCtx.arc(center + player.pos.x * scale, center + player.pos.z * scale, 4, 0, Math.PI * 2);
  minimapCtx.fill();

  minimapCtx.fillStyle = "#ff7b7b";
  enemies.forEach((enemy) => {
    if (enemy.hp <= 0) return;
    minimapCtx.beginPath();
    minimapCtx.arc(center + enemy.pos.x * scale, center + enemy.pos.z * scale, 3, 0, Math.PI * 2);
    minimapCtx.fill();
  });
}

function pickLoot(dt) {
  for (let i = lootDrops.length - 1; i >= 0; i -= 1) {
    const drop = lootDrops[i];
    drop.timer -= dt;
    if (drop.timer <= 0) {
      lootDrops.splice(i, 1);
      continue;
    }
    if (drop.pos.distanceTo(player.pos) < 2) {
      giveItem(drop.itemId, 1);
      handleQuestEvent("loot", drop.itemId);
      addCombatLog(`Looted ${getItemById(drop.itemId)?.name || "item"}`);
      lootDrops.splice(i, 1);
    }
  }
}

function handleInteract() {
  const npc = npcs.find((unit) => unit.pos.distanceTo(player.pos) < 2.2);
  if (npc) {
    handleQuestEvent("talk", npc.id);
    openDialogue(npc);
    return;
  }
  interactables.forEach((obj) => {
    if (obj.pos.distanceTo(player.pos) < 2.2) {
      if (obj.type === "sample") {
        handleQuestEvent("interact", "sample");
      }
      if (obj.type === "ritual") {
        const state = questState.quests["ritualStones"];
        if (state && state.status === "active") {
          if (!state.sequence) state.sequence = 1;
          if (obj.order === state.sequence) {
            state.sequence += 1;
            addQuestProgress("ritualStones");
          }
        }
      }
    }
  });
}

function handleTargeting(event) {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(enemies.map((e) => e.mesh), true);
  if (intersects.length) {
    const targetMesh = intersects[0].object.parent;
    const target = enemies.find((enemy) => enemy.mesh === targetMesh);
    if (target) player.target = target;
  }
}

function findNearestEnemy(radius = 20) {
  let closest = null;
  let bestDist = radius;
  enemies.forEach((enemy) => {
    if (enemy.hp <= 0) return;
    const dist = enemy.pos.distanceTo(player.pos);
    if (dist < bestDist) {
      bestDist = dist;
      closest = enemy;
    }
  });
  return closest;
}

function cycleTarget() {
  const nearby = enemies.filter((enemy) => enemy.hp > 0 && enemy.pos.distanceTo(player.pos) < 25);
  if (nearby.length === 0) return;
  nearby.sort((a, b) => a.pos.distanceTo(player.pos) - b.pos.distanceTo(player.pos));
  if (!player.target) {
    player.target = nearby[0];
    return;
  }
  const index = nearby.indexOf(player.target);
  player.target = nearby[(index + 1) % nearby.length];
}

function saveGame() {
  const save = {
    player: {
      hp: player.hp,
      mana: player.mana,
      fatigue: player.fatigue,
      maxHp: player.maxHp,
      maxMana: player.maxMana,
      xp: player.xp,
      level: player.level,
      xpToNext: player.xpToNext,
      gold: player.gold,
      pos: player.pos.toArray(),
      inventory: player.inventory,
      equipment: player.equipment
    },
    questState
  };
  localStorage.setItem("wayfarer-save", JSON.stringify(save));
}

function loadGame() {
  const raw = localStorage.getItem("wayfarer-save");
  if (!raw) return;
  try {
    const save = JSON.parse(raw);
    Object.assign(player, save.player, { pos: new THREE.Vector3().fromArray(save.player.pos) });
    player.mesh.position.copy(player.pos);
    Object.assign(questState, save.questState);
    recalcStats();
  } catch (error) {
    console.error("Failed to load save", error);
  }
}

function openPanel(panelKey) {
  const panels = [dom.dialoguePanel, dom.vendorPanel, dom.questLog, dom.inventoryPanel];
  panels.forEach((panel) => panel.classList.add("hidden"));
  if (panelKey === "dialogue") dom.dialoguePanel.classList.remove("hidden");
  if (panelKey === "vendor") dom.vendorPanel.classList.remove("hidden");
  if (panelKey === "questLog") dom.questLog.classList.remove("hidden");
  if (panelKey === "inventory") dom.inventoryPanel.classList.remove("hidden");
}

function setupEvents() {
  window.onerror = (message, source, lineno, colno, error) => {
    handleGlobalError(error || new Error(message), "window.onerror");
    return true;
  };

  window.addEventListener("unhandledrejection", (event) => {
    handleGlobalError(event.reason || new Error("Unhandled rejection"), "unhandledrejection");
  });

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  window.addEventListener("keydown", (event) => {
    input.keys.add(event.code);
    if (event.code.startsWith("Digit")) {
      const ability = abilities.find((item) => item.key === event.key);
      if (ability) attemptCast(ability);
    }
    if (event.code === "KeyF") handleInteract();
    if (event.code === "KeyJ") toggleQuestLog();
    if (event.code === "KeyI") openPanel("inventory");
    if (event.code === "KeyH") dom.helpOverlay.classList.toggle("hidden");
    if (event.code === "KeyO") saveGame();
    if (event.code === "KeyR") resetCameraToSpawn();
    if (event.code === "Tab") {
      event.preventDefault();
      cycleTarget();
    }
    if (event.code === "Escape") {
      player.target = null;
      dom.dialoguePanel.classList.add("hidden");
      dom.vendorPanel.classList.add("hidden");
      dom.questLog.classList.add("hidden");
      dom.inventoryPanel.classList.add("hidden");
    }
  });

  window.addEventListener("keyup", (event) => {
    input.keys.delete(event.code);
  });

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  canvas.addEventListener("mousedown", (event) => {
    initAudio();
    if (event.button === 2) {
      settings.holdRmb = true;
      settings.rotating = true;
    }
    if (event.button === 0) {
      handleTargeting(event);
    }
  });

  canvas.addEventListener("mouseup", (event) => {
    if (event.button === 2) {
      settings.holdRmb = false;
      settings.rotating = false;
    }
  });

  canvas.addEventListener("mousemove", (event) => {
    if (settings.rotating) {
      settings.cameraYawTarget -= event.movementX * 0.003;
      settings.cameraPitchTarget = clamp(settings.cameraPitchTarget - event.movementY * 0.003, 0.15, 0.9);
    }
  });

  canvas.addEventListener("wheel", (event) => {
    settings.zoom = clamp(settings.zoom + event.deltaY * 0.01, settings.minZoom, settings.maxZoom);
  });

  dom.toggleInventory.addEventListener("click", () => openPanel("inventory"));
  dom.toggleQuestLog.addEventListener("click", () => toggleQuestLog());
  dom.closeVendor.addEventListener("click", closeVendor);
  dom.closeQuestLog.addEventListener("click", () => dom.questLog.classList.add("hidden"));
  dom.closeInventory.addEventListener("click", () => dom.inventoryPanel.classList.add("hidden"));
  dom.closeHelp.addEventListener("click", () => dom.helpOverlay.classList.add("hidden"));

  dom.inventoryFilter.addEventListener("change", () => updateUi(0));
  dom.inventorySort.addEventListener("change", () => updateUi(0));
}

function updateQuestObjectives() {
  const quest = getQuestById("miniBoss");
  const state = questState.quests["miniBoss"];
  if (quest && state && state.status === "active") {
    const step = quest.steps[state.stepIndex];
    if (step?.type === "reach") {
      const target = world.objectives[step.target];
      if (target && target.distanceTo(player.pos) < 4) {
        addQuestProgress("miniBoss");
      }
    }
  }
}

function updateTime(dt) {
  ensureWorldVisibility();
  pickLoot(dt);
  updateCooldowns(dt);
  updateCasting(dt);
  updateCombat(dt);
  updateEnemies(dt);
  updateEscort(dt);
  updateProjectiles(dt);
  updateSummons(dt);
  updateParticles(dt);
  updateAnimations(clock.elapsedTime);
  updateCamera(dt);
  updateQuestTracker();
  updateQuestObjectives();
  updateMinimap();
  updateUi(dt);
}

function gameLoop() {
  const dt = Math.min(clock.getDelta(), 0.033);
  try {
    if (!errorState.active) {
      updatePlayer(dt);
      updateTime(dt);
      renderer.render(scene, camera);
    } else {
      renderer.render(fallbackScene, fallbackCamera);
    }
  } catch (error) {
    handleGlobalError(error, "gameLoop");
    renderer.render(fallbackScene, fallbackCamera);
  }
  updateDebugHud();
  requestAnimationFrame(gameLoop);
}

async function loadGameData() {
  const [items, spells, quests, npcsData] = await Promise.all([
    fetch("data/items.json").then((res) => res.json()),
    fetch("data/spells.json").then((res) => res.json()),
    fetch("data/quests.json").then((res) => res.json()),
    fetch("data/npcs.json").then((res) => res.json())
  ]);
  dataStore.items = items;
  dataStore.spells = spells;
  dataStore.quests = quests;
  dataStore.npcs = npcsData;
  items.forEach((item) => dataStore.itemMap.set(item.id, item));
  spells.forEach((spell) => dataStore.spellMap.set(spell.id, spell));
  quests.forEach((quest) => dataStore.questMap.set(quest.id, quest));
  npcsData.forEach((npc) => dataStore.npcMap.set(npc.id, npc));
}

function buildQuestMarkers() {
  npcs.forEach((npc) => {
    const available = createQuestMarker("!", "#ffd166");
    const turnIn = createQuestMarker("?", "#7dd7ff");
    available.visible = false;
    turnIn.visible = false;
    npc.markerAvailable = available;
    npc.markerTurnIn = turnIn;
    worldRoot.add(available, turnIn);
    world.markers.push(available, turnIn);
  });

  interactables.forEach((obj) => {
    const marker = createQuestMarker("•", "#7dd7ff");
    marker.visible = false;
    obj.marker = marker;
    worldRoot.add(marker);
    world.markers.push(marker);
  });
}

function initTutorial() {
  const steps = [
    "Welcome to the wilds. Use WASD to move and mouse wheel to zoom.",
    "Hold RMB to rotate the camera, click enemies to target.",
    "Press 1-3 to cast. Try Arc Bolt on a stalker.",
    "Press F near NPCs to accept quests.",
    "Open Inventory (I) to equip new gear."
  ];
  let index = 0;
  dom.tutorialText.textContent = steps[index];
  const interval = setInterval(() => {
    index += 1;
    if (index >= steps.length) {
      dom.tutorialText.textContent = "Tutorial complete. Explore the wilds.";
      clearInterval(interval);
      return;
    }
    dom.tutorialText.textContent = steps[index];
  }, 6000);
}

async function init() {
  await loadGameData();
  abilities = dataStore.spells;
  abilityState = abilities.reduce((acc, ability) => {
    acc[ability.id] = { cooldown: 0 };
    return acc;
  }, {});
  buildWorld();
  setupActors();
  spawnEnemies();
  buildQuestMarkers();
  setupHotbar();
  setupEvents();
  loadGame();
  recalcStats();
  initTutorial();
  setInterval(saveGame, 10000);
  updateFallbackMessage("No error reported.");
  gameLoop();
}

init();
