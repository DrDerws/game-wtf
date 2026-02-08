extends Node

const MAIN_SCENE_PATH = "res://scenes/Main.tscn"

@onready var error_label = $CanvasLayer/ErrorLabel

func _ready():
	error_label.visible = false
	var packed = ResourceLoader.load(MAIN_SCENE_PATH)
	if packed == null or not (packed is PackedScene):
		_show_error("Failed to load %s." % MAIN_SCENE_PATH)
		return
	var instance = packed.instantiate()
	if instance == null:
		_show_error("Failed to instance %s." % MAIN_SCENE_PATH)
		return
	add_child(instance)

func _show_error(message):
	error_label.text = "BOOTSTRAP ERROR:\n" + message
	error_label.visible = true
