extends Label

var hide_timer

func _ready():
	add_to_group("toast")
	visible = false
	hide_timer = Timer.new()
	hide_timer.one_shot = true
	hide_timer.wait_time = 2.0
	hide_timer.timeout.connect(_on_timeout)
	add_child(hide_timer)

func show_toast(message, duration := 2.0):
	text = message
	visible = true
	hide_timer.wait_time = duration
	hide_timer.start()

func _on_timeout():
	visible = false
