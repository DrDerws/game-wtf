extends Control

@export var sheltered_duration := 60.0

@onready var objectives_label = $Panel/MarginContainer/VBoxContainer/ObjectivesLabel

var inventory
var survival
var shelter_timer := 0.0
var tree_chopped := false
var objectives := []

func _ready():
	inventory = get_tree().get_first_node_in_group("inventory")
	survival = get_tree().get_first_node_in_group("survival")
	objectives = [
		{"id": "chop_tree", "text": "Chop 1 tree", "done": false},
		{"id": "collect_wood", "text": "Collect 2 logs + 4 sticks", "done": false},
		{"id": "craft_campfire", "text": "Craft campfire kit", "done": false},
		{"id": "place_light_fire", "text": "Place and light campfire", "done": false},
		{"id": "warm_up", "text": "Warm up above safe temp", "done": false},
		{"id": "place_tent", "text": "Craft and place tarp tent", "done": false},
		{"id": "shelter", "text": "Stay sheltered for 60s", "done": false}
	]
	_update_objectives()

func _process(delta):
	_update_progress(delta)

func mark_tree_chopped():
	tree_chopped = true
	_set_done("chop_tree")

func _update_progress(delta):
	if not _is_done("chop_tree") and _has_felled_tree():
		_set_done("chop_tree")
	if inventory != null:
		if inventory.get_count("log") >= 2 and inventory.get_count("stick") >= 4:
			_set_done("collect_wood")
		if inventory.get_count("campfire_kit") >= 1 or _has_any_campfire():
			_set_done("craft_campfire")
		if inventory.get_count("tarp_tent") >= 1 or _has_any_tent():
			_set_done("place_tent")
	if _has_lit_campfire():
		_set_done("place_light_fire")
	if survival != null and survival.body_temp_c >= 36.5:
		_set_done("warm_up")
	if survival != null and survival.is_sheltered:
		shelter_timer += delta
	else:
		shelter_timer = 0.0
	if shelter_timer >= sheltered_duration:
		_set_done("shelter")

func _has_felled_tree() -> bool:
	for tree in get_tree().get_nodes_in_group("trees"):
		if tree.get("is_felled") == true:
			return true
	return false

func _has_any_campfire() -> bool:
	return get_tree().get_nodes_in_group("campfires").size() > 0

func _has_any_tent() -> bool:
	return get_tree().get_nodes_in_group("tents").size() > 0

func _has_lit_campfire() -> bool:
	for campfire in get_tree().get_nodes_in_group("campfires"):
		if campfire.get("is_lit") == true:
			return true
	return false

func _set_done(id: String):
	for obj in objectives:
		if obj["id"] == id and not obj["done"]:
			obj["done"] = true
			_update_objectives()

func _is_done(id: String) -> bool:
	for obj in objectives:
		if obj["id"] == id:
			return obj["done"]
	return false

func _update_objectives():
	var lines := []
	for obj in objectives:
		var prefix = "[x]" if obj["done"] else "[ ]"
		lines.append("%s %s" % [prefix, obj["text"]])
	objectives_label.text = "\n".join(lines)
