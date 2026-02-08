extends Control

@onready var stick_label = $Panel/MarginContainer/VBoxContainer/StickLabel
@onready var log_label = $Panel/MarginContainer/VBoxContainer/LogLabel
@onready var tinder_label = $Panel/MarginContainer/VBoxContainer/TinderLabel
@onready var stone_label = $Panel/MarginContainer/VBoxContainer/StoneLabel
@onready var flint_steel_label = $Panel/MarginContainer/VBoxContainer/FlintSteelLabel
@onready var stone_axe_label = $Panel/MarginContainer/VBoxContainer/StoneAxeLabel

var inventory

func _ready():
	inventory = get_tree().get_first_node_in_group("inventory")
	if inventory != null:
		inventory.inventory_changed.connect(_update_labels)
	_update_labels()

func _update_labels():
	var stick_count = 0
	var log_count = 0
	var tinder_count = 0
	var stone_count = 0
	var flint_steel_count = 0
	var stone_axe_count = 0
	if inventory != null:
		stick_count = inventory.get_count("stick")
		log_count = inventory.get_count("log")
		tinder_count = inventory.get_count("tinder")
		stone_count = inventory.get_count("stone")
		flint_steel_count = inventory.get_count("flint_steel")
		stone_axe_count = inventory.get_count("stone_axe")
	stick_label.text = "Stick: %d" % stick_count
	log_label.text = "Log: %d" % log_count
	tinder_label.text = "Tinder: %d" % tinder_count
	stone_label.text = "Stone: %d" % stone_count
	flint_steel_label.text = "Flint & Steel: %d" % flint_steel_count
	stone_axe_label.text = "Stone Axe: %d" % stone_axe_count
