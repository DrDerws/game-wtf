/* global THREE */

const canvas = document.getElementById("game-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b0f16, 22, 140);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 260);
const clock = new THREE.Clock();

const ambient = new THREE.AmbientLight(0x9cb8ff, 0.35);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xd9f1ff, 0.9);
sun.position.set(25, 40, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const dom = {
  hpFill: document.getElementById("hud-hp"),
  hpText: document.getElementById("hud-hp-text"),
  staminaFill: document.getElementById("hud-stamina"),
  staminaText: document.getElementById("hud-stamina-text"),
  ammoText: document.getElementById("hud-ammo"),
  waveText: document.getElementById("hud-wave"),
  xpText: document.getElementById("hud-xp"),
  weaponText: document.getElementById("hud-weapon"),
  inventoryList: document.getElementById("inventory-list"),
  message: document.getElementById("hud-message"),
  minimap: document.getElementById("minimap"),
  sensitivity: document.getElementById("sensitivity"),
  sensitivityValue: document.getElementById("sensitivity-value"),
  pauseMenu: document.getElementById("pause-menu"),
  helpOverlay: document.getElementById("help-overlay"),
  shopPanel: document.getElementById("shop-panel"),
  shopText: document.getElementById("shop-text"),
  waveBanner: document.getElementById("wave-banner"),
  crosshair: document.getElementById("crosshair")
};

const minimapCtx = dom.minimap.getContext("2d");

const settings = {
  sensitivity: parseFloat(dom.sensitivity.value),
  thirdPerson: false
};

dom.sensitivityValue.textContent = settings.sensitivity.toFixed(3);

const arena = {
  size: 120,
  rooms: [],
  obstacles: [],
  walls: [],
  ramps: [],
  spawnPoints: []
};

const materials = {
  ground: new THREE.MeshStandardMaterial({ color: 0x27313f }),
  wall: new THREE.MeshStandardMaterial({ color: 0x36404b }),
  ramp: new THREE.MeshStandardMaterial({ color: 0x3a4a5e }),
  player: new THREE.MeshStandardMaterial({ color: 0x6bd5ff, flatShading: true }),
  enemyChaser: new THREE.MeshStandardMaterial({ color: 0xff6b6b, flatShading: true }),
  enemyRanged: new THREE.MeshStandardMaterial({ color: 0xffc16b, flatShading: true }),
  enemyTank: new THREE.MeshStandardMaterial({ color: 0x8c6bff, flatShading: true }),
  pickupHealth: new THREE.MeshStandardMaterial({ color: 0x7dff8f }),
  pickupAmmo: new THREE.MeshStandardMaterial({ color: 0x7dc9ff }),
  pickupStamina: new THREE.MeshStandardMaterial({ color: 0xfff36b }),
  lootCommon: new THREE.MeshStandardMaterial({ color: 0xbfd1de }),
  lootRare: new THREE.MeshStandardMaterial({ color: 0x79e6ff }),
  lootEpic: new THREE.MeshStandardMaterial({ color: 0xe689ff })
};

const audioState = {
  context: null
};

function playBeep(freq, duration = 0.08, volume = 0.12) {
  if (!audioState.context) {
    return;
  }
  const oscillator = audioState.context.createOscillator();
  const gain = audioState.context.createGain();
  oscillator.frequency.value = freq;
  oscillator.type = "triangle";
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(audioState.context.destination);
  oscillator.start();
  oscillator.stop(audioState.context.currentTime + duration);
}

function initAudio() {
  if (!audioState.context) {
    audioState.context = new (window.AudioContext || window.webkitAudioContext)();
  }
}

const prng = {
  seed: 1337,
  random() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
};

function setSeedFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get("seed");
  if (seedParam) {
    const parsed = Number.parseInt(seedParam, 10);
    if (!Number.isNaN(parsed)) {
      prng.seed = parsed;
      return;
    }
  }
  prng.seed = Math.floor(Math.random() * 99999) + 1;
}

function randomInRange(min, max) {
  return min + (max - min) * prng.random();
}

const groundGeo = new THREE.PlaneGeometry(arena.size, arena.size);
const ground = new THREE.Mesh(groundGeo, materials.ground);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const boundary = new THREE.Mesh(
  new THREE.BoxGeometry(arena.size, 6, arena.size),
  new THREE.MeshStandardMaterial({ color: 0x1a222d, side: THREE.BackSide })
);
boundary.position.set(0, 3, 0);
scene.add(boundary);

const pickups = [];
const lootDrops = [];
const projectiles = [];
const enemyProjectiles = [];
const combatText = [];

