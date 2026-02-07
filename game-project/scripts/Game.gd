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

var world_seed: int = 0
var rng := RandomNumberGenerator.new()
var noise := FastNoiseLite.new()

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
	_initialize_world_seed()
	_generate_world()
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
			player.set_held_item(inventory.get_active_item())

func _initialize_world_seed() -> void:
	world_seed = int(Time.get_unix_time_from_system())

func _init_inventory() -> void:
	inventory.add_item("Axe", 1)
	inventory.add_item("FlintSteel", 1)
	inventory.set_active_hotbar(0)
	player.set_held_item(inventory.get_active_item())

func _update_time(delta: float) -> void:
	time_of_day += (24.0 / day_length_seconds) * delta
	if time_of_day >= 24.0:
		time_of_day -= 24.0

func get_ambient_temperature() -> float:
	var day_factor: float = 0.5 - 0.5 * cos((time_of_day / 24.0) * TAU)
	var base_temp := lerp(-32.0, -10.0, day_factor)
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
		temp_delta += 0.14
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
		var harvested: Dictionary = interactable.harvest()
		if harvested.is_empty():
			return
		resource_states["resources"][str(harvested.id)] = true
		inventory.add_item(harvested.item_type, harvested.amount)
		return
	if campfire_instance and campfire_instance.global_position.distance_to(player.global_position) <= 3.0:
		if inventory.remove_item("Stick", 1):
			campfire_instance.add_fuel(30.0)
			hud.show_message("Added fuel")
		return

func _on_player_attack() -> void:
	if not player.input_enabled:
		return
	if hud.is_modal_open():
		return
	if inventory.get_active_item() != "Axe":
		hud.show_message("Equip axe to chop")
		return
	var tree := _get_nearest_tree()
	if tree == null:
		return
	player.play_swing()
	var chopped := tree.chop(1)
	if chopped:
		_spawn_tree_drops(tree.global_position)

func _get_nearest_tree() -> Node:
	var nearest: Node = null
	var nearest_dist: float = 2.6
	for tree in get_tree().get_nodes_in_group("resource_tree"):
		if tree is Node3D and tree.has_method("can_chop"):
			if not tree.can_chop():
				continue
			var dist := tree.global_position.distance_to(player.global_position)
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

func _update_objectives(delta: float) -> void:
	var current: Dictionary = get_current_objective()
	if current.is_empty():
		return
	if current.id == "chop" and chopped_tree_count >= current.target:
		advance_objective()
	if current.id == "tinder" and inventory.get_count("Tinder") >= current.target:
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
	var result := space_state.intersect_ray(origin, to, [player])
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
	campfire_instance.add_fuel(30.0)
	campfire_instance.fire_lit.connect(_on_fire_lit)
	campfire_instance.fuel_changed.connect(_on_fire_fuel_changed)
	campfire_preview.queue_free()
	campfire_preview = null

func light_fire() -> void:
	if campfire_instance == null:
		return
	if inventory.get_count("FlintSteel") <= 0:
		hud.show_message("Need flint & steel")
		return
	if inventory.get_count("Tinder") <= 0:
		hud.show_message("Need tinder")
		return
	if campfire_instance.fuel <= 0.0:
		hud.show_message("Need fuel")
		return
	inventory.remove_item("Tinder", 1)
	campfire_instance.light_fire()

func add_fuel() -> void:
	if campfire_instance == null:
		return
	if inventory.remove_item("Stick", 1):
		campfire_instance.add_fuel(30.0)

func _check_game_state() -> void:
	if health <= 0.0 or body_temp <= -5.0:
		hud.show_message("You succumbed to the cold.")
		player.input_enabled = false
	if objectives.is_empty():
		hud.show_message("You survived the first night!")
		player.input_enabled = false

