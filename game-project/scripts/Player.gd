extends CharacterBody3D

@export var move_speed = 6.0
@export var acceleration = 18.0
@export var deceleration = 20.0
@export var gravity = 22.0
@export var camera_smoothing = 10.0
@export var min_pitch = -35.0
@export var max_pitch = 60.0
@export var zoom_min = 2.5
@export var zoom_max = 8.0
@export var zoom_step = 0.6
@export var chop_cooldown = 0.5
@export var chop_range = 3.0
@export var placement_range = 5.5

@onready var camera_pivot = $CameraPivot
@onready var spring_arm = $CameraPivot/SpringArm3D
@onready var camera = $CameraPivot/SpringArm3D/Camera3D
@onready var interact_area = $InteractArea
@onready var chop_ray = $CameraPivot/SpringArm3D/Camera3D/ChopRay
@onready var held_axe = $HeldItems/StoneAxe
@onready var held_flint = $HeldItems/FlintSteel

var target_yaw = 0.0
var target_pitch = 0.0
var inventory
var next_chop_time := 0.0
var campfire_scene = preload("res://scenes/Campfire.tscn")
var tarp_tent_scene = preload("res://scenes/TarpTent.tscn")
var preview_instance
var preview_item_id := ""
var preview_valid := false

func _ready():
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	var basis = global_transform.basis
	target_yaw = basis.get_euler().y
	target_pitch = camera_pivot.rotation.x
	inventory = get_tree().get_first_node_in_group("inventory")
	if inventory != null:
		inventory.selection_changed.connect(_update_held_item)
		inventory.selection_changed.connect(_on_selection_changed)
	_update_held_item()
	_update_chop_ray()

func _unhandled_input(event):
	if event is InputEventMouseMotion:
		if Input.is_action_pressed("camera_rotate"):
			var motion = event.relative
			target_yaw -= motion.x * 0.01
			target_pitch -= motion.y * 0.01
			target_pitch = clamp(target_pitch, deg_to_rad(min_pitch), deg_to_rad(max_pitch))
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			spring_arm.spring_length = clamp(spring_arm.spring_length - zoom_step, zoom_min, zoom_max)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			spring_arm.spring_length = clamp(spring_arm.spring_length + zoom_step, zoom_min, zoom_max)
	if event.is_action_pressed("interact"):
		_try_interact()
	if event.is_action_pressed("chop"):
		_handle_primary_action()
	for i in range(6):
		if event.is_action_pressed("hotbar_%d" % (i + 1)):
			if inventory != null:
				inventory.select_slot(i)

func _process(delta):
	var current_yaw = rotation.y
	var current_pitch = camera_pivot.rotation.x
	rotation.y = lerp_angle(current_yaw, target_yaw, camera_smoothing * delta)
	camera_pivot.rotation.x = lerp(current_pitch, target_pitch, camera_smoothing * delta)
	_update_chop_ray()
	_update_placement_preview()
	_update_interact_prompt()

func _physics_process(delta):
	var input_vector = Vector2(
		Input.get_action_strength("move_right") - Input.get_action_strength("move_left"),
		Input.get_action_strength("move_forward") - Input.get_action_strength("move_backward")
	)
	if input_vector.length() > 1.0:
		input_vector = input_vector.normalized()

	var cam_basis = camera.global_transform.basis
	var forward = -cam_basis.z
	var right = cam_basis.x
	forward.y = 0.0
	right.y = 0.0
	forward = forward.normalized()
	right = right.normalized()
	var move_dir = (right * input_vector.x + forward * input_vector.y)

	if move_dir.length() > 0.0:
		var desired = move_dir.normalized() * move_speed
		velocity.x = move_toward(velocity.x, desired.x, acceleration * delta)
		velocity.z = move_toward(velocity.z, desired.z, acceleration * delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, deceleration * delta)
		velocity.z = move_toward(velocity.z, 0.0, deceleration * delta)

	if not is_on_floor():
		velocity.y -= gravity * delta
	else:
		velocity.y = 0.0

	move_and_slide()

func _try_interact():
	var areas = interact_area.get_overlapping_areas()
	for area in areas:
		if area != null:
			if area.has_meta("campfire"):
				var campfire = area.get_meta("campfire")
				if campfire != null and campfire.has_method("interact"):
					campfire.interact(_get_selected_item(), inventory)
					return
			if area.has_method("collect"):
				area.collect()
				return

func _handle_primary_action():
	var selected = _get_selected_item()
	if selected == "stone_axe":
		_try_chop()
		return
	if selected == "campfire_kit" or selected == "tarp_tent":
		_try_place(selected)

func _try_chop():
	if inventory == null:
		return
	if inventory.get_selected_item() != "stone_axe":
		return
	var now = Time.get_ticks_msec() / 1000.0
	if now < next_chop_time:
		return
	next_chop_time = now + chop_cooldown
	if chop_ray == null:
		return
	chop_ray.force_raycast_update()
	if not chop_ray.is_colliding():
		return
	var collider = chop_ray.get_collider()
	if collider != null and collider.has_meta("tree"):
		var tree = collider.get_meta("tree")
		if tree != null and tree.has_method("apply_chop"):
			tree.apply_chop()

