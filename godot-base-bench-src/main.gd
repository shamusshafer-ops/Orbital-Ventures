extends Node3D

const MODULE_SPECS := [
	{"id":"can_std", "name":"Pressurized Habitat", "color":Color("#b8c0c7"), "radius":2.1, "kind":"can"},
	{"id":"hab_dome", "name":"Habitat Dome", "color":Color("#b9c7cf"), "radius":2.0, "kind":"dome"},
	{"id":"lab_mod", "name":"Research Lab", "color":Color("#8fb8d4"), "radius":2.1, "kind":"lab"},
	{"id":"power_truss", "name":"Solar Power Truss", "color":Color("#e8b64c"), "radius":2.25, "kind":"truss"},
	{"id":"depot_mod", "name":"Propellant Depot", "color":Color("#67c587"), "radius":2.15, "kind":"depot"},
	{"id":"isru_plant", "name":"ISRU Plant", "color":Color("#c19a64"), "radius":2.2, "kind":"isru"},
	{"id":"reactor_pad", "name":"Reactor Pad", "color":Color("#d7b34f"), "radius":2.0, "kind":"reactor"},
	{"id":"rover_garage", "name":"Rover Garage", "color":Color("#9aa8ad"), "radius":2.35, "kind":"garage"},
	{"id":"greenhouse", "name":"Greenhouse", "color":Color("#76bd78"), "radius":2.1, "kind":"greenhouse"},
]
const PORTS := {
	"east": Vector3.RIGHT,
	"west": Vector3.LEFT,
	"north": Vector3.FORWARD,
	"south": Vector3.BACK,
}

var modules: Array[Node3D] = []
var module_by_id: Dictionary = {}
var selected: Node3D
var dragging: Node3D
var drag_offset := Vector3.ZERO
var orbiting := false
var last_mouse := Vector2.ZERO
var yaw := -0.72
var pitch := -0.62
var distance := 26.0
var camera_target := Vector3(0.0, 0.7, 0.0)
var camera: Camera3D
var module_root: Node3D
var link_root: Node3D
var guide_root: Node3D
var selection_ring: MeshInstance3D
var tray: HBoxContainer
var status_label: Label
var selection_label: Label
var clear_button: Button
var reset_button: Button
var rotate_left_button: Button
var rotate_right_button: Button
var remove_button: Button
var default_layout: Dictionary = {}
var js_message_callback
var web_state_loaded := false


func _ready() -> void:
	_build_world()
	_build_hud()
	_spawn_modules()
	_apply_camera()
	_setup_web_bridge()
	_refresh_editor()


func _build_world() -> void:
	var environment := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#7b4932")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#d8a376")
	env.ambient_light_energy = 0.55
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true
	env.fog_light_color = Color("#b46f48")
	env.fog_density = 0.008
	environment.environment = env
	add_child(environment)

	var sun := DirectionalLight3D.new()
	sun.light_color = Color("#ffd3aa")
	sun.light_energy = 2.2
	sun.rotation_degrees = Vector3(-52.0, -34.0, 0.0)
	sun.shadow_enabled = true
	add_child(sun)

	var ground_body := StaticBody3D.new()
	ground_body.name = "MarsTerrain"
	var ground_mesh := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(90.0, 64.0)
	plane.subdivide_width = 24
	plane.subdivide_depth = 18
	ground_mesh.mesh = plane
	ground_mesh.material_override = _material(Color("#71412c"), 0.0, 0.96)
	ground_body.add_child(ground_mesh)
	var ground_shape := CollisionShape3D.new()
	var ground_box := BoxShape3D.new()
	ground_box.size = Vector3(90.0, 0.2, 64.0)
	ground_shape.shape = ground_box
	ground_shape.position.y = -0.12
	ground_body.add_child(ground_shape)
	add_child(ground_body)

	var rock_material := _material(Color("#542b20"), 0.0, 1.0)
	var rng := RandomNumberGenerator.new()
	rng.seed = 80717
	for i in range(46):
		var p := Vector3(rng.randf_range(-39.0, 39.0), 0.0, rng.randf_range(-26.0, 26.0))
		if abs(p.x) < 18.0 and abs(p.z) < 13.0:
			continue
		var rock := MeshInstance3D.new()
		var mesh := SphereMesh.new()
		mesh.radius = rng.randf_range(0.18, 0.72)
		mesh.height = mesh.radius * 1.2
		rock.mesh = mesh
		rock.material_override = rock_material
		rock.scale = Vector3(rng.randf_range(0.8, 1.5), rng.randf_range(0.35, 0.7), rng.randf_range(0.8, 1.5))
		rock.position = p
		add_child(rock)

	module_root = Node3D.new()
	module_root.name = "Modules"
	add_child(module_root)
	link_root = Node3D.new()
	link_root.name = "RigidDockLinks"
	add_child(link_root)
	guide_root = Node3D.new()
	guide_root.name = "ConnectionGuides"
	add_child(guide_root)

	camera = Camera3D.new()
	camera.fov = 43.0
	camera.near = 0.1
	camera.far = 180.0
	camera.current = true
	add_child(camera)

	selection_ring = MeshInstance3D.new()
	var ring := TorusMesh.new()
	ring.inner_radius = 2.45
	ring.outer_radius = 2.58
	selection_ring.mesh = ring
	selection_ring.material_override = _emissive_material(Color("#67d9ff"), 1.8)
	selection_ring.visible = false
	add_child(selection_ring)


