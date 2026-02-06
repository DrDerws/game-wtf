const STORAGE_KEY = "wizardNarrativeRpgSave";

const spells = {
  starfire: {
    name: "Starfire Lance",
    cost: 3,
    fatigue: 1,
    reputation: -1,
    description: "A focused beam that scorches a target, leaving a comet-trail in the air."
  },
  glimmerbind: {
    name: "Glimmerbind",
    cost: 2,
    fatigue: 1,
    reputation: 0,
    description: "A lattice of light that entangles and redirects attention."
  },
  aegis: {
    name: "Aegis Veil",
    cost: 2,
    fatigue: 0,
    reputation: 1,
    description: "A defensive shimmer that absorbs harm and reflects goodwill."
  }
};

const scenes = {
  intro: {
    title: "The Glassbound Gate",
    text: [
      "The capital's western gate is sealed in a sheet of half-transparent crystal. Your mentor, Archivist Liora, presses a seal-ring into your palm.",
      "\"We need to know why the barrier sings,\" she says. \"Go with care, apprentice.\"",
      "Guard Captain Renn watches the crowd, while Merchant Jass looks for a gap in the line. Acolyte Mira waits under a lantern, clutching a map of the city wells."
    ],
    choices: [
      {
        text: "Speak with Liora about the crystal's origin.",
        next: "archive",
        effects: { reputation: 1 },
        log: "You share a quiet moment with Liora."
      },
      {
        text: "Join Captain Renn to calm the queue.",
        next: "market",
        effects: { fatigue: 1, reputation: 1 },
        log: "You shoulder the burden of the restless crowd."
      },
      {
        text: "Follow Mira toward the whispering canal.",
        next: "canal",
        effects: { mana: 1, reputation: 0 },
        log: "Mira's map glows when you touch it."
      }
    ]
  },
  archive: {
    title: "Archive of Cinders",
    text: [
      "Liora guides you through soot-scented shelves. She confesses the crystal barrier appeared after a failed ritual from the Spire.",
      "\"Renn thinks it's a siege; Jass thinks it's profit,\" she says. \"I think it's a mirror.\"",
      "She offers a ritual sketch and warns you about the Spire's wardens."
    ],
    choices: [
      {
        text: "Study the sketch to prepare a defensive weave (Aegis Veil).",
        next: "spire",
        effects: { mana: -2, fatigue: 0, reputation: 1 },
        requirements: { minMana: 2 },
        log: "You practice Aegis Veil and feel steadier."
      },
      {
        text: "Ask Liora to introduce you to Captain Renn.",
        next: "market",
        effects: { reputation: 1 },
        log: "Liora vouches for your resolve."
      },
      {
        text: "Slip out toward Jass's caravan.",
        next: "market",
        effects: { mana: 0, fatigue: 1, reputation: -1 },
        log: "You leave Liora with more questions than answers."
      }
    ]
  },
  market: {
    title: "Market of Glass and Smoke",
    text: [
      "Jass negotiates with a trader whose cart is trapped behind the crystal. Renn asks you to keep the crowd from pushing.",
      "Mira warns the canal water is \"restless\" and might be the true source of the barrier."
    ],
    choices: [
      {
        text: "Cast Glimmerbind to calm the crowd without force.",
        next: "guild",
        effects: { mana: -2, fatigue: 1, reputation: 1 },
        requirements: { minMana: 2 },
        log: "Glimmerbind softens the panic with radiant threads."
      },
      {
        text: "Back Renn with a firm warning to disperse.",
        next: "guild",
        effects: { fatigue: 1, reputation: -1 },
        log: "Your voice carries authority but costs goodwill."
      },
      {
        text: "Make a deal with Jass to access supplies.",
        next: "canal",
        roll: { sides: 6, threshold: 4, success: "supplies", fail: "debts" },
        effects: { reputation: 0 },
        log: "You gamble on Jass's grin."
      }
    ]
  },
  canal: {
    title: "Whispering Canal",
    text: [
      "Mira kneels by the water. A ferryman of mist rises, offering passage beneath the crystal. His price is a memory.",
      "Renn arrives late, weary and annoyed. He asks you to decide quickly."
    ],
    choices: [
      {
        text: "Offer a memory and ride the mist-ferry.",
        next: "mirror",
        effects: { fatigue: 1, reputation: 1 },
        roll: { sides: 6, threshold: 3, success: "clear", fail: "blur" },
        log: "The ferryman drinks your memory like rainwater."
      },
      {
        text: "Refuse and ward the canal with Aegis Veil.",
        next: "guild",
        effects: { mana: -2, reputation: 1 },
        requirements: { minMana: 2 },
        log: "Aegis Veil hardens the water's surface."
      },
      {
        text: "Attack the ferryman with Starfire Lance.",
        next: "riot",
        effects: { mana: -3, fatigue: 1, reputation: -2 },
        requirements: { minMana: 3 },
        log: "Starfire Lance slices the mist, angering the canal."
      }
    ]
  },
  guild: {
    title: "Wardens' Guildhall",
    text: [
      "The wardens demand a test. Their duelist, Solren, raises a mirrored blade. Liora watches from the balcony.",
      "Renn whispers: \"Win clean, or the city will blame us.\""
    ],
    choices: [
      {
        text: "Use Glimmerbind to control the duel's tempo.",
        next: "spire",
        effects: { mana: -2, fatigue: 1, reputation: 1 },
        requirements: { minMana: 2 },
        roll: { sides: 6, threshold: 4, success: "clean win", fail: "scraped" },
        log: "You weave light to redirect every strike."
      },
      {
        text: "Face Solren with Starfire Lance.",
        next: "spire",
        effects: { mana: -3, fatigue: 1, reputation: -1 },
        requirements: { minMana: 3 },
        roll: { sides: 6, threshold: 5, success: "stunned", fail: "injury" },
        log: "Starfire crackles across the hall."
      },
      {
        text: "Shield yourself with Aegis Veil and play defense.",
        next: "spire",
        effects: { mana: -2, reputation: 1 },
        requirements: { minMana: 2 },
        roll: { sides: 6, threshold: 3, success: "respect", fail: "draw" },
        log: "Your defense wins quiet admiration."
      }
    ]
  },
  mirror: {
    title: "Mirror Paths",
    text: [
      "Below the canal, a maze of mirrored pipes reflects your fears. Mira's voice echoes: \"Stay with me.\"",
      "A door of glass awaits, leading to the Spire's heart."
    ],
    choices: [
      {
        text: "Hold Mira's hand and step through together.",
        next: "spire",
        effects: { reputation: 1, fatigue: 1 },
        log: "Together, you steady the reflections."
      },
      {
        text: "Shatter the glass door with Starfire Lance.",
        next: "riot",
        effects: { mana: -3, fatigue: 1, reputation: -1 },
        requirements: { minMana: 3 },
        log: "The mirror shatters, and alarms answer."
      },
      {
        text: "Trace the maze with Glimmerbind, avoiding the door.",
        next: "spire",
        effects: { mana: -2, fatigue: 1, reputation: 0 },
        requirements: { minMana: 2 },
        roll: { sides: 6, threshold: 4, success: "shortcut", fail: "lost" },
        log: "Light-lines map the maze."
      }
    ]
  },
  riot: {
    title: "Shattered Square",
    text: [
      "The barrier's hum spreads into the city. Citizens panic, and the crowd divides between Renn's guards and Jass's traders.",
      "Liora urges you to restore order before the Spire ritual collapses."
    ],
    choices: [
      {
        text: "Stand beside Renn to hold the line.",
        next: "spire",
        effects: { fatigue: 2, reputation: 1 },
        log: "Renn's trust hardens into loyalty."
      },
      {
        text: "Offer Jass a calm escape route for families.",
        next: "spire",
        effects: { fatigue: 1, reputation: 1 },
        roll: { sides: 6, threshold: 4, success: "safe passage", fail: "stampede" },
        log: "You bargain for mercy amid chaos."
      },
      {
        text: "Channel Aegis Veil to shield the square.",
        next: "spire",
        effects: { mana: -2, fatigue: 1, reputation: 2 },
        requirements: { minMana: 2 },
        log: "Aegis Veil turns panic into awe."
      }
    ]
  },
  spire: {
    title: "The Crystal Spire",
    text: [
      "At the Spire's summit, a ritual circle vibrates. Liora stands over a pulsing prism; Mira steadies the chant. Renn and Jass arrive in their own ways.",
      "The ritual can be sealed, redirected, or shattered. Your reputation will decide who trusts you."
    ],
    choices: [
      {
        text: "Seal the ritual with Aegis Veil and negotiation.",
        next: "ending_peace",
        effects: { mana: -2, fatigue: 1, reputation: 2 },
        requirements: { minMana: 2, minReputation: 4 },
        log: "You anchor the veil with diplomacy."
      },
      {
        text: "Redirect the ritual through your will, risking backlash.",
        next: "trial",
        effects: { mana: -1, fatigue: 2, reputation: 0 },
        requirements: { maxFatigue: 5 },
        log: "You grasp the prism's song."
      },
      {
        text: "Shatter the prism with Starfire Lance.",
        next: "ending_shatter",
        effects: { mana: -3, fatigue: 1, reputation: -2 },
        requirements: { minMana: 3 },
        log: "Starfire cracks the heart of the Spire."
      }
    ]
  },
  trial: {
    title: "Trial of Echoes",
    text: [
      "The prism pulls you into a memory-plane where the city's will weighs on you. Liora, Renn, Mira, and Jass appear as echoes.",
      "You must decide who to heed to stabilize the ritual."
    ],
    choices: [
      {
        text: "Trust Liora's patient method.",
        next: "ending_archive",
        effects: { reputation: 2, fatigue: 1 },
        log: "Liora's guidance steadies the echoes."
      },
      {
        text: "Follow Renn's command to act decisively.",
        next: "ending_guard",
        effects: { reputation: 1, fatigue: 2 },
        log: "Renn's grit cuts through the noise."
      },
      {
        text: "Side with Mira's compassion for the city.",
        next: "ending_healer",
        effects: { reputation: 2, fatigue: 1 },
        log: "Mira's kindness shapes the ritual."
      },
      {
        text: "Listen to Jass's pragmatic bargain.",
        next: "ending_merchant",
        effects: { reputation: -1, fatigue: 1 },
        log: "Jass's pragmatism bends the outcome."
      }
    ]
  },
  ending_peace: {
    title: "Ending: The Gentle Seal",
    isEnding: true,
    text: [
      "You weave Aegis Veil across the Spire, sealing the crystal without breaking it. The barrier melts into harmless light.",
      "Liora calls you a peer. Renn salutes you. Mira smiles through tears. Jass promises to fund your next study.",
      "The city remembers the day the wizard chose mercy."
    ],
    choices: [
      { text: "Play again.", next: "intro", effects: {} }
    ]
  },
  ending_shatter: {
    title: "Ending: The Shattered Song",
    isEnding: true,
    text: [
      "The prism explodes, raining crystal dust. The barrier falls, but the Spire is scarred and the city trembles.",
      "Renn rebuilds the guard, Liora mourns lost knowledge, and Jass profits from the chaos.",
      "You saved the city quickly, but the song of the Spire is gone."
    ],
    choices: [
      { text: "Play again.", next: "intro", effects: {} }
    ]
  },
  ending_archive: {
    title: "Ending: The Archivist's Pact",
    isEnding: true,
    text: [
      "You channel the ritual into a quiet pact. The crystal becomes a gate, not a wall.",
      "Liora records your name among the city's guardians."
    ],
    choices: [
      { text: "Play again.", next: "intro", effects: {} }
    ]
  },
  ending_guard: {
    title: "Ending: The Captain's Oath",
    isEnding: true,
    text: [
      "You sever the ritual's excess with a swift command. The barrier becomes a watchful ward.",
      "Renn names you protector of the west gate, and the people cheer your decisiveness."
    ],
    choices: [
      { text: "Play again.", next: "intro", effects: {} }
    ]
  },
  ending_healer: {
    title: "Ending: The Healer's Light",
    isEnding: true,
    text: [
      "You rewrite the ritual into a gentle rain of mana that heals fatigue across the city.",
      "Mira begins a new order of kind-hearted spellcasters, and you become their first mentor."
    ],
    choices: [
      { text: "Play again.", next: "intro", effects: {} }
    ]
  },
  ending_merchant: {
    title: "Ending: The Merchant's Bargain",
    isEnding: true,
    text: [
      "You redirect the ritual into steady commerce. The barrier lifts, and trade flourishes.",
      "Jass names you partner, while Liora remains wary of the price of prosperity."
    ],
    choices: [
      { text: "Play again.", next: "intro", effects: {} }
    ]
  }
};

