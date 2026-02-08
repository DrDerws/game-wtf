extends Node3D

@onready var inventory_ui = $CanvasLayer/InventoryUI

func _ready():
	inventory_ui.set_visible(false)

func _unhandled_input(event):
	if event.is_action_pressed("inventory"):
		inventory_ui.set_visible(not inventory_ui.is_visible())
