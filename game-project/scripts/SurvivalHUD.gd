extends Control

@onready var health_label = $Panel/MarginContainer/VBoxContainer/HealthLabel
@onready var body_temp_label = $Panel/MarginContainer/VBoxContainer/BodyTempLabel
@onready var ambient_temp_label = $Panel/MarginContainer/VBoxContainer/AmbientTempLabel
@onready var time_label = $Panel/MarginContainer/VBoxContainer/TimeLabel
@onready var status_label = $Panel/MarginContainer/VBoxContainer/StatusLabel

var survival

func _ready():
	survival = get_tree().get_first_node_in_group("survival")
	if survival != null:
		survival.health_changed.connect(_update_health)
		survival.body_temp_changed.connect(_update_body_temp)
		survival.status_changed.connect(_update_status)
	_update_all()

func _process(_delta):
	_update_time_and_ambient()

func _update_all():
	if survival == null:
		return
	_update_health(survival.health)
	_update_body_temp(survival.body_temp_c)
	_update_status(survival.get_status_text())
	_update_time_and_ambient()

func _update_health(value):
	health_label.text = "Health: %d" % int(round(value))

func _update_body_temp(value):
	body_temp_label.text = "Body Temp: %.1fC" % value

func _update_status(value):
	status_label.text = "Status: %s" % value

func _update_time_and_ambient():
	if survival == null:
		return
	ambient_temp_label.text = "Ambient: %.1fC" % survival.ambient_temp_c
	var hours = int(floor(survival.time_of_day))
	var minutes = int(floor((survival.time_of_day - hours) * 60.0))
	time_label.text = "Time: %02d:%02d" % [hours, minutes]
