extends Node

const SAVE_PATH := "user://savegame.json"

@export var autosave_interval := 12.0

var autosave_timer: Timer

func _ready():
	add_to_group("save_manager")
	autosave_timer = Timer.new()
	autosave_timer.wait_time = autosave_interval
	autosave_timer.autostart = true
	autosave_timer.timeout.connect(save_game)
	add_child(autosave_timer)

func save_game():
	var inventory = get_tree().get_first_node_in_group("inventory")
	var data = {
		"inventory": inventory.get_save_data() if inventory != null else {},
		"trees": _collect_tree_data(),
		"version": 1
	}
	var file = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		return
	file.store_string(JSON.stringify(data))

func load_game():
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var file = FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return
	var parsed = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary):
		return
	if parsed.has("inventory"):
		var inventory = get_tree().get_first_node_in_group("inventory")
		if inventory != null and parsed["inventory"] is Dictionary:
			inventory.load_save_data(parsed["inventory"])
	if parsed.has("trees") and parsed["trees"] is Dictionary:
		_apply_tree_data(parsed["trees"])

func _collect_tree_data() -> Dictionary:
	var tree_data := {}
	var trees = get_tree().get_nodes_in_group("trees")
	for tree in trees:
		if tree.has_method("get_save_data"):
			var data = tree.get_save_data()
			if data.has("id"):
				tree_data[data["id"]] = data
	return tree_data

func _apply_tree_data(tree_data: Dictionary):
	var trees = get_tree().get_nodes_in_group("trees")
	for tree in trees:
		if tree.has_method("load_save_data") and tree.has_method("get_save_data"):
			var id = tree.get_save_data().get("id", "")
			if id != "" and tree_data.has(id) and tree_data[id] is Dictionary:
				tree.load_save_data(tree_data[id])
