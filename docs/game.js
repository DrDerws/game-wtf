/* global THREE */

const canvas = document.getElementById("game-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b0f16, 18, 90);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);

const clock = new THREE.Clock();

const ambient = new THREE.AmbientLight(0x9cb8ff, 0.4);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xd9f1ff, 0.9);
sun.position.set(20, 35, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const groundGeo = new THREE.PlaneGeometry(120, 120);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a3645 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const pathGeo = new THREE.PlaneGeometry(50, 6);
const pathMat = new THREE.MeshStandardMaterial({ color: 0x3b2f28 });
const path = new THREE.Mesh(pathGeo, pathMat);
path.rotation.x = -Math.PI / 2;
path.position.set(8, 0.01, 0);
scene.add(path);

const colliders = [];
const decor = [];

function addRock(x, z, radius) {
  const rockGeo = new THREE.DodecahedronGeometry(radius, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x465264, flatShading: true });
  const rock = new THREE.Mesh(rockGeo, rockMat);
  rock.position.set(x, radius * 0.5, z);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
  colliders.push({ mesh: rock, radius: radius * 0.8 });
  decor.push(rock);
}

function addTree(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.6, 3, 6),
    new THREE.MeshStandardMaterial({ color: 0x3d2a1a })
  );
  trunk.position.set(x, 1.5, z);
  trunk.castShadow = true;
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x2f5d3c, flatShading: true })
  );
  crown.position.set(x, 3.8, z);
  crown.castShadow = true;
  scene.add(trunk, crown);
  colliders.push({ mesh: trunk, radius: 0.8 });
  decor.push(trunk, crown);
}

function addWall(x, z, width, depth) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(width, 2.5, depth),
    new THREE.MeshStandardMaterial({ color: 0x37404a })
  );
  wall.position.set(x, 1.25, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
  colliders.push({ mesh: wall, radius: Math.max(width, depth) * 0.5 });
}

for (let i = 0; i < 14; i += 1) {
  addRock(-20 + i * 3.2, -18 + (i % 3) * 4.1, 1.2 + (i % 2) * 0.6);
}
for (let i = 0; i < 10; i += 1) {
  addTree(-28 + i * 5, 20 - (i % 4) * 3.5);
}

addWall(-6, -8, 8, 2);
addWall(-8, -2, 2, 8);
addWall(-6, 4, 8, 2);
addWall(10, 12, 10, 2);
addWall(14, -12, 6, 2);

const camp = new THREE.Group();
const tent = new THREE.Mesh(
  new THREE.ConeGeometry(2.5, 3.5, 4),
  new THREE.MeshStandardMaterial({ color: 0x5a4b6f, flatShading: true })
);
tent.position.set(-8, 1.75, -2);
const tentBase = new THREE.Mesh(
  new THREE.CylinderGeometry(2.7, 2.7, 0.4, 4),
  new THREE.MeshStandardMaterial({ color: 0x3c2e3b })
);
tentBase.position.set(-8, 0.2, -2);
tent.castShadow = true;
tentBase.receiveShadow = true;
camp.add(tent, tentBase);

const brazier = new THREE.Mesh(
  new THREE.CylinderGeometry(1, 1.2, 1, 6),
  new THREE.MeshStandardMaterial({ color: 0x3e3b3a })
);
brazier.position.set(-4, 0.5, 3);
camp.add(brazier);

const flame = new THREE.PointLight(0xffa762, 1.1, 12, 2);
flame.position.set(-4, 2.5, 3);
scene.add(flame);

const hubStone = new THREE.Mesh(
  new THREE.CylinderGeometry(1.3, 1.6, 3, 6),
  new THREE.MeshStandardMaterial({ color: 0x7a8aa1 })
);
hubStone.position.set(-2, 1.5, 0);
hubStone.castShadow = true;
camp.add(hubStone);

scene.add(camp);

const player = {
  mesh: null,
  pos: new THREE.Vector3(-6, 0, 0),
  rot: 0,
  speed: 7.5,
  hp: 120,
  maxHp: 120,
  mana: 80,
  maxMana: 80,
  shield: 0,
  fatigue: 0,
  fatigueTimer: 0,
  inCombatTimer: 0,
  cast: null,
  gcd: 0,
  target: null,
  inventory: {
    "Wild Herb": 0,
    "Spark Shard": 0
  },
  quest: {
    accepted: false,
    completed: false,
    kills: 0,
    goal: 6,
    rewardGiven: false
  }
};