const defaultState = {
  sceneId: "intro",
  mana: 8,
  fatigue: 0,
  reputation: 2,
  log: []
};

let state = { ...defaultState };

const elements = {
  mana: document.getElementById("mana"),
  fatigue: document.getElementById("fatigue"),
  reputation: document.getElementById("reputation"),
  sceneTitle: document.getElementById("scene-title"),
  sceneText: document.getElementById("scene-text"),
  choices: document.getElementById("choices"),
  logEntries: document.getElementById("log-entries"),
  newGame: document.getElementById("new-game"),
  continueGame: document.getElementById("continue-game")
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const addLog = (message) => {
  state.log.unshift({ message, time: new Date().toLocaleTimeString() });
  state.log = state.log.slice(0, 12);
};

const rollDice = (sides) => {
  return Math.floor(Math.random() * sides) + 1;
};

const saveGame = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const loadGame = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return false;
  }
  try {
    state = { ...defaultState, ...JSON.parse(saved) };
    return true;
  } catch (error) {
    console.error("Failed to parse save data", error);
    return false;
  }
};

const resetGame = () => {
  state = { ...defaultState };
  addLog("A new story begins.");
  renderScene(state.sceneId);
};

const updateResources = () => {
  elements.mana.textContent = state.mana;
  elements.fatigue.textContent = state.fatigue;
  elements.reputation.textContent = state.reputation;
};

