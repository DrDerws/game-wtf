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

func _ready():
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	var basis = global_transform.basis
	target_yaw = basis.get_euler().y
	target_pitch = camera_pivot.rotation.x
	inventory = get_tree().get_first_node_in_group("inventory")
	if inventory != null:
		inventory.selection_changed.connect(_update_held_item)
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
		_try_chop()
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
		if area != null and area.has_method("collect"):
			area.collect()
			break

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

func _update_held_item():
	if inventory == null:
		return
	var selected = inventory.get_selected_item()
	held_axe.visible = selected == "stone_axe"
	held_flint.visible = selected == "flint_steel"

func _update_chop_ray():
	if chop_ray != null:
		chop_ray.target_position = Vector3(0, 0, -chop_range)
