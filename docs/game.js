/* global THREE */

const canvas = document.getElementById("game-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f18);
scene.fog = new THREE.Fog(0x0a0f18, 32, 180);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
const clock = new THREE.Clock();

const ambient = new THREE.AmbientLight(0x89a7d9, 0.4);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xf4f6ff, 0.9);
sun.position.set(40, 60, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

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
  dialoguePanel: document.getElementById("dialogue-panel"),
  dialogueTitle: document.getElementById("dialogue-title"),
  dialogueText: document.getElementById("dialogue-text"),
  dialogueChoices: document.getElementById("dialogue-choices"),
  vendorPanel: document.getElementById("vendor-panel"),
  vendorBuy: document.getElementById("vendor-buy"),
  vendorSell: document.getElementById("vendor-sell"),
  questLog: document.getElementById("quest-log"),
  questLogList: document.getElementById("quest-log-list"),
  hotbar: document.getElementById("hotbar"),
  minimap: document.getElementById("minimap"),
  helpOverlay: document.getElementById("help-overlay")
};

const minimapCtx = dom.minimap.getContext("2d");

const settings = {
  zoom: 10,
  minZoom: 6,
  maxZoom: 18,
  cameraYaw: Math.PI / 2,
  cameraPitch: 0.45,
  cameraYawTarget: Math.PI / 2,
  cameraPitchTarget: 0.45,
  holdRmb: false,
  rotating: false
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
  zones: []
};

const input = {
  keys: new Set(),
  mouse: { x: 0, y: 0 },
  mouseDelta: { x: 0, y: 0 },
  wheel: 0,
  lastClick: 0
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

function randRange(min, max) {
  return min + (max - min) * prng.random();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

const groundGeo = new THREE.PlaneGeometry(world.size, world.size);
const ground = new THREE.Mesh(groundGeo, materials.ground);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const boundary = new THREE.Mesh(
  new THREE.BoxGeometry(world.size, 10, world.size),
  new THREE.MeshStandardMaterial({ color: 0x101722, side: THREE.BackSide })
);
boundary.position.set(0, 5, 0);
scene.add(boundary);

const targetRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.9, 0.08, 12, 36),
  new THREE.MeshStandardMaterial({ color: 0xff7bd6, emissive: 0x5c2142, emissiveIntensity: 0.8 })
);
targetRing.rotation.x = -Math.PI / 2;
targetRing.visible = false;
scene.add(targetRing);

const particles = [];