const playerGroup = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.55, 1.2, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0x6bd5ff, flatShading: true })
);
body.castShadow = true;
const cloak = new THREE.Mesh(
  new THREE.ConeGeometry(0.9, 1.6, 6),
  new THREE.MeshStandardMaterial({ color: 0x2e4b6f, flatShading: true })
);
cloak.position.set(0, 0.2, -0.15);
cloak.castShadow = true;
playerGroup.add(body, cloak);
playerGroup.position.copy(player.pos);
scene.add(playerGroup);
player.mesh = playerGroup;

const npc = {
  mesh: null,
  pos: new THREE.Vector3(-4, 0, 2),
  name: "Camp Guide Lyra"
};

const npcMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.5, 0.5, 1.8, 6),
  new THREE.MeshStandardMaterial({ color: 0xffe58a })
);
npcMesh.position.set(npc.pos.x, 0.9, npc.pos.z);
npcMesh.castShadow = true;
scene.add(npcMesh);
npc.mesh = npcMesh;

const targetRing = new THREE.Mesh(
  new THREE.RingGeometry(0.9, 1.1, 32),
  new THREE.MeshBasicMaterial({ color: 0x7cf4ff, side: THREE.DoubleSide })
);
targetRing.rotation.x = -Math.PI / 2;
targetRing.visible = false;
scene.add(targetRing);

const enemyTypes = {
  skirmisher: {
    name: "Wild Skirmisher",
    color: 0xff8b6b,
    speed: 5.5,
    hp: 60,
    damage: [6, 9],
    range: 2.2,
    aggro: 16,
    leash: 24,
    behavior: "melee"
  },
  seer: {
    name: "Rift Seer",
    color: 0xb48bff,
    speed: 4.5,
    hp: 50,
    damage: [8, 12],
    range: 12,
    aggro: 18,
    leash: 26,
    behavior: "ranged"
  },
  brute: {
    name: "Stone Brute",
    color: 0x9ca1a8,
    speed: 3.2,
    hp: 120,
    damage: [10, 16],
    range: 2.4,
    aggro: 14,
    leash: 20,
    behavior: "brute"
  }
};

const enemies = [];

function spawnEnemy(typeKey, position) {
  const template = enemyTypes[typeKey];
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(typeKey === "brute" ? 1.1 : 0.8, 10, 10),
    new THREE.MeshStandardMaterial({ color: template.color, flatShading: true })
  );
  mesh.position.set(position.x, 0.8, position.z);
  mesh.castShadow = true;
  scene.add(mesh);
  const enemy = {
    id: Math.random().toString(16).slice(2),
    type: typeKey,
    behavior: template.behavior,
    name: template.name,
    mesh,
    pos: new THREE.Vector3(position.x, 0, position.z),
    hp: template.hp,
    maxHp: template.hp,
    speed: template.speed,
    damage: template.damage,
    range: template.range,
    aggro: template.aggro,
    leash: template.leash,
    state: "patrol",
    cooldown: 0,
    cast: 0,
    slowTimer: 0,
    home: position.clone(),
    patrolAngle: Math.random() * Math.PI * 2
  };
  enemies.push(enemy);
}

spawnEnemy("skirmisher", new THREE.Vector3(16, 0, 8));
spawnEnemy("skirmisher", new THREE.Vector3(22, 0, -6));
spawnEnemy("seer", new THREE.Vector3(18, 0, 14));
spawnEnemy("seer", new THREE.Vector3(26, 0, 2));
spawnEnemy("brute", new THREE.Vector3(28, 0, -12));
spawnEnemy("brute", new THREE.Vector3(10, 0, -16));