func _build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)

	var top := PanelContainer.new()
	top.set_anchors_preset(Control.PRESET_TOP_WIDE)
	top.offset_left = 18.0
	top.offset_top = 16.0
	top.offset_right = -18.0
	top.offset_bottom = 94.0
	top.add_theme_stylebox_override("panel", _panel_style(Color("#071119e8"), Color("#2f5668")))
	layer.add_child(top)
	var top_row := HBoxContainer.new()
	top_row.add_theme_constant_override("separation", 10)
	top.add_child(top_row)

	var title_box := VBoxContainer.new()
	title_box.custom_minimum_size.x = 330.0
	top_row.add_child(title_box)
	var eyebrow := Label.new()
	eyebrow.text = "GODOT TECHNOLOGY TEST · MARS"
	eyebrow.add_theme_color_override("font_color", Color("#67d9ff"))
	eyebrow.add_theme_font_size_override("font_size", 12)
	title_box.add_child(eyebrow)
	var title := Label.new()
	title.text = "BASE BENCH"
	title.add_theme_font_size_override("font_size", 27)
	title.add_theme_color_override("font_color", Color("#eaf5f8"))
	title_box.add_child(title)

	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top_row.add_child(spacer)
	rotate_left_button = _hud_button("↺ MODULE", "Rotate selected module 90° left")
	rotate_left_button.pressed.connect(func(): _rotate_selected(-1))
	top_row.add_child(rotate_left_button)
	rotate_right_button = _hud_button("↻ MODULE", "Rotate selected module 90° right")
	rotate_right_button.pressed.connect(func(): _rotate_selected(1))
	top_row.add_child(rotate_right_button)
	remove_button = _hud_button("⌫ REMOVE", "Return selected module to the tray")
	remove_button.pressed.connect(_remove_selected)
	top_row.add_child(remove_button)
	clear_button = _hud_button("∅ CLEAR CANVAS", "Move all modules into the tray")
	clear_button.pressed.connect(_clear_canvas)
	top_row.add_child(clear_button)
	reset_button = _hud_button("↶ RESET LAYOUT", "Restore the generated layout")
	reset_button.pressed.connect(_reset_layout)
	top_row.add_child(reset_button)

	var left := PanelContainer.new()
	left.position = Vector2(18.0, 112.0)
	left.size = Vector2(272.0, 186.0)
	left.add_theme_stylebox_override("panel", _panel_style(Color("#071119dd"), Color("#294957")))
	layer.add_child(left)
	var info := VBoxContainer.new()
	info.add_theme_constant_override("separation", 7)
	left.add_child(info)
	var info_title := Label.new()
	info_title.text = "ASSEMBLY CONTROL"
	info_title.add_theme_color_override("font_color", Color("#67d9ff"))
	info_title.add_theme_font_size_override("font_size", 12)
	info.add_child(info_title)
	selection_label = Label.new()
	selection_label.text = "NO MODULE SELECTED"
	selection_label.add_theme_font_size_override("font_size", 18)
	info.add_child(selection_label)
	status_label = Label.new()
	status_label.text = "Ready"
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status_label.add_theme_color_override("font_color", Color("#9eb4bd"))
	info.add_child(status_label)
	var hint := Label.new()
	hint.text = "LMB drag module · LMB empty / RMB orbit\nWheel zoom · Q/E rotate · Delete removes"
	hint.add_theme_color_override("font_color", Color("#708a94"))
	hint.add_theme_font_size_override("font_size", 12)
	info.add_child(hint)

	var tray_panel := PanelContainer.new()
	tray_panel.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	tray_panel.offset_left = 18.0
	tray_panel.offset_top = -82.0
	tray_panel.offset_right = -18.0
	tray_panel.offset_bottom = -16.0
	tray_panel.add_theme_stylebox_override("panel", _panel_style(Color("#071119eb"), Color("#2f5668")))
	layer.add_child(tray_panel)
	var tray_row := HBoxContainer.new()
	tray_row.add_theme_constant_override("separation", 8)
	tray_panel.add_child(tray_row)
	var tray_label := Label.new()
	tray_label.text = "MODULE TRAY"
	tray_label.custom_minimum_size.x = 124.0
	tray_label.add_theme_color_override("font_color", Color("#67d9ff"))
	tray_label.add_theme_font_size_override("font_size", 12)
	tray_row.add_child(tray_label)
	tray = HBoxContainer.new()
	tray.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tray.add_theme_constant_override("separation", 6)
	tray_row.add_child(tray)