const player = {
  name: "Arcanist",
  pos: new THREE.Vector3(0, 1, 0),
  velocity: new THREE.Vector3(),
  yaw: 0,
  radius: 0.6,
  speed: 7.5,
  accel: 18,
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

const quests = [
  {
    id: "clearWilds",
    title: "Cull the Stalkers",
    giver: "Rysa",
    type: "kill",
    target: "stalker",
    count: 6,
    text: "Thin the wild stalkers prowling the forest path.",
    reward: { gold: 25, mana: 8 }
  },
  {
    id: "recoverRelics",
    title: "Lost Camp Relics",
    giver: "Archivist Miro",
    type: "fetch",
    item: "Relic Shard",
    count: 3,
    text: "Recover relic shards scattered near the ruins.",
    reward: { gold: 30, xp: 80 }
  },
  {
    id: "escortScribe",
    title: "Escort the Scribe",
    giver: "Archivist Miro",
    type: "escort",
    npc: "Scribe Ilen",
    text: "Escort Scribe Ilen to the ruin gate.",
    reward: { gold: 40, mana: 10 }
  },
  {
    id: "ritualStones",
    title: "Ritual Alignment",
    giver: "Warden Kato",
    type: "sequence",
    target: "Ritual Stone",
    count: 3,
    text: "Activate the ritual stones in the correct order.",
    reward: { gold: 20, xp: 90 }
  },
  {
    id: "miniBoss",
    title: "Break the Brute",
    giver: "Warden Kato",
    type: "kill",
    target: "brute",
    count: 1,
    text: "Defeat the hulking brute near the cave mouth.",
    reward: { gold: 60, xp: 120, item: "Caveward Ring" }
  },
  {
    id: "casterHunt",
    title: "Silent the Casters",
    giver: "Rysa",
    type: "kill",
    target: "seer",
    count: 4,
    text: "Disrupt the rogue seers at the lake shore.",
    reward: { gold: 35, xp: 70 }
  },
  {
    id: "lakeSamples",
    title: "Lake Residue",
    giver: "Herbalist Nera",
    type: "interact",
    target: "Lake Sample",
    count: 2,
    text: "Collect residue samples along the lake.",
    reward: { gold: 25, mana: 6 }
  },
  {
    id: "hermitNote",
    title: "Hermit's Note",
    giver: "Courier Vale",
    type: "talk",
    target: "Hermit Orren",
    text: "Deliver the sealed note to the hermit beyond the forest.",
    reward: { gold: 20, xp: 50 }
  }
];

const abilities = [
  {
    id: "arcBolt",
    name: "Arc Bolt",
    key: "1",
    mana: 8,
    cooldown: 0,
    cast: 0,
    range: 18,
    requiresTarget: true,
    effect: "bolt",
    description: "Instant spark of arcane force."
  },
  {
    id: "emberLance",
    name: "Ember Lance",
    key: "2",
    mana: 16,
    cooldown: 4,
    cast: 1.2,
    range: 20,
    requiresTarget: true,
    effect: "lance",
    description: "Focused cast for heavy damage."
  },
  {
    id: "sigilSnare",
    name: "Sigil Snare",
    key: "3",
    mana: 18,
    cooldown: 8,
    cast: 0.8,
    range: 16,
    requiresTarget: true,
    effect: "snare",
    description: "Arcane trap slows the target."
  },
  {
    id: "wardShell",
    name: "Ward Shell",
    key: "4",
    mana: 20,
    cooldown: 12,
    cast: 0,
    range: 0,
    requiresTarget: false,
    effect: "shield",
    description: "Instant protective shell."
  },
  {
    id: "novaPulse",
    name: "Nova Pulse",
    key: "5",
    mana: 28,
    cooldown: 10,
    cast: 0,
    range: 6,
    requiresTarget: false,
    effect: "nova",
    description: "Short-range burst around you."
  },
  {
    id: "gloomTether",
    name: "Gloom Tether",
    key: "6",
    mana: 14,
    cooldown: 6,
    cast: 1.0,
    range: 18,
    requiresTarget: true,
    effect: "dot",
    description: "Lingering damage over time."
  },
  {
    id: "blinkStep",
    name: "Blink Step",
    key: "7",
    mana: 22,
    cooldown: 14,
    cast: 0,
    range: 10,
    requiresTarget: false,
    effect: "blink",
    description: "Short teleport to reposition."
  },
  {
    id: "astralCompanion",
    name: "Astral Companion",
    key: "8",
    mana: 26,
    cooldown: 20,
    cast: 1.5,
    range: 0,
    requiresTarget: false,
    effect: "summon",
    description: "Summon a helper for a time."
  }
];

const abilityState = abilities.reduce((acc, ability) => {
  acc[ability.id] = { cooldown: 0 };
  return acc;
}, {});

const lootTable = [
  { name: "Crystal Dust", value: 6, type: "loot" },
  { name: "Tarnished Charm", value: 10, type: "loot" },
  { name: "Relic Shard", value: 0, type: "quest" }
];

const equipmentItems = [
  { name: "Ashen Staff", slot: "staff", stats: { mana: 8 }, value: 40 },
  { name: "Wayfarer Robe", slot: "robe", stats: { hp: 10 }, value: 35 },
  { name: "Focus Ring", slot: "ring", stats: { manaRegen: 1 }, value: 30 },
  { name: "Caveward Ring", slot: "ring", stats: { mana: 12 }, value: 60 }
];

const vendorStock = [
  { name: "Arcane Tonic", value: 15, type: "consumable", effect: "mana" },
  { name: "Luminous Band", value: 40, type: "equipment", item: "Focus Ring" },
  { name: "Nomad's Staff", value: 50, type: "equipment", item: "Ashen Staff" }
];

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
}

function createPropBox(x, z, w, d, h, material = materials.rock, y = h / 2) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  world.props.push(mesh);
  world.colliders.push({ type: "box", pos: new THREE.Vector3(x, y, z), size: new THREE.Vector3(w / 2, h / 2, d / 2) });
  return mesh;
}

function createPropSphere(x, z, radius, material = materials.rock, y = radius) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 12), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
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
  scene.add(trunk, canopy);
  world.props.push(trunk, canopy);
  world.colliders.push({ type: "sphere", pos: new THREE.Vector3(x, height + 0.4, z), radius: 1.2 });
}

