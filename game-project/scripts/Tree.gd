extends StaticBody3D

signal chopped(tree_id: int)

@export var max_health: int = 4
@export var tree_id: int = -1

var health: int
var is_fallen: bool = false
var chopped: bool = false

@onready var trunk: MeshInstance3D = $Trunk
@onready var leaves: MeshInstance3D = $Leaves

func _ready() -> void:
	health = max_health
	add_to_group("resource_tree")

func can_chop() -> bool:
	return not is_fallen

func chop(power: int = 1) -> bool:
	if is_fallen:
		return false
	health -= power
	if health <= 0:
		_fall()
		chopped.emit(tree_id)
		return true
	return false

func _fall() -> void:
	is_fallen = true
	chopped = true
	set_collision_layer_value(1, false)
	set_collision_mask_value(1, false)
	var tween := create_tween()
	var tilt_axis := Vector3(1, 0, 0)
	if randf() > 0.5:
		tilt_axis = Vector3(0, 0, 1)
	var target_rot := rotation + tilt_axis * deg_to_rad(85)
	tween.tween_property(self, "rotation", target_rot, 1.1).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	trunk.scale = Vector3(1, 1, 1)
	leaves.visible = false

func get_state() -> Dictionary:
	return {
		"health": health,
		"fallen": is_fallen,
		"chopped": chopped,
	}

func apply_state(state: Dictionary) -> void:
	if state.is_empty():
		return
	health = int(state.get("health", max_health))
	is_fallen = bool(state.get("fallen", false))
	chopped = bool(state.get("chopped", is_fallen))
	if is_fallen:
		leaves.visible = false
		set_collision_layer_value(1, false)
		set_collision_mask_value(1, false)