func _on_inventory_changed() -> void:
	_update_hud()
	player.set_held_item(inventory.get_active_item())

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
	if placing_campfire:
		return "Press E to place campfire"
	var interactable: Node3D = player.get_interactable()
	if interactable != null and interactable.has_method("harvest"):
		return "Press E to gather"
	var tree := _get_nearest_tree()
	if tree != null:
		return "LMB to chop"
	if campfire_instance and campfire_instance.global_position.distance_to(player.global_position) <= 3.0:
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
	if campfire_preview:
		campfire_preview.queue_free()
		campfire_preview = null
	placing_campfire = false

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
	var mesh := st.commit()
	ground_mesh.mesh = mesh
	var shape := HeightMapShape3D.new()
	shape.map_width = terrain_resolution + 1
	shape.map_depth = terrain_resolution + 1
	shape.map_data = heights
	shape.cell_size_x = step
	shape.cell_size_z = step
	ground_collision.shape = shape

func _spawn_environment() -> void:
	_spawn_trees(90)
	_spawn_rocks(40)
	_spawn_shrubs(50)
	_spawn_logs(12)
	_spawn_pickups("Stick", 20)
	_spawn_pickups("Tinder", 12)
	_spawn_pickups("Stone", 10)
	_spawn_saved_drops()

func _spawn_trees(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position()
		if position == Vector3.ZERO:
			continue
		var tree_id := _next_id()
		if resource_states["trees"].has(str(tree_id)):
			var state: Dictionary = resource_states["trees"][str(tree_id)]
			if state.get("fallen", false):
				continue
		var tree := tree_scene.instantiate()
		resource_root.add_child(tree)
		tree.global_position = position
		tree.tree_id = tree_id
		tree.chopped.connect(_on_tree_chopped)
		if resource_states["trees"].has(str(tree_id)):
			tree.apply_state(resource_states["trees"][str(tree_id)])

func _spawn_rocks(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position()
		if position == Vector3.ZERO:
			continue
		var body := StaticBody3D.new()
		var mesh_instance := MeshInstance3D.new()
		var mesh := SphereMesh.new()
		mesh.radius = rng.randf_range(0.4, 1.0)
		mesh_instance.mesh = mesh
		mesh_instance.scale = Vector3.ONE
		body.add_child(mesh_instance)
		var shape := SphereShape3D.new()
		shape.radius = mesh.radius
		var collision := CollisionShape3D.new()
		collision.shape = shape
		body.add_child(collision)
		body.global_position = position
		resource_root.add_child(body)

func _spawn_shrubs(count: int) -> void:
	for i in range(count):
		var position := _random_ground_position()
		if position == Vector3.ZERO:
			continue
		var body := StaticBody3D.new()
		var mesh_instance := MeshInstance3D.new()
		var mesh := SphereMesh.new()
		mesh.radius = rng.randf_range(0.25, 0.6)
		mesh_instance.mesh = mesh
		mesh_instance.scale = Vector3(1, 0.6, 1)
		body.add_child(mesh_instance)
		var shape := SphereShape3D.new()
		shape.radius = mesh.radius * 0.8
		var collision := CollisionShape3D.new()
		collision.shape = shape
		body.add_child(collision)
		body.global_position = position
		resource_root.add_child(body)

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
	mesh_instance.mesh = mesh
	var shape: Shape3D = SphereShape3D.new()
	if mesh is CylinderMesh:
		var cyl := CylinderShape3D.new()
		cyl.radius = mesh.bottom_radius
		cyl.height = mesh.height
		shape = cyl
	else:
		var sph := SphereShape3D.new()
		sph.radius = (mesh as SphereMesh).radius
		shape = sph
	collision.shape = shape

func _random_ground_position() -> Vector3:
	var half := terrain_size * 0.5 - 4.0
	for attempt in range(12):
		var x := rng.randf_range(-half, half)
		var z := rng.randf_range(-half, half)
		if Vector2(x, z).distance_to(Vector2(lake_center.x, lake_center.z)) < lake_radius + 3.0:
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
	}
