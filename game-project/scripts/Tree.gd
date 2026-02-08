extends Node3D

signal tree_felled(tree_id: String)

@export var min_hp := 3
@export var max_hp := 8

@onready var visual = $Visual
@onready var collider = $Collider
@onready var collision_shape = $Collider/CollisionShape3D
@onready var particles = $ChopParticles
@onready var audio_player = $ChopSound

var tree_id := ""
var hp := 0
var max_hits := 0
var is_felled := false

func _ready():
	add_to_group("trees")
	add_to_group("place_blocker")
	if collider != null:
		collider.set_meta("tree", self)
	_setup_audio()
	if tree_id != "":
		_seed_hp()

func set_tree_id(new_id: String):
	tree_id = new_id
	_seed_hp()

func _seed_hp():
	var seed_value = abs(hash(tree_id))
	max_hits = min_hp + int(seed_value % (max_hp - min_hp + 1))
	hp = max_hits

func apply_chop():
	if is_felled:
		return
	if hp <= 0:
		return
	hp -= 1
	_play_hit_feedback()
	var toast = get_tree().get_first_node_in_group("toast")
	if toast != null:
		toast.show_toast("Chop! %d/%d" % [max_hits - hp, max_hits], 1.0)
	if hp <= 0:
		_fell()

func _play_hit_feedback():
	if particles != null:
		particles.restart()
		particles.emitting = true
	var marker = get_tree().get_first_node_in_group("hit_marker")
	if marker != null:
		marker.show_marker()
	_play_hit_sound()

func _play_hit_sound():
	if audio_player == null:
		return
	if not audio_player.playing:
		audio_player.play()
	var playback = audio_player.get_stream_playback()
	if playback == null:
		return
	var mix_rate = audio_player.stream.mix_rate
	var frame_count = int(mix_rate * 0.08)
	for i in frame_count:
		var t = float(i) / float(frame_count)
		var amp = lerp(0.5, 0.0, t)
		var sample = (randf() * 2.0 - 1.0) * amp * 0.35
		playback.push_frame(Vector2(sample, sample))

func _setup_audio():
	if audio_player == null:
		return
	var generator = AudioStreamGenerator.new()
	generator.mix_rate = 22050
	generator.buffer_length = 0.2
	audio_player.stream = generator

func _fell():
	is_felled = true
	if collision_shape != null:
		collision_shape.set_deferred("disabled", true)
	_animate_fall()
	_spawn_loot()
	emit_signal("tree_felled", tree_id)

func _animate_fall():
	if visual == null:
		return
	var tween = create_tween()
	tween.tween_property(visual, "rotation_degrees:x", 90.0, 0.6).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)

func _spawn_loot():
	var pickup_scene = load("res://scenes/Pickup.tscn")
	if pickup_scene == null:
		return
	var log_count = randi_range(1, 2)
	var stick_count = randi_range(2, 4)
	_spawn_pickups(pickup_scene, "log", "Log", log_count)
	_spawn_pickups(pickup_scene, "stick", "Stick", stick_count)

func _spawn_pickups(pickup_scene: PackedScene, item_id: String, display_name: String, amount: int):
	for i in amount:
		var pickup = pickup_scene.instantiate()
		pickup.item_id = item_id
		pickup.display_name = display_name
		var offset = Vector3(randf_range(-0.8, 0.8), 0.2, randf_range(-0.8, 0.8))
		pickup.global_transform.origin = global_transform.origin + offset
		get_parent().add_child(pickup)

func get_save_data() -> Dictionary:
	return {
		"id": tree_id,
		"felled": is_felled
	}

func load_save_data(data: Dictionary):
	if data.has("felled") and data["felled"] is bool:
		is_felled = data["felled"]
		if is_felled:
			if collision_shape != null:
				collision_shape.set_deferred("disabled", true)
			if visual != null:
				visual.rotation_degrees.x = 90.0
