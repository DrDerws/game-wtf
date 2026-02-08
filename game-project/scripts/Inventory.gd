extends Node

signal inventory_changed
signal hotbar_changed
signal selection_changed

const HOTBAR_SLOTS := 6

var items := {}
var hotbar_slots := []
var selected_slot := 0

func _ready():
	add_to_group("inventory")
	if hotbar_slots.is_empty():
		for i in HOTBAR_SLOTS:
			hotbar_slots.append("")
	_initialize_defaults()

func _initialize_defaults():
	if items.is_empty():
		add_item("stone_axe", 1)
		add_item("flint_steel", 1)
		add_item("tarp", 1)
	if hotbar_slots.size() >= 2 and hotbar_slots[0] == "" and hotbar_slots[1] == "":
		hotbar_slots[0] = "stone_axe"
		hotbar_slots[1] = "flint_steel"
		emit_signal("hotbar_changed")

func add_item(item_id: String, amount := 1):
	if amount <= 0:
		return
	if not items.has(item_id):
		items[item_id] = 0
	items[item_id] += amount
	emit_signal("inventory_changed")

func remove_item(item_id: String, amount := 1) -> bool:
	if amount <= 0:
		return false
	if not items.has(item_id):
		return false
	items[item_id] = max(items[item_id] - amount, 0)
	if items[item_id] == 0:
		items.erase(item_id)
	emit_signal("inventory_changed")
	return true

func get_count(item_id: String) -> int:
	if items.has(item_id):
		return items[item_id]
	return 0

func set_hotbar_slot(index: int, item_id: String):
	if index < 0 or index >= HOTBAR_SLOTS:
		return
	hotbar_slots[index] = item_id
	emit_signal("hotbar_changed")

func select_slot(index: int):
	if index < 0 or index >= HOTBAR_SLOTS:
		return
	selected_slot = index
	emit_signal("selection_changed")

func equip_item(item_id: String) -> bool:
	if get_count(item_id) <= 0:
		return false
	for i in range(hotbar_slots.size()):
		if hotbar_slots[i] == item_id:
			selected_slot = i
			emit_signal("selection_changed")
			return true
	if selected_slot < 0 or selected_slot >= HOTBAR_SLOTS:
		selected_slot = 0
	hotbar_slots[selected_slot] = item_id
	emit_signal("hotbar_changed")
	emit_signal("selection_changed")
	return true

func get_selected_item() -> String:
	if selected_slot < 0 or selected_slot >= hotbar_slots.size():
		return ""
	return hotbar_slots[selected_slot]

func get_save_data() -> Dictionary:
	return {
		"items": items.duplicate(true),
		"hotbar_slots": hotbar_slots.duplicate(true),
		"selected_slot": selected_slot
	}

func load_save_data(data: Dictionary):
	if data.has("items") and data["items"] is Dictionary:
		items = data["items"].duplicate(true)
	if data.has("hotbar_slots") and data["hotbar_slots"] is Array:
		hotbar_slots = data["hotbar_slots"].duplicate(true)
	if hotbar_slots.size() < HOTBAR_SLOTS:
		while hotbar_slots.size() < HOTBAR_SLOTS:
			hotbar_slots.append("")
	if data.has("selected_slot") and data["selected_slot"] is int:
		selected_slot = clamp(data["selected_slot"], 0, HOTBAR_SLOTS - 1)
	_initialize_defaults()
	emit_signal("inventory_changed")
	emit_signal("hotbar_changed")
	emit_signal("selection_changed")
