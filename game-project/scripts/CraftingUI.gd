extends Control

const RECIPES_PATH := "res://data/recipes.json"

@onready var recipes_container = $Panel/MarginContainer/VBoxContainer/Recipes

var recipes := {}
var inventory
var items
var recipe_rows := {}

func _ready():
	add_to_group("crafting_ui")
	inventory = get_tree().get_first_node_in_group("inventory")
	items = get_tree().get_first_node_in_group("items")
	_load_recipes()
	_build_rows()
	_refresh_rows()
	if inventory != null:
		inventory.inventory_changed.connect(_refresh_rows)

func _load_recipes():
	var file = FileAccess.open(RECIPES_PATH, FileAccess.READ)
	if file == null:
		push_warning("Missing recipes at %s" % RECIPES_PATH)
		return
	var parsed = JSON.parse_string(file.get_as_text())
	if parsed is Dictionary:
		recipes = parsed
	else:
		push_warning("Recipe data malformed at %s" % RECIPES_PATH)

func _build_rows():
	for child in recipes_container.get_children():
		child.queue_free()
	recipe_rows.clear()
	for recipe_id in recipes.keys():
		var row = HBoxContainer.new()
		row.custom_constants.separation = 8
		var label = Label.new()
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(label)
		var craft_one = Button.new()
		craft_one.text = "Craft 1"
		craft_one.pressed.connect(_on_craft_pressed.bind(recipe_id, 1))
		row.add_child(craft_one)
		var craft_max = Button.new()
		craft_max.text = "Craft Max"
		craft_max.pressed.connect(_on_craft_pressed.bind(recipe_id, -1))
		row.add_child(craft_max)
		recipes_container.add_child(row)
		recipe_rows[recipe_id] = {
			"label": label,
			"craft_one": craft_one,
			"craft_max": craft_max
		}

func _refresh_rows():
	for recipe_id in recipe_rows.keys():
		var row = recipe_rows[recipe_id]
		var label: Label = row["label"]
		var craft_one: Button = row["craft_one"]
		var craft_max: Button = row["craft_max"]
		var recipe = recipes.get(recipe_id, {})
		var display_name = recipe.get("display_name", recipe_id)
		var requirements = recipe.get("requirements", {})
		var parts := []
		var can_craft = true
		for item_id in requirements.keys():
			var needed = int(requirements[item_id])
			var have = inventory.get_count(item_id) if inventory != null else 0
			var item_name = items.get_display_name(item_id) if items != null else item_id
			parts.append("%s %d/%d" % [item_name, have, needed])
			if have < needed:
				can_craft = false
		label.text = "%s\n%s" % [display_name, ", ".join(parts)]
		craft_one.disabled = not can_craft
		craft_max.disabled = _get_max_craft(recipe_id) <= 0

func _get_max_craft(recipe_id: String) -> int:
	var recipe = recipes.get(recipe_id, {})
	var requirements = recipe.get("requirements", {})
	if requirements.is_empty():
		return 0
	var max_craft = 9999
	for item_id in requirements.keys():
		var needed = int(requirements[item_id])
		if needed <= 0:
			continue
		var have = inventory.get_count(item_id) if inventory != null else 0
		max_craft = min(max_craft, int(floor(float(have) / float(needed))))
	return max_craft

func _on_craft_pressed(recipe_id: String, amount: int):
	if inventory == null:
		return
	var recipe = recipes.get(recipe_id, {})
	var requirements = recipe.get("requirements", {})
	var output = int(recipe.get("output", 1))
	var craft_count = amount
	if craft_count < 0:
		craft_count = _get_max_craft(recipe_id)
	if craft_count <= 0:
		return
	for item_id in requirements.keys():
		var needed = int(requirements[item_id]) * craft_count
		if inventory.get_count(item_id) < needed:
			return
	for item_id in requirements.keys():
		var needed = int(requirements[item_id]) * craft_count
		inventory.remove_item(item_id, needed)
	inventory.add_item(recipe_id, output * craft_count)
	var toast = get_tree().get_first_node_in_group("toast")
	if toast != null:
		var label = recipe.get("display_name", recipe_id)
		toast.show_toast("Crafted %s x%d" % [label, output * craft_count])
	_refresh_rows()