const spells = {
  arcBolt: {
    key: "1",
    name: "Arc Bolt",
    mana: 4,
    gcd: 1.1,
    cast: 0,
    cooldown: 0,
    requiresTarget: true,
    range: 20,
    effect: (target) => {
      if (!target) {
        return;
      }
      const damage = 12 + Math.floor(Math.random() * 6);
      applyDamage(target, damage);
      showFloatingText(target.mesh.position, `-${damage}`, "#fef4b6");
    }
  },
  sigilSnare: {
    key: "2",
    name: "Sigil Snare",
    mana: 12,
    gcd: 1.2,
    cast: 1.1,
    cooldown: 8,
    requiresTarget: true,
    range: 18,
    effect: (target) => {
      if (!target) {
        return;
      }
      const damage = 16 + Math.floor(Math.random() * 6);
      applyDamage(target, damage);
      target.slowTimer = 4.5;
      showFloatingText(target.mesh.position, `-${damage} slowed`, "#9ad7ff");
    }
  },
  wardShell: {
    key: "3",
    name: "Ward Shell",
    mana: 18,
    gcd: 1.3,
    cast: 0,
    cooldown: 12,
    range: 0,
    effect: () => {
      const shieldGain = 35;
      player.shield = Math.min(player.shield + shieldGain, 60);
      showFloatingText(player.mesh.position, `+${shieldGain} shield`, "#7cf4ff");
    }
  },
  novaPulse: {
    key: "4",
    name: "Nova Pulse",
    mana: 26,
    gcd: 1.4,
    cast: 0.9,
    cooldown: 14,
    range: 6,
    effect: () => {
      const enemiesInRange = enemies.filter((enemy) => enemy.hp > 0 && enemy.pos.distanceTo(player.pos) <= 6);
      enemiesInRange.forEach((enemy) => {
        const damage = 22 + Math.floor(Math.random() * 8);
        applyDamage(enemy, damage);
        showFloatingText(enemy.mesh.position, `-${damage}`, "#ffb347");
      });
      showFloatingText(player.mesh.position, "Nova!", "#ffb347");
    }
  }
};

const cooldowns = {
  arcBolt: 0,
  sigilSnare: 0,
  wardShell: 0,
  novaPulse: 0
};

const keys = new Set();
const mouse = {
  rightDown: false,
  x: 0,
  y: 0,
  dragX: 0,
  dragY: 0,
  wheel: 0
};

const ui = {
  playerHp: document.getElementById("player-hp"),
  playerHpText: document.getElementById("player-hp-text"),
  playerMana: document.getElementById("player-mana"),
  playerManaText: document.getElementById("player-mana-text"),
  playerFatigue: document.getElementById("player-fatigue"),
  playerFatigueText: document.getElementById("player-fatigue-text"),
  targetFrame: document.getElementById("target-frame"),
  targetName: document.getElementById("target-name"),
  targetHp: document.getElementById("target-hp"),
  castBar: document.getElementById("cast-bar"),
  castFill: document.getElementById("cast-fill"),
  castText: document.getElementById("cast-text"),
  questText: document.getElementById("quest-text"),
  inventoryList: document.getElementById("inventory-list"),
  dialogue: document.getElementById("dialogue"),
  dialogueTitle: document.getElementById("dialogue-title"),
  dialogueText: document.getElementById("dialogue-text"),
  dialogueClose: document.getElementById("dialogue-close"),
  combatText: document.getElementById("combat-text"),
  hotbar: document.getElementById("hotbar")
};

const floatingTexts = [];

function showFloatingText(position, text, color) {
  if (floatingTexts.length > 18) {
    const old = floatingTexts.shift();
    if (old && old.element) {
      old.element.remove();
    }
  }
  const element = document.createElement("div");
  element.className = "float";
  element.textContent = text;
  element.style.color = color;
  ui.combatText.appendChild(element);
  floatingTexts.push({
    element,
    position: position.clone(),
    life: 1.1
  });
}

function updateFloatingText(delta) {
  for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
    const floater = floatingTexts[i];
    floater.life -= delta;
    floater.position.y += delta * 0.8;
    const screen = floater.position.clone().project(camera);
    const x = (screen.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screen.y * 0.5 + 0.5) * window.innerHeight;
    floater.element.style.left = `${x}px`;
    floater.element.style.top = `${y}px`;
    floater.element.style.opacity = Math.max(0, Math.min(1, floater.life));
    if (floater.life <= 0) {
      floater.element.remove();
      floatingTexts.splice(i, 1);
    }
  }
}

