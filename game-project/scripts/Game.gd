extends Node3D

const SAVE_PATH := "user://savegame.json"

@export var day_length_seconds: float = 600.0
@export var safe_temp_minutes: float = 2.0

@onready var player: CharacterBody3D = $Player
@onready var inventory: Node = $Inventory
@onready var hud: CanvasLayer = $HUD
@onready var campfire_container: Node3D = $Campfires
@onready var objective_marker: MeshInstance3D = $ObjectiveMarker

var time_of_day: float = 20.5
var wind_factor: float = 0.15

var body_temp: float = 36.0
var hunger: float = 100.0
var thirst: float = 100.0
var fatigue: float = 0.0
var health: float = 100.0

var safe_temp_timer: float = 0.0
var autosave_timer: float = 0.0

var campfire_scene: PackedScene = preload("res://scenes/Campfire.tscn")
var campfire_instance: Campfire = null

const BASE_OBJECTIVES := [
	{"id": "sticks", "text": "Gather 5 sticks", "target": 5},
	{"id": "tinder", "text": "Gather 3 tinder", "target": 3},
	{"id": "craft", "text": "Craft campfire", "target": 1},
	{"id": "light", "text": "Light fire", "target": 1},
	{"id": "survive", "text": "Survive until morning", "target": 1},
]

var objectives: Array = []

func _ready() -> void:
	_reset_objectives()
	inventory.inventory_changed.connect(_on_inventory_changed)
	_update_hud()

func _process(delta: float) -> void:
	_update_time(delta)
	_update_needs(delta)
	_update_objectives(delta)
	_update_objective_marker()
	_update_hud()
	_autosave(delta)
	_check_game_state()

func _input(event: InputEvent) -> void:
	if event.is_action_pressed("interact"):
		_interact()
	if event.is_action_pressed("toggle_inventory"):
		hud.toggle_inventory()
	if event.is_action_pressed("toggle_crafting"):
		hud.toggle_crafting()
	if event.is_action_pressed("save_game"):
		save_game()
	if event.is_action_pressed("load_game"):
		load_game()

func _update_time(delta: float) -> void:
	time_of_day += (24.0 / day_length_seconds) * delta
	if time_of_day >= 24.0:
		time_of_day -= 24.0

func get_ambient_temperature() -> float:
	var day_factor: float = 0.5 - 0.5 * cos((time_of_day / 24.0) * TAU)
	return lerp(-30.0, -8.0, day_factor)

func _update_needs(delta: float) -> void:
	var ambient := get_ambient_temperature()
	var temp_delta := (ambient - body_temp) * 0.02
	if _is_near_fire():
		temp_delta += 0.12
	else:
		temp_delta -= wind_factor * 0.03
	body_temp = clamp(body_temp + temp_delta * delta * 60.0, -5.0, 40.0)

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
	var interactable: Node3D = player.get_interactable()
	if interactable and interactable.has_method("harvest"):
		var harvested: Dictionary = interactable.harvest()
		inventory.add_item(harvested.item_type, harvested.amount)
		return
	if campfire_instance and campfire_instance.global_position.distance_to(player.global_position) <= 3.0:
		if inventory.remove_item("Stick", 1):
			campfire_instance.add_fuel(30.0)
			hud.show_message("Added fuel")
		return

func _update_objectives(delta: float) -> void:
	var current: Dictionary = get_current_objective()
	if current.is_empty():
		return
	if current.id == "sticks" and inventory.get_count("Stick") >= current.target:
		advance_objective()
	if current.id == "tinder" and inventory.get_count("Tinder") >= current.target:
		advance_objective()
	if current.id == "craft" and inventory.get_count("CampfireKit") >= current.target:
		advance_objective()
	if current.id == "light" and campfire_instance and campfire_instance.is_lit:
		advance_objective()
	if current.id == "survive":
		if time_of_day >= 6.0 and time_of_day <= 10.0:
			advance_objective()
		if safe_temp_timer >= safe_temp_minutes * 60.0:
			advance_objective()

