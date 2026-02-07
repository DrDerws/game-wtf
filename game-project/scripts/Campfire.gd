extends Node3D

signal fire_lit
signal fuel_changed

@export var max_fuel: float = 120.0
@export var heat_radius: float = 6.0
@export var heat_strength: float = 18.0

var fuel: float = 0.0
var is_lit: bool = false

@onready var flame_mesh: MeshInstance3D = $Flame
@onready var light: OmniLight3D = $FireLight

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
	fire_lit.emit()

func _process(delta: float) -> void:
	if not is_lit:
		return
	fuel -= delta
	if fuel <= 0.0:
		fuel = 0.0
		is_lit = false
	_update_visuals()
	fuel_changed.emit()

func _update_visuals() -> void:
	flame_mesh.visible = is_lit
	light.visible = is_lit

func refresh() -> void:
	_update_visuals()