const player = {
  mesh: null,
  pos: new THREE.Vector3(0, 1.1, 0),
  velocity: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  radius: 0.55,
  height: 1.6,
  speed: 8.5,
  rollSpeed: 16,
  rollTime: 0,
  rollCooldown: 0,
  iFrames: 0,
  jumpStrength: 8.5,
  onGround: false,
  hp: 120,
  maxHp: 120,
  stamina: 100,
  maxStamina: 100,
  staminaRegen: 22,
  ammo: 28,
  maxAmmo: 40,
  weapon: "melee",
  meleeDamage: 24,
  rangedDamage: 18,
  rangedCooldown: 0,
  meleeCooldown: 0,
  xp: 0,
  level: 1,
  xpToNext: 120,
  inventory: [],
  gold: 0,
  modifiers: {
    damage: 1,
    moveSpeed: 1,
    crit: 0.05,
    maxHp: 0
  },
  status: {
    poison: 0,
    slow: 0
  }
};

const playerMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.1, 4, 8), materials.player);
playerMesh.castShadow = true;
playerMesh.position.copy(player.pos);
scene.add(playerMesh);
player.mesh = playerMesh;

const cameraRig = new THREE.Object3D();
scene.add(cameraRig);

const input = {
  keys: new Set(),
  mouseLocked: false,
  mouseDelta: { x: 0, y: 0 },
  buttons: new Set()
};

const waveState = {
  wave: 1,
  maxWaves: 5,
  active: false,
  enemiesRemaining: 0,
  betweenTimer: 4,
  win: false,
  loss: false
};

const enemyTypes = {
  chaser: { speed: 6.4, hp: 55, damage: 12, color: materials.enemyChaser, range: 1.2 },
  ranged: { speed: 5.2, hp: 45, damage: 10, color: materials.enemyRanged, range: 12 },
  tank: { speed: 3.4, hp: 120, damage: 20, color: materials.enemyTank, range: 1.6 }
};

const enemies = [];

const shop = {
  mesh: null,
  active: false
};

function addCombatText(text, position, color = "#ffd37d") {
  const element = document.createElement("div");
  element.className = "combat-text";
  element.style.color = color;
  element.textContent = text;
  document.body.appendChild(element);
  combatText.push({ element, position: position.clone(), ttl: 1.2 });
}

function updateCombatText(delta) {
  for (let i = combatText.length - 1; i >= 0; i -= 1) {
    const item = combatText[i];
    item.ttl -= delta;
    item.position.y += delta * 0.9;
    const screen = item.position.clone().project(camera);
    const x = (screen.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screen.y * 0.5 + 0.5) * window.innerHeight;
    item.element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    item.element.style.opacity = Math.max(item.ttl, 0);
    if (item.ttl <= 0) {
      item.element.remove();
      combatText.splice(i, 1);
    }
  }
}

function createWall(x, z, width, depth, height = 3.2) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials.wall);
  mesh.position.set(x, height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  arena.walls.push({ mesh, width, depth, height });
  return mesh;
}

function createRamp(x, z, width, depth, height = 2) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  geometry.translate(0, height / 2, 0);
  geometry.rotateX(-Math.PI / 6);
  const mesh = new THREE.Mesh(geometry, materials.ramp);
  mesh.position.set(x, 0, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  arena.ramps.push({ mesh, width, depth, height });
  return mesh;
}

function createObstacle(x, z, width, depth, height = 2.4) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials.wall);
  mesh.position.set(x, height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  arena.obstacles.push({ mesh, width, depth, height });
  return mesh;
}

function generateArena() {
  arena.rooms.length = 0;
  arena.obstacles.length = 0;
  arena.walls.length = 0;
  arena.ramps.length = 0;
  arena.spawnPoints.length = 0;

  const roomSize = 32;
  arena.rooms.push({ center: new THREE.Vector3(-20, 0, 0), size: roomSize });
  arena.rooms.push({ center: new THREE.Vector3(22, 0, -10), size: roomSize });

  arena.rooms.forEach((room, index) => {
    const half = room.size / 2;
    createWall(room.center.x, room.center.z - half, room.size, 2);
    createWall(room.center.x, room.center.z + half, room.size, 2);
    createWall(room.center.x - half, room.center.z, 2, room.size);
    createWall(room.center.x + half, room.center.z, 2, room.size);
    if (index === 0) {
      createWall(room.center.x + half, room.center.z, 2, room.size / 2 - 4);
      createWall(room.center.x + half, room.center.z + room.size / 4 + 4, 2, room.size / 2 - 4);
    } else {
      createWall(room.center.x - half, room.center.z, 2, room.size / 2 - 5);
      createWall(room.center.x - half, room.center.z - room.size / 4 - 4, 2, room.size / 2 - 5);
    }
  });

  createWall(0, -6, 10, 2);
  createWall(0, 10, 12, 2);
  createRamp(-6, 8, 8, 8);
  createRamp(12, -12, 10, 8);

  const obstacleCount = 10;
  for (let i = 0; i < obstacleCount; i += 1) {
    const x = randomInRange(-45, 45);
    const z = randomInRange(-45, 45);
    const width = randomInRange(2.5, 5.5);
    const depth = randomInRange(2.5, 6);
    createObstacle(x, z, width, depth, randomInRange(1.8, 3.2));
  }

  arena.spawnPoints.push(
    new THREE.Vector3(-28, 0, 10),
    new THREE.Vector3(-10, 0, -16),
    new THREE.Vector3(18, 0, -24),
    new THREE.Vector3(28, 0, 18),
    new THREE.Vector3(4, 0, 28)
  );
}