function updateInventoryUI() {
  ui.inventoryList.innerHTML = "";
  Object.entries(player.inventory).forEach(([name, count]) => {
    const item = document.createElement("li");
    item.textContent = name;
    const value = document.createElement("span");
    value.textContent = count;
    item.appendChild(value);
    ui.inventoryList.appendChild(item);
  });
}

function updateQuestUI() {
  if (!player.quest.accepted) {
    ui.questText.textContent = "Speak to Camp Guide Lyra to receive a task.";
  } else if (!player.quest.completed) {
    ui.questText.textContent = `Clear ${player.quest.goal} rift creatures: ${player.quest.kills}/${player.quest.goal}.`;
  } else {
    ui.questText.textContent = "Quest complete! Return to Camp Guide Lyra.";
  }
}

function applyDamage(enemy, amount) {
  enemy.hp = Math.max(0, enemy.hp - amount);
  if (enemy.hp === 0) {
    enemy.mesh.visible = false;
    if (player.target === enemy) {
      player.target = null;
    }
    if (player.quest.accepted && !player.quest.completed) {
      player.quest.kills += 1;
      if (player.quest.kills >= player.quest.goal) {
        player.quest.completed = true;
      }
      updateQuestUI();
    }
    grantLoot();
  }
}

function grantLoot() {
  const roll = Math.random();
  if (roll < 0.6) {
    player.inventory["Wild Herb"] += 1;
  } else {
    player.inventory["Spark Shard"] += 1;
  }
  updateInventoryUI();
}

function takePlayerDamage(amount) {
  player.inCombatTimer = 6;
  if (player.shield > 0) {
    const absorbed = Math.min(player.shield, amount);
    player.shield -= absorbed;
    amount -= absorbed;
  }
  if (amount > 0) {
    player.hp = Math.max(0, player.hp - amount);
    showFloatingText(player.mesh.position, `-${amount}`, "#ff6b6b");
  }
  if (player.cast) {
    player.cast = null;
    ui.castBar.style.display = "none";
    showFloatingText(player.mesh.position, "Interrupted", "#ff6b6b");
  }
}

function startCast(spellKey) {
  const spell = spells[spellKey];
  if (!spell) {
    return;
  }
  if (player.gcd > 0 || cooldowns[spellKey] > 0) {
    return;
  }
  if (player.mana < spell.mana) {
    showFloatingText(player.mesh.position, "No mana", "#ff6b6b");
    return;
  }
  if (spell.requiresTarget && (!player.target || player.target.hp <= 0)) {
    showFloatingText(player.mesh.position, "No target", "#ffb347");
    return;
  }
  if (spell.range > 0 && player.target) {
    const distance = player.pos.distanceTo(player.target.pos);
    if (distance > spell.range) {
      showFloatingText(player.mesh.position, "Out of range", "#ffb347");
      return;
    }
  }
  player.mana = Math.max(0, player.mana - spell.mana);
  player.fatigue = Math.min(100, player.fatigue + 8);
  player.fatigueTimer = 5;
  player.gcd = spell.gcd;
  cooldowns[spellKey] = spell.cooldown;
  player.cast = {
    spellKey,
    timer: spell.cast,
    duration: spell.cast
  };
  if (spell.cast > 0) {
    ui.castBar.style.display = "block";
    ui.castText.textContent = spell.name;
  } else {
    resolveCast();
  }
}

function resolveCast() {
  if (!player.cast) {
    return;
  }
  const spell = spells[player.cast.spellKey];
  if (!spell) {
    return;
  }
  spell.effect(player.target);
  player.cast = null;
  ui.castBar.style.display = "none";
}

let cameraDistance = 12;
let cameraYaw = Math.PI * 0.75;
let cameraPitch = 0.4;

