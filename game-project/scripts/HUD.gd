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
@onready var needs_label: Label = $Root/BottomLeft/NeedsLabel
@onready var hunger_bar: ProgressBar = $Root/BottomLeft/NeedsBars/HungerBar
@onready var thirst_bar: ProgressBar = $Root/BottomLeft/NeedsBars/ThirstBar
@onready var fatigue_bar: ProgressBar = $Root/BottomLeft/NeedsBars/FatigueBar

@onready var hotbar: HBoxContainer = $Root/BottomRight/Hotbar

@onready var debug_label: Label = $Root/DebugLabel

@onready var interact_label: Label = $Root/Center/InteractLabel
@onready var message_label: Label = $Root/Center/MessageLabel

@onready var hints_panel: PanelContainer = $Root/Hints

@onready var inventory_panel: PanelContainer = $Root/InventoryPanel
@onready var crafting_panel: PanelContainer = $Root/CraftingPanel

@onready var item_grid: GridContainer = $Root/InventoryPanel/VBox/ItemGrid

@onready var craft_kit_button: Button = $Root/CraftingPanel/VBox/CraftKit
@onready var place_fire_button: Button = $Root/CraftingPanel/VBox/PlaceFire
@onready var light_fire_button: Button = $Root/CraftingPanel/VBox/LightFire
@onready var add_fuel_button: Button = $Root/CraftingPanel/VBox/AddFuel

var message_timer: float = 0.0
var hotbar_slots: Array[PanelContainer] = []
var last_inventory_hash: int = 0
var debug_visible: bool = false

func _ready() -> void:
	_build_hotbar()

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

	_update_objectives(data.objective, data.objective_distance, data.objectives_list)
	interact_label.text = data.prompt

	_update_inventory(data.inventory)
	_update_hotbar(data.hotbar, data.active_hotbar)

	craft_kit_button.disabled = not (data.inventory.get("Stick", 0) >= 5 and data.inventory.get("Tinder", 0) >= 3)
	place_fire_button.disabled = data.inventory.get("CampfireKit", 0) <= 0 or data.campfire != null
	light_fire_button.disabled = data.campfire == null or data.campfire.is_lit
	add_fuel_button.disabled = data.campfire == null or data.inventory.get("Stick", 0) <= 0

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

func _update_hotbar(items: Array, active_index: int) -> void:
	for i in range(hotbar_slots.size()):
		var panel := hotbar_slots[i]
		var label := panel.get_child(0) as Label
		var item_name := ""
		if i < items.size():
			item_name = str(items[i])
		label.text = "%d\n%s" % [i + 1, item_name]
		panel.add_theme_stylebox_override("panel", _make_hotbar_style(i == active_index))

func _make_hotbar_style(active: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.1, 0.1, 0.1, 0.7)
	style.border_color = Color(0.8, 0.6, 0.2) if active else Color(0.2, 0.2, 0.2)
	style.border_width_all = 2
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

func _on_craft_kit_pressed() -> void:
	get_parent().craft_campfire_kit()

func _on_place_fire_pressed() -> void:
	get_parent().place_campfire()

func _on_light_fire_pressed() -> void:
	get_parent().light_fire()

func _on_add_fuel_pressed() -> void:
	get_parent().add_fuel()
