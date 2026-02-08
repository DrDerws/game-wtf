extends Control

const SLOT_COUNT := 6

@onready var slot_container = $PanelContainer/MarginContainer/HBoxContainer

var inventory
var slot_labels := []
var slot_panels := []

func _ready():
	inventory = get_tree().get_first_node_in_group("inventory")
	for child in slot_container.get_children():
		if child is PanelContainer:
			slot_panels.append(child)
			var label = child.get_node("Label")
			slot_labels.append(label)
	if inventory != null:
		inventory.hotbar_changed.connect(_update_slots)
		inventory.selection_changed.connect(_update_selection)
	_update_slots()
	_update_selection()

func _update_slots():
	if inventory == null:
		return
	for i in range(min(slot_labels.size(), inventory.hotbar_slots.size())):
		var item_id = inventory.hotbar_slots[i]
		var item_label = ""
		if item_id != "":
			var items = get_tree().get_first_node_in_group("items")
			if items != null:
				item_label = items.get_display_name(item_id)
			else:
				item_label = item_id
		slot_labels[i].text = "%d\n%s" % [i + 1, item_label]

func _update_selection():
	if inventory == null:
		return
	for i in range(slot_panels.size()):
		var panel = slot_panels[i]
		if i == inventory.selected_slot:
			panel.modulate = Color(0.9, 0.85, 0.5)
		else:
			panel.modulate = Color(1, 1, 1)
