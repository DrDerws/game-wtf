extends Control

@onready var stick_label = $Panel/MarginContainer/VBoxContainer/StickLabel
@onready var log_label = $Panel/MarginContainer/VBoxContainer/LogLabel
@onready var tinder_label = $Panel/MarginContainer/VBoxContainer/TinderLabel
@onready var stone_label = $Panel/MarginContainer/VBoxContainer/StoneLabel
@onready var flint_steel_label = $Panel/MarginContainer/VBoxContainer/FlintSteelLabel
@onready var stone_axe_label = $Panel/MarginContainer/VBoxContainer/StoneAxeLabel
@onready var campfire_kit_label = $Panel/MarginContainer/VBoxContainer/CampfireKitLabel
@onready var tarp_label = $Panel/MarginContainer/VBoxContainer/TarpLabel
@onready var tarp_tent_label = $Panel/MarginContainer/VBoxContainer/TarpTentLabel
@onready var equip_stone_axe = $Panel/MarginContainer/VBoxContainer/EquipStoneAxe
@onready var equip_flint_steel = $Panel/MarginContainer/VBoxContainer/EquipFlintSteel
@onready var equip_campfire_kit = $Panel/MarginContainer/VBoxContainer/EquipCampfireKit
@onready var equip_tarp_tent = $Panel/MarginContainer/VBoxContainer/EquipTarpTent

var inventory

func _ready():
	inventory = get_tree().get_first_node_in_group("inventory")
	if inventory != null:
		inventory.inventory_changed.connect(_update_labels)
	_connect_buttons()
	_update_labels()

func _connect_buttons():
	equip_stone_axe.pressed.connect(_equip_item.bind("stone_axe"))
	equip_flint_steel.pressed.connect(_equip_item.bind("flint_steel"))
	equip_campfire_kit.pressed.connect(_equip_item.bind("campfire_kit"))
	equip_tarp_tent.pressed.connect(_equip_item.bind("tarp_tent"))

func _equip_item(item_id: String):
	if inventory != null:
		inventory.equip_item(item_id)

func _update_labels():
	var stick_count = 0
	var log_count = 0
	var tinder_count = 0
	var stone_count = 0
	var flint_steel_count = 0
	var stone_axe_count = 0
	var campfire_kit_count = 0
	var tarp_count = 0
	var tarp_tent_count = 0
	if inventory != null:
		stick_count = inventory.get_count("stick")
		log_count = inventory.get_count("log")
		tinder_count = inventory.get_count("tinder")
		stone_count = inventory.get_count("stone")
		flint_steel_count = inventory.get_count("flint_steel")
		stone_axe_count = inventory.get_count("stone_axe")
		campfire_kit_count = inventory.get_count("campfire_kit")
		tarp_count = inventory.get_count("tarp")
		tarp_tent_count = inventory.get_count("tarp_tent")
	stick_label.text = "Stick: %d" % stick_count
	log_label.text = "Log: %d" % log_count
	tinder_label.text = "Tinder: %d" % tinder_count
	stone_label.text = "Stone: %d" % stone_count
	flint_steel_label.text = "Flint & Steel: %d" % flint_steel_count
	stone_axe_label.text = "Stone Axe: %d" % stone_axe_count
	campfire_kit_label.text = "Campfire Kit: %d" % campfire_kit_count
	tarp_label.text = "Tarp: %d" % tarp_count
	tarp_tent_label.text = "Tarp Tent: %d" % tarp_tent_count
	equip_stone_axe.disabled = stone_axe_count <= 0
	equip_flint_steel.disabled = flint_steel_count <= 0
	equip_campfire_kit.disabled = campfire_kit_count <= 0
	equip_tarp_tent.disabled = tarp_tent_count <= 0