const renderLog = () => {
  elements.logEntries.innerHTML = state.log
    .map((entry) => `<p><strong>${entry.time}</strong> — ${entry.message}</p>`)
    .join("");
};

const isChoiceAvailable = (requirements = {}) => {
  const { minMana, minReputation, maxFatigue } = requirements;
  if (minMana !== undefined && state.mana < minMana) {
    return "Not enough mana.";
  }
  if (minReputation !== undefined && state.reputation < minReputation) {
    return "Reputation too low.";
  }
  if (maxFatigue !== undefined && state.fatigue > maxFatigue) {
    return "Too fatigued.";
  }
  return null;
};

const applyEffects = (effects = {}) => {
  state.mana = clamp(state.mana + (effects.mana || 0), 0, 12);
  state.fatigue = clamp(state.fatigue + (effects.fatigue || 0), 0, 10);
  state.reputation = clamp(state.reputation + (effects.reputation || 0), -5, 10);
};

const handleRoll = (roll) => {
  if (!roll) {
    return null;
  }
  const value = rollDice(roll.sides);
  const success = value >= roll.threshold;
  addLog(`Roll d${roll.sides}: ${value} (${success ? "success" : "strain"}).`);
  return success ? roll.success : roll.fail;
};

const applyChoice = (choice) => {
  if (!choice) {
    return;
  }
  if (choice.log) {
    addLog(choice.log);
  }

  if (choice.roll) {
    const outcome = handleRoll(choice.roll);
    if (outcome === "supplies") {
      addLog("Jass grants you a pouch of mana crystals (+2 mana).");
      applyEffects({ mana: 2, reputation: 1 });
    }
    if (outcome === "debts") {
      addLog("Jass expects payment later (-1 reputation).");
      applyEffects({ reputation: -1 });
    }
    if (outcome === "clear") {
      addLog("The ferry ride is smooth, leaving you clear-headed.");
      applyEffects({ fatigue: -1 });
    }
    if (outcome === "blur") {
      addLog("Your memory returns in fragments (-1 mana).");
      applyEffects({ mana: -1 });
    }
    if (outcome === "clean win") {
      addLog("The guild applauds your restraint (+1 reputation).");
      applyEffects({ reputation: 1 });
    }
    if (outcome === "scraped") {
      addLog("The duel leaves you tired (+1 fatigue).");
      applyEffects({ fatigue: 1 });
    }
    if (outcome === "stunned") {
      addLog("Solren yields with respect (+1 reputation).");
      applyEffects({ reputation: 1 });
    }
    if (outcome === "injury") {
      addLog("You take a hard hit (+2 fatigue).");
      applyEffects({ fatigue: 2 });
    }
    if (outcome === "respect") {
      addLog("A calm defense earns quiet approval (+1 reputation).");
      applyEffects({ reputation: 1 });
    }
    if (outcome === "draw") {
      addLog("The duel ends in a draw, costing time (+1 fatigue).");
      applyEffects({ fatigue: 1 });
    }
    if (outcome === "shortcut") {
      addLog("You find a shortcut through the maze (-1 fatigue).");
      applyEffects({ fatigue: -1 });
    }
    if (outcome === "lost") {
      addLog("You lose time in the maze (+1 fatigue).");
      applyEffects({ fatigue: 1 });
    }
    if (outcome === "safe passage") {
      addLog("Families slip away safely (+1 reputation).");
      applyEffects({ reputation: 1 });
    }
    if (outcome === "stampede") {
      addLog("The crowd surges, leaving you drained (+1 fatigue).");
      applyEffects({ fatigue: 1 });
    }
  }

  applyEffects(choice.effects);
  state.sceneId = choice.next;
  renderScene(choice.next);
};

