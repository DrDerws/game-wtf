extends Node3D

@export var world_seed := 1337

@onready var inventory_ui = $CanvasLayer/InventoryUI
@onready var crafting_ui = $CanvasLayer/CraftingUI
@onready var hotbar_ui = $CanvasLayer/Hotbar
@onready var objective_tracker = $CanvasLayer/ObjectiveTracker
@onready var props = $Props
@onready var save_manager = $SaveManager

func _ready():
	inventory_ui.set_visible(false)
	crafting_ui.set_visible(false)
	_assign_tree_ids()
	_connect_tree_signals()
	if save_manager != null:
		save_manager.load_game()

func _unhandled_input(event):
	if event.is_action_pressed("inventory"):
		var next_state = not inventory_ui.is_visible()
		inventory_ui.set_visible(next_state)
		if next_state:
			crafting_ui.set_visible(false)
	if event.is_action_pressed("crafting"):
		var next_state = not crafting_ui.is_visible()
		crafting_ui.set_visible(next_state)
		if next_state:
			inventory_ui.set_visible(false)
	if event.is_action_pressed("save_game"):
		if save_manager != null:
			save_manager.save_game()
			_show_toast("Game saved")
	if event.is_action_pressed("load_game"):
		if save_manager != null:
			save_manager.load_game()
			_show_toast("Game loaded")

func _assign_tree_ids():
	var index = 0
	for child in props.get_children():
		if child.has_method("set_tree_id"):
			child.set_tree_id(_make_tree_id(index))
			index += 1

func _make_tree_id(index: int) -> String:
	return "tree_%s_%d" % [world_seed, index]

func _connect_tree_signals():
	for tree in get_tree().get_nodes_in_group("trees"):
		if tree.has_signal("tree_felled"):
			tree.tree_felled.connect(_on_tree_felled)

func _on_tree_felled(_tree_id: String):
	if objective_tracker != null:
		objective_tracker.mark_tree_chopped()
	if save_manager != null:
		save_manager.save_game()

func _show_toast(message: String):
	var toast = get_tree().get_first_node_in_group("toast")
	if toast != null:
		toast.show_toast(message, 1.5)
