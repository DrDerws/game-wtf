extends Node

signal inventory_changed

var items := {
	"Stick": 0,
	"Tinder": 0,
	"Stone": 0,
	"Fish": 0,
	"Water": 0,
	"CampfireKit": 0,
}

func add_item(item_name: String, amount: int = 1) -> void:
	if not items.has(item_name):
		items[item_name] = 0
	items[item_name] += amount
	inventory_changed.emit()

func remove_item(item_name: String, amount: int = 1) -> bool:
	if not items.has(item_name):
		return false
	if items[item_name] < amount:
		return false
	items[item_name] -= amount
	inventory_changed.emit()
	return true

func get_count(item_name: String) -> int:
	if not items.has(item_name):
		return 0
	return items[item_name]

func to_dict() -> Dictionary:
	return items.duplicate()

func from_dict(data: Dictionary) -> void:
	for key in data.keys():
		items[key] = int(data[key])
	inventory_changed.emit()