function updateCamera() {
  const desired = new THREE.Vector3(
    player.pos.x + Math.cos(cameraYaw) * Math.cos(cameraPitch) * cameraDistance,
    player.pos.y + 4 + Math.sin(cameraPitch) * cameraDistance,
    player.pos.z + Math.sin(cameraYaw) * Math.cos(cameraPitch) * cameraDistance
  );

  const origin = player.pos.clone().add(new THREE.Vector3(0, 1.5, 0));
  const direction = desired.clone().sub(origin).normalize();
  const raycaster = new THREE.Raycaster(origin, direction);
  raycaster.far = origin.distanceTo(desired);
  const intersections = raycaster.intersectObjects(colliders.map((c) => c.mesh));
  let finalPosition = desired;
  if (intersections.length > 0) {
    const hit = intersections[0];
    finalPosition = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(0.8));
  }

  camera.position.lerp(finalPosition, 0.3);
  camera.lookAt(player.pos.x, player.pos.y + 1.4, player.pos.z);
}

function getCameraForward() {
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  return forward;
}

function getCameraRight() {
  const forward = getCameraForward();
  return new THREE.Vector3(forward.z, 0, -forward.x);
}

function updatePlayer(delta) {
  const move = new THREE.Vector3();
  const forward = getCameraForward();
  const right = getCameraRight();

  if (keys.has("KeyW")) {
    move.add(forward);
  }
  if (keys.has("KeyS")) {
    move.add(forward.clone().multiplyScalar(-1));
  }
  if (keys.has("KeyA")) {
    move.add(right.clone().multiplyScalar(-1));
  }
  if (keys.has("KeyD")) {
    move.add(right);
  }
  if (keys.has("KeyQ")) {
    player.rot += delta * 1.8;
  }
  if (keys.has("KeyE")) {
    player.rot -= delta * 1.8;
  }

  if (mouse.rightDown) {
    player.rot = -cameraYaw + Math.PI / 2;
  }

  if (move.lengthSq() > 0) {
    move.normalize();
    const speed = player.speed * delta;
    const nextPos = player.pos.clone().add(move.multiplyScalar(speed));
    if (!collides(nextPos, 0.8)) {
      player.pos.copy(nextPos);
    }
  }

  player.mesh.position.copy(player.pos);
  player.mesh.rotation.y = player.rot;
}

function collides(position, radius) {
  return colliders.some((collider) => {
    const dist = position.distanceTo(collider.mesh.position);
    return dist < radius + collider.radius;
  });
}

function updateEnemies(delta) {
  enemies.forEach((enemy) => {
    if (enemy.hp <= 0) {
      return;
    }

    enemy.cooldown = Math.max(0, enemy.cooldown - delta);
    const previousCast = enemy.cast;
    enemy.cast = Math.max(0, enemy.cast - delta);
    enemy.slowTimer = Math.max(0, enemy.slowTimer - delta);

    const distanceToPlayer = enemy.pos.distanceTo(player.pos);
    const distanceFromHome = enemy.pos.distanceTo(enemy.home);

    if (distanceToPlayer < enemy.aggro) {
      enemy.state = "aggro";
      player.inCombatTimer = 6;
    }

    if (distanceFromHome > enemy.leash) {
      enemy.state = "return";
    }

    if (enemy.state === "aggro" && distanceToPlayer > enemy.leash) {
      enemy.state = "return";
    }

    if (enemy.state === "return") {
      const dir = enemy.home.clone().sub(enemy.pos);
      if (dir.length() < 0.5) {
        enemy.state = "patrol";
      } else {
        dir.normalize();
        enemy.pos.add(dir.multiplyScalar(enemy.speed * delta));
      }
    } else if (enemy.state === "patrol") {
      enemy.patrolAngle += delta * 0.4;
      const offset = new THREE.Vector3(Math.cos(enemy.patrolAngle), 0, Math.sin(enemy.patrolAngle)).multiplyScalar(2.2);
      const desired = enemy.home.clone().add(offset);
      const dir = desired.sub(enemy.pos);
      if (dir.length() > 0.2) {
        enemy.pos.add(dir.normalize().multiplyScalar(enemy.speed * 0.4 * delta));
      }
    } else if (enemy.state === "aggro") {
      if (enemy.behavior === "ranged") {
        if (distanceToPlayer < 7) {
          const away = enemy.pos.clone().sub(player.pos).normalize();
          enemy.pos.add(away.multiplyScalar(enemy.speed * delta));
        }
        if (enemy.cast <= 0 && enemy.cooldown <= 0 && distanceToPlayer <= enemy.range) {
          enemy.cast = 0.9;
          enemy.cooldown = 2.4;
        }
        if (previousCast > 0 && enemy.cast === 0) {
          const damage = randomBetween(...enemy.damage);
          takePlayerDamage(damage);
          showFloatingText(player.mesh.position, `-${damage}`, "#ff8686");
        }
      } else {
        if (distanceToPlayer > enemy.range) {
          const dir = player.pos.clone().sub(enemy.pos).normalize();
          const speedMod = enemy.slowTimer > 0 ? 0.45 : 1;
          enemy.pos.add(dir.multiplyScalar(enemy.speed * speedMod * delta));
        } else if (enemy.cooldown <= 0) {
          const damage = randomBetween(...enemy.damage);
          takePlayerDamage(damage);
          enemy.cooldown = enemy.behavior === "brute" ? 2.6 : 1.6;
        }
      }
    }

    enemy.mesh.position.set(enemy.pos.x, 0.8, enemy.pos.z);
  });
}

function randomBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function updateUI() {
  if (player.target && player.target.hp <= 0) {
    player.target = null;
  }
  const hpPercent = player.hp / player.maxHp;
  ui.playerHp.style.width = `${Math.max(0, hpPercent) * 100}%`;
  ui.playerHpText.textContent = `${player.hp}/${player.maxHp}`;

  const manaPercent = player.mana / player.maxMana;
  ui.playerMana.style.width = `${Math.max(0, manaPercent) * 100}%`;
  ui.playerManaText.textContent = `${Math.floor(player.mana)}/${player.maxMana}`;

  const fatiguePercent = player.fatigue / 100;
  ui.playerFatigue.style.width = `${fatiguePercent * 100}%`;
  ui.playerFatigueText.textContent = `${Math.floor(player.fatigue)}`;

  if (player.target && player.target.hp > 0) {
    ui.targetFrame.style.opacity = "1";
    ui.targetName.textContent = player.target.name;
    ui.targetHp.style.width = `${(player.target.hp / player.target.maxHp) * 100}%`;
    targetRing.visible = true;
    targetRing.position.set(player.target.pos.x, 0.05, player.target.pos.z);
  } else {
    ui.targetFrame.style.opacity = "0.6";
    ui.targetName.textContent = "No Target";
    ui.targetHp.style.width = "0%";
    targetRing.visible = false;
  }

  if (player.cast && player.cast.duration > 0) {
    const progress = 1 - player.cast.timer / player.cast.duration;
    ui.castFill.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  }

  Object.entries(spells).forEach(([key, spell]) => {
    const slot = ui.hotbar.querySelector(`[data-slot="${spell.key}"]`);
    if (!slot) {
      return;
    }
    const overlay = slot.querySelector(".hotbar__cooldown");
    const remaining = cooldowns[key];
    const cooldownRatio = spell.cooldown > 0 ? remaining / spell.cooldown : 0;
    overlay.style.transform = `scaleY(${Math.min(1, cooldownRatio)})`;
    slot.disabled = player.mana < spell.mana;
  });
}

function updateResources(delta) {
  player.gcd = Math.max(0, player.gcd - delta);
  Object.keys(cooldowns).forEach((key) => {
    cooldowns[key] = Math.max(0, cooldowns[key] - delta);
  });

  if (player.cast) {
    player.cast.timer -= delta;
    if (player.cast.timer <= 0) {
      resolveCast();
    }
  }

  player.inCombatTimer = Math.max(0, player.inCombatTimer - delta);
  player.fatigueTimer = Math.max(0, player.fatigueTimer - delta);

  const regenBase = player.inCombatTimer > 0 ? 2 : 6;
  const fatiguePenalty = player.fatigueTimer > 0 ? player.fatigue / 120 : 0;
  const regen = Math.max(0, regenBase - fatiguePenalty);
  player.mana = Math.min(player.maxMana, player.mana + regen * delta);
  player.fatigue = Math.max(0, player.fatigue - delta * 6);
}

function selectTarget(enemy) {
  if (enemy && enemy.hp > 0) {
    player.target = enemy;
  }
}

