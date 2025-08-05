import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

import { 
	WebGLRenderer, Color, PointLight, PerspectiveCamera,
	Scene, PCFSoftShadowMap, Vector2, InstancedMesh, Object3D, Clock, Raycaster,
	DirectionalLight,
	NoToneMapping,
	Vector3,
	Euler,
	Quaternion,
	MOUSE
} from 'three';

import { 
	a_star_generate_frontier,
	bfs_generate_frontier, dfs_generate_frontier,
	gfs_generate_frontier, mark_tile,
	prim_generate_frontier, remove_score_objects_from_scene, reset_tile_color, 
	set_end_position, 
	set_new_tile_position_optimized,
	set_start_position
} from './functions.js';

import { crow_distance, easeOutQuad_ease, exp_decay, interpolate_y, is_coord_in_bounds, is_coord_path, is_coord_wall, shuffle, tile_type_oracle } from './pure_functions.js';

import { defaults_data, globals_data, maze_gen_data, maze_solver_data, tile_data } from './classes.js';


import { a_star_maze_stepper, backtracker_maze_stepper, bfs_maze_stepper, dead_end_filling_stepper, dfs_maze_stepper, gfs_maze_stepper, noise_maze_stepper, prim_maze_stepper, wall_follower_fast_left_hand_maze_stepper, wall_follower_left_hand_maze_stepper } from './stepper-functions.js';


import path_to_tile_gltf from '/assets/tiles.glb?url';
import path_to_start_gltf from '/assets/start.glb?url';
import path_to_end_gltf from '/assets/cage.glb?url';
import path_to_arrow_gltf from '/assets/arrow.glb?url';

import path_to_interstate_mono from '/assets/fonts/Interstate Mono_Regular.json?url';

//import { Stats } from 'stats.js'
import Stats from 'https://cdnjs.cloudflare.com/ajax/libs/stats.js/17/Stats.js'

function create_fps_counter() {
	var script=document.createElement('script');
	script.onload=function(){var stats=new Stats();
		document.body.appendChild(stats.dom);
		stats.dom.id='fps-counter-element'
		requestAnimationFrame(function loop(){stats.update();
			requestAnimationFrame(loop)});
	};
	script.src='https://mrdoob.github.io/stats.js/build/stats.min.js';
	document.head.appendChild(script);
	//globals.loading_fps_counter
}
create_fps_counter();



//I would like to declare all the global variables up here
const scene = new Scene();
const loader = new GLTFLoader();
const font_loader = new FontLoader();
const raycaster = new Raycaster();

const globals = new globals_data();
const defaults = new defaults_data();

var maze_gen = new maze_gen_data();
var maze_solver = new maze_solver_data({ wall_follower_current_position: globals.start_position, wall_follower_fast_current_position: globals.start_position });

var grid = [];

//Now we set up the scene
//scene.background = new Color("#FFEECC");
scene.background = new Color("#cccccc");
//scene.background = new Color("#f1ece6");
const camera = new PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 5000);
//camera.position.set(-17,31,33);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
//renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMapping = NoToneMapping;
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
//document.getElementById("main-view").appendChild(renderer.domElement);
document.body.appendChild(renderer.domElement);

const first_person_renderer = new WebGLRenderer({ antialias: true });
first_person_renderer.setSize(innerWidth, innerHeight);
//renderer.toneMapping = ACESFilmicToneMapping;
first_person_renderer.toneMapping = NoToneMapping;
first_person_renderer.physicallyCorrectLights = true;
first_person_renderer.shadowMap.enabled = true;
first_person_renderer.shadowMap.type = PCFSoftShadowMap;
const fps_element = document.getElementById("fps-view");
const first_person_camera = new PerspectiveCamera(60, fps_element.offsetWidth/fps_element.offsetHeight, 0.1, 1000);
first_person_renderer.setSize( fps_element.offsetWidth, fps_element.offsetHeight);
fps_element.appendChild(first_person_renderer.domElement);



//const directionalLight = new DirectionalLight( 0xffffff, .5 );
//const directionalLight = new DirectionalLight( new Color("#FFCB8E").convertSRGBToLinear().convertSRGBToLinear(), 10, 200 );
const directionalLight = new DirectionalLight( new Color("#FFFFFF").convertSRGBToLinear().convertSRGBToLinear(), 10, 200 );
//##################
scene.add( directionalLight );


const point_light_color = new Color("#FFCB8E").convertSRGBToLinear().convertSRGBToLinear();
//const point_light_color = new Color("#FFFFFF").convertSRGBToLinear().convertSRGBToLinear();
globals.end_light = new PointLight( point_light_color, 80, 200 );
globals.end_light.position.set(globals.grid_size-2, 2, globals.grid_size-2);
globals.end_light.castShadow = true; 
globals.end_light.shadow.mapSize.width = 512; 
globals.end_light.shadow.mapSize.height = 512; 
globals.end_light.shadow.camera.near = 0.5; 
globals.end_light.shadow.camera.far = 500; 
//##################
scene.add( globals.end_light );

globals.start_light = new PointLight( point_light_color, 80, 200 );
globals.start_light.position.set(globals.grid_size-2, 2, globals.grid_size-2);
globals.start_light.castShadow = true; 
globals.start_light.shadow.mapSize.width = 512; 
globals.start_light.shadow.mapSize.height = 512; 
globals.start_light.shadow.camera.near = 0.5; 
globals.start_light.shadow.camera.far = 500; 
//##################
scene.add( globals.start_light );




//Adding some controls
const controls = new OrbitControls(camera, renderer.domElement);
reset_controls();
controls.mouseButtons = {
	MIDDLE: MOUSE.ROTATE,
	RIGHT: MOUSE.PAN
}



const run_menu_button = document.getElementById("menu-category-run");
const run_items_holder = document.getElementById("run-items-holder");
run_menu_button.onclick = function() {button_show_and_hide(run_menu_button, settings_menu_button, run_items_holder, settings_items_holder)};
const settings_menu_button = document.getElementById("menu-category-settings");
const settings_items_holder = document.getElementById("settings-items-holder");
settings_menu_button.onclick = function() {button_show_and_hide(settings_menu_button, run_menu_button, settings_items_holder, run_items_holder)};

function button_show_and_hide(this_button, other_button, this_content, other_content) {
	//elem.classList.remove('unminimizing-window');
	if (this_button.classList.contains('menu-category-selector-item-selected')) {
		
	} else {
		other_button.classList.remove('menu-category-selector-item-selected');
		this_button.classList.add('menu-category-selector-item-selected');
		this_content.classList.remove('hidden');
		other_content.classList.add('hidden');

	}

}


const fps_counter_toggle = document.getElementById("show-fps-checkbox");
var fps_counter_element;


fps_counter_toggle.addEventListener('change', function() {
	if (this.checked) {
	  fps_counter_element.classList.remove('hidden');
	} else {
	  fps_counter_element.classList.add('hidden');
	}
});


