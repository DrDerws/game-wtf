extends Node

const MAIN_SCENE_PATH = "res://scenes/Main.tscn"

@onready var error_label = $CanvasLayer/ErrorLabel

func _ready():
	error_label.visible = false
	_setup_input()
	var packed = ResourceLoader.load(MAIN_SCENE_PATH)
	if packed == null or not (packed is PackedScene):
		_show_error("Failed to load %s." % MAIN_SCENE_PATH)
		return
	var instance = packed.instantiate()
	if instance == null:
		_show_error("Failed to instance %s." % MAIN_SCENE_PATH)
		return
	add_child(instance)

func _setup_input():
	_add_action_key("move_forward", KEY_W)
	_add_action_key("move_backward", KEY_S)
	_add_action_key("move_left", KEY_A)
	_add_action_key("move_right", KEY_D)
	_add_action_key("interact", KEY_E)
	_add_action_key("inventory", KEY_I)
	_add_action_mouse("camera_rotate", MOUSE_BUTTON_RIGHT)
	_add_action_mouse("chop", MOUSE_BUTTON_LEFT)
	_add_action_key("chop", KEY_F)
	_add_action_key("save_game", KEY_F5)
	_add_action_key("load_game", KEY_F9)
	for i in range(6):
		_add_action_key("hotbar_%d" % (i + 1), KEY_1 + i)

func _add_action_key(action_name: String, keycode: int):
	if not InputMap.has_action(action_name):
		InputMap.add_action(action_name)
	var event = InputEventKey.new()
	event.keycode = keycode
	InputMap.action_add_event(action_name, event)

func _add_action_mouse(action_name: String, button_index: int):
	if not InputMap.has_action(action_name):
		InputMap.add_action(action_name)
	var event = InputEventMouseButton.new()
	event.button_index = button_index
	InputMap.action_add_event(action_name, event)

func _show_error(message):
	error_label.text = "BOOTSTRAP ERROR:\n" + message
	error_label.visible = true