function cycleTarget() {
  const candidates = enemies.filter((enemy) => enemy.hp > 0);
  if (candidates.length === 0) {
    player.target = null;
    return;
  }
  candidates.sort((a, b) => a.pos.distanceTo(player.pos) - b.pos.distanceTo(player.pos));
  const currentIndex = candidates.findIndex((enemy) => enemy === player.target);
  const next = candidates[(currentIndex + 1) % candidates.length];
  player.target = next;
}

function handleInteract() {
  if (player.pos.distanceTo(npc.pos) < 3.2) {
    openDialogue();
  }
}

function openDialogue() {
  ui.dialogue.style.display = "flex";
  if (!player.quest.accepted) {
    ui.dialogueTitle.textContent = npc.name;
    ui.dialogueText.textContent = "The wilds are restless. Please clear six rift creatures on the path and bring back any shards you find.";
    player.quest.accepted = true;
    updateQuestUI();
  } else if (player.quest.completed && !player.quest.rewardGiven) {
    ui.dialogueTitle.textContent = npc.name;
    ui.dialogueText.textContent = "You did it! The camp can breathe again. Your mana capacity rises with this charm.";
    player.quest.rewardGiven = true;
    player.maxMana += 20;
    player.mana = player.maxMana;
    updateQuestUI();
  } else if (player.quest.completed) {
    ui.dialogueTitle.textContent = npc.name;
    ui.dialogueText.textContent = "The path is calm for now. Keep your eyes open for new disturbances.";
  } else {
    ui.dialogueTitle.textContent = npc.name;
    ui.dialogueText.textContent = "Stay alert. The rift creatures still prowl the clearing.";
  }
}

ui.dialogueClose.addEventListener("click", () => {
  ui.dialogue.style.display = "none";
});

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

window.addEventListener("keydown", (event) => {
  if (["INPUT", "TEXTAREA"].includes(event.target.tagName)) {
    return;
  }
  if (event.code === "Tab") {
    event.preventDefault();
    cycleTarget();
    return;
  }
  if (event.code === "KeyE") {
    const canInteract = player.pos.distanceTo(npc.pos) < 3.2;
    if (canInteract) {
      handleInteract();
      return;
    }
  }
  keys.add(event.code);
  if (event.code === "Digit1") {
    startCast("arcBolt");
  }
  if (event.code === "Digit2") {
    startCast("sigilSnare");
  }
  if (event.code === "Digit3") {
    startCast("wardShell");
  }
  if (event.code === "Digit4") {
    startCast("novaPulse");
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

canvas.addEventListener("mousedown", (event) => {
  if (event.button === 2) {
    mouse.rightDown = true;
    mouse.dragX = event.clientX;
    mouse.dragY = event.clientY;
  }
});

canvas.addEventListener("mouseup", (event) => {
  if (event.button === 2) {
    mouse.rightDown = false;
  }
});

canvas.addEventListener("mousemove", (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
  if (mouse.rightDown) {
    const deltaX = event.clientX - mouse.dragX;
    const deltaY = event.clientY - mouse.dragY;
    cameraYaw -= deltaX * 0.005;
    cameraPitch = Math.max(-0.1, Math.min(1.1, cameraPitch - deltaY * 0.005));
    mouse.dragX = event.clientX;
    mouse.dragY = event.clientY;
  }
});

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  cameraDistance = Math.max(6, Math.min(20, cameraDistance + event.deltaY * 0.01));
});

canvas.addEventListener("click", (event) => {
  if (event.button !== 0) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const mousePos = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mousePos, camera);
  const hits = raycaster.intersectObjects(enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.mesh));
  if (hits.length > 0) {
    const hit = hits[0].object;
    const enemy = enemies.find((entry) => entry.mesh === hit);
    selectTarget(enemy);
  } else {
    player.target = null;
  }
});

ui.hotbar.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  const slot = button.dataset.slot;
  if (slot === "1") {
    startCast("arcBolt");
  }
  if (slot === "2") {
    startCast("sigilSnare");
  }
  if (slot === "3") {
    startCast("wardShell");
  }
  if (slot === "4") {
    startCast("novaPulse");
  }
});

updateInventoryUI();
updateQuestUI();

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);

  updateResources(delta);
  updatePlayer(delta);
  updateEnemies(delta);
  updateCamera();
  updateUI();
  updateFloatingText(delta);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