const tile_hover_toggle = document.getElementById("hover-selection-checkbox");

tile_hover_toggle.addEventListener('change', (event) => {
	if (event.currentTarget.checked) {
		globals.is_highlighting = true;
	} else {
		globals.is_highlighting = false;
		for(let i = 0; i < (globals.recently_hovered.length); i++) {
			const coord = globals.recently_hovered[i];
			const tile = grid[coord.y][coord.x];
			//console.log("tile:",tile)
			tile.is_hovered = false;

			mark_tile(grid, coord, undefined, undefined, globals);
		}
		globals.recently_hovered = [];
		globals.currently_hovered = new Vector2(-1, -1);
	}
})

const rotate_button_selection_dropdown = document.getElementById("rotate-button-selection-dropdown");


rotate_button_selection_dropdown.addEventListener('change', function() {
	console.log(this.value)
	if ( this.value === "left-click" ) {
		controls.mouseButtons = {
			LEFT: MOUSE.ROTATE,
			RIGHT: MOUSE.PAN
		}

	} else if ( this.value === "middle-click" ) {
		controls.mouseButtons = {
			MIDDLE: MOUSE.ROTATE,
			RIGHT: MOUSE.PAN
		}

	} else if ( this.value === "right-click" ) {
		controls.mouseButtons = {
			MIDDLE: MOUSE.PAN,
			RIGHT: MOUSE.ROTATE
		}
	}
});

const warm_cool_selection_checkbox = document.getElementById("warm-cool-selection-checkbox");


warm_cool_selection_checkbox.addEventListener('change', function() {
	if (this.checked) {
		globals.is_warm_cold_coloring = true;
	} else {
		globals.is_warm_cold_coloring = false;
	}
});


const a_star_diagonal_checkbox = document.getElementById("a-star-diagonal-checkbox");


a_star_diagonal_checkbox.addEventListener('change', function() {
	if (this.checked) {
		globals.a_star_diagonal = true;
	} else {
		globals.a_star_diagonal = false;
	}
});




const minimize_box = document.getElementById("minimize-box");
const fps_window = document.getElementById("fps-view-holder");
minimize_box.onclick = function() {minimize_window(fps_window, globals)};
minimize_box.onmouseenter = function() {general_hover();};

const minimize_menu_button = document.getElementById("minimize-menu-button");
const menu_holder = document.getElementById("menu-holder");
minimize_menu_button.onclick = function() {minimize_menu(menu_holder)};
minimize_menu_button.onmouseenter = function() {general_hover();};

const grid_size_setter_button = document.getElementById("grid-size-setter-button");
grid_size_setter_button.onclick = function() {grid_size_setter(this, "button")};
grid_size_setter_button.onmouseenter = function() {general_hover();};

const grid_size_setter_input = document.getElementById("grid-size-setter-input");
grid_size_setter_input.value = globals.grid_size;
grid_size_setter_input.addEventListener("keydown", function (e) {
    if (e.code === "Enter") {  //checks whether the pressed key is "Enter"
        grid_size_setter(this, "enter");
    }
});

const maze_gen_button = document.getElementById("maze-gen-button");
maze_gen_button.onclick = function() { generate_maze(grid, document.getElementById("maze-gen-checkbox").checked, document.getElementById("maze-gen-dropdown").value) };
maze_gen_button.onmouseenter = function() {general_hover();};

const maze_solve_checkbox = document.getElementById('maze-solve-checkbox');
const maze_stepper_checkbox = document.getElementById('maze-solve-stepper-checkbox');
//console.log("maze_stepper_checkbox:",maze_stepper_checkbox);

maze_stepper_checkbox.addEventListener('change', (event) => {
  if (event.currentTarget.checked) {
    maze_solve_checkbox.disabled=true;
  } else {
    maze_solve_checkbox.disabled=false;
  }
})

const maze_solver_button = document.getElementById("maze-solve-button");
const maze_solver_dropdown = document.getElementById("maze-solve-dropdown");

const maze_solver_rescue_checkbox = document.getElementById("maze-solve-rescue-checkbox");
//maze_solver_rescue_checkbox.checked

maze_solver_button.onclick = function() { solver_input_handler(grid, maze_solve_checkbox.checked, maze_stepper_checkbox.checked, true, maze_solver_dropdown.value) };
maze_solver_button.onmouseenter = function() {general_hover();};

maze_solver_dropdown.addEventListener('change', (event) => {
	console.log("maze_solver_dropdown.value:",maze_solver_dropdown.value);
	if (maze_solver_dropdown.value === 'dead-end-filling') {
		maze_solver_rescue_checkbox.disabled=true;
	}
	else {
		maze_solver_rescue_checkbox.disabled=false;
	}
  })

window.addEventListener( 'resize', onWindowResize );

document.addEventListener('mousedown', onMouseDown);
document.addEventListener('click', onMouseClick);
document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousemove', onMouseMove);

function onMouseDown(event) {
	const coords = new Vector2(
		(event.clientX / window.innerWidth) * 2 - 1,
		-((event.clientY / window.innerHeight) * 2 - 1),
	);
	raycaster.setFromCamera(coords, camera);
	const intersections = raycaster.intersectObjects(scene.children, true);
	if (intersections.length > 0 && globals.is_nothing_blocking_grid) {
		var point = intersections[0].point
		point.x = Math.ceil(point.x + .5)-1;
		point.z = Math.ceil(point.z + .5)-1;
		var intersecting_object_name = intersections[0].object.name;
		if (intersecting_object_name === "Start") {
			globals.is_dragging_start = true;
			controls.enabled = false;
		}
		else if (intersecting_object_name === "Cage_1" || intersecting_object_name === "Cage_2") {
			globals.is_dragging_end = true;
			controls.enabled = false;
		}
	}

}

function onMouseUp(event) {
	//console.log("Mouse released")

}