function resetArena() {
  [...arena.obstacles, ...arena.walls, ...arena.ramps].forEach(({ mesh }) => {
    scene.remove(mesh);
    mesh.geometry.dispose();
  });
  generateArena();
}

function spawnPickup(type, position) {
  const geo = new THREE.SphereGeometry(0.6, 12, 12);
  const mat =
    type === "health"
      ? materials.pickupHealth
      : type === "ammo"
        ? materials.pickupAmmo
        : materials.pickupStamina;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  mesh.position.y = 0.6;
  mesh.castShadow = true;
  scene.add(mesh);
  pickups.push({ type, mesh, ttl: 20 });
}

function spawnLoot(position) {
  const roll = prng.random();
  let rarity = "common";
  if (roll > 0.85) {
    rarity = "epic";
  } else if (roll > 0.55) {
    rarity = "rare";
  }
  const mat =
    rarity === "epic" ? materials.lootEpic : rarity === "rare" ? materials.lootRare : materials.lootCommon;
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), mat);
  mesh.position.copy(position);
  mesh.position.y = 0.6;
  mesh.castShadow = true;
  scene.add(mesh);
  const bonuses = {
    damage: randomInRange(0.05, 0.18),
    moveSpeed: randomInRange(0.03, 0.15),
    crit: randomInRange(0.02, 0.06),
    maxHp: randomInRange(6, 16)
  };
  lootDrops.push({ mesh, rarity, bonuses, ttl: 25 });
}

function spawnEnemy(type, position) {
  const base = enemyTypes[type];
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 14), base.color);
  mesh.castShadow = true;
  mesh.position.set(position.x, 0.9, position.z);
  scene.add(mesh);
  enemies.push({
    type,
    mesh,
    hp: base.hp + waveState.wave * 6,
    maxHp: base.hp + waveState.wave * 6,
    speed: base.speed + waveState.wave * 0.15,
    damage: base.damage + waveState.wave * 1.2,
    cooldown: randomInRange(0.6, 1.8),
    knockback: 5,
    status: { poison: 0, slow: 0 },
    hitStun: 0
  });
  waveState.enemiesRemaining += 1;
}

function startWave() {
  waveState.active = true;
  waveState.betweenTimer = 0;
  waveState.enemiesRemaining = 0;
  const count = 3 + waveState.wave * 2;
  for (let i = 0; i < count; i += 1) {
    const spawn = arena.spawnPoints[i % arena.spawnPoints.length];
    const offset = new THREE.Vector3(randomInRange(-4, 4), 0, randomInRange(-4, 4));
    const typeRoll = prng.random();
    const type = typeRoll > 0.78 ? "tank" : typeRoll > 0.45 ? "ranged" : "chaser";
    spawnEnemy(type, spawn.clone().add(offset));
  }
  showBanner(`Wave ${waveState.wave}`);
  playBeep(420, 0.12, 0.15);
}

function completeWave() {
  waveState.active = false;
  waveState.betweenTimer = 8;
  waveState.wave += 1;
  player.gold += 3 + waveState.wave;
  showBanner("Wave cleared! Visit the upgrade station.");
  if (waveState.wave > waveState.maxWaves) {
    waveState.win = true;
    showBanner("You cleared every wave! Victory!");
  }
}

function showBanner(text) {
  dom.waveBanner.textContent = text;
  dom.waveBanner.classList.add("show");
  setTimeout(() => dom.waveBanner.classList.remove("show"), 2400);
}

function setupShop() {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 2.2, 6), materials.ramp);
  mesh.position.set(0, 1.1, 18);
  mesh.castShadow = true;
  scene.add(mesh);
  shop.mesh = mesh;
}

