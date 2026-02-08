extends Node3D

const SAVE_PATH := "user://savegame.json"

@export var day_length_seconds: float = 600.0
@export var safe_temp_minutes: float = 2.0
@export var terrain_size: float = 120.0
@export var terrain_resolution: int = 100
@export var lake_center: Vector3 = Vector3(0, 0, -20)
@export var lake_radius: float = 18.0

@onready var player: CharacterBody3D = $Player
@onready var inventory: Node = $Inventory
@onready var hud: CanvasLayer = $HUD
@onready var campfire_container: Node3D = $Campfires
@onready var resource_root: Node3D = $ResourceRoot
@onready var ground_mesh: MeshInstance3D = $Ground/MeshInstance3D
@onready var ground_collision: CollisionShape3D = $Ground/CollisionShape3D
@onready var water_mesh: MeshInstance3D = $Water
@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var snow_particles: GPUParticles3D = $Weather/SnowParticles
@onready var cloud_root: Node3D = $Clouds

var time_of_day: float = 20.5
var wind_factor: float = 0.15
var weather_state: String = "clear"
var weather_timer: float = 0.0

var body_temp: float = 36.0
var hunger: float = 100.0
var thirst: float = 100.0
var fatigue: float = 0.0
var health: float = 100.0

var safe_temp_timer: float = 0.0
var autosave_timer: float = 0.0

var campfire_scene: PackedScene = preload("res://scenes/Campfire.tscn")
var tree_scene: PackedScene = preload("res://scenes/Tree.tscn")
var pickup_scene: PackedScene = preload("res://scenes/Pickup.tscn")

var campfire_instance: Campfire = null
var campfire_preview: Node3D = null
var placing_campfire: bool = false
var campfire_preview_rot: float = 0.0

var world_seed: int = 0
var rng := RandomNumberGenerator.new()
var noise := FastNoiseLite.new()
var recipes: Array = []

var resource_states := {
	"trees": {},
	"resources": {},
	"drops": []
}
var next_resource_id: int = 0

const BASE_OBJECTIVES := [
	{"id": "chop", "text": "Chop wood", "target": 1},
	{"id": "tinder", "text": "Gather tinder", "target": 3},
	{"id": "craft", "text": "Craft campfire", "target": 1},
	{"id": "place", "text": "Place campfire", "target": 1},
	{"id": "light", "text": "Light fire", "target": 1},
	{"id": "survive", "text": "Stay warm until morning", "target": 1},
]

var objectives: Array = []
var chopped_tree_count: int = 0

func _ready() -> void:
	_reset_objectives()
	inventory.inventory_changed.connect(_on_inventory_changed)
	player.attack_pressed.connect(_on_player_attack)
	_init_inventory()
	_load_recipes()
	_initialize_world_seed()
	_generate_world()
	hud.set_recipes(recipes)
	_update_hud()

func _process(delta: float) -> void:
	_update_time(delta)
	_update_weather(delta)
	_update_needs(delta)
	_update_objectives(delta)
	_update_hud()
	_autosave(delta)
	_update_campfire_preview()
	_update_weather_follow()
	_check_game_state()

func _input(event: InputEvent) -> void:
	if event.is_action_pressed("interact"):
		_interact()
	if event.is_action_pressed("use_item"):
		_use_active_item()
	if event.is_action_pressed("toggle_inventory"):
		hud.toggle_inventory()
	if event.is_action_pressed("toggle_crafting"):
		hud.toggle_crafting()
	if event.is_action_pressed("toggle_hints"):
		hud.toggle_hints()
	if event.is_action_pressed("toggle_debug"):
		hud.toggle_debug()
	if event.is_action_pressed("save_game"):
		save_game()
	if event.is_action_pressed("load_game"):
		load_game()
	for index in range(6):
		if event.is_action_pressed("hotbar_%d" % (index + 1)):
			inventory.set_active_hotbar(index)
			var active_item: String = inventory.get_active_item()
			if active_item != "" and inventory.get_count(active_item) <= 0:
				hud.show_message("No %s in inventory" % inventory.get_item_label(active_item))
				player.set_held_item("")
			else:
				player.set_held_item(active_item)
	if placing_campfire:
		if event.is_action_pressed("rotate_left"):
			_rotate_campfire_preview(-15.0)
		if event.is_action_pressed("rotate_right"):
			_rotate_campfire_preview(15.0)

func _initialize_world_seed() -> void:
	world_seed = int(Time.get_unix_time_from_system())

func _init_inventory() -> void:
	inventory.add_item("FlintSteel", 1)
	inventory.set_active_hotbar(0)
	player.set_held_item(inventory.get_active_item())

func _load_recipes() -> void:
	var file := FileAccess.open("res://data/recipes.json", FileAccess.READ)
	if file == null:
		recipes = []
		return
	var data: Variant = JSON.parse_string(file.get_as_text())
	if typeof(data) != TYPE_DICTIONARY:
		recipes = []
		return
	var recipe_data: Dictionary = data
	recipes = recipe_data.get("recipes", [])

func _update_time(delta: float) -> void:
	time_of_day += (24.0 / day_length_seconds) * delta
	if time_of_day >= 24.0:
		time_of_day -= 24.0

func get_ambient_temperature() -> float:
	var day_factor: float = 0.5 - 0.5 * cos((time_of_day / 24.0) * TAU)
	var base_temp: float = lerp(-32.0, -10.0, day_factor)
	if weather_state == "snow":
		base_temp -= 4.0
	if weather_state == "windy":
		base_temp -= 2.0
	return base_temp

func _update_weather(delta: float) -> void:
	weather_timer += delta
	if weather_timer >= 90.0:
		weather_timer = 0.0
		var roll := rng.randi_range(0, 2)
		weather_state = ["clear", "snow", "windy"][roll]
	_apply_weather_visuals()