function createAreaPlane(x, z, w, d, material) {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(x, 0.01, z);
  plane.receiveShadow = true;
  scene.add(plane);
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
    fleeing: false
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
    vendor: def.vendor
  };
  npcs.push(npc);
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
  createNpc({ id: "rysa", name: "Rysa", role: "Scout Captain", pos: new THREE.Vector3(-55, 1, 0), staff: false, dialogue: "scout" });
  createNpc({ id: "miro", name: "Archivist Miro", role: "Historian", pos: new THREE.Vector3(-48, 1, 6), staff: true, dialogue: "archivist" });
  createNpc({ id: "kato", name: "Warden Kato", role: "Guard Captain", pos: new THREE.Vector3(-60, 1, -6), staff: false, dialogue: "warden" });
  createNpc({ id: "nera", name: "Herbalist Nera", role: "Trainer", pos: new THREE.Vector3(-42, 1, 0), staff: true, dialogue: "trainer" });
  createNpc({ id: "vale", name: "Courier Vale", role: "Courier", pos: new THREE.Vector3(-50, 1, -8), staff: false, dialogue: "courier" });
  createNpc({ id: "orra", name: "Hermit Orren", role: "Hermit", pos: new THREE.Vector3(20, 1, 85), staff: true, dialogue: "hermit" });
  createNpc({ id: "merchant", name: "Luma", role: "Merchant", pos: new THREE.Vector3(-45, 1, 12), staff: false, dialogue: "merchant", vendor: true });
  escort.npc = createNpc({ id: "scribe", name: "Scribe Ilen", role: "Scribe", pos: new THREE.Vector3(-52, 1, 10), staff: true, dialogue: "archivist" });

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
    { id: "seer1", name: "Rogue Seer", type: "seer", pos: new THREE.Vector3(65, 1, -70), material: materials.enemyTeal, hp: 65, damage: 8, speed: 3.5, range: 14, aggro: 18, height: 1.6 },
    { id: "seer2", name: "Rogue Seer", type: "seer", pos: new THREE.Vector3(75, 1, -90), material: materials.enemyTeal, hp: 65, damage: 8, speed: 3.5, range: 14, aggro: 18, height: 1.6 },
    { id: "brute1", name: "Cave Brute", type: "brute", pos: new THREE.Vector3(-5, 1, 75), material: materials.enemyPurple, hp: 140, damage: 12, speed: 2.8, range: 2.8, aggro: 16, height: 1.8 },
    { id: "guardian", name: "Ruin Guardian", type: "guardian", pos: new THREE.Vector3(70, 1, 60), material: materials.enemyGold, hp: 110, damage: 10, speed: 3.2, range: 2.4, aggro: 16, height: 1.7 },
    { id: "shade", name: "Glide Shade", type: "flying", pos: new THREE.Vector3(50, 2, -10), material: materials.enemyBlack, hp: 55, damage: 7, speed: 4, range: 10, aggro: 16, height: 1.2 },
    { id: "seer3", name: "Rogue Seer", type: "seer", pos: new THREE.Vector3(58, 1, -95), material: materials.enemyTeal, hp: 65, damage: 8, speed: 3.5, range: 14, aggro: 18, height: 1.6 }
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

function addQuestProgress(id, amount = 1) {
  const quest = quests.find((q) => q.id === id);
  if (!quest) return;
  const state = questState.quests[id];
  if (!state || state.status !== "active") return;
  state.progress = clamp(state.progress + amount, 0, quest.count || 1);
  if (state.progress >= (quest.count || 1)) {
    state.status = "complete";
    questState.completed.push(id);
  }
}

function startQuest(id) {
  if (questState.quests[id]) return;
  questState.quests[id] = { status: "active", progress: 0 };
  questState.active.push(id);
}

function turnInQuest(id) {
  const quest = quests.find((q) => q.id === id);
  if (!quest) return;
  const state = questState.quests[id];
  if (!state || state.status !== "complete") return;
  state.status = "turnedIn";
  player.gold += quest.reward.gold || 0;
  if (quest.reward.mana) player.baseMana += quest.reward.mana;
  if (quest.reward.xp) awardXp(quest.reward.xp);
  if (quest.reward.item) giveItem(quest.reward.item);
  questState.active = questState.active.filter((activeId) => activeId !== id);
  recalcStats();
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

function giveItem(name) {
  const equipment = equipmentItems.find((item) => item.name === name);
  if (equipment) {
    player.inventory.push({ name: equipment.name, type: "equipment", slot: equipment.slot, stats: equipment.stats, value: equipment.value });
    return;
  }
  player.inventory.push({ name, type: "loot", value: 6 });
}

function equipItem(item) {
  if (!item.slot) return;
  player.equipment[item.slot] = item;
  recalcStats();
}

function removeLoot(name) {
  const index = player.inventory.findIndex((item) => item.name === name);
  if (index >= 0) {
    player.inventory.splice(index, 1);
  }
}

function recalcStats() {
  let bonusHp = 0;
  let bonusMana = 0;
  let bonusRegen = 0;
  player.spellPower = 1;
  Object.values(player.equipment).forEach((item) => {
    if (!item) return;
    if (item.stats?.hp) bonusHp += item.stats.hp;
    if (item.stats?.mana) bonusMana += item.stats.mana;
    if (item.stats?.manaRegen) bonusRegen += item.stats.manaRegen;
  });
  player.perks.forEach((perk) => {
    if (perk === "vigor") bonusHp += 10;
    if (perk === "focus") bonusMana += 10;
    if (perk === "flow") bonusRegen += 2;
    if (perk === "might") player.spellPower += 0.15;
  });
  player.maxHp = player.baseHp + bonusHp;
  player.maxMana = player.baseMana + bonusMana;
  player.manaRegen = player.baseManaRegen + bonusRegen;
  player.manaRegenOoc = player.baseManaRegenOoc + bonusRegen * 1.5;
  player.hp = Math.min(player.hp, player.maxHp);
  player.mana = Math.min(player.mana, player.maxMana);
}

function openVendor(npc) {
  dom.vendorPanel.classList.remove("hidden");
  dom.vendorBuy.innerHTML = "";
  dom.vendorSell.innerHTML = "";
  vendorStock.forEach((stock) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.textContent = `${stock.name} (${stock.value}g)`;
    button.addEventListener("click", () => {
      if (player.gold < stock.value) return;
      player.gold -= stock.value;
      if (stock.type === "equipment") {
        giveItem(stock.item);
      } else {
        player.mana = Math.min(player.maxMana, player.mana + 25);
      }
      playTone(720, 0.08, "triangle");
    });
    li.appendChild(button);
    dom.vendorBuy.appendChild(li);
  });

  player.inventory.forEach((item) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.textContent = `${item.name} (+${item.value || 5}g)`;
    button.addEventListener("click", () => {
      player.gold += item.value || 5;
      removeLoot(item.name);
    });
    li.appendChild(button);
    dom.vendorSell.appendChild(li);
  });
}

