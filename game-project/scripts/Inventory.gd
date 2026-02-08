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
	"Berries": 0,
	"Fiber": 0,
	"Mushroom": 0,
	"BerryMash": 0,
	"Kindling": 0,
	"StoneAxe": 0,
	"SimpleKnife": 0,
	"WaterFlask": 0,
}

var hotbar: Array[String] = ["FlintSteel", "", "", "", "", ""]
var active_hotbar_index: int = 0

const ITEM_DATA := {
	"Stick": {"stack": 20, "label": "Stick", "color": Color(0.55, 0.4, 0.3)},
	"Tinder": {"stack": 20, "label": "Tinder", "color": Color(0.7, 0.6, 0.4)},
	"Stone": {"stack": 20, "label": "Stone", "color": Color(0.5, 0.5, 0.55)},
	"Log": {"stack": 10, "label": "Log", "color": Color(0.4, 0.25, 0.15)},
	"CampfireKit": {"stack": 5, "label": "Campfire Kit", "color": Color(0.8, 0.5, 0.3), "hotbar": true},
	"Axe": {"stack": 1, "label": "Axe", "color": Color(0.8, 0.8, 0.85), "hotbar": true},
	"FlintSteel": {"stack": 1, "label": "Flint & Steel", "color": Color(0.7, 0.7, 0.75), "hotbar": true},
	"Berries": {"stack": 20, "label": "Berries", "color": Color(0.7, 0.1, 0.2), "consumable": true, "hotbar": true},
	"Fiber": {"stack": 30, "label": "Fiber", "color": Color(0.4, 0.6, 0.2)},
	"Mushroom": {"stack": 10, "label": "Mushroom", "color": Color(0.8, 0.6, 0.4), "consumable": true, "hotbar": true},
	"BerryMash": {"stack": 10, "label": "Berry Mash", "color": Color(0.6, 0.2, 0.3), "consumable": true, "hotbar": true},
	"Kindling": {"stack": 20, "label": "Kindling", "color": Color(0.6, 0.45, 0.3)},
	"StoneAxe": {"stack": 1, "label": "Stone Axe", "color": Color(0.7, 0.7, 0.75), "hotbar": true},
	"SimpleKnife": {"stack": 1, "label": "Simple Knife", "color": Color(0.7, 0.7, 0.75), "hotbar": true},
	"WaterFlask": {"stack": 1, "label": "Water Flask", "color": Color(0.4, 0.6, 0.8), "hotbar": true},
}

func add_item(item_name: String, amount: int = 1) -> void:
	if not items.has(item_name):
		items[item_name] = 0
	items[item_name] += amount
	_auto_assign_hotbar(item_name)
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
	_sanitize_hotbar()
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

func is_consumable(item_name: String) -> bool:
	if ITEM_DATA.has(item_name):
		return bool(ITEM_DATA[item_name].get("consumable", false))
	return false

func is_hotbar_item(item_name: String) -> bool:
	if ITEM_DATA.has(item_name):
		return bool(ITEM_DATA[item_name].get("hotbar", false))
	return false

func _auto_assign_hotbar(item_name: String) -> void:
	if not is_hotbar_item(item_name):
		return
	if hotbar.has(item_name):
		return
	for index in range(hotbar.size()):
		if hotbar[index] == "":
			hotbar[index] = item_name
			return

func _sanitize_hotbar() -> void:
	for index in range(hotbar.size()):
		var item_name := hotbar[index]
		if item_name == "":
			continue
		if get_count(item_name) <= 0:
			hotbar[index] = ""
