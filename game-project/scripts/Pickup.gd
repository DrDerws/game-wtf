extends Area3D

@export var item_id = ""
@export var display_name = ""

func _ready():
	add_to_group("pickup")

func collect():
	var inventory = get_tree().get_first_node_in_group("inventory")
	if inventory != null:
		inventory.add_item(item_id, 1)
	var toast = get_tree().get_first_node_in_group("toast")
	if toast != null:
		toast.show_toast("Picked up %s" % display_name)
	queue_free()
