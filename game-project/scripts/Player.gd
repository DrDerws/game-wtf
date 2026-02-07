extends CharacterBody3D

signal attack_pressed

@export var move_speed: float = 6.0
@export var acceleration: float = 14.0
@export var deceleration: float = 18.0
@export var max_pitch: float = 50.0
@export var min_pitch: float = -35.0
@export var zoom_min: float = 3.5
@export var zoom_max: float = 8.0
@export var zoom_speed: float = 0.8
@export var zoom_smooth: float = 8.0

var yaw: float = 0.0
var pitch: float = -15.0
var target_yaw: float = 0.0
var target_pitch: float = -15.0
var target_zoom: float = 5.5

@onready var spring_arm: SpringArm3D = $SpringArm3D
@onready var camera: Camera3D = $SpringArm3D/Camera3D
@onready var interact_area: Area3D = $InteractArea
@onready var hand: Node3D = $Hand
@onready var held_mesh: MeshInstance3D = $Hand/HeldItemMesh

var input_enabled: bool = true
var is_swinging: bool = false

func _ready() -> void:
	spring_arm.spring_length = 5.5
	target_zoom = spring_arm.spring_length
	spring_arm.collision_mask = 1
	spring_arm.margin = 0.2
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	target_yaw = yaw
	target_pitch = pitch
	_set_held_item("")

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_RIGHT:
			if event.pressed:
				Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
			else:
				Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			target_zoom = clamp(target_zoom - zoom_speed, zoom_min, zoom_max)
		if event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			target_zoom = clamp(target_zoom + zoom_speed, zoom_min, zoom_max)
	if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
		target_yaw -= event.relative.x * 0.2
		target_pitch = clamp(target_pitch - event.relative.y * 0.2, min_pitch, max_pitch)
	if event.is_action_pressed("attack"):
		attack_pressed.emit()

func _process(delta: float) -> void:
	yaw = lerp(yaw, target_yaw, delta * 12.0)
	pitch = lerp(pitch, target_pitch, delta * 12.0)
	rotation_degrees.y = yaw
	spring_arm.rotation_degrees.x = pitch
	spring_arm.spring_length = lerp(spring_arm.spring_length, target_zoom, delta * zoom_smooth)

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

func set_held_item(item_name: String) -> void:
	_set_held_item(item_name)

func _set_held_item(item_name: String) -> void:
	var mesh: Mesh = null
	if item_name == "Axe":
		var axe_mesh := BoxMesh.new()
		axe_mesh.size = Vector3(0.15, 0.6, 0.08)
		mesh = axe_mesh
	elif item_name == "FlintSteel":
		var flint_mesh := BoxMesh.new()
		flint_mesh.size = Vector3(0.2, 0.12, 0.08)
		mesh = flint_mesh
	elif item_name == "Torch":
		var torch_mesh := CylinderMesh.new()
		torch_mesh.top_radius = 0.05
		torch_mesh.bottom_radius = 0.07
		torch_mesh.height = 0.6
		mesh = torch_mesh
	held_mesh.mesh = mesh
	held_mesh.visible = mesh != null

func play_swing() -> void:
	if is_swinging:
		return
	is_swinging = true
	var tween := create_tween()
	tween.tween_property(hand, "rotation_degrees", Vector3(-50, 0, 30), 0.12)
	tween.tween_property(hand, "rotation_degrees", Vector3(0, 0, 0), 0.18)
	tween.finished.connect(func(): is_swinging = false)
