extends Node3D

signal campfire_lit
signal campfire_extinguished

@export var heat_radius := 6.0
@export var fuel_burn_rate := 0.2
@export var light_base_energy := 1.8
@export var light_flicker_strength := 0.5

@onready var interact_area = $InteractArea
@onready var fire_particles = $FireParticles
@onready var smoke_particles = $SmokeParticles
@onready var fire_light = $FireLight
@onready var collider_body = $Collider

var fuel := 0.0
var tinder := 0.0
var is_lit := false
var is_preview := false

func _ready():
	add_to_group("campfires")
	add_to_group("place_blocker")
	if interact_area != null:
		interact_area.set_meta("campfire", self)
	_update_visuals()

func set_preview(active: bool, can_place := true):
	is_preview = active
	if interact_area != null:
		interact_area.monitoring = not active
	if active:
		remove_from_group("campfires")
		remove_from_group("place_blocker")
		_set_collider_enabled(false)
	else:
		add_to_group("campfires")
		add_to_group("place_blocker")
		_set_collider_enabled(true)
	_set_preview_material(can_place)
	if active:
		fire_particles.emitting = false
		smoke_particles.emitting = false
		fire_light.light_energy = 0.0

func _set_collider_enabled(enabled: bool):
	if collider_body == null:
		return
	collider_body.collision_layer = 1 if enabled else 0
	collider_body.collision_mask = 1 if enabled else 0
	for child in collider_body.get_children():
		if child is CollisionShape3D:
			child.disabled = not enabled

func _set_preview_material(can_place: bool):
	var color = Color(0.2, 0.8, 0.3, 0.5) if can_place else Color(0.9, 0.2, 0.2, 0.5)
	for child in get_children():
		if child is MeshInstance3D:
			var material = StandardMaterial3D.new()
			material.albedo_color = color
			material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			child.material_override = material

func add_fuel(amount: float):
	fuel = max(fuel + amount, 0.0)

func add_tinder(amount: float):
	tinder = max(tinder + amount, 0.0)

func can_light() -> bool:
	return fuel > 0.0 and tinder > 0.0 and not is_lit

func light_fire():
	if not can_light():
		return
	is_lit = true
	_update_visuals()
	emit_signal("campfire_lit")

func extinguish():
	if not is_lit:
		return
	is_lit = false
	_update_visuals()
	emit_signal("campfire_extinguished")

func _process(delta):
	if is_preview:
		return
	if is_lit:
		fuel = max(fuel - fuel_burn_rate * delta, 0.0)
		if fuel <= 0.0:
			extinguish()
		_update_visuals()
		_update_flicker(delta)

func _update_visuals():
	if fire_particles != null:
		fire_particles.emitting = is_lit
	if smoke_particles != null:
		smoke_particles.emitting = is_lit
	if fire_light != null:
		fire_light.light_energy = light_base_energy if is_lit else 0.0

func _update_flicker(_delta):
	if fire_light == null or not is_lit:
		return
	var flicker = randf_range(-light_flicker_strength, light_flicker_strength)
	fire_light.light_energy = max(light_base_energy + flicker, 0.0)

func get_heat_at_position(position: Vector3) -> float:
	if not is_lit:
		return 0.0
	var distance = position.distance_to(global_transform.origin)
	if distance > heat_radius:
		return 0.0
	return 1.0 - (distance / heat_radius)

func get_prompt_text(selected_item: String, inventory) -> String:
	if is_preview:
		return ""
	if selected_item == "flint_steel":
		if can_light():
			return "E: Light campfire"
		return "Needs tinder + fuel"
	if selected_item == "tinder":
		return "E: Add tinder" if inventory.get_count("tinder") > 0 else "Need tinder"
	if selected_item == "log":
		return "E: Add log" if inventory.get_count("log") > 0 else "Need log"
	if selected_item == "stick":
		return "E: Add sticks" if inventory.get_count("stick") > 0 else "Need sticks"
	return "E: Manage campfire"

func interact(selected_item: String, inventory):
	if inventory == null:
		return
	if selected_item == "flint_steel":
		if can_light():
			light_fire()
			var toast = get_tree().get_first_node_in_group("toast")
			if toast != null:
				toast.show_toast("Campfire lit")
		return
	if selected_item == "tinder" and inventory.get_count("tinder") > 0:
		inventory.remove_item("tinder", 1)
		add_tinder(1)
		_show_toast("Added tinder")
		return
	if selected_item == "log" and inventory.get_count("log") > 0:
		inventory.remove_item("log", 1)
		add_fuel(2.5)
		_show_toast("Added log")
		return
	if selected_item == "stick" and inventory.get_count("stick") > 0:
		inventory.remove_item("stick", 2)
		add_fuel(1.2)
		_show_toast("Added sticks")
		return

func _show_toast(message: String):
	var toast = get_tree().get_first_node_in_group("toast")
	if toast != null:
		toast.show_toast(message)

func get_save_data() -> Dictionary:
	return {
		"position": global_transform.origin,
		"fuel": fuel,
		"tinder": tinder,
		"is_lit": is_lit
	}

func load_save_data(data: Dictionary):
	if data.has("position"):
		global_transform.origin = data["position"]
	if data.has("fuel"):
		fuel = float(data["fuel"])
	if data.has("tinder"):
		tinder = float(data["tinder"])
	if data.has("is_lit"):
		is_lit = data["is_lit"]
	_update_visuals()