func _spawn_modules() -> void:
	var positions := [
		Vector3(-7.5, 0.0, -8.0),
		Vector3(-2.5, 0.0, -8.0),
		Vector3(2.5, 0.0, -8.0),
		Vector3(7.5, 0.0, -8.0),
		Vector3(-5.0, 0.0, -2.7),
		Vector3(0.0, 0.0, -2.7),
		Vector3(5.2, 0.0, -2.7),
		Vector3(-3.0, 0.0, 3.3),
		Vector3(2.3, 0.0, 3.3),
		Vector3(7.4, 0.0, 3.3),
	]
	for i in range(MODULE_SPECS.size()):
		var spec: Dictionary = MODULE_SPECS[i]
		var module := _create_module(spec)
		module.position = positions[i]
		module.set_meta("default_position", positions[i])
		module.set_meta("default_yaw", 0.0)
		module.set_meta("dock_parent", "")
		module.set_meta("target_port", "")
		module.set_meta("own_port", "")
		module_root.add_child(module)
		modules.append(module)
		module_by_id[spec.id] = module
		default_layout[spec.id] = {"position": positions[i], "yaw": 0.0}


func _create_module(spec: Dictionary) -> Node3D:
	var root := Node3D.new()
	root.name = str(spec.id)
	root.set_meta("module_id", spec.id)
	root.set_meta("display_name", spec.name)
	root.set_meta("radius", spec.radius)
	root.set_meta("in_tray", false)

	var pad := MeshInstance3D.new()
	var pad_mesh := CylinderMesh.new()
	pad_mesh.top_radius = spec.radius + 0.25
	pad_mesh.bottom_radius = spec.radius + 0.42
	pad_mesh.height = 0.22
	pad.mesh = pad_mesh
	pad.position.y = 0.11
	pad.material_override = _material(Color("#56646a"), 0.45, 0.68)
	root.add_child(pad)

	var body_color: Color = spec.color
	match str(spec.kind):
		"can":
			_add_box(root, Vector3(0, 1.0, 0), Vector3(3.6, 1.65, 2.35), body_color)
			_add_box(root, Vector3(0, 1.06, 1.2), Vector3(1.8, 0.55, 0.08), Color("#4eb3e6"), true)
		"dome":
			_add_sphere(root, Vector3(0, 1.05, 0), Vector3(1.55, 0.76, 1.55), body_color)
			_add_torus(root, Vector3(0, 0.42, 0), Vector3.ZERO, 1.48, Color("#d4e0e5"))
		"lab":
			_add_box(root, Vector3(0, 0.95, 0), Vector3(3.4, 1.55, 2.4), body_color)
			_add_box(root, Vector3(0, 1.82, 0), Vector3(2.8, 0.18, 1.9), Color("#d8e2e6"))
			_add_box(root, Vector3(0, 1.05, 1.23), Vector3(1.75, 0.62, 0.08), Color("#4eb3e6"), true)
		"truss":
			_add_box(root, Vector3(0, 0.72, 0), Vector3(4.0, 0.32, 0.32), body_color)
			_add_box(root, Vector3(0, 1.15, -1.25), Vector3(4.3, 0.12, 1.65), Color("#174b7d"), true)
			_add_box(root, Vector3(0, 1.15, 1.25), Vector3(4.3, 0.12, 1.65), Color("#174b7d"), true)
		"depot":
			_add_box(root, Vector3(0, 0.75, 0), Vector3(3.7, 0.38, 2.1), body_color)
			_add_cylinder(root, Vector3(-0.85, 1.35, 0), 0.48, 1.75, Color("#d2a84a"))
			_add_cylinder(root, Vector3(0.85, 1.35, 0), 0.48, 1.75, Color("#d2a84a"))
		"isru":
			_add_box(root, Vector3(0, 0.8, 0), Vector3(3.5, 1.25, 2.2), body_color)
			for x in [-1.05, 1.05]:
				_add_cylinder(root, Vector3(x, 1.75, 0.35), 0.43, 1.55, Color("#d2a84a"))
		"reactor":
			_add_cylinder(root, Vector3(0, 1.35, 0), 0.72, 2.45, body_color)
			for i in range(8):
				var angle := i * TAU / 8.0
				_add_box(root, Vector3(cos(angle) * 1.0, 0.95, sin(angle) * 1.0), Vector3(0.16, 1.25, 1.2), Color("#d9ad42"), false, angle)
		"garage":
			_add_box(root, Vector3(0, 0.95, 0), Vector3(4.0, 1.7, 2.75), body_color)
			_add_box(root, Vector3(0, 0.9, 1.39), Vector3(2.25, 1.2, 0.08), Color("#26343b"))
		"greenhouse":
			_add_box(root, Vector3(0, 0.82, 0), Vector3(3.7, 1.25, 2.25), Color("#8ebd94"))
			_add_box(root, Vector3(0, 1.48, 0), Vector3(3.3, 0.12, 1.82), Color("#5bbd8c"), true)

	var label := Label3D.new()
	label.text = str(spec.name).to_upper()
	label.position = Vector3(0, 3.25, 0)
	label.font_size = 32
	label.outline_size = 7
	label.modulate = Color("#e9f6fa")
	label.outline_modulate = Color("#061015")
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	root.add_child(label)

	var body := StaticBody3D.new()
	body.set_meta("module_id", spec.id)
	var collider := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(spec.radius * 1.65, 2.5, spec.radius * 1.5)
	collider.shape = shape
	collider.position.y = 1.25
	body.add_child(collider)
	root.add_child(body)

	for port_name in PORTS:
		var direction: Vector3 = PORTS[port_name]
		var marker := MeshInstance3D.new()
		var marker_mesh := SphereMesh.new()
		marker_mesh.radius = 0.17
		marker_mesh.height = 0.34
		marker.mesh = marker_mesh
		marker.position = direction * float(spec.radius) + Vector3.UP * 0.68
		marker.material_override = _emissive_material(Color("#67d9ff"), 2.5)
		marker.set_meta("port_name", port_name)
		root.add_child(marker)
	return root