function updateShop() {
  const distance = shop.mesh.position.distanceTo(player.pos);
  shop.active = distance < 3 && !waveState.active && !waveState.win && !waveState.loss;
  dom.shopPanel.classList.toggle("visible", shop.active);
  dom.shopText.textContent = shop.active
    ? `Spend 3 Scrap to upgrade (+damage/+speed/+HP). Scrap: ${player.gold}`
    : "";
}

function buyUpgrade() {
  if (!shop.active || player.gold < 3) {
    return;
  }
  player.gold -= 3;
  player.modifiers.damage += 0.08;
  player.modifiers.moveSpeed += 0.05;
  player.modifiers.maxHp += 6;
  player.maxHp += 6;
  player.hp = Math.min(player.maxHp, player.hp + 6);
  addCombatText("Upgrade!", player.pos, "#7df9ff");
  playBeep(500, 0.1, 0.2);
}

function applyDamage(target, amount, knockbackDir, statusEffect) {
  if (target === player) {
    if (player.iFrames > 0) {
      return;
    }
    player.hp = Math.max(0, player.hp - amount);
    player.velocity.add(knockbackDir.multiplyScalar(4));
    addCombatText(`-${Math.round(amount)}`, player.pos, "#ff8686");
    if (statusEffect === "slow") {
      player.status.slow = 2.5;
    }
    if (statusEffect === "poison") {
      player.status.poison = 4;
    }
    playBeep(180, 0.08, 0.18);
    if (player.hp <= 0) {
      waveState.loss = true;
      showBanner("Defeated. Press Restart.");
    }
    return;
  }
  target.hp -= amount;
  if (statusEffect === "poison") {
    target.status.poison = 4;
  }
  if (statusEffect === "slow") {
    target.status.slow = 2.5;
  }
  target.hitStun = 0.2;
  target.mesh.position.add(knockbackDir.multiplyScalar(0.4));
  addCombatText(`-${Math.round(amount)}`, target.mesh.position, "#ffd37d");
  playBeep(300, 0.07, 0.12);
}

function gainXp(amount) {
  player.xp += amount;
  if (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level += 1;
    player.xpToNext = Math.floor(player.xpToNext * 1.25);
    player.maxHp += 8;
    player.hp = player.maxHp;
    player.stamina = player.maxStamina;
    player.meleeDamage += 2;
    addCombatText("Level Up!", player.pos, "#9affd1");
    playBeep(640, 0.12, 0.2);
  }
}

function spawnProjectile(origin, direction, speed, damage, owner) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshStandardMaterial({ color: 0x7dd8ff }));
  mesh.position.copy(origin);
  mesh.castShadow = true;
  scene.add(mesh);
  projectiles.push({ mesh, velocity: direction.multiplyScalar(speed), damage, ttl: 2.2, owner });
}

function spawnEnemyProjectile(origin, direction, damage) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffa96b }));
  mesh.position.copy(origin);
  mesh.castShadow = true;
  scene.add(mesh);
  enemyProjectiles.push({ mesh, velocity: direction.multiplyScalar(10), damage, ttl: 2.4 });
}

function meleeAttack() {
  if (player.meleeCooldown > 0) {
    return;
  }
  player.meleeCooldown = 0.35;
  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  enemies.forEach((enemy) => {
    if (enemy.hp <= 0) {
      return;
    }
    const toEnemy = enemy.mesh.position.clone().sub(player.pos);
    if (toEnemy.length() < 2.2 && forward.dot(toEnemy.normalize()) > 0.2) {
      const crit = prng.random() < player.modifiers.crit;
      const damage = player.meleeDamage * player.modifiers.damage * (crit ? 1.6 : 1);
      applyDamage(enemy, damage, forward.clone(), "slow");
    }
  });
  playBeep(520, 0.08, 0.15);
}

function rangedAttack() {
  if (player.rangedCooldown > 0 || player.ammo <= 0) {
    return;
  }
  player.rangedCooldown = 0.35;
  player.ammo -= 1;
  const direction = new THREE.Vector3(Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), Math.cos(player.yaw) * Math.cos(player.pitch));
  const origin = player.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
  spawnProjectile(origin, direction, 18, player.rangedDamage * player.modifiers.damage, "player");
  playBeep(740, 0.08, 0.14);
}

function handleAttacks() {
  if (input.buttons.has(0)) {
    if (player.weapon === "melee") {
      meleeAttack();
    } else {
      rangedAttack();
    }
  }
}

