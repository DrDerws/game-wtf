extends Area3D

@export var item_type: String = "Stick"
@export var amount: int = 1

func _ready() -> void:
	add_to_group("resource")
	add_to_group("resource_%s" % item_type.to_lower())

func harvest() -> Dictionary:
	var harvested := {
		"item_type": item_type,
		"amount": amount,
	}
	queue_free()
	return harvested