func _process(_delta: float) -> void:
	if selected and is_instance_valid(selected) and selected.visible:
		selection_ring.visible = true
		selection_ring.position = selected.position + Vector3.UP * 0.3
		selection_ring.rotation.y = selected.rotation.y
	else:
		selection_ring.visible = false


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_Q:
			_rotate_selected(-1)
		elif event.keycode == KEY_E:
			_rotate_selected(1)
		elif event.keycode == KEY_DELETE:
			_remove_selected()
		elif event.keycode == KEY_R:
			_reset_camera()
	if event is InputEventMouseButton:
		last_mouse = event.position
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			distance = clampf(distance * 0.9, 8.0, 60.0)
			_apply_camera()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			distance = clampf(distance * 1.1, 8.0, 60.0)
			_apply_camera()
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			orbiting = event.pressed
		elif event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				var hit_module := _pick_module(event.position)
				if hit_module:
					_select(hit_module)
					dragging = hit_module
					var ground: Variant = _ground_point(event.position)
					if ground:
						drag_offset = dragging.position - ground
					_detach(dragging)
					status_label.text = "Dragging %s — cyan nodes are valid snap targets." % dragging.get_meta("display_name")
				else:
					_select(null)
					orbiting = true
			else:
				if dragging:
					_finish_drag()
				dragging = null
				orbiting = false
	if event is InputEventMouseMotion:
		if dragging:
			var ground: Variant = _ground_point(event.position)
			if ground:
				dragging.position = Vector3(ground.x + drag_offset.x, 0.0, ground.z + drag_offset.z)
				_refresh_links()
		elif orbiting:
			yaw -= event.relative.x * 0.007
			pitch = clampf(pitch - event.relative.y * 0.006, -1.42, 1.42)
			_apply_camera()