function updateProjectiles(delta) {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];
    projectile.ttl -= delta;
    projectile.mesh.position.add(projectile.velocity.clone().multiplyScalar(delta));
    if (projectile.ttl <= 0) {
      scene.remove(projectile.mesh);
      projectiles.splice(i, 1);
      continue;
    }
    enemies.forEach((enemy) => {
      if (enemy.hp <= 0) {
        return;
      }
      if (projectile.mesh.position.distanceTo(enemy.mesh.position) < 1.0) {
        applyDamage(enemy, projectile.damage, projectile.velocity.clone().normalize(), "poison");
        projectile.ttl = 0;
      }
    });
  }

  for (let i = enemyProjectiles.length - 1; i >= 0; i -= 1) {
    const projectile = enemyProjectiles[i];
    projectile.ttl -= delta;
    projectile.mesh.position.add(projectile.velocity.clone().multiplyScalar(delta));
    if (projectile.ttl <= 0) {
      scene.remove(projectile.mesh);
      enemyProjectiles.splice(i, 1);
      continue;
    }
    if (projectile.mesh.position.distanceTo(player.pos) < 1.1) {
      applyDamage(player, projectile.damage, projectile.velocity.clone().normalize(), "poison");
      projectile.ttl = 0;
    }
  }
}

function updatePickups(delta) {
  for (let i = pickups.length - 1; i >= 0; i -= 1) {
    const pickup = pickups[i];
    pickup.ttl -= delta;
    pickup.mesh.rotation.y += delta * 2;
    if (pickup.mesh.position.distanceTo(player.pos) < 1.4) {
      if (pickup.type === "health") {
        player.hp = Math.min(player.maxHp, player.hp + 30);
      } else if (pickup.type === "ammo") {
        player.ammo = Math.min(player.maxAmmo, player.ammo + 16);
      } else {
        player.stamina = Math.min(player.maxStamina, player.stamina + 35);
      }
      playBeep(560, 0.08, 0.15);
      scene.remove(pickup.mesh);
      pickups.splice(i, 1);
      continue;
    }
    if (pickup.ttl <= 0) {
      scene.remove(pickup.mesh);
      pickups.splice(i, 1);
    }
  }

  for (let i = lootDrops.length - 1; i >= 0; i -= 1) {
    const loot = lootDrops[i];
    loot.ttl -= delta;
    loot.mesh.rotation.y += delta * 2;
    if (loot.mesh.position.distanceTo(player.pos) < 1.4) {
      player.modifiers.damage += loot.bonuses.damage;
      player.modifiers.moveSpeed += loot.bonuses.moveSpeed;
      player.modifiers.crit += loot.bonuses.crit;
      player.modifiers.maxHp += loot.bonuses.maxHp;
      player.maxHp += loot.bonuses.maxHp;
      player.hp = Math.min(player.maxHp, player.hp + loot.bonuses.maxHp * 0.6);
      player.inventory.push({ rarity: loot.rarity, bonuses: loot.bonuses });
      playBeep(620, 0.12, 0.18);
      scene.remove(loot.mesh);
      lootDrops.splice(i, 1);
      continue;
    }
    if (loot.ttl <= 0) {
      scene.remove(loot.mesh);
      lootDrops.splice(i, 1);
    }
  }
}

function updateEnemies(delta) {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (enemy.hp <= 0) {
      waveState.enemiesRemaining -= 1;
      gainXp(22 + waveState.wave * 6);
      spawnLoot(enemy.mesh.position.clone());
      if (prng.random() > 0.65) {
        const type = prng.random() > 0.66 ? "ammo" : prng.random() > 0.5 ? "stamina" : "health";
        spawnPickup(type, enemy.mesh.position.clone());
      }
      scene.remove(enemy.mesh);
      enemies.splice(i, 1);
      continue;
    }

    enemy.cooldown -= delta;
    enemy.hitStun = Math.max(0, enemy.hitStun - delta);
    if (enemy.status.poison > 0) {
      enemy.status.poison -= delta;
      enemy.hp -= delta * 4;
    }
    if (enemy.status.slow > 0) {
      enemy.status.slow -= delta;
    }
    const slowFactor = enemy.status.slow > 0 ? 0.6 : 1;

    if (enemy.hitStun > 0) {
      continue;
    }

    const toPlayer = player.pos.clone().sub(enemy.mesh.position);
    const distance = toPlayer.length();
    const direction = toPlayer.normalize();

    const avoid = new THREE.Vector3();
    arena.obstacles.forEach(({ mesh }) => {
      const offset = enemy.mesh.position.clone().sub(mesh.position);
      const dist = Math.max(offset.length(), 0.01);
      if (dist < 3.2) {
        avoid.add(offset.normalize().multiplyScalar((3.2 - dist) * 0.6));
      }
    });

    const moveDir = direction.clone().add(avoid).normalize();

    if (enemy.type === "ranged") {
      if (distance < 7) {
        enemy.mesh.position.add(moveDir.multiplyScalar(-enemy.speed * slowFactor * delta));
      } else if (distance > 14) {
        enemy.mesh.position.add(moveDir.multiplyScalar(enemy.speed * slowFactor * delta));
      }
      if (enemy.cooldown <= 0 && distance < 16) {
        enemy.cooldown = 1.6 + prng.random();
        spawnEnemyProjectile(enemy.mesh.position.clone(), direction, enemy.damage);
      }
    } else {
      if (distance > 1.4) {
        enemy.mesh.position.add(moveDir.multiplyScalar(enemy.speed * slowFactor * delta));
      }
      if (distance < 1.7 && enemy.cooldown <= 0) {
        enemy.cooldown = enemy.type === "tank" ? 2.4 : 1.4;
        const status = enemy.type === "tank" ? "slow" : prng.random() > 0.5 ? "poison" : "slow";
        applyDamage(player, enemy.damage, direction.clone().multiplyScalar(2), status);
      }
    }
  }

  if (waveState.active && waveState.enemiesRemaining <= 0) {
    completeWave();
  }
}

