extends Area3D

@export var item_type: String = "Stick"
@export var amount: int = 1
@export var resource_id: int = -1
@export var required_tool: String = ""
@export var allow_bare_hands: bool = true
@export var sway_enabled: bool = false
@export var sway_strength: float = 0.05
@export var sway_speed: float = 1.2

var harvested: bool = false
var sway_timer: float = 0.0

@onready var mesh_instance: MeshInstance3D = get_node_or_null("MeshInstance3D")

func _ready() -> void:
	add_to_group("resource")
	add_to_group("resource_%s" % item_type.to_lower())

func _process(delta: float) -> void:
	if not sway_enabled:
		return
	if mesh_instance == null:
		return
	sway_timer += delta * sway_speed
	mesh_instance.rotation.y = sin(sway_timer) * sway_strength

func can_harvest(active_tool: String) -> bool:
	if required_tool == "":
		return true
	if active_tool == required_tool:
		return true
	if required_tool == "StoneAxe" and active_tool == "Axe":
		return true
	return allow_bare_hands and active_tool == ""

func harvest() -> Dictionary:
	if harvested:
		return {}
	harvested = true
	var harvested_data := {
		"item_type": item_type,
		"amount": amount,
		"id": resource_id,
	}
	queue_free()
	return harvested_data