func _pick_module(screen_position: Vector2) -> Node3D:
	var origin := camera.project_ray_origin(screen_position)
	var end := origin + camera.project_ray_normal(screen_position) * 200.0
	var query := PhysicsRayQueryParameters3D.create(origin, end)
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return null
	var collider: Object = hit.collider
	if collider and collider.has_meta("module_id"):
		return module_by_id.get(str(collider.get_meta("module_id")))
	return null


func _ground_point(screen_position: Vector2):
	var origin := camera.project_ray_origin(screen_position)
	var direction := camera.project_ray_normal(screen_position)
	var plane := Plane(Vector3.UP, 0.0)
	return plane.intersects_ray(origin, direction)


func _finish_drag() -> void:
	var candidate := _nearest_dock(dragging)
	if candidate.is_empty():
		status_label.text = "%s left undocked. Drag near a cyan node to connect it." % dragging.get_meta("display_name")
	else:
		_snap_to(dragging, candidate.target, candidate.port)
		status_label.text = "%s docked to %s · %s port." % [dragging.get_meta("display_name"), candidate.target.get_meta("display_name"), str(candidate.port).to_upper()]
	_refresh_editor()


func _nearest_dock(moving: Node3D) -> Dictionary:
	var best := {}
	var best_distance := 3.2
	for target in modules:
		if target == moving or not target.visible:
			continue
		for port_name in PORTS:
			if _port_occupied(target, port_name, moving):
				continue
			var target_position := _port_world(target, port_name)
			var direction: Vector3 = target.global_transform.basis * PORTS[port_name]
			var desired := target_position + direction.normalized() * (_radius(moving) + 0.34)
			var delta := Vector2(moving.global_position.x - desired.x, moving.global_position.z - desired.z).length()
			if delta < best_distance:
				best_distance = delta
				best = {"target":target, "port":port_name}
	return best


func _snap_to(moving: Node3D, target: Node3D, port_name: String) -> void:
	var direction: Vector3 = (target.global_transform.basis * PORTS[port_name]).normalized()
	moving.rotation.y = -atan2(direction.z, direction.x)
	var target_position := _port_world(target, port_name)
	moving.global_position = target_position + direction * (_radius(moving) + 0.34)
	moving.global_position.y = 0.0
	moving.set_meta("dock_parent", str(target.get_meta("module_id")))
	moving.set_meta("target_port", port_name)
	moving.set_meta("own_port", "west")
	_refresh_links()


func _detach(module: Node3D) -> void:
	module.set_meta("dock_parent", "")
	module.set_meta("target_port", "")
	module.set_meta("own_port", "")
	_refresh_links()


func _port_occupied(target: Node3D, port_name: String, except: Node3D = null) -> bool:
	for module in modules:
		if module == except or not module.visible:
			continue
		if str(module.get_meta("dock_parent")) == str(target.get_meta("module_id")) and str(module.get_meta("target_port")) == port_name:
			return true
	return false


func _port_world(module: Node3D, port_name: String) -> Vector3:
	var local: Vector3 = PORTS[port_name] * _radius(module) + Vector3.UP * 0.68
	return module.to_global(local)


func _refresh_links() -> void:
	for child in link_root.get_children():
		child.queue_free()
	for module in modules:
		if not module.visible or str(module.get_meta("dock_parent")) == "":
			continue
		var target: Node3D = module_by_id.get(str(module.get_meta("dock_parent")))
		if not target or not target.visible:
			continue
		var start := _port_world(target, str(module.get_meta("target_port")))
		var finish := _port_world(module, str(module.get_meta("own_port")))
		_add_rigid_link(start, finish)


func _add_rigid_link(start: Vector3, finish: Vector3) -> void:
	var direction := finish - start
	var length := direction.length()
	if length < 0.01:
		return
	var link := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(0.56, 0.38, length)
	link.mesh = box
	link.material_override = _material(Color("#7f929a"), 0.72, 0.34)
	link.global_position = (start + finish) * 0.5
	link.look_at(finish, Vector3.UP)
	link_root.add_child(link)