func _apply_weather_visuals() -> void:
	world_environment.environment.adjustment_enabled = true
	world_environment.environment.adjustment_brightness = 1.05
	world_environment.environment.adjustment_contrast = 1.05
	world_environment.environment.adjustment_saturation = 1.1
	if weather_state == "snow":
		wind_factor = 0.25
		snow_particles.emitting = true
		world_environment.environment.fog_density = 0.035
		world_environment.environment.background_color = Color(0.68, 0.76, 0.86, 1.0)
	elif weather_state == "windy":
		wind_factor = 0.35
		snow_particles.emitting = false
		world_environment.environment.fog_density = 0.03
		world_environment.environment.background_color = Color(0.6, 0.7, 0.82, 1.0)
	else:
		wind_factor = 0.12
		snow_particles.emitting = false
		world_environment.environment.fog_density = 0.02
		world_environment.environment.background_color = Color(0.62, 0.72, 0.82, 1.0)

func _update_weather_follow() -> void:
	snow_particles.global_position = player.global_position + Vector3(0, 12, 0)

func _update_needs(delta: float) -> void:
	var ambient := get_ambient_temperature()
	var temp_delta := (ambient - body_temp) * 0.02
	if _is_near_fire():
		temp_delta += campfire_instance.heat_strength * 0.01
	else:
		temp_delta -= wind_factor * 0.05
	body_temp = clamp(body_temp + temp_delta * delta * 60.0, -10.0, 40.0)

	hunger = clamp(hunger - delta * 0.6, 0.0, 100.0)
	thirst = clamp(thirst - delta * 0.8, 0.0, 100.0)
	fatigue = clamp(fatigue + delta * 0.4, 0.0, 100.0)

	var fatigue_penalty := 1.0 - (fatigue / 140.0)
	player.move_speed = 6.0 * fatigue_penalty

	if hunger <= 0.0 or thirst <= 0.0:
		health = clamp(health - delta * 1.2, 0.0, 100.0)

	if body_temp <= 0.0:
		health = clamp(health - delta * 2.4, 0.0, 100.0)

	if body_temp >= 30.0:
		safe_temp_timer += delta
	else:
		safe_temp_timer = 0.0

func _is_near_fire() -> bool:
	if campfire_instance == null:
		return false
	if not campfire_instance.is_lit:
		return false
	var dist: float = campfire_instance.global_position.distance_to(player.global_position)
	return dist <= campfire_instance.heat_radius

func _interact() -> void:
	if hud.is_modal_open():
		return
	if placing_campfire:
		_confirm_campfire_placement()
		return
	var interactable: Node3D = player.get_interactable()
	if interactable and interactable.has_method("harvest"):
		var active_item: String = inventory.get_active_item()
		if interactable.has_method("can_harvest"):
			if active_item != "" and inventory.get_count(active_item) <= 0:
				active_item = ""
			if not interactable.can_harvest(active_item):
				hud.show_message("Need the right tool")
				return
		var harvested: Dictionary = interactable.harvest()
		if harvested.is_empty():
			return
		var resource_id := str(harvested.get("id", -1))
		if resource_id != "-1":
			resource_states["resources"][resource_id] = true
		var item_type := str(harvested.get("item_type", ""))
		var amount := int(harvested.get("amount", 0))
		if item_type != "" and amount > 0:
			inventory.add_item(item_type, amount)
			hud.show_message("+%d %s" % [amount, inventory.get_item_label(item_type)])
		return
	if campfire_instance and campfire_instance.global_position.distance_to(player.global_position) <= 3.0:
		if _try_add_campfire_tinder():
			return
		if _try_add_campfire_fuel():
			return
		return

func _on_player_attack() -> void:
	if not player.input_enabled:
		return
	if hud.is_modal_open():
		return
	var active_item: String = inventory.get_active_item()
	if active_item != "Axe" and active_item != "StoneAxe":
		hud.show_message("Equip axe to chop")
		return
	if inventory.get_count(active_item) <= 0:
		hud.show_message("You don't have that tool")
		return
	var tree := _get_nearest_tree()
	if tree == null:
		return
	player.play_swing()
	var chopped: bool = tree.chop(1)
	if chopped:
		_spawn_tree_drops(tree.global_position)

func _get_nearest_tree() -> Node:
	var nearest: Node = null
	var nearest_dist: float = 2.6
	for tree in get_tree().get_nodes_in_group("resource_tree"):
		if tree is Node3D and tree.has_method("can_chop"):
			if not tree.can_chop():
				continue
			var dist: float = tree.global_position.distance_to(player.global_position)
			if dist < nearest_dist:
				nearest_dist = dist
				nearest = tree
	return nearest

func _spawn_tree_drops(origin: Vector3) -> void:
	chopped_tree_count += 1
	_spawn_pickup("Log", 1, origin + Vector3(0.5, 0.2, 0.2), true)
	_spawn_pickup("Log", 1, origin + Vector3(-0.4, 0.2, -0.3), true)
	_spawn_pickup("Stick", 2, origin + Vector3(0.3, 0.2, -0.6), true)
	inventory.inventory_changed.emit()

func _update_objectives(_delta: float) -> void:
	var current: Dictionary = get_current_objective()
	if current.is_empty():
		return
	if current.id == "chop" and chopped_tree_count >= current.target:
		advance_objective()
	if current.id == "tinder" and (inventory.get_count("Tinder") + inventory.get_count("Kindling")) >= current.target:
		advance_objective()
	if current.id == "craft" and inventory.get_count("CampfireKit") >= current.target:
		advance_objective()
	if current.id == "place" and campfire_instance != null:
		advance_objective()
	if current.id == "light" and campfire_instance and campfire_instance.is_lit:
		advance_objective()
	if current.id == "survive":
		if time_of_day >= 6.0 and time_of_day <= 10.0:
			advance_objective()
		if safe_temp_timer >= safe_temp_minutes * 60.0:
			advance_objective()

func get_current_objective() -> Dictionary:
	if objectives.is_empty():
		return {}
	return objectives[0]

func advance_objective() -> void:
	if objectives.is_empty():
		return
	objectives.remove_at(0)

func _reset_objectives(start_index: int = 0) -> void:
	objectives = BASE_OBJECTIVES.duplicate(true)
	for index in range(start_index):
		if objectives.is_empty():
			return
		objectives.remove_at(0)