function closeVendor() {
  dom.vendorPanel.classList.add("hidden");
}

function showPerkChoice() {
  if (player.talents <= 0) return;
  dom.dialoguePanel.classList.remove("hidden");
  dom.dialogueTitle.textContent = "Perk Choice";
  dom.dialogueText.textContent = "Select a perk to refine your arcane path.";
  dom.dialogueChoices.innerHTML = "";
  const perks = [
    { id: "vigor", label: "Vigor (+10 Max Health)" },
    { id: "focus", label: "Focus (+10 Max Mana)" },
    { id: "flow", label: "Flow (+2 Mana Regen)" },
    { id: "might", label: "Might (+15% Spell Power)" }
  ];
  perks.forEach((perk) => {
    const button = document.createElement("button");
    button.textContent = perk.label;
    button.addEventListener("click", () => {
      player.perks.push(perk.id);
      player.talents -= 1;
      recalcStats();
      dom.dialoguePanel.classList.add("hidden");
    });
    dom.dialogueChoices.appendChild(button);
  });
}

function openDialogue(npc) {
  closeVendor();
  dom.dialoguePanel.classList.remove("hidden");
  dom.dialogueTitle.textContent = `${npc.name} - ${npc.role}`;
  dom.dialogueChoices.innerHTML = "";

  const availableQuests = quests.filter((quest) => quest.giver === npc.name && !questState.quests[quest.id]);
  const completedQuests = quests.filter((quest) => quest.giver === npc.name && questState.quests[quest.id]?.status === "complete");

  const lines = {
    scout: "The wilds are restless. Keep the paths clear and we can all breathe.",
    archivist: "The ruins whisper. Bring me pieces and I can read them.",
    warden: "We guard the gate. Prove your strength and I'll reward you.",
    trainer: "Channel your flow. Training starts with curiosity.",
    courier: "Messages keep the camp alive. Care to help?",
    hermit: "Rarely do I speak. But your note... it is familiar.",
    merchant: "Supplies for the road. Gold for the craft."
  };

  dom.dialogueText.textContent = lines[npc.dialogue] || "...";

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
    button.textContent = "Browse wares";
    button.addEventListener("click", () => openVendor(npc));
    dom.dialogueChoices.appendChild(button);
  }

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => dom.dialoguePanel.classList.add("hidden"));
  dom.dialogueChoices.appendChild(closeBtn);
}

function showQuestLog() {
  dom.questLog.classList.remove("hidden");
  dom.questLogList.innerHTML = "";
  quests.forEach((quest) => {
    const state = questState.quests[quest.id];
    if (!state) return;
    const li = document.createElement("li");
    li.textContent = `${quest.title} - ${state.status} (${state.progress}/${quest.count || 1})`;
    dom.questLogList.appendChild(li);
  });
}

function toggleQuestLog() {
  if (dom.questLog.classList.contains("hidden")) {
    showQuestLog();
  } else {
    dom.questLog.classList.add("hidden");
  }
}

function updateQuestTracker() {
  dom.questTracker.innerHTML = "";
  questState.active.forEach((id) => {
    const quest = quests.find((q) => q.id === id);
    if (!quest) return;
    const state = questState.quests[id];
    const li = document.createElement("li");
    const progress = quest.count ? `${state.progress}/${quest.count}` : state.status;
    li.textContent = `${quest.title}: ${progress}`;
    dom.questTracker.appendChild(li);
  });
}

function attemptCast(ability) {
  if (player.globalCooldown > 0 || player.cast) return;
  if (abilityState[ability.id].cooldown > 0) return;
  if (player.mana < ability.mana) return;
  if (ability.requiresTarget) {
    if (!player.target) return;
    if (player.target && player.target.hp <= 0) return;
    if (player.pos.distanceTo(player.target.pos) > ability.range) return;
  }

  if (ability.cast > 0) {
    player.cast = {
      ability,
      timer: ability.cast
    };
  } else {
    executeAbility(ability);
  }
}

