extends Node

signal inventory_changed

var items := {
	"Stick": 0,
	"Tinder": 0,
	"Stone": 0,
	"Log": 0,
	"CampfireKit": 0,
	"Axe": 0,
	"FlintSteel": 0,
}

var hotbar: Array[String] = ["Axe", "FlintSteel", "", "", "", ""]
var active_hotbar_index: int = 0

const ITEM_DATA := {
	"Stick": {"stack": 20, "label": "Stick", "color": Color(0.55, 0.4, 0.3)},
	"Tinder": {"stack": 20, "label": "Tinder", "color": Color(0.7, 0.6, 0.4)},
	"Stone": {"stack": 20, "label": "Stone", "color": Color(0.5, 0.5, 0.55)},
	"Log": {"stack": 10, "label": "Log", "color": Color(0.4, 0.25, 0.15)},
	"CampfireKit": {"stack": 5, "label": "Campfire Kit", "color": Color(0.8, 0.5, 0.3)},
	"Axe": {"stack": 1, "label": "Axe", "color": Color(0.8, 0.8, 0.85)},
	"FlintSteel": {"stack": 1, "label": "Flint & Steel", "color": Color(0.7, 0.7, 0.75)},
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
	return {
		"items": items.duplicate(),
		"hotbar": hotbar.duplicate(),
		"active_hotbar": active_hotbar_index,
	}

func from_dict(data: Dictionary) -> void:
	var item_data: Dictionary = data.get("items", data)
	for key in item_data.keys():
		items[key] = int(item_data[key])
	if data.has("hotbar"):
		hotbar = data.get("hotbar", hotbar).duplicate()
		active_hotbar_index = int(data.get("active_hotbar", active_hotbar_index))
	inventory_changed.emit()

func get_item_label(item_name: String) -> String:
	if ITEM_DATA.has(item_name):
		return ITEM_DATA[item_name]["label"]
	return item_name

func get_item_color(item_name: String) -> Color:
	if ITEM_DATA.has(item_name):
		return ITEM_DATA[item_name]["color"]
	return Color.WHITE

func get_active_item() -> String:
	if active_hotbar_index < 0 or active_hotbar_index >= hotbar.size():
		return ""
	return hotbar[active_hotbar_index]

func set_active_hotbar(index: int) -> void:
	active_hotbar_index = clamp(index, 0, hotbar.size() - 1)
	inventory_changed.emit()