func _update_hud() -> void:
	hud.update_hud({
		"time": time_of_day,
		"ambient": get_ambient_temperature(),
		"wind": wind_factor,
		"body_temp": body_temp,
		"health": health,
		"hunger": hunger,
		"thirst": thirst,
		"fatigue": fatigue,
		"status": _get_status_effect(),
		"objective": get_current_objective(),
		"objective_distance": _get_objective_distance(),
		"objectives_list": objectives,
		"prompt": _get_interact_prompt(),
		"inventory": inventory.items,
		"campfire": campfire_instance,
		"campfire_fuel": campfire_instance.fuel if campfire_instance else 0.0,
		"campfire_max_fuel": campfire_instance.max_fuel if campfire_instance else 0.0,
		"campfire_tinder": campfire_instance.tinder if campfire_instance else 0,
		"hotbar": inventory.hotbar,
		"active_hotbar": inventory.active_hotbar_index,
		"weather": weather_state,
		"seed": world_seed,
		"debug": {
			"fps": Engine.get_frames_per_second(),
			"tree_count": get_tree().get_nodes_in_group("resource_tree").size(),
			"resource_count": get_tree().get_nodes_in_group("resource").size(),
		}
	})

func _get_status_effect() -> String:
	if _is_near_fire():
		return "Warming"
	if body_temp <= 0.0:
		return "Freezing"
	if body_temp < 20.0:
		return "Cold"
	if body_temp >= 30.0:
		return "Warm"
	if fatigue > 80.0:
		return "Exhausted"
	if hunger > 70.0 and thirst > 70.0:
		return "Well Fed"
	return ""

func craft_campfire_kit() -> void:
	if inventory.get_count("Stick") >= 5 and inventory.get_count("Tinder") >= 3:
		inventory.remove_item("Stick", 5)
		inventory.remove_item("Tinder", 3)
		inventory.add_item("CampfireKit", 1)
		hud.show_message("Crafted campfire kit")

func craft_recipe(recipe_id: String, quantity: int) -> void:
	var recipe := _get_recipe_by_id(recipe_id)
	if recipe.is_empty():
		return
	var max_qty: int = _get_max_craftable(recipe)
	if max_qty <= 0:
		hud.show_message("Missing ingredients")
		return
	var craft_qty: int = int(clamp(quantity, 1, max_qty))
	var requirements: Dictionary = recipe.get("requirements", {})
	for key in requirements.keys():
		inventory.remove_item(str(key), int(requirements[key]) * craft_qty)
	var outputs: Dictionary = recipe.get("outputs", {})
	for key in outputs.keys():
		inventory.add_item(str(key), int(outputs[key]) * craft_qty)
	hud.show_message("Crafted %s x%d" % [str(recipe.get("name", recipe_id)), craft_qty])

func _get_recipe_by_id(recipe_id: String) -> Dictionary:
	for recipe in recipes:
		if typeof(recipe) == TYPE_DICTIONARY and recipe.get("id", "") == recipe_id:
			return recipe
	return {}

func _get_max_craftable(recipe: Dictionary) -> int:
	var requirements: Dictionary = recipe.get("requirements", {})
	var max_qty: float = INF
	for key in requirements.keys():
		var need := int(requirements[key])
		if need <= 0:
			continue
		var available: int = inventory.get_count(str(key))
		max_qty = min(max_qty, int(floor(float(available) / float(need))))
	if max_qty == INF:
		return 0
	return int(max_qty)

func place_campfire() -> void:
	if inventory.get_count("CampfireKit") <= 0:
		return
	if campfire_instance:
		return
	placing_campfire = true
	_create_campfire_preview()
	hud.show_message("Place campfire (E to confirm)")

func _create_campfire_preview() -> void:
	if campfire_preview:
		campfire_preview.queue_free()
	campfire_preview = campfire_scene.instantiate() as Node3D
	campfire_preview.name = "CampfirePreview"
	campfire_preview.scale = Vector3.ONE * 1.05
	campfire_preview.rotation.y = campfire_preview_rot
	campfire_container.add_child(campfire_preview)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1, 0.7, 0.4, 0.4)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	for child in campfire_preview.get_children():
		if child is MeshInstance3D:
			child.material_override = mat
		if child is GPUParticles3D:
			child.emitting = false
		if child is OmniLight3D:
			child.visible = false

func _update_campfire_preview() -> void:
	if not placing_campfire or campfire_preview == null:
		return
	var space_state := get_world_3d().direct_space_state
	var origin := player.global_transform.origin + Vector3(0, 1.2, 0)
	var direction := -player.global_transform.basis.z
	var to := origin + direction * 8.0
	var query := PhysicsRayQueryParameters3D.create(origin, to)
	query.exclude = [player]
	var result := space_state.intersect_ray(query)
	if result:
		campfire_preview.global_position = result.position

func _confirm_campfire_placement() -> void:
	if campfire_preview == null:
		return
	placing_campfire = false
	inventory.remove_item("CampfireKit", 1)
	campfire_instance = campfire_scene.instantiate() as Campfire
	campfire_container.add_child(campfire_instance)
	campfire_instance.global_position = campfire_preview.global_position
	campfire_instance.rotation = campfire_preview.rotation
	campfire_instance.add_fuel(30.0)
	campfire_instance.fire_lit.connect(_on_fire_lit)
	campfire_instance.fuel_changed.connect(_on_fire_fuel_changed)
	campfire_preview.queue_free()
	campfire_preview = null

func _rotate_campfire_preview(amount: float) -> void:
	campfire_preview_rot += deg_to_rad(amount)
	if campfire_preview:
		campfire_preview.rotation.y = campfire_preview_rot

func light_fire() -> void:
	if campfire_instance == null:
		return
	if inventory.get_count("FlintSteel") <= 0:
		hud.show_message("Need flint & steel")
		return
	if not _has_tinder_available():
		hud.show_message("Need tinder")
		return
	if campfire_instance.fuel <= 0.0:
		hud.show_message("Need fuel")
		return
	_consume_tinder()
	campfire_instance.light_fire()

func add_fuel() -> void:
	if campfire_instance == null:
		return
	if _try_add_campfire_fuel():
		return