function executeAbility(ability) {
  player.mana = Math.max(0, player.mana - ability.mana);
  player.fatigue = clamp(player.fatigue + 12, 0, player.maxFatigue);
  player.globalCooldown = 1.2;
  abilityState[ability.id].cooldown = ability.cooldown;
  player.inCombatTimer = 6;
  playTone(660, 0.08, "triangle");

  switch (ability.effect) {
    case "bolt":
      spawnProjectile(player, player.target, 18, 22 * player.spellPower, 14, 0x8cd3ff);
      break;
    case "lance":
      spawnProjectile(player, player.target, 20, 32 * player.spellPower, 20, 0xffa96b);
      break;
    case "snare":
      applyDebuff(player.target, { slow: 0.5, duration: 4 });
      spawnSigil(player.target.pos, 0x5ecbff);
      break;
    case "shield":
      player.shield = Math.min(45, player.shield + 30);
      spawnBurst(player.pos, 0x6bf9ff);
      break;
    case "nova":
      spawnNova(player.pos, 6, 20 * player.spellPower, 0xa7b7ff);
      break;
    case "dot":
      applyDebuff(player.target, { dot: 4 * player.spellPower, duration: 6, tick: 1 });
      spawnSigil(player.target.pos, 0x9a7bff);
      break;
    case "blink":
      blinkPlayer();
      spawnBurst(player.pos, 0x7bb6ff);
      break;
    case "summon":
      summonCompanion();
      break;
    default:
      break;
  }
}

function blinkPlayer() {
  const direction = new THREE.Vector3(Math.sin(settings.cameraYaw), 0, Math.cos(settings.cameraYaw));
  const targetPos = player.pos.clone().add(direction.multiplyScalar(6));
  if (!resolveCollisions(targetPos, player.radius)) {
    player.pos.copy(targetPos);
    player.mesh.position.copy(player.pos);
  }
}

function summonCompanion() {
  const mesh = createHumanoid({ body: materials.glow, accent: materials.enemyTeal, height: 1.2, role: "summon", staff: false, scale: 0.9 });
  mesh.position.copy(player.pos).add(new THREE.Vector3(1.2, 0, 1));
  scene.add(mesh);
  summoned.push({
    mesh,
    pos: mesh.position,
    timer: 12,
    attackTimer: 0
  });
}

function spawnProjectile(source, target, speed, damage, size, color) {
  if (!target) return;
  const geometry = new THREE.SphereGeometry(size * 0.04, 8, 8);
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(source.pos).add(new THREE.Vector3(0, 1.1, 0));
  scene.add(mesh);
  const dir = target.pos.clone().sub(source.pos).setY(0).normalize();
  projectiles.push({ mesh, velocity: dir.multiplyScalar(speed), damage, source, target, life: 3 });
}

function spawnSigil(position, color) {
  const geometry = new THREE.RingGeometry(0.6, 1.1, 20);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(position).add(new THREE.Vector3(0, 0.05, 0));
  scene.add(mesh);
  particles.push({ mesh, life: 1.2 });
}

function spawnBurst(position, color) {
  const geometry = new THREE.SphereGeometry(0.2, 10, 10);
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position).add(new THREE.Vector3(0, 1.2, 0));
  scene.add(mesh);
  particles.push({ mesh, life: 0.6, grow: 3.5 });
}

function spawnNova(position, radius, damage, color) {
  enemies.forEach((enemy) => {
    if (enemy.hp <= 0) return;
    if (enemy.pos.distanceTo(position) <= radius) {
      applyDamage(enemy, damage);
    }
  });
  const geometry = new THREE.RingGeometry(radius * 0.2, radius, 30);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(position).add(new THREE.Vector3(0, 0.05, 0));
  scene.add(mesh);
  particles.push({ mesh, life: 0.8, expand: 1.8 });
}

function applyDebuff(enemy, debuff) {
  if (!enemy) return;
  if (debuff.slow) {
    enemy.slow = Math.max(enemy.slow, debuff.slow);
    enemy.slowTimer = debuff.duration;
  }
  if (debuff.dot) {
    enemy.dot = debuff.dot;
    enemy.dotTimer = debuff.duration;
    enemy.dotTick = debuff.tick;
    enemy.dotTickTimer = debuff.tick;
  }
}

function applyDamage(enemy, amount) {
  if (!enemy || enemy.hp <= 0) return;
  enemy.hp -= amount;
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    handleEnemyDefeat(enemy);
  }
  spawnFloatingText(`-${amount}`, enemy.pos);
}

function spawnFloatingText(text, position) {
  const div = document.createElement("div");
  div.className = "floating";
  div.textContent = text;
  dom.floatingText.appendChild(div);
  const screen = worldToScreen(position.clone().add(new THREE.Vector3(0, 1.8, 0)));
  div.style.left = `${screen.x}px`;
  div.style.top = `${screen.y}px`;
  setTimeout(() => div.remove(), 1200);
}

function worldToScreen(position) {
  const vector = position.project(camera);
  const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
  return { x, y };
}

function handleEnemyDefeat(enemy) {
  enemy.mesh.visible = false;
  enemy.state = "dead";
  awardXp(25);
  dropLoot(enemy.pos);
  if (enemy.type === "stalker") addQuestProgress("clearWilds");
  if (enemy.type === "seer") addQuestProgress("casterHunt");
  if (enemy.type === "brute") addQuestProgress("miniBoss");
}

