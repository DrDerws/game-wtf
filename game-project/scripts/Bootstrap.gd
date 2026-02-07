extends Node3D

@export var main_scene_path: String = "res://scenes/Main.tscn"

@onready var error_label: Label3D = $ErrorLabel

func _ready() -> void:
	var packed := load(main_scene_path)
	if packed == null or not (packed is PackedScene):
		_show_error("Main failed to load")
		return
	var instance := packed.instantiate()
	if instance == null:
		_show_error("Main failed to load")
		return
	add_child(instance)

func _show_error(message: String) -> void:
	error_label.text = message
	error_label.visible = true