func _use_active_item() -> void:
	if not player.input_enabled:
		return
	if hud.is_modal_open():
		return
	var active_item: String = inventory.get_active_item()
	if active_item == "":
		hud.show_message("No item selected")
		return
	if inventory.get_count(active_item) <= 0:
		hud.show_message("You don't have that item")
		return
	if inventory.is_consumable(active_item):
		_consume_item(active_item)
		return
	if active_item == "FlintSteel":
		light_fire()
		return
	if active_item == "CampfireKit":
		place_campfire()
		return
	if active_item == "WaterFlask":
		hud.show_message("Flask is empty")
		return
	hud.show_message("Can't use that item")

func _consume_item(item_name: String) -> void:
	if item_name == "Berries":
		hunger = clamp(hunger + 8.0, 0.0, 100.0)
		inventory.remove_item("Berries", 1)
		hud.show_message("Ate berries")
		return
	if item_name == "Mushroom":
		hunger = clamp(hunger + 6.0, 0.0, 100.0)
		inventory.remove_item("Mushroom", 1)
		hud.show_message("Ate mushroom")
		return
	if item_name == "BerryMash":
		hunger = clamp(hunger + 14.0, 0.0, 100.0)
		inventory.remove_item("BerryMash", 1)
		hud.show_message("Ate berry mash")
		return

func _has_tinder_available() -> bool:
	if campfire_instance and campfire_instance.tinder > 0:
		return true
	return inventory.get_count("Tinder") > 0 or inventory.get_count("Kindling") > 0

func _consume_tinder() -> void:
	if campfire_instance and campfire_instance.tinder > 0:
		campfire_instance.tinder -= 1
		campfire_instance.refresh()
		return
	if inventory.get_count("Kindling") > 0:
		inventory.remove_item("Kindling", 1)
		return
	inventory.remove_item("Tinder", 1)

func _try_add_campfire_tinder() -> bool:
	if campfire_instance == null:
		return false
	var active_item: String = inventory.get_active_item()
	if active_item == "Tinder" or active_item == "Kindling":
		if inventory.remove_item(active_item, 1):
			campfire_instance.tinder += 1
			campfire_instance.refresh()
			hud.show_message("Added tinder")
			return true
	return false

func _try_add_campfire_fuel() -> bool:
	if campfire_instance == null:
		return false
	if inventory.remove_item("Log", 1):
		campfire_instance.add_fuel(60.0)
		hud.show_message("Added log")
		return true
	if inventory.remove_item("Stick", 1):
		campfire_instance.add_fuel(30.0)
		hud.show_message("Added stick")
		return true
	return false

func _check_game_state() -> void:
	if health <= 0.0 or body_temp <= -5.0:
		hud.show_message("You succumbed to the cold.")
		player.input_enabled = false
	if objectives.is_empty():
		hud.show_message("You survived the first night!")
		player.input_enabled = false

func _on_inventory_changed() -> void:
	_update_hud()
	var active_item: String = inventory.get_active_item()
	if active_item != "" and inventory.get_count(active_item) <= 0:
		player.set_held_item("")
	else:
		player.set_held_item(active_item)

func _on_fire_lit() -> void:
	hud.show_message("Fire lit")

func _on_fire_fuel_changed() -> void:
	_update_hud()

func _autosave(delta: float) -> void:
	autosave_timer += delta
	if autosave_timer >= 45.0:
		autosave_timer = 0.0
		save_game()

func save_game() -> void:
	var data: Dictionary = {
		"seed": world_seed,
		"player_pos": _vector_to_array(player.global_position),
		"time_of_day": time_of_day,
		"needs": {
			"body_temp": body_temp,
			"hunger": hunger,
			"thirst": thirst,
			"fatigue": fatigue,
			"health": health,
			"safe_timer": safe_temp_timer,
		},
		"inventory": inventory.to_dict(),
		"objective_index": _get_objective_index(),
		"campfire": campfire_instance != null,
		"campfire_state": _get_campfire_state(),
		"resource_states": resource_states,
		"next_resource_id": next_resource_id,
		"weather": weather_state,
		"chopped_count": chopped_tree_count,
	}
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(data))
		hud.show_message("Game saved")

func load_game() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		hud.show_message("No save found")
		return
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	var data: Variant = JSON.parse_string(file.get_as_text())
	if typeof(data) != TYPE_DICTIONARY:
		hud.show_message("Save data corrupted")
		return
	var data_dict: Dictionary = data
	world_seed = int(data_dict.get("seed", world_seed))
	resource_states = data_dict.get("resource_states", resource_states)
	_ensure_resource_state_keys()
	var saved_next_id := int(data_dict.get("next_resource_id", next_resource_id))
	next_resource_id = 0
	_generate_world()
	next_resource_id = saved_next_id
	player.global_position = _array_to_vector(data_dict.get("player_pos", _vector_to_array(player.global_position)))
	time_of_day = data_dict.get("time_of_day", time_of_day)
	var needs: Dictionary = data_dict.get("needs", {})
	body_temp = needs.get("body_temp", body_temp)
	hunger = needs.get("hunger", hunger)
	thirst = needs.get("thirst", thirst)
	fatigue = needs.get("fatigue", fatigue)
	health = needs.get("health", health)
	safe_temp_timer = needs.get("safe_timer", safe_temp_timer)
	inventory.from_dict(data_dict.get("inventory", {}))
	_reset_objectives(int(data_dict.get("objective_index", _get_objective_index())))
	weather_state = data_dict.get("weather", weather_state)
	_apply_weather_visuals()
	chopped_tree_count = int(data_dict.get("chopped_count", chopped_tree_count))
	if data_dict.get("campfire", false):
		_restore_campfire(data_dict.get("campfire_state", {}))
	else:
		_clear_campfire()
	_update_hud()
	player.input_enabled = true

func _get_campfire_state() -> Dictionary:
	if campfire_instance == null:
		return {}
	return {
		"position": _vector_to_array(campfire_instance.global_position),
		"rotation": _vector_to_array(campfire_instance.rotation),
		"fuel": campfire_instance.fuel,
		"is_lit": campfire_instance.is_lit,
		"tinder": campfire_instance.tinder,
	}

