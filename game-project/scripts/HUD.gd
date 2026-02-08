extends CanvasLayer

@onready var time_label: Label = $Root/TopLeft/TimeLabel
@onready var temp_label: Label = $Root/TopLeft/TempLabel
@onready var weather_label: Label = $Root/TopLeft/WeatherLabel
@onready var wind_label: Label = $Root/TopLeft/WindLabel

@onready var objective_label: Label = $Root/TopRight/Objectives
@onready var objective_list: Label = $Root/TopRight/ObjectiveList
@onready var objective_distance: Label = $Root/TopRight/ObjectiveDistance

@onready var health_label: Label = $Root/BottomLeft/HealthLabel
@onready var temp_status: Label = $Root/BottomLeft/TempStatus
@onready var needs_icons: HBoxContainer = $Root/BottomLeft/NeedsIcons
@onready var health_icon: TextureRect = $Root/BottomLeft/NeedsIcons/HealthIcon
@onready var warmth_icon: TextureRect = $Root/BottomLeft/NeedsIcons/WarmthIcon
@onready var hunger_icon: TextureRect = $Root/BottomLeft/NeedsIcons/HungerIcon
@onready var thirst_icon: TextureRect = $Root/BottomLeft/NeedsIcons/ThirstIcon
@onready var fatigue_icon: TextureRect = $Root/BottomLeft/NeedsIcons/FatigueIcon
@onready var needs_label: Label = $Root/BottomLeft/NeedsLabel
@onready var hunger_bar: ProgressBar = $Root/BottomLeft/NeedsBars/HungerBar
@onready var thirst_bar: ProgressBar = $Root/BottomLeft/NeedsBars/ThirstBar
@onready var fatigue_bar: ProgressBar = $Root/BottomLeft/NeedsBars/FatigueBar
@onready var campfire_box: VBoxContainer = $Root/BottomLeft/CampfireBox
@onready var fuel_bar: ProgressBar = $Root/BottomLeft/CampfireBox/FuelBar

@onready var hotbar: HBoxContainer = $Root/BottomRight/Hotbar

@onready var debug_label: Label = $Root/DebugLabel

@onready var interact_label: Label = $Root/Center/InteractLabel
@onready var message_label: Label = $Root/Center/MessageLabel

@onready var hints_panel: PanelContainer = $Root/Hints

@onready var inventory_panel: PanelContainer = $Root/InventoryPanel
@onready var crafting_panel: PanelContainer = $Root/CraftingPanel

@onready var item_grid: GridContainer = $Root/InventoryPanel/VBox/ItemGrid
@onready var crafting_tabs: TabContainer = $Root/CraftingPanel/VBox/CraftingTabs
@onready var craft_quantity: OptionButton = $Root/CraftingPanel/VBox/CraftingControls/CraftQuantity
@onready var recipe_details: RichTextLabel = $Root/CraftingPanel/VBox/RecipeDetails
@onready var craft_button: Button = $Root/CraftingPanel/VBox/CraftButton
@onready var tools_list: VBoxContainer = $Root/CraftingPanel/VBox/CraftingTabs/Tools/ToolsList
@onready var fire_list: VBoxContainer = $Root/CraftingPanel/VBox/CraftingTabs/Fire/FireList
@onready var food_list: VBoxContainer = $Root/CraftingPanel/VBox/CraftingTabs/Food/FoodList
@onready var materials_list: VBoxContainer = $Root/CraftingPanel/VBox/CraftingTabs/Materials/MaterialsList

var message_timer: float = 0.0
var hotbar_slots: Array[PanelContainer] = []
var last_inventory_hash: int = 0
var debug_visible: bool = false
var recipe_entries: Dictionary = {}
var selected_recipe_id: String = ""
var current_max_craftable: int = 0

func _ready() -> void:
	_build_hotbar()
	_setup_craft_controls()
	_setup_need_icons()

func _process(delta: float) -> void:
	if message_timer > 0.0:
		message_timer -= delta
		if message_timer <= 0.0:
			message_label.text = ""