function onMouseClick(event) {
	//console.log("globals.is_dragging_end:",globals.is_dragging_end)
	//console.log("globals.is_dragging_start:",globals.is_dragging_start)

	//console.log("Mouse pressed clicked")
	const coords = new Vector2(
		(event.clientX / window.innerWidth) * 2 - 1,
		-((event.clientY / window.innerHeight) * 2 - 1),
	);
	raycaster.setFromCamera(coords, camera);
	const intersections = raycaster.intersectObjects(scene.children, true);
	if (intersections.length > 0 && globals.is_nothing_blocking_grid) {
		var point = intersections[0].point
		point.x = Math.ceil(point.x + .5)-1;
		point.z = Math.ceil(point.z + .5)-1;
		//console.log("intersection point:",point);
		
		//Get tile object
		const tile = grid[point.z][point.x];
		//console.log("tile:",tile);

		if (globals.is_dragging_start) {

		}
		else if (globals.is_dragging_end) {

		}
		else {
			if (point.z === globals.start_position.z && point.x === globals.start_position.x) {
				
			}
			else if (point.z === globals.end_position.z && point.x === globals.end_position.x) {
				
			}
			else {				
				let chosen_target_y;
				let chosen_target_color;
				if (tile.target_y === defaults.extended_block_height) {
					chosen_target_y = defaults.default_tile_height;
					chosen_target_color = defaults.path_tile_color;
				}
				else {
					chosen_target_y = defaults.extended_block_height;
					chosen_target_color = defaults.wall_tile_color;
				}
				tile.is_animating = true;
				tile.target_time_elapsed = defaults.block_raise_time;

				let coord = new Vector2(point.x, point.z);
				mark_tile(grid, coord, chosen_target_y, chosen_target_color, globals);

			}
		}
		//console.log("tile:",tile);
	}
	if (globals.is_dragging_start) {
		globals.is_dragging_start = false;
		controls.enabled = true;
	}
	else if (globals.is_dragging_end) {
		globals.is_dragging_end = false;
		controls.enabled = true;
	}
}

function onMouseMove(event) {
	//console.log("Hi")
	/*
	*/
	let element_mouse_is_over = document.elementFromPoint(event.clientX, event.clientY);
	if (element_mouse_is_over != null) {
		if (element_mouse_is_over.nodeName === "CANVAS" && element_mouse_is_over.parentElement.id != "fps-view") {
			//console.log("element_mouse_is_over.nodeName:",element_mouse_is_over.parentElement.id);
			globals.is_nothing_blocking_grid = true;
		}
		else {
			globals.is_nothing_blocking_grid = false;
		}
	}
	else {
		globals.is_nothing_blocking_grid = false;
	}

	let has_intersection = false;
	let point;
	if ( globals.is_highlighting || globals.is_dragging_start || globals.is_dragging_end) {
		const coords = new Vector2(
			(event.clientX / window.innerWidth) * 2 - 1,
			-((event.clientY / window.innerHeight) * 2 - 1),
		);
		raycaster.setFromCamera(coords, camera);
		let intersections = raycaster.intersectObjects(scene.children, true);
		let chosen_intersection_index = 0;

		if ( globals.is_dragging_start || globals.is_dragging_end) {
			for (let i = 0; i < intersections.length; i++) {
				let current_intersection = intersections[i];
				if ( current_intersection.object.name === "tile_instanced_mesh" ) {
					chosen_intersection_index = i;
					break
				}
			}
		}
		if ( intersections.length > 0 && globals.is_nothing_blocking_grid ) {
			point = intersections[chosen_intersection_index].point
			has_intersection = true
		}
	}

	

	/*
	*/
	if ( has_intersection ) {

		let coord = new Vector2(Math.ceil(point.x + .5)-1, Math.ceil(point.z + .5)-1);

		if ( is_coord_in_bounds(grid, coord) && coord.equals(globals.currently_hovered) === false ) {

			for(let i = 0; i < (globals.recently_hovered.length); i++) {
				const coord = globals.recently_hovered[i];
				const tile = grid[coord.y][coord.x];
				//console.log("tile:",tile)
				tile.is_hovered = false;
		
				mark_tile(grid, coord, undefined, undefined, globals);
			}
			globals.recently_hovered = [];

			const tile = grid[coord.y][coord.x];

			if (globals.is_dragging_start) {
				let is_valid_position = true;
				if (tile.target_y === defaults.extended_block_height){
					is_valid_position = false;
				} else if(coord.x === globals.end_position.x && coord.y === globals.end_position.z) {
					is_valid_position = false;
				}
				if (is_valid_position) {
					set_start_position(globals, coord.x, coord.y);
				}
				document.body.style.cursor = "pointer";
			} else if (globals.is_dragging_end) {
				let is_valid_position = true;
				if (tile.target_y === defaults.extended_block_height){
					is_valid_position = false;
				} else if(coord.x === globals.start_position.x && coord.y === globals.start_position.z) {
					is_valid_position = false;
				}
				if (is_valid_position) {
					set_end_position(globals, coord.x, coord.y);
					first_person_camera.position.copy(globals.end_position);
				}
				document.body.style.cursor = "pointer";	
			}
			else {
				if (globals.start_position.x === coord.x && globals.start_position.z === coord.y) {
					document.body.style.cursor = "pointer";
					globals.currently_hovered = new Vector2(-1, -1);

				} else if (globals.end_position.x === coord.x && globals.end_position.z === coord.y) {
					document.body.style.cursor = "pointer";
					globals.currently_hovered = new Vector2(-1, -1);

				} else {
					document.body.style.cursor = "auto";
					tile.is_hovered = true;
					globals.recently_hovered.push(coord);
					globals.currently_hovered = coord;
					mark_tile(grid, coord, undefined, undefined, globals);

				}
			}

		}
	} else {
		document.body.style.cursor = "auto";
		for(let i = 0; i < (globals.recently_hovered.length); i++) {
			const coord = globals.recently_hovered[i];
			const tile = grid[coord.y][coord.x];
			//console.log("tile:",tile)
			tile.is_hovered = false;
	
			mark_tile(grid, coord, undefined, undefined, globals);
		}
		globals.recently_hovered = [];
		globals.currently_hovered = new Vector2(-1, -1);

	}
}


// Make the DIV element draggable:
dragElement(document.getElementById("fps-view-holder"));