func _update_objective_marker() -> void:
	var current: Dictionary = get_current_objective()
	if current.is_empty():
		objective_marker.visible = false
		return
	var target: Node3D = null
	if current.id == "sticks":
		target = _nearest_resource("resource_stick")
	if current.id == "tinder":
		target = _nearest_resource("resource_tinder")
	if current.id == "light" and campfire_instance != null:
		target = campfire_instance
	if target == null:
		objective_marker.visible = false
		return
	objective_marker.visible = true
	objective_marker.global_position = target.global_position + Vector3(0, 2.2, 0)

func _nearest_resource(group_name: String) -> Node3D:
	var nearest: Node3D = null
	var nearest_dist: float = INF
	for node in get_tree().get_nodes_in_group(group_name):
		if node is Node3D:
			var dist: float = node.global_position.distance_to(player.global_position)
			if dist < nearest_dist:
				nearest_dist = dist
				nearest = node
	return nearest

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
		"prompt": _get_interact_prompt(),
		"inventory": inventory.items,
		"campfire": campfire_instance,
	})

func _get_status_effect() -> String:
	if body_temp <= 0.0:
		return "Freezing"
	if body_temp < 20.0:
		return "Cold"
	if body_temp >= 30.0:
		return "Warm"
	if fatigue > 80.0:
		return "Exhausted"
	return ""

func craft_campfire_kit() -> void:
	if inventory.get_count("Stick") >= 5 and inventory.get_count("Tinder") >= 3:
		inventory.remove_item("Stick", 5)
		inventory.remove_item("Tinder", 3)
		inventory.add_item("CampfireKit", 1)
		hud.show_message("Crafted campfire kit")

func place_campfire() -> void:
	if inventory.get_count("CampfireKit") <= 0:
		return
	if campfire_instance:
		return
	inventory.remove_item("CampfireKit", 1)
	campfire_instance = campfire_scene.instantiate() as Campfire
	campfire_container.add_child(campfire_instance)
	campfire_instance.global_position = player.global_position + player.global_transform.basis.z * 2.5
	campfire_instance.add_fuel(30.0)
	campfire_instance.fire_lit.connect(_on_fire_lit)
	campfire_instance.fuel_changed.connect(_on_fire_fuel_changed)

func light_fire() -> void:
	if campfire_instance == null:
		return
	campfire_instance.light_fire()

func add_fuel() -> void:
	if campfire_instance == null:
		return
	if inventory.remove_item("Stick", 1):
		campfire_instance.add_fuel(30.0)

func _check_game_state() -> void:
	if health <= 0.0 or body_temp <= 0.0:
		hud.show_message("You succumbed to the cold.")
		player.input_enabled = false
	if objectives.is_empty():
		hud.show_message("You survived the first night!")
		player.input_enabled = false

func _on_inventory_changed() -> void:
	_update_hud()

func _on_fire_lit() -> void:
	hud.show_message("Fire lit")

func _on_fire_fuel_changed() -> void:
	_update_hud()

func _autosave(delta: float) -> void:
	autosave_timer += delta
	if autosave_timer >= 30.0:
		autosave_timer = 0.0
		save_game()

func save_game() -> void:
	var data: Dictionary = {
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
		"fuel": campfire_instance.fuel,
		"is_lit": campfire_instance.is_lit,
	}

func _restore_campfire(state: Dictionary) -> void:
	_clear_campfire()
	campfire_instance = campfire_scene.instantiate() as Campfire
	campfire_container.add_child(campfire_instance)
	campfire_instance.global_position = _array_to_vector(state.get("position", _vector_to_array(player.global_position)))
	campfire_instance.fuel = state.get("fuel", 0.0)
	campfire_instance.is_lit = state.get("is_lit", false)
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
	var interactable: Node3D = player.get_interactable()
	if interactable != null and interactable.has_method("harvest"):
		return "Press E to gather"
	if campfire_instance and campfire_instance.global_position.distance_to(player.global_position) <= 3.0:
		return "Press E to add fuel"
	return ""

func _get_objective_distance() -> String:
	var current: Dictionary = get_current_objective()
	if current.is_empty():
		return ""
	if current.id == "sticks":
		return _distance_to_nearest("resource_stick")
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
