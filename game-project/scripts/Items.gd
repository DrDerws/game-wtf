extends Node

const ITEM_DATA_PATH := "res://data/items.json"

var items := {}

func _ready():
	add_to_group("items")
	_load_items()

func _load_items():
	var file = FileAccess.open(ITEM_DATA_PATH, FileAccess.READ)
	if file == null:
		push_warning("Missing item data at %s" % ITEM_DATA_PATH)
		return
	var parsed = JSON.parse_string(file.get_as_text())
	if parsed is Dictionary:
		items = parsed
	else:
		push_warning("Item data malformed at %s" % ITEM_DATA_PATH)

func get_item(item_id: String) -> Dictionary:
	if items.has(item_id):
		return items[item_id]
	return {}

func get_display_name(item_id: String) -> String:
	var data = get_item(item_id)
	if data.has("display_name"):
		return data["display_name"]
	return item_id

func get_item_ids() -> Array:
	return items.keys()