func _rotate_selected(direction: int) -> void:
	if not selected or not selected.visible:
		return
	selected.rotation.y += direction * PI * 0.5
	_detach(selected)
	status_label.text = "%s rotated %s 90°." % [selected.get_meta("display_name"), "right" if direction > 0 else "left"]
	_refresh_editor()


func _remove_selected() -> void:
	if not selected or not selected.visible:
		return
	var name := str(selected.get_meta("display_name"))
	_detach(selected)
	selected.visible = false
	selected.set_meta("in_tray", true)
	_select(null)
	status_label.text = "%s returned to the module tray." % name
	_refresh_editor()


func _clear_canvas() -> void:
	for module in modules:
		_detach(module)
		module.visible = false
		module.set_meta("in_tray", true)
	_select(null)
	status_label.text = "Canvas cleared. Restore modules from the tray to rebuild."
	_refresh_editor()


func _restore_module(module: Node3D) -> void:
	var visible_modules := modules.filter(func(item): return item.visible)
	module.visible = true
	module.set_meta("in_tray", false)
	module.rotation.y = 0.0
	module.position = Vector3.ZERO if visible_modules.is_empty() else visible_modules[0].position + Vector3(5.0, 0.0, 4.5)
	_select(module)
	status_label.text = "%s restored. Drag it onto a cyan node." % module.get_meta("display_name")
	_refresh_editor()


func _reset_layout() -> void:
	for module in modules:
		var id := str(module.get_meta("module_id"))
		var initial: Dictionary = default_layout[id]
		module.visible = true
		module.set_meta("in_tray", false)
		module.position = initial.position
		module.rotation.y = initial.yaw
		_detach(module)
	_select(null)
	status_label.text = "Generated Base layout restored."
	_refresh_editor()


func _refresh_editor() -> void:
	selection_label.text = str(selected.get_meta("display_name")).to_upper() if selected else "NO MODULE SELECTED"
	rotate_left_button.disabled = selected == null
	rotate_right_button.disabled = selected == null
	remove_button.disabled = selected == null
	clear_button.disabled = modules.all(func(item): return not item.visible)
	reset_button.disabled = false
	for child in tray.get_children():
		child.queue_free()
	for module in modules:
		if module.visible:
			continue
		var button := _hud_button("+ " + str(module.get_meta("display_name")).to_upper(), "Restore module to the canvas")
		button.pressed.connect(_restore_module.bind(module))
		tray.add_child(button)
	_refresh_links()
	_emit_layout()


func _setup_web_bridge() -> void:
	if not OS.has_feature("web"):
		return
	var window = JavaScriptBridge.get_interface("window")
	if not window:
		return
	js_message_callback = JavaScriptBridge.create_callback(_on_web_message)
	window.addEventListener("message", js_message_callback)
	_post_web_message({
		"source":"orbital-ventures-godot",
		"type":"ready",
		"version":1,
		"capabilities":{"unique_module_types":true, "duplicate_module_types":false, "layout_round_trip":true},
	})


func _on_web_message(arguments: Array) -> void:
	if arguments.is_empty():
		return
	var event = arguments[0]
	var parsed = JSON.parse_string(str(event.data))
	if typeof(parsed) != TYPE_DICTIONARY or parsed.get("source") != "orbital-ventures":
		return
	if parsed.get("type") == "load":
		_apply_web_state(parsed)


func _apply_web_state(payload: Dictionary) -> void:
	var incoming_modules: Array = payload.get("modules", [])
	var requested: Dictionary = {}
	for module_id in incoming_modules:
		requested[str(module_id)] = true
	var layout: Dictionary = payload.get("layout", {})
	for module in modules:
		var id := str(module.get_meta("module_id"))
		var entry: Dictionary = layout.get(id, {})
		module.visible = requested.has(id) and not bool(entry.get("hidden", false))
		module.set_meta("in_tray", not module.visible)
		if not entry.is_empty():
			module.position = Vector3(float(entry.get("x", module.position.x)), 0.0, float(entry.get("z", module.position.z)))
			module.rotation.y = float(entry.get("yaw", module.rotation.y))
			module.set_meta("dock_parent", str(entry.get("parent_id", "")))
			module.set_meta("target_port", str(entry.get("target_port", "")))
			module.set_meta("own_port", str(entry.get("own_port", "")))
		else:
			_detach(module)
	web_state_loaded = true
	_select(null)
	status_label.text = "Loaded %d Base Bench module types from Orbital Ventures." % requested.size()
	_refresh_editor()


