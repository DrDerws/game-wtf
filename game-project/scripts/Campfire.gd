extends Node3D
class_name Campfire

signal fire_lit
signal fuel_changed

@export var max_fuel: float = 120.0
@export var heat_radius: float = 6.0
@export var heat_strength: float = 18.0

var fuel: float = 0.0
var is_lit: bool = false
var flicker_timer: float = 0.0
var tinder: int = 0

@onready var ember: MeshInstance3D = $Ember
@onready var flame_particles: GPUParticles3D = $FlameParticles
@onready var smoke_particles: GPUParticles3D = $SmokeParticles
@onready var light: OmniLight3D = $FireLight
@onready var sparks_particles: GPUParticles3D = $SparksParticles
@onready var ignite_player: AudioStreamPlayer3D = $IgnitePlayer

func _ready() -> void:
	_update_visuals()

func add_fuel(amount: float) -> void:
	fuel = clamp(fuel + amount, 0.0, max_fuel)
	fuel_changed.emit()
	if fuel > 0.0 and is_lit:
		_update_visuals()

func light_fire() -> void:
	if fuel <= 0.0:
		return
	is_lit = true
	_update_visuals()
	_play_ignite_effects()
	fire_lit.emit()

func _process(delta: float) -> void:
	if not is_lit:
		return
	fuel -= delta
	flicker_timer += delta
	if flicker_timer >= 0.1:
		flicker_timer = 0.0
		light.light_energy = randf_range(2.2, 3.0)
	if fuel <= 0.0:
		fuel = 0.0
		is_lit = false
	_update_visuals()
	fuel_changed.emit()

func _update_visuals() -> void:
	ember.visible = is_lit or fuel > 0.0
	flame_particles.emitting = is_lit
	smoke_particles.emitting = is_lit
	light.visible = is_lit
	sparks_particles.emitting = false

func refresh() -> void:
	_update_visuals()

func _play_ignite_effects() -> void:
	if sparks_particles:
		sparks_particles.emitting = true
		sparks_particles.restart()
	if ignite_player:
		if ignite_player.stream == null:
			var generator := AudioStreamGenerator.new()
			generator.mix_rate = 44100
			generator.buffer_length = 0.3
			ignite_player.stream = generator
		ignite_player.play()
		var playback := ignite_player.get_stream_playback() as AudioStreamGeneratorPlayback
		if playback:
			var frames := int(44100 * 0.18)
			for i in range(frames):
				var t := float(i) / float(frames)
				var amp: float = lerp(0.5, 0.0, t)
				var sample: float = (randf() * 2.0 - 1.0) * amp
				playback.push_frame(Vector2(sample, sample))