function resolvePlayerCollision() {
  player.onGround = false;
  if (player.pos.y <= player.height / 2) {
    player.pos.y = player.height / 2;
    player.velocity.y = Math.max(0, player.velocity.y);
    player.onGround = true;
  }

  arena.obstacles.forEach(({ mesh, width, depth, height }) => {
    const minX = mesh.position.x - width / 2 - player.radius;
    const maxX = mesh.position.x + width / 2 + player.radius;
    const minZ = mesh.position.z - depth / 2 - player.radius;
    const maxZ = mesh.position.z + depth / 2 + player.radius;
    if (player.pos.x > minX && player.pos.x < maxX && player.pos.z > minZ && player.pos.z < maxZ) {
      const dx = Math.min(maxX - player.pos.x, player.pos.x - minX);
      const dz = Math.min(maxZ - player.pos.z, player.pos.z - minZ);
      if (dx < dz) {
        player.pos.x += player.pos.x > mesh.position.x ? dx : -dx;
      } else {
        player.pos.z += player.pos.z > mesh.position.z ? dz : -dz;
      }
      if (player.pos.y < height + 0.1) {
        player.pos.y = height + player.height / 2;
        player.velocity.y = 0;
        player.onGround = true;
      }
    }
  });

  arena.walls.forEach(({ mesh, width, depth }) => {
    const minX = mesh.position.x - width / 2 - player.radius;
    const maxX = mesh.position.x + width / 2 + player.radius;
    const minZ = mesh.position.z - depth / 2 - player.radius;
    const maxZ = mesh.position.z + depth / 2 + player.radius;
    if (player.pos.x > minX && player.pos.x < maxX && player.pos.z > minZ && player.pos.z < maxZ) {
      const dx = Math.min(maxX - player.pos.x, player.pos.x - minX);
      const dz = Math.min(maxZ - player.pos.z, player.pos.z - minZ);
      if (dx < dz) {
        player.pos.x += player.pos.x > mesh.position.x ? dx : -dx;
      } else {
        player.pos.z += player.pos.z > mesh.position.z ? dz : -dz;
      }
    }
  });
}