func _emit_layout() -> void:
	if not OS.has_feature("web") or not web_state_loaded:
		return
	var layout: Dictionary = {}
	for module in modules:
		var id := str(module.get_meta("module_id"))
		layout[id] = {
			"x": snappedf(module.position.x, 0.01),
			"z": snappedf(module.position.z, 0.01),
			"yaw": snappedf(module.rotation.y, 0.001),
			"hidden": not module.visible,
			"parent_id": str(module.get_meta("dock_parent")),
			"target_port": str(module.get_meta("target_port")),
			"own_port": str(module.get_meta("own_port")),
		}
	_post_web_message({"source":"orbital-ventures-godot", "type":"layout_changed", "layout":layout})


func _post_web_message(payload: Dictionary) -> void:
	if not OS.has_feature("web"):
		return
	var window = JavaScriptBridge.get_interface("window")
	if window:
		window.parent.postMessage(JSON.stringify(payload), "*")


func _select(module: Node3D) -> void:
	selected = module
	_refresh_editor()


func _apply_camera() -> void:
	var horizontal := cos(pitch)
	camera.position = camera_target + Vector3(sin(yaw) * horizontal, -sin(pitch), cos(yaw) * horizontal) * distance
	camera.look_at(camera_target, Vector3.UP)


func _reset_camera() -> void:
	yaw = -0.72
	pitch = -0.62
	distance = 26.0
	_apply_camera()
	status_label.text = "Camera reset."


func _radius(module: Node3D) -> float:
	return float(module.get_meta("radius"))


func _hud_button(text: String, tooltip: String) -> Button:
	var button := Button.new()
	button.text = text
	button.tooltip_text = tooltip
	button.custom_minimum_size.y = 38.0
	button.add_theme_font_size_override("font_size", 12)
	button.add_theme_color_override("font_color", Color("#d7e6eb"))
	button.add_theme_color_override("font_hover_color", Color.WHITE)
	return button


func _panel_style(fill: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(6)
	style.content_margin_left = 14.0
	style.content_margin_right = 14.0
	style.content_margin_top = 10.0
	style.content_margin_bottom = 10.0
	return style


func _material(color: Color, metallic: float = 0.25, roughness: float = 0.55) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.metallic = metallic
	material.roughness = roughness
	return material


func _emissive_material(color: Color, energy: float) -> StandardMaterial3D:
	var material := _material(color, 0.1, 0.28)
	material.emission_enabled = true
	material.emission = color
	material.emission_energy_multiplier = energy
	return material


func _add_box(parent: Node3D, position: Vector3, size: Vector3, color: Color, emissive := false, yaw_angle := 0.0) -> void:
	var mesh_instance := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mesh_instance.mesh = mesh
	mesh_instance.position = position
	mesh_instance.rotation.y = yaw_angle
	mesh_instance.material_override = _emissive_material(color, 0.7) if emissive else _material(color)
	parent.add_child(mesh_instance)


func _add_sphere(parent: Node3D, position: Vector3, scale_value: Vector3, color: Color) -> void:
	var mesh_instance := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 1.0
	mesh.height = 2.0
	mesh_instance.mesh = mesh
	mesh_instance.position = position
	mesh_instance.scale = scale_value
	mesh_instance.material_override = _material(color)
	parent.add_child(mesh_instance)


func _add_cylinder(parent: Node3D, position: Vector3, radius: float, height: float, color: Color) -> void:
	var mesh_instance := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh_instance.mesh = mesh
	mesh_instance.position = position
	mesh_instance.material_override = _material(color, 0.62, 0.34)
	parent.add_child(mesh_instance)


func _add_torus(parent: Node3D, position: Vector3, rotation_value: Vector3, radius: float, color: Color) -> void:
	var mesh_instance := MeshInstance3D.new()
	var mesh := TorusMesh.new()
	mesh.inner_radius = radius - 0.08
	mesh.outer_radius = radius + 0.08
	mesh_instance.mesh = mesh
	mesh_instance.position = position
	mesh_instance.rotation = rotation_value
	mesh_instance.material_override = _material(color, 0.72, 0.3)
	parent.add_child(mesh_instance)