func _restore_campfire(state: Dictionary) -> void:
	_clear_campfire()
	campfire_instance = campfire_scene.instantiate() as Campfire
	campfire_container.add_child(campfire_instance)
	campfire_instance.global_position = _array_to_vector(state.get("position", _vector_to_array(player.global_position)))
	campfire_instance.rotation = _array_to_vector(state.get("rotation", [0, 0, 0]))
	campfire_instance.fuel = state.get("fuel", 0.0)
	campfire_instance.is_lit = state.get("is_lit", false)
	campfire_instance.tinder = int(state.get("tinder", 0))
	campfire_instance.fire_lit.connect(_on_fire_lit)
	campfire_instance.fuel_changed.connect(_on_fire_fuel_changed)
	campfire_instance.refresh()

func _clear_campfire() -> void:
	if campfire_instance:
		campfire_instance.queue_free()
		campfire_instance = null

func _get_interact_prompt() -> String:
	if hud.is_modal_open():
		return ""
	if placing_campfire:
		return "Press E to place campfire"
	var interactable: Node3D = player.get_interactable()
	if interactable != null and interactable.has_method("harvest"):
		return "Press E to gather"
	var tree := _get_nearest_tree()
	if tree != null:
		return "LMB to chop"
	if campfire_instance and campfire_instance.global_position.distance_to(player.global_position) <= 3.0:
		var active_item: String = inventory.get_active_item()
		if active_item == "Tinder" or active_item == "Kindling":
			return "Press E to add tinder"
		return "Press E to add fuel"
	return ""

func _get_objective_distance() -> String:
	var current: Dictionary = get_current_objective()
	if current.is_empty():
		return ""
	if current.id == "tinder":
		return _distance_to_nearest("resource_tinder")
	if current.id == "light" and campfire_instance != null:
		return "Campfire: %.1f m" % campfire_instance.global_position.distance_to(player.global_position)
	return ""

func _distance_to_nearest(group_name: String) -> String:
	var nearest: float = INF
	for node in get_tree().get_nodes_in_group(group_name):
		if node is Node3D:
			var dist: float = node.global_position.distance_to(player.global_position)
			if dist < nearest:
				nearest = dist
	if nearest == INF:
		return ""
	return "Nearest: %.1f m" % nearest

func _vector_to_array(value: Vector3) -> Array:
	return [value.x, value.y, value.z]

func _get_objective_index() -> int:
	return BASE_OBJECTIVES.size() - objectives.size()

func _array_to_vector(value: Variant) -> Vector3:
	if value is Array and value.size() == 3:
		return Vector3(value[0], value[1], value[2])
	return Vector3.ZERO

func _generate_world() -> void:
	_clear_world()
	_ensure_resource_state_keys()
	rng.seed = world_seed
	noise.seed = world_seed
	noise.frequency = 0.06
	_generate_terrain_mesh()
	_snap_player_to_ground()
	_spawn_environment()
	_spawn_clouds(18)
	_apply_weather_visuals()

func _snap_player_to_ground() -> void:
	var pos := player.global_position
	pos.y = _get_height_at(pos.x, pos.z) + 1.4
	player.global_position = pos

func _ensure_resource_state_keys() -> void:
	if not resource_states.has("trees"):
		resource_states["trees"] = {}
	if not resource_states.has("resources"):
		resource_states["resources"] = {}
	if not resource_states.has("drops"):
		resource_states["drops"] = []

func _clear_world() -> void:
	for child in resource_root.get_children():
		child.queue_free()
	for child in cloud_root.get_children():
		child.queue_free()
	if campfire_preview:
		campfire_preview.queue_free()
		campfire_preview = null
	placing_campfire = false
	campfire_preview_rot = 0.0

func _generate_terrain_mesh() -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var half := terrain_size * 0.5
	var step := terrain_size / float(terrain_resolution)
	var heights: PackedFloat32Array = PackedFloat32Array()
	for z in range(terrain_resolution + 1):
		for x in range(terrain_resolution + 1):
			var world_x := -half + x * step
			var world_z := -half + z * step
			var height := noise.get_noise_2d(world_x * 0.2, world_z * 0.2) * 2.2
			height += noise.get_noise_2d(world_x * 0.6, world_z * 0.6) * 0.6
			if Vector2(world_x, world_z).distance_to(Vector2(lake_center.x, lake_center.z)) < lake_radius:
				height -= 1.2
			heights.append(height)
	for z in range(terrain_resolution):
		for x in range(terrain_resolution):
			var i := z * (terrain_resolution + 1) + x
			var v00 := Vector3(-half + x * step, heights[i], -half + z * step)
			var v10 := Vector3(-half + (x + 1) * step, heights[i + 1], -half + z * step)
			var v01 := Vector3(-half + x * step, heights[i + terrain_resolution + 1], -half + (z + 1) * step)
			var v11 := Vector3(-half + (x + 1) * step, heights[i + terrain_resolution + 2], -half + (z + 1) * step)
			st.add_vertex(v00)
			st.add_vertex(v10)
			st.add_vertex(v11)
			st.add_vertex(v00)
			st.add_vertex(v11)
			st.add_vertex(v01)
	st.generate_normals()
	var mesh := st.commit()
	ground_mesh.mesh = mesh
	ground_mesh.material_override = _make_terrain_material()
	var shape := HeightMapShape3D.new()
	shape.map_width = terrain_resolution + 1
	shape.map_depth = terrain_resolution + 1
	shape.map_data = heights
	shape.cell_size = step
	ground_collision.shape = shape

