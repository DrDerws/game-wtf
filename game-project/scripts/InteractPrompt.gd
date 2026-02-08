extends Label

var hide_timer: Timer

func _ready():
	add_to_group("interact_prompt")
	visible = false
	hide_timer = Timer.new()
	hide_timer.one_shot = true
	hide_timer.wait_time = 0.1
	hide_timer.timeout.connect(_on_timeout)
	add_child(hide_timer)

func show_prompt(message: String):
	text = message
	visible = message != ""
	if visible:
		hide_timer.start()

func _on_timeout():
	visible = false
