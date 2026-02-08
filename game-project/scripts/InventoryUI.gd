extends Control

@onready var stick_label = $Panel/MarginContainer/VBoxContainer/StickLabel
@onready var tinder_label = $Panel/MarginContainer/VBoxContainer/TinderLabel

var inventory

func _ready():
	inventory = get_tree().get_first_node_in_group("inventory")
	if inventory != null:
		inventory.inventory_changed.connect(_update_labels)
	_update_labels()

func _update_labels():
	var stick_count = 0
	var tinder_count = 0
	if inventory != null:
		stick_count = inventory.get_count("stick")
		tinder_count = inventory.get_count("tinder")
	stick_label.text = "Stick: %d" % stick_count
	tinder_label.text = "Tinder: %d" % tinder_count