function updatePlayer(delta) {
  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  let moveX = 0;
  let moveZ = 0;
  if (input.keys.has("KeyW")) moveZ += 1;
  if (input.keys.has("KeyS")) moveZ -= 1;
  if (input.keys.has("KeyA")) moveX -= 1;
  if (input.keys.has("KeyD")) moveX += 1;

  const moveDir = forward.clone().multiplyScalar(moveZ).add(right.clone().multiplyScalar(moveX));
  if (moveDir.lengthSq() > 0) {
    moveDir.normalize();
  }

  const slowFactor = player.status.slow > 0 ? 0.6 : 1;
  const speed = player.speed * player.modifiers.moveSpeed * slowFactor;

  if (player.rollTime > 0) {
    player.rollTime -= delta;
    player.iFrames = Math.max(player.iFrames, 0.15);
    player.velocity.x = forward.x * player.rollSpeed;
    player.velocity.z = forward.z * player.rollSpeed;
  } else {
    player.velocity.x = moveDir.x * speed;
    player.velocity.z = moveDir.z * speed;
  }

  if (input.keys.has("Space") && player.onGround && player.rollTime <= 0) {
    player.velocity.y = player.jumpStrength;
    player.onGround = false;
  }

  if (player.rollCooldown > 0) {
    player.rollCooldown -= delta;
  }

  if (input.keys.has("ShiftLeft") && player.rollCooldown <= 0 && player.stamina >= 20) {
    player.rollCooldown = 0.8;
    player.rollTime = 0.35;
    player.iFrames = 0.3;
    player.stamina -= 20;
    playBeep(360, 0.1, 0.16);
  }

  const gravity = -22;
  player.velocity.y += gravity * delta;
  player.pos.add(player.velocity.clone().multiplyScalar(delta));

  resolvePlayerCollision();

  if (player.status.poison > 0) {
    player.status.poison -= delta;
    player.hp -= delta * 2;
  }
  if (player.status.slow > 0) {
    player.status.slow -= delta;
  }
  if (player.iFrames > 0) {
    player.iFrames -= delta;
  }

  if (player.rollTime <= 0) {
    player.stamina = Math.min(player.maxStamina, player.stamina + player.staminaRegen * delta);
  }

  player.meleeCooldown = Math.max(0, player.meleeCooldown - delta);
  player.rangedCooldown = Math.max(0, player.rangedCooldown - delta);

  player.mesh.position.copy(player.pos);

  if (player.hp <= 0 && !waveState.loss) {
    waveState.loss = true;
    showBanner("Defeated. Press Restart.");
  }
}

function updateCamera() {
  const yaw = player.yaw;
  const pitch = player.pitch;
  if (settings.thirdPerson) {
    const offset = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch) + 0.2,
      Math.cos(yaw) * Math.cos(pitch)
    );
    const desired = player.pos.clone().add(new THREE.Vector3(0, 1.2, 0)).add(offset.clone().multiplyScalar(-6));
    camera.position.lerp(desired, 0.18);
    camera.lookAt(player.pos.clone().add(new THREE.Vector3(0, 1.3, 0)));
  } else {
    camera.position.copy(player.pos).add(new THREE.Vector3(0, 1.3, 0));
    camera.rotation.set(pitch, yaw, 0, "YXZ");
  }
}