func update_hud(data: Dictionary) -> void:
	var hour := int(data.time)
	var minute := int((data.time - hour) * 60.0)
	time_label.text = "Time: %02d:%02d" % [hour, minute]
	temp_label.text = "Ambient: %.1f C" % data.ambient
	weather_label.text = "Weather: %s" % str(data.weather).capitalize()
	wind_label.text = "Wind: %.0f%%" % (data.wind * 100.0)

	health_label.text = "Health: %.0f" % data.health
	temp_status.text = "❄ Body Temp: %.1f (%s)" % [data.body_temp, data.status]

	hunger_bar.value = data.hunger
	thirst_bar.value = data.thirst
	fatigue_bar.value = data.fatigue
	needs_label.text = "🍖 Hunger: %.0f  💧 Thirst: %.0f  💤 Fatigue: %.0f" % [data.hunger, data.thirst, data.fatigue]
	_update_need_tooltips(data)
	_update_campfire(data.campfire_fuel, data.campfire_max_fuel)

	_update_objectives(data.objective, data.objective_distance, data.objectives_list)
	interact_label.text = data.prompt

	_update_inventory(data.inventory)
	_update_hotbar(data.hotbar, data.active_hotbar, data.inventory)
	_update_crafting_panel(data.inventory)

	if debug_visible:
		debug_label.visible = true
		debug_label.text = "FPS: %d\nTemp: %.1f C\nWeather: %s\nSeed: %d\nTrees: %d\nResources: %d" % [
			int(data.debug.fps),
			data.body_temp,
			str(data.weather).capitalize(),
			data.seed,
			data.debug.tree_count,
			data.debug.resource_count,
		]
	else:
		debug_label.visible = false

func _update_objectives(objective: Dictionary, distance_text: String, objectives_list: Array) -> void:
	if objective.is_empty():
		objective_label.text = "Objectives: Completed"
		objective_list.text = ""
		objective_distance.text = ""
		return
	objective_label.text = "Objectives:"
	var lines: Array[String] = []
	for index in range(objectives_list.size()):
		var entry: Dictionary = objectives_list[index]
		if entry.id == objective.id:
			lines.append("→ %s" % entry.text)
		else:
			lines.append("• %s" % entry.text)
	objective_list.text = "\n".join(lines)
	objective_distance.text = distance_text

func toggle_inventory() -> void:
	inventory_panel.visible = not inventory_panel.visible
	if inventory_panel.visible:
		crafting_panel.visible = false

func toggle_crafting() -> void:
	crafting_panel.visible = not crafting_panel.visible
	if crafting_panel.visible:
		inventory_panel.visible = false

func toggle_hints() -> void:
	hints_panel.visible = not hints_panel.visible

func toggle_debug() -> void:
	debug_visible = not debug_visible

func is_modal_open() -> bool:
	return inventory_panel.visible or crafting_panel.visible

func show_message(text: String) -> void:
	message_label.text = text
	message_timer = 2.5

func _build_hotbar() -> void:
	hotbar_slots.clear()
	for child in hotbar.get_children():
		child.queue_free()
	for i in range(6):
		var panel := PanelContainer.new()
		panel.custom_minimum_size = Vector2(48, 48)
		var label := Label.new()
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.autowrap_mode = TextServer.AUTOWRAP_OFF
		panel.add_child(label)
		hotbar.add_child(panel)
		hotbar_slots.append(panel)

func _update_hotbar(items: Array, active_index: int, inventory: Dictionary) -> void:
	for i in range(hotbar_slots.size()):
		var panel := hotbar_slots[i]
		var label := panel.get_child(0) as Label
		var item_name := ""
		if i < items.size():
			item_name = str(items[i])
		var count_text := ""
		if item_name != "":
			count_text = " x%d" % int(inventory.get(item_name, 0))
		label.text = "%d\n%s%s" % [i + 1, item_name, count_text]
		panel.add_theme_stylebox_override("panel", _make_hotbar_style(i == active_index))

func _make_hotbar_style(active: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.1, 0.1, 0.1, 0.7)
	style.border_color = Color(0.8, 0.6, 0.2) if active else Color(0.2, 0.2, 0.2)
	style.border_width_left = 2
	style.border_width_top = 2
	style.border_width_right = 2
	style.border_width_bottom = 2
	style.corner_radius_top_left = 4
	style.corner_radius_top_right = 4
	style.corner_radius_bottom_left = 4
	style.corner_radius_bottom_right = 4
	return style

func _update_inventory(items: Dictionary) -> void:
	var hash := items.hash()
	if hash == last_inventory_hash:
		return
	last_inventory_hash = hash
	for child in item_grid.get_children():
		child.queue_free()
	for key in items.keys():
		var count := int(items[key])
		if count <= 0:
			continue
		var row := HBoxContainer.new()
		var icon := TextureRect.new()
		icon.custom_minimum_size = Vector2(32, 32)
		icon.texture = _make_item_icon(get_parent().inventory.get_item_color(key))
		icon.tooltip_text = get_parent().inventory.get_item_label(key)
		var label := Label.new()
		label.text = "%s x%d" % [get_parent().inventory.get_item_label(key), count]
		row.add_child(icon)
		row.add_child(label)
		item_grid.add_child(row)

func _make_item_icon(color: Color) -> Texture2D:
	var image := Image.create(32, 32, false, Image.FORMAT_RGBA8)
	image.fill(color)
	return ImageTexture.create_from_image(image)