func _try_place(item_id: String):
	if not preview_valid:
		_show_toast("Can't place here")
		return
	if inventory == null or inventory.get_count(item_id) <= 0:
		return
	var placeables = get_tree().get_first_node_in_group("placeables")
	if placeables == null:
		return
	var instance = _create_placeable(item_id)
	if instance == null:
		return
	instance.global_transform.origin = preview_instance.global_transform.origin
	placeables.add_child(instance)
	if item_id == "campfire_kit":
		if instance.has_method("add_tinder"):
			instance.add_tinder(1)
	inventory.remove_item(item_id, 1)
	_show_toast("Placed %s" % _get_item_label(item_id))
	_remove_preview()

func _create_placeable(item_id: String):
	if item_id == "campfire_kit":
		return campfire_scene.instantiate()
	if item_id == "tarp_tent":
		return tarp_tent_scene.instantiate()
	return null

func _update_held_item():
	if inventory == null:
		return
	var selected = inventory.get_selected_item()
	held_axe.visible = selected == "stone_axe"
	held_flint.visible = selected == "flint_steel"

func _on_selection_changed():
	_update_placement_preview(true)

func _update_chop_ray():
	if chop_ray != null:
		chop_ray.target_position = Vector3(0, 0, -chop_range)

func _update_interact_prompt():
	var prompt = get_tree().get_first_node_in_group("interact_prompt")
	if prompt == null:
		return
	var areas = interact_area.get_overlapping_areas()
	for area in areas:
		if area != null:
			if area.has_meta("campfire"):
				var campfire = area.get_meta("campfire")
				if campfire != null:
					prompt.show_prompt(campfire.get_prompt_text(_get_selected_item(), inventory))
					return
			if area.has_method("get_prompt_text"):
				prompt.show_prompt(area.get_prompt_text(_get_selected_item(), inventory))
				return
	prompt.show_prompt("")

func _update_placement_preview(force_refresh := false):
	var selected = _get_selected_item()
	if selected != "campfire_kit" and selected != "tarp_tent":
		_remove_preview()
		return
	if preview_instance == null or preview_item_id != selected or force_refresh:
		_remove_preview()
		preview_instance = _create_placeable(selected)
		if preview_instance == null:
			return
		preview_item_id = selected
		var placeables = get_tree().get_first_node_in_group("placeables")
		if placeables != null:
			placeables.add_child(preview_instance)
		if preview_instance.has_method("set_preview"):
			preview_instance.set_preview(true, true)
	var placement = _get_placement_position()
	if placement == null:
		preview_valid = false
		if preview_instance.has_method("set_preview"):
			preview_instance.set_preview(true, false)
		return
	preview_instance.global_transform.origin = placement
	preview_valid = _is_placement_valid(placement, _get_place_radius())
	if preview_instance.has_method("set_preview"):
		preview_instance.set_preview(true, preview_valid)

func _get_placement_position():
	var space_state = get_world_3d().direct_space_state
	var from = camera.global_transform.origin
	var to = from + -camera.global_transform.basis.z * placement_range
	var query = PhysicsRayQueryParameters3D.create(from, to)
	query.collision_mask = 1
	var result = space_state.intersect_ray(query)
	if result.is_empty():
		return null
	return result.position

func _get_place_radius() -> float:
	if preview_item_id == "campfire_kit":
		return 0.8
	if preview_item_id == "tarp_tent":
		return 1.6
	return 1.0

func _is_placement_valid(position: Vector3, radius: float) -> bool:
	var shape = SphereShape3D.new()
	shape.radius = radius
	var params = PhysicsShapeQueryParameters3D.new()
	params.shape_rid = shape.get_rid()
	params.transform = Transform3D(Basis(), position)
	params.collision_mask = 1
	params.exclude = [self.get_rid()]
	var space_state = get_world_3d().direct_space_state
	var results = space_state.intersect_shape(params, 8)
	for hit in results:
		var collider = hit.get("collider")
		if collider == null:
			continue
		if collider is StaticBody3D and collider.is_in_group("ground"):
			continue
		if collider.is_in_group("place_blocker"):
			return false
		if collider != self:
			return false
	return true

func _remove_preview():
	if preview_instance != null:
		preview_instance.queue_free()
	preview_instance = null
	preview_item_id = ""
	preview_valid = false

func _get_selected_item() -> String:
	if inventory == null:
		return ""
	return inventory.get_selected_item()

func _get_item_label(item_id: String) -> String:
	var items = get_tree().get_first_node_in_group("items")
	if items != null:
		return items.get_display_name(item_id)
	return item_id

func _show_toast(message: String):
	var toast = get_tree().get_first_node_in_group("toast")
	if toast != null:
		toast.show_toast(message)