function dropLoot(position) {
  const item = lootTable[Math.floor(prng.random() * lootTable.length)];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), materials.glow);
  mesh.position.copy(position).add(new THREE.Vector3(0, 0.3, 0));
  scene.add(mesh);
  lootDrops.push({ mesh, item, timer: 14 });
}

function pickLoot() {
  lootDrops.forEach((drop, index) => {
    if (drop.mesh.position.distanceTo(player.pos) < 1.4) {
      if (drop.item.type === "quest") {
        addQuestProgress("recoverRelics");
      } else {
        player.inventory.push({ name: drop.item.name, type: "loot", value: drop.item.value });
      }
      scene.remove(drop.mesh);
      lootDrops.splice(index, 1);
    }
  });
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
  return collided;
}

function updateCamera(dt) {
  settings.cameraYaw = lerp(settings.cameraYaw, settings.cameraYawTarget, dt * 6);
  settings.cameraPitch = lerp(settings.cameraPitch, settings.cameraPitchTarget, dt * 6);

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
    desired = player.pos.clone().add(direction.multiplyScalar(Math.max(2.5, hit.distance - 0.5)));
  }

  camera.position.lerp(desired, dt * 6);
  camera.lookAt(player.pos.clone().add(new THREE.Vector3(0, 1.2, 0)));
}

function updatePlayer(dt) {
  const move = new THREE.Vector3();
  const forward = new THREE.Vector3(Math.sin(settings.cameraYaw), 0, Math.cos(settings.cameraYaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  if (input.keys.has("KeyW")) move.add(forward);
  if (input.keys.has("KeyS")) move.sub(forward);
  if (input.keys.has("KeyA")) move.sub(right);
  if (input.keys.has("KeyD")) move.add(right);

  if (input.keys.has("KeyQ")) player.yaw -= dt * 2.5;
  if (input.keys.has("KeyE")) player.yaw += dt * 2.5;

  if (settings.holdRmb) {
    player.yaw = lerpAngle(player.yaw, settings.cameraYaw, dt * 8);
  }

  const targetSpeed = player.speed * (1 - player.fatigue / player.maxFatigue * 0.3);
  if (move.lengthSq() > 0.01) {
    move.normalize();
    player.velocity.x = lerp(player.velocity.x, move.x * targetSpeed, dt * player.accel);
    player.velocity.z = lerp(player.velocity.z, move.z * targetSpeed, dt * player.accel);
  } else {
    player.velocity.x = lerp(player.velocity.x, 0, dt * player.decel);
    player.velocity.z = lerp(player.velocity.z, 0, dt * player.decel);
  }

  player.pos.add(new THREE.Vector3(player.velocity.x * dt, 0, player.velocity.z * dt));
  resolveCollisions(player.pos, player.radius);
  player.mesh.position.copy(player.pos);
  player.mesh.rotation.y = player.yaw;
}

function lerpAngle(a, b, t) {
  const diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + diff * t;
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
    if (enemy.hp <= 0) return;
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
        groupAggro(enemy);
      } else {
        patrolEnemy(enemy, dt);
      }
    }

    if (enemy.state === "aggro") {
      const homeDistance = enemy.pos.distanceTo(enemy.spawn);
      if (homeDistance > enemy.leash) {
        enemy.state = "return";
        enemy.target = null;
        return;
      }
      if (distance > enemy.aggroRadius * 2) {
        enemy.state = "return";
        enemy.target = null;
        return;
      }
      const speed = enemy.speed * (enemy.slow ? 1 - enemy.slow : 1);
      const direction = player.pos.clone().sub(enemy.pos).setY(0);
      if (enemy.type === "seer" || enemy.type === "flying") {
        const desiredRange = enemy.range - 3;
        if (distance > desiredRange) {
          enemy.velocity.copy(direction.normalize().multiplyScalar(speed));
        } else {
          enemy.velocity.copy(direction.normalize().multiplyScalar(-speed));
        }
      } else if (enemy.hp < enemy.maxHp * 0.25 && enemy.type === "scout") {
        enemy.velocity.copy(direction.normalize().multiplyScalar(-speed * 1.2));
      } else {
        enemy.velocity.copy(direction.normalize().multiplyScalar(speed));
      }
      enemy.pos.add(enemy.velocity.clone().multiplyScalar(dt));
      resolveCollisions(enemy.pos, 0.5);
      enemy.mesh.position.copy(enemy.pos);
      enemy.mesh.rotation.y = Math.atan2(direction.x, direction.z);

      enemy.attackTimer -= dt;
      if (enemy.attackTimer <= 0 && distance <= enemy.range) {
        enemy.attackTimer = enemy.type === "seer" ? 2.2 : 1.6;
        if (enemy.type === "seer" || enemy.type === "flying") {
          spawnEnemyProjectile(enemy, player, 14, enemy.damage, 0xff7bd6);
        } else {
          receiveDamage(enemy.damage);
        }
      }
    }

    if (enemy.state === "return") {
      const direction = enemy.spawn.clone().sub(enemy.pos).setY(0);
      if (direction.length() < 0.4) {
        enemy.state = "patrol";
      } else {
        enemy.velocity.copy(direction.normalize().multiplyScalar(enemy.speed));
        enemy.pos.add(enemy.velocity.clone().multiplyScalar(dt));
        enemy.mesh.position.copy(enemy.pos);
        enemy.mesh.rotation.y = Math.atan2(direction.x, direction.z);
      }
    }
  });
}