func set_recipes(recipes: Array) -> void:
	recipe_entries.clear()
	_clear_recipe_lists()
	for recipe in recipes:
		if typeof(recipe) != TYPE_DICTIONARY:
			continue
		var category := str(recipe.get("category", ""))
		var target_list := _get_recipe_list(category)
		if target_list == null:
			continue
		var button := Button.new()
		button.text = str(recipe.get("name", recipe.get("id", "Recipe")))
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.pressed.connect(_on_recipe_selected.bind(str(recipe.get("id", ""))))
		target_list.add_child(button)
		recipe_entries[str(recipe.get("id", ""))] = recipe
	if recipes.size() > 0:
		_select_first_recipe()

func _setup_craft_controls() -> void:
	craft_quantity.clear()
	craft_quantity.add_item("1", 1)
	craft_quantity.add_item("Max", 2)
	craft_button.pressed.connect(_on_craft_pressed)

func _setup_need_icons() -> void:
	health_icon.texture = _make_item_icon(Color(0.8, 0.2, 0.2))
	warmth_icon.texture = _make_item_icon(Color(0.9, 0.6, 0.2))
	hunger_icon.texture = _make_item_icon(Color(0.7, 0.3, 0.2))
	thirst_icon.texture = _make_item_icon(Color(0.2, 0.5, 0.9))
	fatigue_icon.texture = _make_item_icon(Color(0.7, 0.7, 0.7))

func _update_need_tooltips(data: Dictionary) -> void:
	health_icon.tooltip_text = "Health: %.0f" % data.health
	warmth_icon.tooltip_text = "Warmth: %.1f" % data.body_temp
	hunger_icon.tooltip_text = "Hunger: %.0f" % data.hunger
	thirst_icon.tooltip_text = "Thirst: %.0f" % data.thirst
	fatigue_icon.tooltip_text = "Fatigue: %.0f" % data.fatigue

func _update_campfire(fuel: float, max_fuel: float) -> void:
	if max_fuel <= 0.0:
		campfire_box.visible = false
		return
	campfire_box.visible = true
	fuel_bar.max_value = max_fuel
	fuel_bar.value = fuel

func _update_crafting_panel(inventory: Dictionary) -> void:
	if selected_recipe_id == "":
		craft_button.disabled = true
		recipe_details.text = ""
		return
	var recipe: Dictionary = recipe_entries.get(selected_recipe_id, {})
	var requirements: Dictionary = recipe.get("requirements", {})
	var outputs: Dictionary = recipe.get("outputs", {})
	var lines: Array[String] = []
	current_max_craftable = _get_max_craftable(requirements, inventory)
	for key in requirements.keys():
		var need := int(requirements[key])
		var have := int(inventory.get(key, 0))
		var color := "green" if have >= need else "red"
		lines.append("[color=%s]%s: %d/%d[/color]" % [color, str(key), have, need])
	if outputs.keys().size() > 0:
		var output_parts: Array[String] = []
		for key in outputs.keys():
			output_parts.append("%s x%d" % [str(key), int(outputs[key])])
		lines.append("[color=yellow]Outputs: %s[/color]" % ", ".join(output_parts))
	recipe_details.text = "[b]%s[/b]\n%s" % [str(recipe.get("name", "")), "\n".join(lines)]
	craft_button.disabled = current_max_craftable <= 0

func _get_recipe_list(category: String) -> VBoxContainer:
	if category == "Tools":
		return tools_list
	if category == "Fire":
		return fire_list
	if category == "Food":
		return food_list
	if category == "Materials":
		return materials_list
	return null

func _clear_recipe_lists() -> void:
	for list_container in [tools_list, fire_list, food_list, materials_list]:
		for child in list_container.get_children():
			child.queue_free()

func _select_first_recipe() -> void:
	for key in recipe_entries.keys():
		selected_recipe_id = key
		return

func _on_recipe_selected(recipe_id: String) -> void:
	selected_recipe_id = recipe_id

func _on_craft_pressed() -> void:
	if selected_recipe_id == "":
		return
	var qty := _get_selected_quantity()
	get_parent().craft_recipe(selected_recipe_id, qty)

func _get_selected_quantity() -> int:
	if craft_quantity.get_selected_id() == 2:
		return current_max_craftable
	return 1

func _get_max_craftable(requirements: Dictionary, inventory: Dictionary) -> int:
	var max_qty := INF
	for key in requirements.keys():
		var need := int(requirements[key])
		if need <= 0:
			continue
		var available := int(inventory.get(key, 0))
		max_qty = min(max_qty, int(floor(float(available) / float(need))))
	if max_qty == INF:
		return 0
	return int(max_qty)
