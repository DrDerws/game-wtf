extends Node

signal health_changed(value)
signal body_temp_changed(value)
signal status_changed(status)

@export var day_cycle_seconds := 600.0
@export var wind_level := 0.35
@export var base_cooling_rate := 0.08
@export var wind_cooling_rate := 0.12
@export var warming_rate := 0.05
@export var campfire_heating_rate := 1.2
@export var shelter_wind_multiplier := 0.3
@export var health_drain_rate := 0.6
@export var health_recovery_rate := 0.4

var time_of_day := 8.0
var ambient_temp_c := -4.0
var body_temp_c := 37.0
var health := 100.0
var is_sheltered := false

func _ready():
	add_to_group("survival")
	_update_ambient_temp()

func _process(delta):
	_update_time(delta)
	_update_ambient_temp()
	_update_body_temp(delta)
	_update_health(delta)

func _update_time(delta):
	var day_progress = 24.0 / day_cycle_seconds
	time_of_day = fmod(time_of_day + day_progress * delta, 24.0)

func _update_ambient_temp():
	var phase = (time_of_day - 12.0) / 24.0 * TAU
	var normalized = (cos(phase) + 1.0) * 0.5
	ambient_temp_c = lerp(-15.0, 2.0, normalized)

func _update_body_temp(delta):
	var campfire_heat = _get_campfire_heat()
	is_sheltered = _check_sheltered()
	var wind_factor = wind_level * wind_cooling_rate
	if is_sheltered:
		wind_factor *= shelter_wind_multiplier
	var ambient_delta = ambient_temp_c - body_temp_c
	var rate = base_cooling_rate + wind_factor
	if ambient_delta > 0.0:
		rate = warming_rate
	body_temp_c += ambient_delta * rate * delta
	body_temp_c += campfire_heat * campfire_heating_rate * delta
	body_temp_c = clamp(body_temp_c, 25.0, 41.0)
	body_temp_changed.emit(body_temp_c)
	status_changed.emit(get_status_text())

func _update_health(delta):
	if body_temp_c < 35.0:
		var severity = 35.0 - body_temp_c
		health = max(health - severity * health_drain_rate * delta, 0.0)
	elif body_temp_c >= 36.5 and health < 100.0:
		health = min(health + health_recovery_rate * delta, 100.0)
	health_changed.emit(health)

func _get_campfire_heat() -> float:
	var total = 0.0
	for campfire in get_tree().get_nodes_in_group("campfires"):
		if campfire.has_method("get_heat_at_position"):
			total += campfire.get_heat_at_position(_get_player_position())
	return clamp(total, 0.0, 1.0)

func _check_sheltered() -> bool:
	for tent in get_tree().get_nodes_in_group("tents"):
		if tent.has_method("is_position_sheltered"):
			if tent.is_position_sheltered(_get_player_position()):
				return true
	return false

func _get_player_position() -> Vector3:
	var player = get_tree().get_first_node_in_group("player")
	if player != null:
		return player.global_transform.origin
	return Vector3.ZERO

func get_status_text() -> String:
	var status = "Warm"
	if body_temp_c < 35.0:
		status = "Freezing"
	elif body_temp_c < 36.0:
		status = "Cold"
	if is_sheltered:
		status += " / Sheltered"
	return status

func get_save_data() -> Dictionary:
	return {
		"time_of_day": time_of_day,
		"body_temp_c": body_temp_c,
		"health": health
	}

func load_save_data(data: Dictionary):
	if data.has("time_of_day"):
		time_of_day = float(data["time_of_day"])
	if data.has("body_temp_c"):
		body_temp_c = float(data["body_temp_c"])
	if data.has("health"):
		health = float(data["health"])
	_update_ambient_temp()