function updateEscort(dt) {
  const state = questState.quests["escortScribe"];
  if (!state || state.status !== "active" || !escort.npc) return;
  const npc = escort.npc;
  const distance = npc.pos.distanceTo(player.pos);
  if (distance > 2.4) {
    const direction = player.pos.clone().sub(npc.pos).setY(0).normalize();
    npc.pos.add(direction.multiplyScalar(dt * 3));
    npc.mesh.position.copy(npc.pos);
    npc.mesh.rotation.y = Math.atan2(direction.x, direction.z);
  }
  if (npc.pos.distanceTo(escort.destination) < 3.5) {
    state.progress = 1;
    state.status = "complete";
  }
}

function groupAggro(enemy) {
  enemies.forEach((other) => {
    if (other === enemy || other.hp <= 0) return;
    if (other.pos.distanceTo(enemy.pos) < 8) {
      other.state = "aggro";
      other.target = player;
    }
  });
}

function patrolEnemy(enemy, dt) {
  if (!enemy.patrol || enemy.patrol.length === 0) return;
  const target = enemy.patrol[enemy.patrolIndex];
  const direction = target.clone().sub(enemy.pos);
  if (direction.length() < 0.6) {
    enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrol.length;
    return;
  }
  enemy.velocity.copy(direction.normalize().multiplyScalar(enemy.speed * 0.5));
  enemy.pos.add(enemy.velocity.clone().multiplyScalar(dt));
  enemy.mesh.position.copy(enemy.pos);
  enemy.mesh.rotation.y = Math.atan2(direction.x, direction.z);
}

function spawnEnemyProjectile(source, target, speed, damage, color) {
  const geometry = new THREE.SphereGeometry(0.2, 8, 8);
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(source.pos).add(new THREE.Vector3(0, 1.1, 0));
  scene.add(mesh);
  const dir = target.pos.clone().sub(source.pos).setY(0).normalize();
  projectiles.push({ mesh, velocity: dir.multiplyScalar(speed), damage, source, target, enemy: true, life: 3 });
}

function receiveDamage(amount) {
  const mitigated = Math.max(0, amount - player.shield);
  player.shield = Math.max(0, player.shield - amount);
  player.hp = Math.max(0, player.hp - mitigated);
  spawnFloatingText(`-${amount}`, player.pos);
  if (player.hp <= 0) {
    player.hp = player.maxHp;
    player.mana = player.maxMana;
    player.pos.set(-50, 1, 0);
  }
}

function updateProjectiles(dt) {
  projectiles.forEach((proj, index) => {
    proj.mesh.position.add(proj.velocity.clone().multiplyScalar(dt));
    proj.life -= dt;
    if (proj.life <= 0) {
      scene.remove(proj.mesh);
      projectiles.splice(index, 1);
      return;
    }
    const target = proj.target;
    if (target && target.hp > 0 && proj.mesh.position.distanceTo(target.pos) < 0.8) {
      if (proj.enemy) {
        receiveDamage(proj.damage);
      } else {
        applyDamage(target, proj.damage);
      }
      scene.remove(proj.mesh);
      projectiles.splice(index, 1);
    }
  });
}

function updateSummons(dt) {
  summoned.forEach((pet, index) => {
    pet.timer -= dt;
    if (pet.timer <= 0) {
      scene.remove(pet.mesh);
      summoned.splice(index, 1);
      return;
    }
    pet.mesh.rotation.y += dt * 2;
    pet.attackTimer -= dt;
    if (pet.attackTimer <= 0) {
      const target = findNearestEnemy(10);
      if (target) {
        pet.attackTimer = 2.4;
        spawnProjectile({ pos: pet.pos }, target, 16, 12, 12, 0x9fd7ff);
      }
    }
  });
}

function updateParticles(dt) {
  particles.forEach((particle, index) => {
    particle.life -= dt;
    if (particle.grow) {
      particle.mesh.scale.multiplyScalar(1 + dt * particle.grow);
    }
    if (particle.expand) {
      particle.mesh.scale.multiplyScalar(1 + dt * particle.expand);
    }
    if (particle.life <= 0) {
      scene.remove(particle.mesh);
      particles.splice(index, 1);
    }
  });
}

function updateAnimations(time) {
  animateHumanoid(player.mesh, time, player.velocity.length());
  enemies.forEach((enemy) => animateHumanoid(enemy.mesh, time, enemy.velocity.length()));
  npcs.forEach((npc) => animateHumanoid(npc.mesh, time, 0));
}

function animateHumanoid(group, time, speed) {
  if (!group) return;
  const data = group.userData;
  const walk = Math.min(1, speed / 5);
  const swing = Math.sin(time * 6) * 0.6 * walk;
  data.armLeft.rotation.x = swing;
  data.armRight.rotation.x = -swing;
  data.legLeft.rotation.x = -swing;
  data.legRight.rotation.x = swing;
  data.torso.position.y = data.torsoBase + Math.sin(time * 2) * 0.05;
}

