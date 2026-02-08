extends Node

signal inventory_changed

var items = {}

func _ready():
	add_to_group("inventory")

func add_item(item_id, amount := 1):
	if not items.has(item_id):
		items[item_id] = 0
	items[item_id] += amount
	emit_signal("inventory_changed")

func get_count(item_id):
	if items.has(item_id):
		return items[item_id]
	return 0