func _make_terrain_material() -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = """
shader_type spatial;

uniform vec3 low_color : source_color = vec3(0.2, 0.5, 0.25);
uniform vec3 mid_color : source_color = vec3(0.35, 0.55, 0.3);
uniform vec3 high_color : source_color = vec3(0.85, 0.88, 0.9);
uniform vec3 rock_color : source_color = vec3(0.45, 0.45, 0.48);
uniform float snow_height = 1.5;
uniform float snow_blend = 1.0;
uniform float rock_slope = 0.55;

void fragment() {
	float height = VERTEX.y;
	float slope = 1.0 - abs(NORMAL.y);
	float snow = smoothstep(snow_height - snow_blend, snow_height + snow_blend, height);
	float rock = smoothstep(rock_slope, 0.95, slope);
	vec3 base = mix(low_color, mid_color, smoothstep(-1.5, 0.8, height));
	vec3 with_snow = mix(base, high_color, snow);
	ALBEDO = mix(with_snow, rock_color, rock);
	ROUGHNESS = 0.95;
}
"""
	var mat := ShaderMaterial.new()
	mat.shader = shader
	return mat

func _spawn_environment() -> void:
	_spawn_trees(140)
	_spawn_stone_nodes(22)
	_spawn_berry_bushes(26)
	_spawn_reed_clumps(24)
	_spawn_mushroom_clusters(18)
	_spawn_saplings(30)
	_spawn_bark_nodes(20)
	_spawn_stumps(14)
	_spawn_fallen_branches(16)
	_spawn_small_boulders(22)
	_spawn_shoreline_rocks(18)
	_spawn_driftwood(10)
	_spawn_deadwood_piles(10)
	_spawn_logs(12)
	_spawn_pickups("Stick", 10)
	_spawn_pickups("Tinder", 6)
	_spawn_pickups("Stone", 6)
	_spawn_saved_drops()

func _spawn_clouds(count: int) -> void:
	var cloud_mesh := SphereMesh.new()
	cloud_mesh.radius = 1.0
	var cloud_material := StandardMaterial3D.new()
	cloud_material.albedo_color = Color(1.0, 1.0, 1.0, 0.65)
	cloud_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	cloud_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	cloud_material.cull_mode = BaseMaterial3D.CULL_DISABLED
	var half := terrain_size * 0.55
	for i in range(count):
		var cloud := MeshInstance3D.new()
		cloud.mesh = cloud_mesh
		cloud.material_override = cloud_material
		var x := rng.randf_range(-half, half)
		var z := rng.randf_range(-half, half)
		var y := rng.randf_range(16.0, 24.0)
		cloud.position = Vector3(x, y, z)
		cloud.rotation.y = rng.randf_range(0.0, TAU)
		var scale := Vector3(
			rng.randf_range(4.0, 8.0),
			rng.randf_range(1.6, 3.0),
			rng.randf_range(4.0, 8.0)
		)
		cloud.scale = scale
		cloud_root.add_child(cloud)