const renderScene = (sceneId) => {
  const scene = scenes[sceneId];
  if (!scene) {
    elements.sceneTitle.textContent = "Lost in the Story";
    elements.sceneText.innerHTML =
      "<p>The tale falters; a page is missing. Start a new game to reset the story.</p>";
    elements.choices.innerHTML = "";
    return;
  }

  elements.sceneTitle.textContent = scene.title;
  elements.sceneText.innerHTML = scene.text.map((line) => `<p>${line}</p>`).join("");
  elements.choices.innerHTML = "";

  scene.choices.forEach((choice) => {
    const hint = isChoiceAvailable(choice.requirements);
    const button = document.createElement("button");
    button.className = "choice-button";
    button.type = "button";
    button.textContent = choice.text;
    if (hint) {
      button.disabled = true;
      const hintSpan = document.createElement("span");
      hintSpan.className = "choice-hint";
      hintSpan.textContent = hint;
      button.appendChild(hintSpan);
    }
    button.addEventListener("click", () => applyChoice(choice));
    elements.choices.appendChild(button);
  });

  updateResources();
  renderLog();
  saveGame();
};

const displaySpellbook = () => {
  const spellLines = Object.values(spells)
    .map((spell) =>
      `<p><strong>${spell.name}</strong> — Mana ${spell.cost}, ` +
      `Fatigue ${spell.fatigue}, Reputation ${spell.reputation}. ${spell.description}</p>`
    )
    .join("");
  addLog("Spellbook refreshed.");
  elements.logEntries.innerHTML = spellLines + elements.logEntries.innerHTML;
};

const init = () => {
  const hasSave = loadGame();
  elements.continueGame.disabled = !hasSave;
  elements.continueGame.addEventListener("click", () => {
    if (loadGame()) {
      addLog("You resume your journey.");
      renderScene(state.sceneId);
    }
  });

  elements.newGame.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    resetGame();
  });

  if (!hasSave) {
    addLog("The city waits for your first step.");
    renderScene(state.sceneId);
  } else {
    renderScene(state.sceneId);
  }

  displaySpellbook();
};

init();
