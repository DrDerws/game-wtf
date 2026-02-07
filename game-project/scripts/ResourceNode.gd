extends Area3D

@export var item_type: String = "Stick"
@export var amount: int = 1
@export var resource_id: int = -1

var harvested: bool = false

func _ready() -> void:
	add_to_group("resource")
	add_to_group("resource_%s" % item_type.to_lower())

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
