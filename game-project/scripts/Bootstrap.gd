extends Node

const MAIN_SCENE_PATH = "res://scenes/Main.tscn"
const REQUIRED_SCENES = {
	"Bootstrap": "res://scenes/Bootstrap.tscn",
	"Main": "res://scenes/Main.tscn",
	"Player": "res://scenes/Player.tscn"
}
const REQUIRED_SCRIPTS = {
	"Bootstrap": "res://scripts/Bootstrap.gd",
	"Main": "res://scripts/Main.gd",
	"Player": "res://scripts/Player.gd"
}
const REQUIRED_INPUT_ACTIONS = [
	"move_forward",
	"move_backward",
	"move_left",
	"move_right",
	"interact",
	"inventory",
	"camera_rotate",
	"chop",
	"save_game",
	"load_game",
	"hotbar_1",
	"hotbar_2",
	"hotbar_3",
	"hotbar_4",
	"hotbar_5",
	"hotbar_6"
]

@onready var error_label = $CanvasLayer/ErrorLabel

func _ready():
	error_label.visible = false
	_setup_input()
	var issues = _run_smoke_test()
	if issues.size() > 0:
		_report_smoke_test_issues(issues)
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

func _run_smoke_test() -> Array:
	var issues: Array = []
	for label in REQUIRED_SCENES.keys():
		var path = REQUIRED_SCENES[label]
		if not ResourceLoader.exists(path):
			issues.append("Missing scene: %s (%s)" % [label, path])
	for label in REQUIRED_SCRIPTS.keys():
		var path = REQUIRED_SCRIPTS[label]
		var script_resource = ResourceLoader.load(path)
		if script_resource == null or not (script_resource is GDScript):
			issues.append("Missing or invalid script: %s (%s)" % [label, path])
	for action_name in REQUIRED_INPUT_ACTIONS:
		if not InputMap.has_action(action_name):
			issues.append("Missing input action: %s" % action_name)
	return issues

func _report_smoke_test_issues(issues: Array):
	for issue in issues:
		push_error("Smoke test: " + str(issue))
	_show_error("SMOKE TEST FAILED:\n" + "\n".join(issues))

func _show_error(message: String):
	error_label.text = "BOOTSTRAP ERROR:\n" + message
	error_label.visible = true
