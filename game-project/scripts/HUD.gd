extends CanvasLayer

@onready var time_label: Label = $Root/TopLeft/TimeLabel
@onready var temp_label: Label = $Root/TopLeft/TempLabel
@onready var wind_label: Label = $Root/TopLeft/WindLabel

@onready var objective_label: Label = $Root/TopRight/Objectives
@onready var objective_distance: Label = $Root/TopRight/ObjectiveDistance

@onready var health_label: Label = $Root/BottomLeft/HealthLabel
@onready var temp_status: Label = $Root/BottomLeft/TempStatus

@onready var needs_label: Label = $Root/BottomRight/NeedsLabel

@onready var interact_label: Label = $Root/Center/InteractLabel
@onready var message_label: Label = $Root/Center/MessageLabel

@onready var inventory_panel: PanelContainer = $Root/InventoryPanel
@onready var crafting_panel: PanelContainer = $Root/CraftingPanel

@onready var inv_stick: Label = $Root/InventoryPanel/VBox/StickCount
@onready var inv_tinder: Label = $Root/InventoryPanel/VBox/TinderCount
@onready var inv_stone: Label = $Root/InventoryPanel/VBox/StoneCount
@onready var inv_fish: Label = $Root/InventoryPanel/VBox/FishCount
@onready var inv_water: Label = $Root/InventoryPanel/VBox/WaterCount
@onready var inv_camp: Label = $Root/InventoryPanel/VBox/CampfireCount

@onready var craft_kit_button: Button = $Root/CraftingPanel/VBox/CraftKit
@onready var place_fire_button: Button = $Root/CraftingPanel/VBox/PlaceFire
@onready var light_fire_button: Button = $Root/CraftingPanel/VBox/LightFire
@onready var add_fuel_button: Button = $Root/CraftingPanel/VBox/AddFuel

var message_timer: float = 0.0

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
	wind_label.text = "Wind: %.0f%%" % (data.wind * 100.0)

	health_label.text = "Health: %.0f" % data.health
	temp_status.text = "Body Temp: %.1f ( %s )" % [data.body_temp, data.status]

	needs_label.text = "Hunger: %.0f\nThirst: %.0f\nFatigue: %.0f" % [data.hunger, data.thirst, data.fatigue]

	_update_objectives(data.objective, data.objective_distance)
	interact_label.text = data.prompt

	inv_stick.text = "Sticks: %d" % data.inventory.get("Stick", 0)
	inv_tinder.text = "Tinder: %d" % data.inventory.get("Tinder", 0)
	inv_stone.text = "Stone: %d" % data.inventory.get("Stone", 0)
	inv_fish.text = "Fish: %d" % data.inventory.get("Fish", 0)
	inv_water.text = "Water: %d" % data.inventory.get("Water", 0)
	inv_camp.text = "Campfire Kit: %d" % data.inventory.get("CampfireKit", 0)

	craft_kit_button.disabled = not (data.inventory.get("Stick", 0) >= 5 and data.inventory.get("Tinder", 0) >= 3)
	place_fire_button.disabled = data.inventory.get("CampfireKit", 0) <= 0 or data.campfire != null
	light_fire_button.disabled = data.campfire == null or data.campfire.is_lit
	add_fuel_button.disabled = data.campfire == null or data.inventory.get("Stick", 0) <= 0

func _update_objectives(objective: Dictionary, distance_text: String) -> void:
	if objective.is_empty():
		objective_label.text = "Objective: Survived"
		objective_distance.text = ""
		return
	objective_label.text = "Objective: %s" % objective.text
	objective_distance.text = distance_text

func toggle_inventory() -> void:
	inventory_panel.visible = not inventory_panel.visible
	if inventory_panel.visible:
		crafting_panel.visible = false

func toggle_crafting() -> void:
	crafting_panel.visible = not crafting_panel.visible
	if crafting_panel.visible:
		inventory_panel.visible = false

func is_modal_open() -> bool:
	return inventory_panel.visible or crafting_panel.visible

func show_message(text: String) -> void:
	message_label.text = text
	message_timer = 2.5

func _on_drop_stick_pressed() -> void:
	get_parent().inventory.remove_item("Stick", 1)

func _on_drop_tinder_pressed() -> void:
	get_parent().inventory.remove_item("Tinder", 1)

func _on_drop_stone_pressed() -> void:
	get_parent().inventory.remove_item("Stone", 1)

func _on_drop_fish_pressed() -> void:
	get_parent().inventory.remove_item("Fish", 1)

func _on_drop_water_pressed() -> void:
	get_parent().inventory.remove_item("Water", 1)

func _on_craft_kit_pressed() -> void:
	get_parent().craft_campfire_kit()

func _on_place_fire_pressed() -> void:
	get_parent().place_campfire()

func _on_light_fire_pressed() -> void:
	get_parent().light_fire()

func _on_add_fuel_pressed() -> void:
	get_parent().add_fuel()
