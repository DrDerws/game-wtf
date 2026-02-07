extends CharacterBody3D

@export var move_speed: float = 6.0
@export var acceleration: float = 14.0
@export var deceleration: float = 18.0
@export var max_pitch: float = 50.0
@export var min_pitch: float = -35.0
@export var zoom_min: float = 3.5
@export var zoom_max: float = 8.0
@export var zoom_speed: float = 0.8

var yaw: float = 0.0
var pitch: float = -15.0
var target_yaw: float = 0.0
var target_pitch: float = -15.0

@onready var spring_arm: SpringArm3D = $SpringArm3D
@onready var camera: Camera3D = $SpringArm3D/Camera3D
@onready var interact_area: Area3D = $InteractArea

var input_enabled: bool = true

func _ready() -> void:
	spring_arm.spring_length = 5.5
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	target_yaw = yaw
	target_pitch = pitch

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_RIGHT:
			if event.pressed:
				Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
			else:
				Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			spring_arm.spring_length = clamp(spring_arm.spring_length - zoom_speed, zoom_min, zoom_max)
		if event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			spring_arm.spring_length = clamp(spring_arm.spring_length + zoom_speed, zoom_min, zoom_max)
	if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
		target_yaw -= event.relative.x * 0.2
		target_pitch = clamp(target_pitch - event.relative.y * 0.2, min_pitch, max_pitch)

func _process(delta: float) -> void:
	yaw = lerp(yaw, target_yaw, delta * 12.0)
	pitch = lerp(pitch, target_pitch, delta * 12.0)
	rotation_degrees.y = yaw
	spring_arm.rotation_degrees.x = pitch

func _physics_process(delta: float) -> void:
	if not input_enabled:
		velocity.x = move_toward(velocity.x, 0.0, deceleration * delta)
		velocity.z = move_toward(velocity.z, 0.0, deceleration * delta)
		move_and_slide()
		return
	var input_dir := Vector2(
		Input.get_action_strength("move_right") - Input.get_action_strength("move_left"),
		Input.get_action_strength("move_backward") - Input.get_action_strength("move_forward")
	)
	if input_dir.length() > 1.0:
		input_dir = input_dir.normalized()
	var camera_basis := camera.global_transform.basis
	var forward := -camera_basis.z
	forward.y = 0.0
	forward = forward.normalized()
	var right := camera_basis.x
	right.y = 0.0
	right = right.normalized()
	var direction := (right * input_dir.x + forward * input_dir.y).normalized()
	var target_velocity := direction * move_speed
	velocity.x = move_toward(velocity.x, target_velocity.x, acceleration * delta)
	velocity.z = move_toward(velocity.z, target_velocity.z, acceleration * delta)
	velocity.y -= 20.0 * delta
	move_and_slide()

func get_interactable() -> Node3D:
	for body in interact_area.get_overlapping_areas():
		if body.has_method("harvest"):
			return body
	for body in interact_area.get_overlapping_bodies():
		if body.has_method("interact"):
			return body
	return null
