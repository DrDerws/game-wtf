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

@onready var camera_pivot = $CameraPivot
@onready var spring_arm = $CameraPivot/SpringArm3D
@onready var camera = $CameraPivot/SpringArm3D/Camera3D
@onready var interact_area = $InteractArea

var target_yaw = 0.0
var target_pitch = 0.0

func _ready():
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	var basis = global_transform.basis
	target_yaw = basis.get_euler().y
	target_pitch = camera_pivot.rotation.x

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

func _process(delta):
	var current_yaw = rotation.y
	var current_pitch = camera_pivot.rotation.x
	rotation.y = lerp_angle(current_yaw, target_yaw, camera_smoothing * delta)
	camera_pivot.rotation.x = lerp(current_pitch, target_pitch, camera_smoothing * delta)

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