function dragElement(elmnt) {
	var mouse_location_x;
	var mouse_location_y;
  var mouse_local_location_x = 0;
  var mouse_local_location_y = 0;


  if (document.getElementById(elmnt.id + "-header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "-header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
	mouse_local_location_x = -1*(elmnt.offsetLeft - e.clientX);
	mouse_local_location_y = -1*(elmnt.offsetTop - e.clientY);

	//console.log("mouse_local_location_x:", mouse_local_location_x);
	//console.log("mouse_local_location_y:", mouse_local_location_y);
    e = e || window.event;
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    mouse_location_x = e.clientX;
    mouse_location_y = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
	if (globals.is_narrow === false) {
		document.onmousemove = elementDrag;
	}
  }

  function elementDrag(e) {

	elmnt.classList.remove('unminimizing-window');
    e = e || window.event;
    e.preventDefault();
	let top_edge_of_screen = 0;
	let bottom_edge_of_screen = window.innerHeight;
	let left_edge_of_screen = 0;
	let right_edge_of_screen = window.innerWidth;

	//I want to try to move the top left corner to where it should be in relation to the mouse and the mouse's offset
	let proposed_window_left_bound = e.clientX - mouse_local_location_x;
	let proposed_window_right_bound = proposed_window_left_bound + elmnt.offsetWidth;
	let proposed_window_top_bound = e.clientY - mouse_local_location_y;
	let proposed_window_bottom_bound = proposed_window_top_bound + elmnt.offsetHeight;

	let correction_on_x = 0;
	if (proposed_window_left_bound < left_edge_of_screen) {
		correction_on_x = left_edge_of_screen - proposed_window_left_bound;
	}
	else if (proposed_window_right_bound > right_edge_of_screen) {
		correction_on_x = right_edge_of_screen - proposed_window_right_bound;
	}
	let correction_on_y = 0;
	if (proposed_window_top_bound < top_edge_of_screen) {
		correction_on_y = top_edge_of_screen - proposed_window_top_bound;
	}
	else if (proposed_window_bottom_bound > bottom_edge_of_screen) {
		correction_on_y = bottom_edge_of_screen - proposed_window_bottom_bound;
	}

	//Okay now let's place the window
	elmnt.style.left = e.clientX-mouse_local_location_x+correction_on_x + "px";
	elmnt.style.top = e.clientY-mouse_local_location_y+correction_on_y + "px";
	elmnt.style.right = "auto";
	elmnt.style.bottom = "auto";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

var timer = new Clock(true);
var performance_timer = new Clock(true);
(async function() {
		renderer.setAnimationLoop(() => {
			if (globals.loading_models_tiles || globals.loading_models_start || globals.loading_models_end || globals.loading_models_arrow || globals.loading_font_1 || globals.loading_fps_counter ) {
				if (globals.loading_models_run_once_toggle) {
					load_models();
					globals.loading_models_run_once_toggle = false;
				}
				if ( document.getElementById("fps-counter-element") != undefined && document.getElementById("fps-counter-element") != null) {
					//console.log("Done")
					globals.loading_fps_counter = false;
				}
				//document.getElementById("fps-counter-element") === undefined
			}
			else if (globals.running_setup) {
				generate_grid();

				first_person_renderer.render(scene, first_person_camera);
				fps_counter_element = document.getElementById("fps-counter-element");
				fps_counter_element.classList.add('hidden');

				if (window.innerWidth <= defaults.narrow_mode_threshold) {
					globals.is_narrow = true;
					fps_counter_toggle.disabled = true;
					
				}
				else {
					globals.is_narrow = false;
					fps_counter_toggle.disabled = false;
				}

				globals.running_setup = false;
			}
			else {
				var delta = timer.getDelta ();

				//This is the section for generating mazes
				if (maze_gen.is_running && maze_gen.is_visual) {
					if (maze_gen.algorithm === "backtracking") {
						backtracker_maze_stepper(grid, maze_gen, defaults, globals);
					} else if (maze_gen.algorithm === "prim") {
						prim_maze_stepper(grid, maze_gen, defaults, globals);
					} else if (maze_gen.algorithm === "noise") {
						noise_maze_stepper(grid, maze_gen, defaults, globals);
					}
					//console.log("return_value:",return_value);
				}
				if (maze_solver.is_running && maze_solver.is_visual && maze_solver.is_stepping === false) {
					if (maze_solver.algorithm === "dfs") {
						if (globals.use_first_person_camera && globals.is_first_person_camera_blocked === false) {
							if (globals.first_person_camera_current_time_elapsed >=  globals.first_person_camera_delay_time) {
								dfs_maze_stepper(grid, maze_solver, defaults, globals);
							}
							else {
								globals.first_person_camera_current_time_elapsed += delta;
							}

						}
						else {
							dfs_maze_stepper(grid, maze_solver, defaults, globals);
						}
					}
					else if (maze_solver.algorithm === "bfs") {
						if (globals.use_first_person_camera && globals.is_first_person_camera_blocked === false) {
							if (globals.first_person_camera_current_time_elapsed >=  globals.first_person_camera_delay_time) {
								bfs_maze_stepper(grid, maze_solver, defaults, globals);
							}
							else {
								globals.first_person_camera_current_time_elapsed += delta;
							}

						}
						else {
							bfs_maze_stepper(grid, maze_solver, defaults, globals);
						}
					}
					else if (maze_solver.algorithm === "gfs") {
						if (globals.use_first_person_camera && globals.is_first_person_camera_blocked === false) {
							if (globals.first_person_camera_current_time_elapsed >=  globals.first_person_camera_delay_time) {
								gfs_maze_stepper(grid, maze_solver, defaults, globals, scene);
							}
							else {
								globals.first_person_camera_current_time_elapsed += delta;
							}

						}
						else {
							gfs_maze_stepper(grid, maze_solver, defaults, globals, scene);
						}
					}
					else if (maze_solver.algorithm === "wf-lh") {
						globals.arrow_object.visible = true;
						globals.arrow_object_fast.visible = true;
						if (globals.use_first_person_camera && globals.is_first_person_camera_blocked === false) {
							if (globals.first_person_camera_current_time_elapsed >=  globals.first_person_camera_delay_time) {
							wall_follower_fast_left_hand_maze_stepper(grid, maze_solver, defaults, globals);
							wall_follower_fast_left_hand_maze_stepper(grid, maze_solver, defaults, globals);
							wall_follower_left_hand_maze_stepper(grid, maze_solver, defaults, globals);
							}
							else {
								globals.first_person_camera_current_time_elapsed += delta;
							}

						}
						else {
							wall_follower_fast_left_hand_maze_stepper(grid, maze_solver, defaults, globals);
							wall_follower_fast_left_hand_maze_stepper(grid, maze_solver, defaults, globals);
							wall_follower_left_hand_maze_stepper(grid, maze_solver, defaults, globals);
						}
					}
					else if (maze_solver.algorithm === "a-star") {
						if (globals.use_first_person_camera && globals.is_first_person_camera_blocked === false) {
							if (globals.first_person_camera_current_time_elapsed >=  globals.first_person_camera_delay_time) {
								a_star_maze_stepper(grid, maze_solver, defaults, globals, scene);
							}
							else {
								globals.first_person_camera_current_time_elapsed += delta;
							}

						}
						else {
							a_star_maze_stepper(grid, maze_solver, defaults, globals, scene);
						}
					}

					else if (maze_solver.algorithm === "dead-end-filling") {
						if (globals.use_first_person_camera && globals.is_first_person_camera_blocked === false) {
							if (globals.first_person_camera_current_time_elapsed >=  globals.first_person_camera_delay_time) {
								dead_end_filling_stepper(grid, maze_solver, defaults, globals);
							}
							else {
								globals.first_person_camera_current_time_elapsed += delta;
							}

						}
						else {
							dead_end_filling_stepper(grid, maze_solver, defaults, globals);
						}
					}
					//console.log("return_value:",return_value);
				}

				if ( globals.lights_still_moving ) {
					let decay = 8;
					let end_light_lerped_x = exp_decay(globals.end_light.position.x, globals.end_light_target_position.x, decay, delta);
					let end_light_lerped_z = exp_decay(globals.end_light.position.z, globals.end_light_target_position.z, decay, delta);
					globals.end_light.position.set(end_light_lerped_x, 2, end_light_lerped_z);
	
					let start_light_lerped_x = exp_decay(globals.start_light.position.x, globals.start_light_target_position.x, decay, delta);
					let start_light_lerped_z = exp_decay(globals.start_light.position.z, globals.start_light_target_position.z, decay, delta);
					globals.start_light.position.set(start_light_lerped_x, 2, start_light_lerped_z);

					var start_z_difference = Math.abs(globals.start_light.position.z - globals.start_light_target_position.z);
					var start_x_difference = Math.abs(globals.start_light.position.x - globals.start_light_target_position.x);

					var end_z_difference = Math.abs(globals.end_light.position.z - globals.end_light_target_position.z);
					var end_x_difference = Math.abs(globals.end_light.position.x - globals.end_light_target_position.x);

					let threshold = .001;
					if ( start_z_difference <= threshold && start_x_difference <= threshold && end_z_difference <= threshold && end_x_difference <= threshold ) {
						globals.lights_still_moving = false;
					}
				}

				if (typeof globals.instanced_mesh_holder !== 'undefined') {
					if (globals.instanced_mesh_holder.length === defaults.amount_of_tile_types) {
						set_new_tile_position_optimized(grid, globals, defaults, delta);
						//reset();
					}
				}
			}
			//
			if (globals.use_first_person_camera) {
				let percent_done = globals.first_person_camera_current_time_elapsed/globals.first_person_camera_target_time_elapsed;
				
				if (percent_done > 1) {
					percent_done = 1;
				}
				if (isNaN(percent_done)) {
					percent_done = 0;
				}
				/**/
				const difference_x = globals.first_person_camera_target_position.x-globals.first_person_camera_start_position.x;
				const difference_z = globals.first_person_camera_target_position.z-globals.first_person_camera_start_position.z;
				const target_x = globals.first_person_camera_start_position.x + (difference_x*percent_done);
				const target_z = globals.first_person_camera_start_position.z + (difference_z*percent_done);

				let decay = 8;
				let lerped_x = exp_decay(first_person_camera.position.x, target_x, decay, delta);
				let lerped_z = exp_decay(first_person_camera.position.z, target_z, decay, delta);
				first_person_camera.position.set(lerped_x, 1, lerped_z);
				
	
				let multiplier = easeOutQuad_ease(percent_done);

				let start_quat = new Quaternion().setFromAxisAngle(new Vector3(0,1,0), globals.first_person_camera_start_rotation);
				let target_quat = new Quaternion().setFromAxisAngle(new Vector3(0,1,0), globals.first_person_camera_target_rotation);
				let rot_to_set = start_quat.slerp(target_quat, multiplier);
				first_person_camera.rotation.setFromQuaternion( rot_to_set );
				
			}
			
			
			controls.update();
			renderer.render(scene, camera);

			if (globals.is_first_person_camera_blocked === false) {
				first_person_renderer.render(scene, first_person_camera);
			}
		});
	})();

function load_models() {
	//This assumes it fully ran first before anything else
	loader.load(path_to_tile_gltf, function (gltf) {  
		var type_0_counter = 0;
		var type_1_counter = 0;
		//We need to calculate this data twice to avoid async problems
		for (let i = 0; i < globals.grid_size; i++) {
			const row = [];
			for (let j = 0; j < globals.grid_size; j++) {
				let tile_type = tile_type_oracle(j,i);
				if (tile_type == 0) {
					type_0_counter += 1;
				}
				else {
					type_1_counter += 1;
				}
			}
		}

		globals.amount_of_each_tile_type_0 = type_0_counter;
		globals.amount_of_each_tile_type_1 = type_1_counter;

		gltf.scene.name = "tiles"
		gltf.scene.children.forEach((child) => {
			if (child.type === 'Mesh') {
				const object_name = child.name;
					child.geometry.name = "geometry_"+object_name;
					globals.geometry_holder.push(child.geometry);
					
			}
		});
	
		// Done loading all the geometry to array
		globals.loading_models_tiles = false;
		//console.log("Finished importing tiles");
	});

	loader.load(path_to_start_gltf, function (gltf) { 
		scene.add(gltf.scene);
		globals.start_object = gltf.scene;
		set_start_position(globals, globals.start_position.x, globals.start_position.z);
		globals.loading_models_start = false;
		
	});

	loader.load(path_to_end_gltf, function (gltf) { 
		scene.add(gltf.scene);
		globals.end_object = gltf.scene;
		globals.end_object.children[0].children[1].material.transparent = true;

		set_end_position(globals, globals.grid_size_x-1, globals.grid_size_y-1);

		first_person_camera.position.copy(globals.end_position);
		globals.loading_models_end = false;
		
	});

	loader.load(path_to_arrow_gltf, function (gltf) { 
		scene.add(gltf.scene);
		globals.arrow_object = gltf.scene;
		globals.arrow_object.position.copy(globals.start_position);

		globals.arrow_object_fast = globals.arrow_object.clone();

		scene.add(globals.arrow_object_fast);

		globals.arrow_object_fast.children[0].material = defaults.black_material;
		//console.log("globals.arrow_object_fast:",globals.arrow_object_fast.children[0].material.color);

		globals.loading_models_arrow = false;

		globals.arrow_object.visible = false;
		globals.arrow_object_fast.visible = false;
		

		
	});


	font_loader.load( path_to_interstate_mono, function ( font ) {
		globals.font_1 = font
		globals.loading_font_1 = false;
	});
/*
	var amount_to_pitch_shift = -5;
	var pitch_shift = new Tone.PitchShift({
		pitch: amount_to_pitch_shift
	}).toMaster();

	audio_player.connect(pitch_shift);

	Tone.Buffer.on('load', () => {
		alert('Ready for play');
	});
	Tone.Transport.start();
	*/

}

function generate_grid() {
	for (let i = 0; i < globals.instanced_mesh_holder.length; i++) {
		var current_instanced_mesh = globals.instanced_mesh_holder[i];
		scene.remove(current_instanced_mesh);
	}
	
	globals.instanced_mesh_holder = [];
	//globals.geometry_holder = [];
	globals.dummy_holder = [];
	globals.recently_hovered = [];
	globals.tiles_to_update = [];
	globals.tiles_to_update_set = new Set();
	maze_solver.is_running = false;

	globals.arrow_object.visible = false;
	globals.arrow_object_fast.visible = false;

	grid = [];
	console.log()
	//Making the initial grid
	var type_0_counter = 0;
	var type_1_counter = 0;
	for (let i = 0; i < globals.grid_size; i++) {
		const row = [];
		for (let j = 0; j < globals.grid_size; j++) {
			const tile = new tile_data({ 
				target_y: defaults.default_tile_height, 
				target_color: defaults.path_tile_color, 
				target_y: defaults.default_tile_height,
				animation_start_y: defaults.default_tile_height,
			});
			const tile_type = tile_type_oracle(j,i);
			if (tile_type == 0) {
				type_0_counter += 1;
				tile.tile_type = 0;
				tile.index_of_this_type = type_0_counter-1;
			}
			else {
				type_1_counter += 1;
				tile.tile_type = 1;
				tile.index_of_this_type = type_1_counter-1;
			}
			let coord = new Vector2(j, i);
			globals.tiles_to_update.push(coord);
			globals.tiles_to_update_set.add(coord);
			row.push(tile);
		}
		grid.push(row);
	}
	globals.amount_of_each_tile_type_0 = type_0_counter;
	globals.amount_of_each_tile_type_1 = type_1_counter;
	//Done making the initial grid
	// Load a glTF resource and add the geometry from it to an array

	// Done loading all the geometry to array

	//Now we want to loop through all the types of geometry and make an InstancedMesh for each one
	for(let i = 0; i < (globals.geometry_holder.length); i++) {
		let working_geometry = globals.geometry_holder[i];
		let amount_of_chosen_tile_type;
		if (i === 0) {
			amount_of_chosen_tile_type = globals.amount_of_each_tile_type_0;
		} else {
			amount_of_chosen_tile_type = globals.amount_of_each_tile_type_1;
		}
		
		const tile_instanced_mesh = new InstancedMesh(working_geometry, defaults.default_material, amount_of_chosen_tile_type);
		tile_instanced_mesh.name = 'tile_instanced_mesh';
		//console.log("I am here")
		globals.instanced_mesh_holder.push(tile_instanced_mesh);
		scene.add(tile_instanced_mesh);
		const working_dummy = new Object3D();
		globals.dummy_holder.push(working_dummy);
	}
	//console.log("globals.instanced_mesh_holder:",globals.instanced_mesh_holder);
	set_new_tile_position_optimized(grid, globals, defaults, 0);
	//console.log("tileMesh_2:",tileMesh_2)

	set_start_position(globals, 0, 0);
	set_end_position(globals, globals.grid_size_x-1, globals.grid_size_y-1);
	first_person_camera.position.copy(globals.end_position);
	//reset_tile_color(grid, defaults.path_tile_color, defaults.wall_tile_color, globals);
}

function reset() {
	//backtracking_maze_gen_previously_visited_stack = [];
	
	remove_score_objects_from_scene(maze_solver.gfs_score_numbers, scene);
	remove_score_objects_from_scene(maze_solver.a_star_score_numbers, scene);
	remove_score_objects_from_scene(maze_solver.a_star_g_score_numbers, scene);
	remove_score_objects_from_scene(maze_solver.a_star_h_score_numbers, scene);
	generate_grid();
	reset_controls();
	maze_gen.is_running = false;
	maze_solver.is_running = false;
	//console.log("I am here")
}

function general_hover() {
	//console.log("I am hovered")
}

function reset_controls() {
	controls.target.set( globals.grid_size/2-.5,0,globals.grid_size/2-.5);
	controls.dampingFactor = 0.05;
	controls.enableDamping = true;
	camera.position.set(globals.grid_size_x/2 -.5,globals.grid_size_y*1.5,(globals.grid_size_y/2-.5)*2.2 + 5);

}

function minimize_window(element, globals) {
	let minimize_icon_holder = element.lastElementChild.previousElementSibling.lastElementChild.lastElementChild;
	//console.log("minimize_icon_holder:",minimize_icon_holder);
	//element.style.

	if (element.classList.contains('minimized-window')) {
		element.classList.remove('minimized-window');
		element.classList.add('unminimizing-window');
		minimize_icon_holder.lastElementChild.classList.add('hidden');
		minimize_icon_holder.firstElementChild.classList.remove('hidden');
		globals.is_first_person_camera_blocked = false;
		
	}
	else {
		element.classList.add('minimized-window');
		element.classList.remove('unminimizing-window');
		minimize_icon_holder.lastElementChild.classList.remove('hidden');
		minimize_icon_holder.firstElementChild.classList.add('hidden');
		globals.is_first_person_camera_blocked = true;
	}
	//globals.window_is_minimizing = true;
	//first_person_renderer.render(scene, first_person_camera);
	first_person_camera.aspect = fps_element.offsetWidth/240;
	first_person_renderer.setSize( fps_element.offsetWidth, 240);
    first_person_camera.updateProjectionMatrix();
}

function minimize_menu(element) {
	let minimize_icon_holder = element.lastElementChild.lastElementChild;
	if (element.classList.contains('minimized-menu')) {
		element.classList.remove('minimized-menu');
		element.classList.add('unminimizing-menu');
		minimize_icon_holder.lastElementChild.classList.remove('hidden');
		minimize_icon_holder.firstElementChild.classList.add('hidden');
		
	}
	else {
		element.classList.add('minimized-menu');
		element.classList.remove('unminimizing-menu');
		minimize_icon_holder.lastElementChild.classList.add('hidden');
		minimize_icon_holder.firstElementChild.classList.remove('hidden');
	}
}

function grid_size_setter($this, type) {
	var val;
	if (type === "button") {
		val = $this.previousElementSibling.lastElementChild.value;
		
	}
	else if (type === "enter") {
		val = $this.value;

	}
	val = Math.floor(val);
	if(val == ''){
		console.log('no input or invalid number');
	}else{
		if ( val < 2) {
			alert("The grid width is too small");
		}
		else if ( val > 500) {
			alert("The grid width is too large");
		}
		else {
			globals.grid_size = val;
			globals.grid_size_x = val;
			globals.grid_size_y = val;
			reset();

		}
	}
  }

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
	
	first_person_camera.aspect = fps_element.offsetWidth/fps_element.offsetHeight;
    first_person_camera.updateProjectionMatrix();
	first_person_renderer.setSize( fps_element.offsetWidth+2, fps_element.offsetHeight+2);

	let elmnt = document.getElementById("fps-view-holder")
	var style = window.getComputedStyle(elmnt);
	
	var right = parseInt(style.getPropertyValue('right'));
	if (right < 0) {
		var left = parseInt(style.getPropertyValue('left'));
		elmnt.style.left = (left + right)+'px';
	}
	/*
	if (globals.is_first_person_camera_blocked) {
		//first_person_renderer.render(scene, first_person_camera);
	}
	*/
	if (window.innerWidth <= defaults.narrow_mode_threshold) {
		globals.is_narrow = true;
		fps_counter_toggle.disabled = true;
		
	}
	else {
		globals.is_narrow = false;
		fps_counter_toggle.disabled = false;
	}

}


function generate_maze(grid, is_visual, algorithm) {
	remove_score_objects_from_scene(maze_solver.gfs_score_numbers, scene);
	remove_score_objects_from_scene(maze_solver.a_star_score_numbers, scene);
	remove_score_objects_from_scene(maze_solver.a_star_g_score_numbers, scene);
	remove_score_objects_from_scene(maze_solver.a_star_h_score_numbers, scene);

	maze_gen = new maze_gen_data();
	maze_gen.algorithm = algorithm;
	maze_gen.is_running = true;
	maze_gen.is_visual = is_visual;
	maze_solver.is_running = false;

	first_person_camera.position.copy(globals.end_position);
	globals.first_person_camera_start_position = globals.end_position;
	globals.first_person_camera_target_position = globals.end_position;
	globals.first_person_camera_start_rotation = 0;
	globals.first_person_camera_target_rotation = 0;

	globals.arrow_object.visible = false;
	globals.arrow_object_fast.visible = false;


	//console.log("maze_gen.is_running:",maze_gen.is_running);
	//console.log("maze_gen.is_visual:",maze_gen.is_visual);

	//let random_starting_point = Math.floor((Math.abs(Math.floor(Math.random()*10000))%(grid.length-4)+2)/2)*2+1;
	let random_starting_point = Math.floor((Math.abs(Math.floor(Math.random()*10000))%(grid.length))/2)*2-1;
	if (random_starting_point < 1) {
		random_starting_point = 1;
	}
	//console.log("random_starting_point:",random_starting_point);


	//First set the grid up for maze gen
	for (let i = 0; i < grid.length; i++) {
		let row = grid[i];
		for (let j = 0; j < row.length; j++) {
			const tile = row[j];

			
			let coord = new Vector2(j, i);
			mark_tile(grid, coord, defaults.extended_block_height, defaults.wall_tile_color, globals);
			tile.animation_start_y = defaults.extended_block_height;
			tile.is_animating = false;
		}
	}

	if (maze_gen.algorithm === "backtracking") {

		let current_coord = new Vector2(random_starting_point, random_starting_point);

		maze_gen.backtracking_previously_visited_stack.push(current_coord);

		mark_tile(grid, current_coord, 0, defaults.search_frontier_tile_color, globals);

		if (maze_gen.is_visual === false) {
			//Fast generation, not visualizing
			while (maze_gen.is_running) {
				backtracker_maze_stepper(grid, maze_gen, defaults, globals);
			}

		}
	}
	else if (maze_gen.algorithm === "noise") {
		if (maze_gen.is_visual === false) {

			var delta = performance_timer.getDelta ();
			while (maze_gen.is_running) {
				noise_maze_stepper(grid, maze_gen, defaults, globals);
			}
			delta = performance_timer.getDelta ();
			console.log("delta:", delta)
		}
	}
	else if (maze_gen.algorithm === "prim") {

		let current_coord = new Vector2(random_starting_point, random_starting_point);
		mark_tile(grid, current_coord, 0, defaults.path_tile_color, globals);
		prim_generate_frontier(grid, maze_gen, current_coord, defaults.gen_frontier_tile_color, globals);
		//console.log("maze_gen.prim_frontier_tiles:",maze_gen.prim_frontier_tiles)

		//maze_gen.is_visual === false
		if (maze_gen.is_visual === false) {
			var delta = performance_timer.getDelta ();
			//Fast generation, not visualizing
			while (maze_gen.is_running) {
				prim_maze_stepper(grid, maze_gen, defaults, globals);
			}
			delta = performance_timer.getDelta ();
			//console.log("delta:", delta)
		}
	}
}

function setup_solver(is_visual, is_stepping, is_rescuing, algorithm) {
	remove_score_objects_from_scene(maze_solver.gfs_score_numbers, scene);
	remove_score_objects_from_scene(maze_solver.a_star_score_numbers, scene);
	remove_score_objects_from_scene(maze_solver.a_star_g_score_numbers, scene);
	remove_score_objects_from_scene(maze_solver.a_star_h_score_numbers, scene);

	maze_solver = new maze_solver_data();
	maze_solver.algorithm = algorithm;
	maze_solver.is_running = true;
	maze_solver.is_visual = is_visual;
	maze_solver.is_stepping = is_stepping;
	maze_solver.is_rescuing = is_rescuing;

	globals.arrow_object.visible = false;
	globals.arrow_object_fast.visible = false;

	let distance_between_start_and_end_x = Math.abs(globals.start_position.x - globals.end_position.x);
	let distance_between_start_and_end_y = Math.abs(globals.start_position.z - globals.end_position.z);

	let min_x_distance;
	if (distance_between_start_and_end_x === 0) {
		let right_value = -Math.abs(grid[0].length - (globals.start_position.x+1));
		let left_value = -Math.abs(globals.start_position.x);
		min_x_distance = Math.min(right_value,left_value);
	} else {
		let direction_to_end = (globals.end_position.x - globals.start_position.x)/Math.abs((globals.end_position.x - globals.start_position.x));
		let distance_to_start_edge;
		let distance_to_end_edge;
		if ( direction_to_end > 0 ) {
			distance_to_start_edge = Math.abs(globals.start_position.x);
			distance_to_end_edge = Math.abs(grid[0].length - (globals.end_position.x+1));
		}
		else {
			distance_to_start_edge = Math.abs(grid[0].length - (globals.start_position.x+1));
			distance_to_end_edge = Math.abs(globals.end_position.x);
		}
		let start_value = (-distance_to_start_edge+0);
		let end_value = (-distance_to_end_edge+0)+distance_between_start_and_end_x;
		min_x_distance = Math.min(start_value,end_value);
	}

	let min_y_distance;
	if (distance_between_start_and_end_y === 0) {
		let down_value = -Math.abs(grid.length - (globals.start_position.z+1));
		let up_value = -Math.abs(globals.start_position.z);
		min_y_distance = Math.min(down_value,up_value);
	} else {
		let direction_to_end = (globals.end_position.z - globals.start_position.z)/Math.abs((globals.end_position.z - globals.start_position.z));
		let distance_to_start_edge;
		let distance_to_end_edge;
		if ( direction_to_end > 0 ) {
			distance_to_start_edge = Math.abs(globals.start_position.z);
			distance_to_end_edge = Math.abs(grid.length - (globals.end_position.z+1));
		}
		else {
			distance_to_start_edge = Math.abs(grid.length - (globals.start_position.z+1));
			distance_to_end_edge = Math.abs(globals.end_position.z);
		}
		let start_value = (-distance_to_start_edge+0);
		let end_value = (-distance_to_end_edge+0)+distance_between_start_and_end_y;
		min_y_distance = Math.min(start_value,end_value);
	}
	maze_solver.manhattan_min_score = min_x_distance+min_y_distance;
	maze_solver.manhattan_max_score = distance_between_start_and_end_x+distance_between_start_and_end_y;
	maze_solver.crow_min_score = crow_distance(globals.end_position.x, globals.end_position.z, globals.start_position.x, globals.start_position.z);
	//console.log("#############################################");
	//console.log("maze_solver.crow_min_score:", maze_solver.crow_min_score);
	//console.log("#############################################");
	//console.log("min_score:", maze_solver.manhattan_min_score);
	//console.log("max_score:", maze_solver.manhattan_max_score);

	//console.log("maze_solver.is_rescuing:",maze_solver.is_rescuing);
	first_person_camera.position.copy(globals.end_position);

	reset_tile_color(grid, defaults.path_tile_color, defaults.wall_tile_color, globals);

	if (maze_solver.algorithm === "dfs") {

		let current_coord = new Vector2(globals.start_position.x, globals.start_position.z);
		//console.log("current_coord:",current_coord);

		const key = String(current_coord.x)+"_"+String(current_coord.y);
		maze_solver.dfs_already_searched_tiles.set(key, new Vector2(0,0));
		dfs_generate_frontier(grid, maze_solver, current_coord, defaults.search_frontier_tile_color, globals);
		//console.log("maze_solver:",maze_solver);

		if (maze_solver.is_visual === false && maze_solver.is_stepping === false) {
			//Fast generation, not visualizing
			while (maze_solver.is_running) {
				dfs_maze_stepper(grid, maze_solver, defaults, globals);
			}

		}
	}
	if (maze_solver.algorithm === "bfs") {

		let current_coord = new Vector2(globals.start_position.x, globals.start_position.z);
		//console.log("current_coord:",current_coord);

		const key = String(current_coord.x)+"_"+String(current_coord.y);
		maze_solver.bfs_already_searched_tiles.set(key, new Vector2(0,0));
		bfs_generate_frontier(grid, maze_solver, current_coord, defaults.search_frontier_tile_color, globals);
		//console.log("maze_solver:",maze_solver);

		if (maze_solver.is_visual === false && maze_solver.is_stepping === false) {
			//Fast generation, not visualizing
			while (maze_solver.is_running) {
				bfs_maze_stepper(grid, maze_solver, defaults, globals);
			}

		}
	}
	if (maze_solver.algorithm === "gfs") {

		let current_coord = new Vector2(globals.start_position.x, globals.start_position.z);
		//console.log("current_coord:",current_coord);

		const key = String(current_coord.x)+"_"+String(current_coord.y);
		maze_solver.gfs_already_searched_tiles.set(key, new Vector2(0,0));
		gfs_generate_frontier(grid, maze_solver, current_coord, defaults, globals, scene);
		//console.log("maze_solver:",maze_solver);

		if (maze_solver.is_visual === false && maze_solver.is_stepping === false) {
			//Fast generation, not visualizing
			while (maze_solver.is_running) {
				gfs_maze_stepper(grid, maze_solver, defaults, globals, scene);
			}

		}
	}
	if (maze_solver.algorithm === "wf-lh") {

		globals.arrow_object.position.copy(maze_solver.wall_follower_current_position);

		console.log("globals.arrow_object.position:",globals.arrow_object.position)
		let rotation_euler = new Euler().setFromVector3(maze_solver.wall_follower_direction_vector);
		globals.arrow_object.rotation.copy(rotation_euler);

		globals.arrow_object_fast.position.copy(maze_solver.wall_follower_current_position);
		globals.arrow_object_fast.rotation.copy(rotation_euler);

		globals.arrow_object.visible = true;
		globals.arrow_object_fast.visible = true;

		if (maze_solver.is_visual === false && maze_solver.is_stepping === false) {
			//Fast generation, not visualizing
			while (maze_solver.is_running) {
				wall_follower_fast_left_hand_maze_stepper(grid, maze_solver, defaults, globals);
				wall_follower_fast_left_hand_maze_stepper(grid, maze_solver, defaults, globals);
				wall_follower_left_hand_maze_stepper(grid, maze_solver, defaults, globals, first_person_camera, globals);
				//console.log("globals.arrow_object_fast:",globals.arrow_object_fast)
			}
		}
	}

	if (maze_solver.algorithm === "dead-end-filling") {
		if (maze_solver.is_visual === false && maze_solver.is_stepping === false) {
			//console.log("I am here");
			//Fast generation, not visualizing
			while (maze_solver.is_running) {
				dead_end_filling_stepper(grid, maze_solver, defaults, globals);
			}

		}
	}

	if (maze_solver.algorithm === "a-star") {

		let current_coord = new Vector2(globals.start_position.x, globals.start_position.z);
		//console.log("current_coord:",current_coord);

		const key = String(current_coord.x)+"_"+String(current_coord.y);

		maze_solver.g_score_map.set(key, 0);
		//console.log("maze_solver.g_score_map:",maze_solver.g_score_map);

		maze_solver.a_star_already_searched_tiles.set(key, new Vector2(0,0));
		a_star_generate_frontier(grid, maze_solver, current_coord, defaults, globals, scene);
		//console.log("maze_solver:",maze_solver);


		if (maze_solver.is_visual === false && maze_solver.is_stepping === false) {
			//Fast generation, not visualizing
			while (maze_solver.is_running) {
				a_star_maze_stepper(grid, maze_solver, defaults, globals, scene);
			}

		}
	}

}



function solver_input_handler(grid, is_visual, is_stepping, is_rescuing, algorithm) {
	if (is_stepping) {

		if (maze_solver.is_running === false) {
			setup_solver(is_visual, is_stepping, is_rescuing, algorithm);
		}
		if (maze_solver.is_running) {
			if (maze_solver.algorithm === "dfs") {
				dfs_maze_stepper(grid, maze_solver, defaults, globals);
			}
			else if (maze_solver.algorithm === "bfs") {
				bfs_maze_stepper(grid, maze_solver, defaults, globals);
			}
			else if (maze_solver.algorithm === "gfs") {
				gfs_maze_stepper(grid, maze_solver, defaults, globals, scene);
			}
			else if (maze_solver.algorithm === "wf-lh") {

				globals.arrow_object.visible = true;
				globals.arrow_object_fast.visible = true;

				wall_follower_fast_left_hand_maze_stepper(grid, maze_solver, defaults, globals);
				wall_follower_fast_left_hand_maze_stepper(grid, maze_solver, defaults, globals);
				wall_follower_left_hand_maze_stepper(grid, maze_solver, defaults, globals, first_person_camera);
				//console.log("globals.arrow_object_fast:",globals.arrow_object_fast)
			}
			else if (maze_solver.algorithm === "dead-end-filling") {
				dead_end_filling_stepper(grid, maze_solver, defaults, globals);
			}
			else if (maze_solver.algorithm === "a-star") {
				a_star_maze_stepper(grid, maze_solver, defaults, globals, scene);
			}
		}
	}
	else {
		start_solver(grid, is_visual, is_stepping, is_rescuing, algorithm);
	}
}



function start_solver(grid, is_visual, is_stepping, is_rescuing, algorithm) {

	setup_solver(is_visual, is_stepping, is_rescuing, algorithm);


	
}
