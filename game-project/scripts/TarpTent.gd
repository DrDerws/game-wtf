extends Node3D

@export var shelter_radius := 2.0

@onready var shelter_area = $ShelterArea
@onready var collider_body = $Collider

var is_preview := false

func _ready():
	add_to_group("tents")
	add_to_group("place_blocker")
	if shelter_area != null:
		shelter_area.set_meta("tent", self)

func set_preview(active: bool, can_place := true):
	is_preview = active
	if shelter_area != null:
		shelter_area.monitoring = not active
	if active:
		remove_from_group("tents")
		remove_from_group("place_blocker")
		_set_collider_enabled(false)
	else:
		add_to_group("tents")
		add_to_group("place_blocker")
		_set_collider_enabled(true)
	_set_preview_material(can_place)

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

func is_position_sheltered(position: Vector3) -> bool:
	return position.distance_to(global_transform.origin) <= shelter_radius

func get_save_data() -> Dictionary:
	return {
		"position": global_transform.origin
	}

func load_save_data(data: Dictionary):
	if data.has("position"):
		global_transform.origin = data["position"]