func _spawn_trees(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position()
		if position == Vector3.ZERO:
			continue
		var tree_id := _next_id()
		if resource_states["trees"].has(str(tree_id)):
			var state: Dictionary = resource_states["trees"][str(tree_id)]
			if state.get("fallen", false) or state.get("chopped", false):
				continue
		var tree := tree_scene.instantiate()
		resource_root.add_child(tree)
		tree.global_position = position
		tree.tree_id = tree_id
		tree.chopped.connect(_on_tree_chopped)
		if resource_states["trees"].has(str(tree_id)):
			tree.apply_state(resource_states["trees"][str(tree_id)])

func _spawn_stone_nodes(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position()
		if position == Vector3.ZERO:
			continue
		_spawn_gatherable("Stone", rng.randi_range(2, 4), position, "stone_node", false, "StoneAxe", false)

func _spawn_berry_bushes(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position()
		if position == Vector3.ZERO:
			continue
		_spawn_gatherable("Berries", rng.randi_range(2, 4), position, "berry_bush", true)

func _spawn_reed_clumps(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position(true)
		if position == Vector3.ZERO:
			continue
		_spawn_gatherable("Fiber", rng.randi_range(2, 3), position, "reed_clump", true)

func _spawn_mushroom_clusters(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position()
		if position == Vector3.ZERO:
			continue
		_spawn_gatherable("Mushroom", rng.randi_range(1, 2), position, "mushroom_cluster", true)

func _spawn_saplings(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position()
		if position == Vector3.ZERO:
			continue
		_spawn_gatherable("Stick", rng.randi_range(1, 2), position, "sapling", true)

func _spawn_bark_nodes(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position()
		if position == Vector3.ZERO:
			continue
		_spawn_gatherable("Tinder", 1, position, "bark", false)

func _spawn_stumps(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position()
		if position == Vector3.ZERO:
			continue
		_spawn_prop(position, "stump")

func _spawn_fallen_branches(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position()
		if position == Vector3.ZERO:
			continue
		_spawn_prop(position, "fallen_branch")

func _spawn_small_boulders(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position()
		if position == Vector3.ZERO:
			continue
		_spawn_prop(position, "small_boulder")

func _spawn_shoreline_rocks(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position(true, true)
		if position == Vector3.ZERO:
			continue
		_spawn_prop(position, "shore_rock")

func _spawn_driftwood(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position(true, true)
		if position == Vector3.ZERO:
			continue
		_spawn_prop(position, "driftwood")

func _spawn_deadwood_piles(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position()
		if position == Vector3.ZERO:
			continue
		_spawn_prop(position, "deadwood_pile")

func _spawn_logs(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position()
		if position == Vector3.ZERO:
			continue
		var body := StaticBody3D.new()
		var mesh_instance := MeshInstance3D.new()
		var mesh := CylinderMesh.new()
		mesh.top_radius = 0.25
		mesh.bottom_radius = 0.28
		mesh.height = 2.0
		mesh_instance.mesh = mesh
		mesh_instance.rotation_degrees = Vector3(0, rng.randf_range(0, 360), 90)
		body.add_child(mesh_instance)
		var shape := CylinderShape3D.new()
		shape.radius = 0.28
		shape.height = 2.0
		var collision := CollisionShape3D.new()
		collision.shape = shape
		collision.rotation_degrees = Vector3(0, rng.randf_range(0, 360), 90)
		body.add_child(collision)
		body.global_position = position
		resource_root.add_child(body)

func _spawn_pickups(item_type: String, count: int) -> void:
	for i in range(count):
		var position := _random_ground_position()
		if position == Vector3.ZERO:
			continue
		_spawn_pickup(item_type, 1, position, false)

func _spawn_pickup(item_type: String, amount: int, position: Vector3, is_drop: bool) -> void:
	var resource_id := _next_id()
	if resource_states["resources"].has(str(resource_id)):
		return
	var pickup := pickup_scene.instantiate() as Area3D
	pickup.item_type = item_type
	pickup.amount = amount
	pickup.resource_id = resource_id
	resource_root.add_child(pickup)
	pickup.global_position = position
	_configure_pickup(pickup, item_type)
	if is_drop:
		resource_states["drops"].append({
			"id": resource_id,
			"item": item_type,
			"amount": amount,
			"position": _vector_to_array(position),
		})

func _spawn_gatherable(item_type: String, amount: int, position: Vector3, visual_type: String, sway: bool = false, required_tool: String = "", allow_bare_hands: bool = true) -> void:
	var resource_id := _next_id()
	if resource_states["resources"].has(str(resource_id)):
		return
	var pickup := pickup_scene.instantiate() as Area3D
	pickup.item_type = item_type
	pickup.amount = amount
	pickup.resource_id = resource_id
	pickup.sway_enabled = sway
	pickup.required_tool = required_tool
	pickup.allow_bare_hands = allow_bare_hands
	resource_root.add_child(pickup)
	pickup.global_position = position
	_configure_gatherable_visual(pickup, visual_type)

func _spawn_saved_drops() -> void:
	var drops: Array = resource_states.get("drops", [])
	for drop in drops:
		if typeof(drop) != TYPE_DICTIONARY:
			continue
		var resource_id := int(drop.get("id", _next_id()))
		if resource_states["resources"].has(str(resource_id)):
			continue
		var position := _array_to_vector(drop.get("position", [0, 0, 0]))
		var pickup := pickup_scene.instantiate() as Area3D
		pickup.item_type = drop.get("item", "Stick")
		pickup.amount = int(drop.get("amount", 1))
		pickup.resource_id = resource_id
		resource_root.add_child(pickup)
		pickup.global_position = position
		_configure_pickup(pickup, pickup.item_type)

func _configure_pickup(pickup: Area3D, item_type: String) -> void:
	var mesh_instance: MeshInstance3D = pickup.get_node("MeshInstance3D")
	var collision: CollisionShape3D = pickup.get_node("CollisionShape3D")
	var mesh: Mesh = SphereMesh.new()
	if item_type == "Stick":
		mesh = CylinderMesh.new()
		mesh.top_radius = 0.06
		mesh.bottom_radius = 0.08
		mesh.height = 0.7
		mesh_instance.rotation_degrees = Vector3(0, rng.randf_range(0, 360), 90)
	elif item_type == "Log":
		mesh = CylinderMesh.new()
		mesh.top_radius = 0.18
		mesh.bottom_radius = 0.2
		mesh.height = 1.1
		mesh_instance.rotation_degrees = Vector3(0, rng.randf_range(0, 360), 90)
	elif item_type == "Stone":
		mesh = SphereMesh.new()
		mesh.radius = 0.25
	elif item_type == "Tinder":
		mesh = SphereMesh.new()
		mesh.radius = 0.18
	elif item_type == "Berries":
		mesh = SphereMesh.new()
		mesh.radius = 0.2
	elif item_type == "Fiber":
		mesh = CylinderMesh.new()
		mesh.top_radius = 0.05
		mesh.bottom_radius = 0.06
		mesh.height = 0.6
		mesh_instance.rotation_degrees = Vector3(0, rng.randf_range(0, 360), 15)
	elif item_type == "Mushroom":
		mesh = CapsuleMesh.new()
		mesh.radius = 0.1
		mesh.height = 0.3
	mesh_instance.mesh = mesh
	_apply_item_material(mesh_instance, item_type)
	var shape: Shape3D = SphereShape3D.new()
	if mesh is CylinderMesh:
		var cyl := CylinderShape3D.new()
		cyl.radius = mesh.bottom_radius
		cyl.height = mesh.height
		shape = cyl
	elif mesh is CapsuleMesh:
		var cap := CapsuleShape3D.new()
		cap.radius = (mesh as CapsuleMesh).radius
		cap.height = (mesh as CapsuleMesh).height
		shape = cap
	elif mesh is BoxMesh:
		var box := BoxShape3D.new()
		box.size = (mesh as BoxMesh).size
		shape = box
	else:
		var sph := SphereShape3D.new()
		sph.radius = (mesh as SphereMesh).radius
		shape = sph
	collision.shape = shape

func _configure_gatherable_visual(pickup: Area3D, visual_type: String) -> void:
	var mesh_instance: MeshInstance3D = pickup.get_node("MeshInstance3D")
	var collision: CollisionShape3D = pickup.get_node("CollisionShape3D")
	var mesh: Mesh = SphereMesh.new()
	if visual_type == "berry_bush":
		var sphere := SphereMesh.new()
		sphere.radius = 0.35
		mesh = sphere
		mesh_instance.scale = Vector3(1.2, 0.8, 1.2)
	elif visual_type == "reed_clump":
		var cyl := CylinderMesh.new()
		cyl.top_radius = 0.06
		cyl.bottom_radius = 0.08
		cyl.height = 0.9
		mesh = cyl
		mesh_instance.scale = Vector3(1, 1.4, 1)
	elif visual_type == "mushroom_cluster":
		var cap := CapsuleMesh.new()
		cap.radius = 0.18
		cap.height = 0.4
		mesh = cap
		mesh_instance.scale = Vector3(1, 0.8, 1)
	elif visual_type == "sapling":
		var trunk := CylinderMesh.new()
		trunk.top_radius = 0.05
		trunk.bottom_radius = 0.08
		trunk.height = 1.2
		mesh = trunk
	elif visual_type == "bark":
		var box := BoxMesh.new()
		box.size = Vector3(0.35, 0.2, 0.1)
		mesh = box
	elif visual_type == "stone_node":
		var rock := SphereMesh.new()
		rock.radius = 0.35
		mesh = rock
	mesh_instance.mesh = mesh
	_apply_visual_material(mesh_instance, visual_type)
	var shape: Shape3D = SphereShape3D.new()
	if mesh is CylinderMesh:
		var cyl := CylinderShape3D.new()
		cyl.radius = (mesh as CylinderMesh).bottom_radius
		cyl.height = (mesh as CylinderMesh).height
		shape = cyl
	elif mesh is BoxMesh:
		var box_shape := BoxShape3D.new()
		box_shape.size = (mesh as BoxMesh).size
		shape = box_shape
	elif mesh is CapsuleMesh:
		var cap_shape := CapsuleShape3D.new()
		cap_shape.radius = (mesh as CapsuleMesh).radius
		cap_shape.height = (mesh as CapsuleMesh).height
		shape = cap_shape
	else:
		var sph := SphereShape3D.new()
		sph.radius = (mesh as SphereMesh).radius
		shape = sph
	collision.shape = shape

func _spawn_prop(position: Vector3, prop_type: String) -> void:
	var body := StaticBody3D.new()
	var mesh_instance := MeshInstance3D.new()
	var mesh: Mesh = null
	if prop_type == "stump":
		var cyl := CylinderMesh.new()
		cyl.top_radius = 0.4
		cyl.bottom_radius = 0.5
		cyl.height = 0.6
		mesh = cyl
	elif prop_type == "fallen_branch":
		var branch := CylinderMesh.new()
		branch.top_radius = 0.08
		branch.bottom_radius = 0.1
		branch.height = 1.6
		mesh = branch
		mesh_instance.rotation_degrees = Vector3(0, rng.randf_range(0, 360), 90)
	elif prop_type == "small_boulder":
		var rock := SphereMesh.new()
		rock.radius = rng.randf_range(0.5, 1.1)
		mesh = rock
	elif prop_type == "shore_rock":
		var shore := SphereMesh.new()
		shore.radius = rng.randf_range(0.35, 0.8)
		mesh = shore
	elif prop_type == "driftwood":
		var drift := CylinderMesh.new()
		drift.top_radius = 0.12
		drift.bottom_radius = 0.14
		drift.height = 2.0
		mesh = drift
		mesh_instance.rotation_degrees = Vector3(0, rng.randf_range(0, 360), 90)
	elif prop_type == "deadwood_pile":
		var pile := BoxMesh.new()
		pile.size = Vector3(0.9, 0.35, 0.7)
		mesh = pile
	if mesh == null:
		return
	mesh_instance.mesh = mesh
	_apply_visual_material(mesh_instance, prop_type)
	body.add_child(mesh_instance)
	var collision := CollisionShape3D.new()
	var shape: Shape3D = SphereShape3D.new()
	if mesh is CylinderMesh:
		var cyl_shape := CylinderShape3D.new()
		cyl_shape.radius = (mesh as CylinderMesh).bottom_radius
		cyl_shape.height = (mesh as CylinderMesh).height
		shape = cyl_shape
	elif mesh is BoxMesh:
		var box_shape := BoxShape3D.new()
		box_shape.size = (mesh as BoxMesh).size
		shape = box_shape
	else:
		var sph_shape := SphereShape3D.new()
		sph_shape.radius = (mesh as SphereMesh).radius
		shape = sph_shape
	collision.shape = shape
	body.add_child(collision)
	body.global_position = position
	resource_root.add_child(body)

func _apply_item_material(mesh_instance: MeshInstance3D, item_type: String) -> void:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = inventory.get_item_color(item_type)
	mat.roughness = 0.8
	mesh_instance.material_override = mat

func _apply_visual_material(mesh_instance: MeshInstance3D, visual_type: String) -> void:
	var mat := StandardMaterial3D.new()
	if visual_type == "berry_bush":
		mat.albedo_color = Color(0.15, 0.4, 0.2)
	elif visual_type == "reed_clump":
		mat.albedo_color = Color(0.25, 0.5, 0.2)
	elif visual_type == "mushroom_cluster":
		mat.albedo_color = Color(0.6, 0.45, 0.35)
	elif visual_type == "sapling":
		mat.albedo_color = Color(0.3, 0.4, 0.2)
	elif visual_type == "bark":
		mat.albedo_color = Color(0.4, 0.25, 0.15)
	elif visual_type == "stone_node":
		mat.albedo_color = Color(0.45, 0.46, 0.5)
	elif visual_type == "stump":
		mat.albedo_color = Color(0.4, 0.27, 0.18)
	elif visual_type == "fallen_branch":
		mat.albedo_color = Color(0.36, 0.24, 0.16)
	elif visual_type == "small_boulder":
		mat.albedo_color = Color(0.4, 0.4, 0.42)
	elif visual_type == "shore_rock":
		mat.albedo_color = Color(0.5, 0.5, 0.55)
	elif visual_type == "driftwood":
		mat.albedo_color = Color(0.55, 0.45, 0.3)
	elif visual_type == "deadwood_pile":
		mat.albedo_color = Color(0.35, 0.25, 0.15)
	else:
		mat.albedo_color = Color(0.5, 0.5, 0.5)
	mat.roughness = 0.9
	mesh_instance.material_override = mat

func _random_ground_position(near_water: bool = false, allow_shore: bool = false) -> Vector3:
	var half := terrain_size * 0.5 - 4.0
	for attempt in range(12):
		var x := rng.randf_range(-half, half)
		var z := rng.randf_range(-half, half)
		var distance := Vector2(x, z).distance_to(Vector2(lake_center.x, lake_center.z))
		if distance < lake_radius - 1.0:
			continue
		if not allow_shore and distance < lake_radius + 3.0:
			continue
		if near_water and distance > lake_radius + 7.0:
			continue
		var y := _get_height_at(x, z)
		return Vector3(x, y, z)
	return Vector3.ZERO

func _get_height_at(x: float, z: float) -> float:
	return noise.get_noise_2d(x * 0.2, z * 0.2) * 2.2 + noise.get_noise_2d(x * 0.6, z * 0.6) * 0.6

func _next_id() -> int:
	var id := next_resource_id
	next_resource_id += 1
	return id

func _on_tree_chopped(tree_id: int) -> void:
	resource_states["trees"][str(tree_id)] = {
		"fallen": true,
		"health": 0,
		"chopped": true,
	}