function updateUI() {
  dom.hpFill.style.width = `${(player.hp / player.maxHp) * 100}%`;
  dom.hpText.textContent = `${Math.round(player.hp)} / ${player.maxHp}`;
  dom.staminaFill.style.width = `${(player.stamina / player.maxStamina) * 100}%`;
  dom.staminaText.textContent = `${Math.round(player.stamina)} / ${player.maxStamina}`;
  dom.ammoText.textContent = `${player.ammo} / ${player.maxAmmo}`;
  dom.waveText.textContent = waveState.win ? "Victory" : waveState.loss ? "Defeat" : `Wave ${waveState.wave}/${waveState.maxWaves}`;
  dom.xpText.textContent = `Lv ${player.level} (${player.xp}/${player.xpToNext})`;
  dom.weaponText.textContent = player.weapon === "melee" ? "Melee" : "Arc Shot";

  dom.inventoryList.innerHTML = "";
  player.inventory.slice(-4).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.rarity.toUpperCase()} loot +dmg ${item.bonuses.damage.toFixed(2)}`;
    dom.inventoryList.appendChild(li);
  });
}

function updateMinimap() {
  const size = dom.minimap.width;
  minimapCtx.clearRect(0, 0, size, size);
  minimapCtx.fillStyle = "#121922";
  minimapCtx.fillRect(0, 0, size, size);
  minimapCtx.strokeStyle = "#394453";
  minimapCtx.strokeRect(2, 2, size - 4, size - 4);

  const scale = size / arena.size;
  const toMap = (pos) => ({
    x: size / 2 + pos.x * scale,
    y: size / 2 + pos.z * scale
  });

  minimapCtx.fillStyle = "#2e3b4a";
  arena.walls.forEach(({ mesh, width, depth }) => {
    const map = toMap(mesh.position);
    minimapCtx.fillRect(map.x - (width * scale) / 2, map.y - (depth * scale) / 2, width * scale, depth * scale);
  });

  minimapCtx.fillStyle = "#6bd5ff";
  const playerMap = toMap(player.pos);
  minimapCtx.beginPath();
  minimapCtx.arc(playerMap.x, playerMap.y, 4, 0, Math.PI * 2);
  minimapCtx.fill();

  minimapCtx.fillStyle = "#ff8686";
  enemies.forEach((enemy) => {
    const map = toMap(enemy.mesh.position);
    minimapCtx.beginPath();
    minimapCtx.arc(map.x, map.y, 3, 0, Math.PI * 2);
    minimapCtx.fill();
  });

  minimapCtx.fillStyle = "#7df9ff";
  pickups.forEach((pickup) => {
    const map = toMap(pickup.mesh.position);
    minimapCtx.fillRect(map.x - 2, map.y - 2, 4, 4);
  });
}

function update(delta) {
  if (waveState.loss || waveState.win) {
    updateUI();
    updateCombatText(delta);
    return;
  }

  if (!waveState.active) {
    waveState.betweenTimer = Math.max(0, waveState.betweenTimer - delta);
    if (waveState.betweenTimer <= 0 && waveState.wave <= waveState.maxWaves) {
      startWave();
    }
  }

  handleAttacks();
  updatePlayer(delta);
  updateProjectiles(delta);
  updateEnemies(delta);
  updatePickups(delta);
  updateShop();
  updateCamera();
  updateUI();
  updateMinimap();
  updateCombatText(delta);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.032);
  if (!pauseState.active) {
    update(delta);
    renderer.render(scene, camera);
  }
}

function setPointerLock(locked) {
  input.mouseLocked = locked;
  dom.crosshair.classList.toggle("hidden", !locked);
  document.body.classList.toggle("locked", locked);
}

function togglePause() {
  pauseState.active = !pauseState.active;
  dom.pauseMenu.classList.toggle("visible", pauseState.active);
  if (pauseState.active) {
    document.exitPointerLock();
  }
}

function restartGame() {
  player.hp = player.maxHp;
  player.stamina = player.maxStamina;
  player.ammo = player.maxAmmo;
  player.gold = 0;
  player.xp = 0;
  player.level = 1;
  player.xpToNext = 120;
  player.inventory = [];
  player.modifiers = { damage: 1, moveSpeed: 1, crit: 0.05, maxHp: 0 };
  waveState.wave = 1;
  waveState.active = false;
  waveState.win = false;
  waveState.loss = false;
  waveState.betweenTimer = 3;
  enemies.forEach((enemy) => scene.remove(enemy.mesh));
  enemies.length = 0;
  projectiles.forEach((projectile) => scene.remove(projectile.mesh));
  projectiles.length = 0;
  enemyProjectiles.forEach((projectile) => scene.remove(projectile.mesh));
  enemyProjectiles.length = 0;
  pickups.forEach((pickup) => scene.remove(pickup.mesh));
  pickups.length = 0;
  lootDrops.forEach((loot) => scene.remove(loot.mesh));
  lootDrops.length = 0;
  resetArena();
  player.pos.set(0, 1.1, 0);
  showBanner("New run started");
}

const pauseState = { active: false };

canvas.addEventListener("click", () => {
  if (!input.mouseLocked) {
    initAudio();
    canvas.requestPointerLock();
  }
});

document.addEventListener("pointerlockchange", () => {
  setPointerLock(document.pointerLockElement === canvas);
});

document.addEventListener("mousemove", (event) => {
  if (!input.mouseLocked || pauseState.active) return;
  player.yaw -= event.movementX * settings.sensitivity;
  player.pitch -= event.movementY * settings.sensitivity;
  player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch));
});

document.addEventListener("mousedown", (event) => {
  input.buttons.add(event.button);
});

document.addEventListener("mouseup", (event) => {
  input.buttons.delete(event.button);
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    togglePause();
    return;
  }
  if (pauseState.active) {
    return;
  }
  if (event.code === "KeyH") {
    dom.helpOverlay.classList.toggle("visible");
  }
  if (event.code === "KeyV") {
    settings.thirdPerson = !settings.thirdPerson;
  }
  if (event.code === "Digit1") {
    player.weapon = "melee";
  }
  if (event.code === "Digit2") {
    player.weapon = "ranged";
  }
  if (event.code === "KeyE") {
    buyUpgrade();
  }
  input.keys.add(event.code);
});

document.addEventListener("keyup", (event) => {
  input.keys.delete(event.code);
});

dom.sensitivity.addEventListener("input", () => {
  settings.sensitivity = parseFloat(dom.sensitivity.value);
  dom.sensitivityValue.textContent = settings.sensitivity.toFixed(3);
});

document.getElementById("resume-btn").addEventListener("click", () => {
  togglePause();
});

document.getElementById("restart-btn").addEventListener("click", () => {
  pauseState.active = false;
  dom.pauseMenu.classList.remove("visible");
  restartGame();
});

document.getElementById("quit-btn").addEventListener("click", () => {
  window.location.reload();
});

setSeedFromUrl();
generateArena();
setupShop();

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

updateUI();
updateMinimap();
animate();