function updateUi() {
  dom.hpFill.style.width = `${(player.hp / player.maxHp) * 100}%`;
  dom.hpText.textContent = `${Math.round(player.hp)} / ${player.maxHp}`;
  dom.manaFill.style.width = `${(player.mana / player.maxMana) * 100}%`;
  dom.manaText.textContent = `${Math.round(player.mana)} / ${player.maxMana}`;
  dom.fatigueFill.style.width = `${(player.fatigue / player.maxFatigue) * 100}%`;
  dom.fatigueText.textContent = `${Math.round(player.fatigue)} / ${player.maxFatigue}`;
  dom.levelText.textContent = player.level;
  dom.xpText.textContent = `${player.xp}/${player.xpToNext}`;
  dom.goldText.textContent = player.gold;
  dom.zoneText.textContent = getZoneName();

  dom.targetFrame.classList.toggle("hidden", !player.target || player.target.hp <= 0);
  if (player.target && player.target.hp > 0) {
    dom.targetName.textContent = player.target.name;
    dom.targetHp.style.width = `${(player.target.hp / player.target.maxHp) * 100}%`;
    targetRing.visible = true;
    targetRing.position.copy(player.target.pos).setY(0.05);
  } else {
    targetRing.visible = false;
  }

  dom.inventoryList.innerHTML = "";
  player.inventory.slice(0, 6).forEach((item) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.textContent = item.name;
    button.addEventListener("click", () => {
      if (item.type === "equipment") {
        equipItem(item);
      }
    });
    li.appendChild(button);
    dom.inventoryList.appendChild(li);
  });
  dom.equipStaff.textContent = player.equipment.staff?.name || "None";
  dom.equipRobe.textContent = player.equipment.robe?.name || "None";
  dom.equipRing.textContent = player.equipment.ring?.name || "None";

  const slots = dom.hotbar.querySelectorAll(".hotbar__slot");
  slots.forEach((slot) => {
    const ability = abilities.find((item) => item.id === slot.dataset.id);
    const cooldown = abilityState[ability.id].cooldown;
    slot.dataset.cooldown = cooldown > 0;
    const overlay = slot.querySelector(".hotbar__cooldown");
    const ratio = cooldown > 0 && ability.cooldown > 0 ? cooldown / ability.cooldown : 0;
    overlay.style.clipPath = `inset(${ratio * 100}% 0 0 0)`;
  });
}

function getZoneName() {
  const zone = world.zones.find((area) => area.center.distanceTo(player.pos) < area.radius);
  return zone ? zone.name : "Wilds";
}

function updateMinimap() {
  minimapCtx.clearRect(0, 0, dom.minimap.width, dom.minimap.height);
  minimapCtx.fillStyle = "rgba(15, 24, 38, 0.8)";
  minimapCtx.fillRect(0, 0, dom.minimap.width, dom.minimap.height);
  const scale = 0.5;
  const center = { x: dom.minimap.width / 2, y: dom.minimap.height / 2 };
  minimapCtx.fillStyle = "#7dd7ff";
  minimapCtx.beginPath();
  minimapCtx.arc(center.x, center.y, 4, 0, Math.PI * 2);
  minimapCtx.fill();

  enemies.forEach((enemy) => {
    if (enemy.hp <= 0) return;
    const dx = (enemy.pos.x - player.pos.x) * scale;
    const dz = (enemy.pos.z - player.pos.z) * scale;
    if (Math.abs(dx) > 70 || Math.abs(dz) > 70) return;
    minimapCtx.fillStyle = "#ff7b7b";
    minimapCtx.fillRect(center.x + dx, center.y + dz, 3, 3);
  });
}

function handleInteract() {
  const npc = npcs.find((unit) => unit.pos.distanceTo(player.pos) < 2.2);
  if (npc) {
    if (npc.name === "Hermit Orren") {
      addQuestProgress("hermitNote");
    }
    openDialogue(npc);
    return;
  }
  interactables.forEach((obj) => {
    if (obj.pos.distanceTo(player.pos) < 2.2) {
      if (obj.type === "sample") {
        addQuestProgress("lakeSamples");
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

function setupEvents() {
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
    if (event.code === "KeyH") dom.helpOverlay.classList.toggle("hidden");
    if (event.code === "KeyO") saveGame();
    if (event.code === "Tab") {
      event.preventDefault();
      cycleTarget();
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
}

function updateTime(dt) {
  pickLoot();
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
  updateMinimap();
  updateUi();
}

function gameLoop() {
  const dt = Math.min(clock.getDelta(), 0.033);
  updatePlayer(dt);
  updateTime(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(gameLoop);
}

function init() {
  buildWorld();
  setupActors();
  spawnEnemies();
  setupHotbar();
  setupEvents();
  loadGame();
  recalcStats();
  setInterval(saveGame, 10000);
  gameLoop();
}

init();
