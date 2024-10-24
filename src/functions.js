import { Box3, Color, Euler, Mesh, MeshBasicMaterial, Vector2, Vector3 } from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { crow_distance, eight_dir_distance, interpolate_y, is_coord_in_bounds, } from './pure_functions.js';

//Functions the purely modify passed in values
export function rotate_vector_90deg(vector, direction) {
	var clone = vector.clone();
	clone.applyEuler(new Euler( 0, direction, 0, 'XYZ' ));
	clone.x = Math.round(clone.x);
	clone.y = Math.round(clone.y);
	clone.z = Math.round(clone.z);
	make_zeroes_in_vector_positive(clone);
	return clone;
}

export function make_zeroes_in_vector_positive(vector) {
	vector.x += 0;
	vector.y += 0;
	if (vector.isVector3) {
		vector.z += 0;
	}
}

export function remove_elements_in_array_from_scene(array, scene) {

	for (let i = 0; i < array.length; i++) {
		let reverse_index = array.length -1 - i;
		let item = array[reverse_index];
		//console.log(item);
		scene.remove(item);

	}
}

export function remove_score_objects_from_scene(map, scene) {
	let keys = Array.from(map.keys());
	for (let i = 0; i < keys.length; i++) {
		let reverse_index = keys.length -1 - i;
		const key = keys[reverse_index];
		let score_object = map.get(key);
		if (Array.isArray(score_object)){
			for (let i = 0; i < score_object.length; i++) {
				let object_from_array = score_object[i];
				scene.remove(object_from_array);

			}

		} else {
			scene.remove(score_object);
		}
		//let g_score_object = item.g_score_object;
		//let h_score_object = item.h_score_object;
		
		//scene.remove(g_score_object);
		//scene.remove(h_score_object);

	}
}




export function clear_around_coord(grid, coord, path_height, path_color, remove_corners, globals) {
	const north = new Vector2 (0,-1);
	const south = new Vector2(0,1);
	const west = new Vector2(-1,0);
	const east = new Vector2(1,0);
	const north_west = new Vector2().addVectors(north, west);
	const north_east = new Vector2().addVectors(north, east);
	const south_west = new Vector2().addVectors(south, west);
	const south_east = new Vector2().addVectors(south, east);
	const center = new Vector2(0,0);

	let directions;
	if (remove_corners) {
		directions = new Set([north_west, north, north_east, west, center, east, south_west, south, south_east]);
	}
	else {
		directions = new Set([north, west, center, east, south]);
	}
	const two_d_coord = new Vector2(coord.x, coord.z);

	if (coord.z <= 0) {
		//We're at the top of the grid
		directions.delete(north_west);
		directions.delete(north);
		directions.delete(north_east);
	}
	if (coord.z >= grid.length - 1) {
		//We're at the bottom of the grid
		directions.delete(south_west);
		directions.delete(south);
		directions.delete(south_east);
	}
	if (coord.x <= 0) {
		//We're at the left side of the grid
		directions.delete(north_west);
		directions.delete(west);
		directions.delete(south_west);
	}
	if (coord.x >= grid[0].length - 1) {
		//We're at the right side of the grid
		directions.delete(north_east);
		directions.delete(east);
		directions.delete(south_east);
	}

	for (const direction of directions) {
		let coord_to_check = new Vector2().addVectors(two_d_coord, direction);
		mark_tile(grid, coord_to_check, path_height, path_color, globals)
	}
}



export function prim_generate_frontier(grid, maze_data, coord, search_frontier_tile_color, globals) {

	const north = new Vector2(0, -1);
	const south = new Vector2(0, 1);
	const west = new Vector2(-1, 0);
	const east = new Vector2(1, 0);

	var directions = [north, south, east, west];

	for (let i = 0; i < directions.length; i++) {
		var direction = directions[i];
		var coord_to_check = coord.clone().addScaledVector(direction, 2);
		const key = String(coord_to_check.x)+"_"+String(coord_to_check.y)
		//console.log("key:",key);
		if (is_coord_in_bounds(grid, coord_to_check)) {
			if (maze_data.prim_existing_path_tiles.has(key)) {
				//console.log("This tile is already occupied by a path")
			}
			else {
				let direction_to_source = direction.clone().multiplyScalar(-1);
				make_zeroes_in_vector_positive(direction_to_source);
				maze_data.prim_frontier_tiles.set(key, direction_to_source);
				mark_tile(grid, coord_to_check, undefined, search_frontier_tile_color, globals);
			}
		}
		
	}

}

export function reset_tile_color(grid, path_tile_color, wall_tile_color, globals) {
	for (let i = 0; i < grid.length; i++) {
		var row = grid[i];
		for (let j = 0; j < row.length; j++) {
			var tile = row[j];
			var height = tile.target_y;
			var chosen_color;
			if (height === 1) {
				chosen_color = wall_tile_color;
			}
			else {

				chosen_color = path_tile_color;
			}
			let coord = new Vector2(j, i);
			mark_tile(grid, coord, undefined, chosen_color, globals);
		}
	}
}

export function dfs_generate_frontier(grid, maze_data, coord, search_frontier_tile_color, globals) {

	const north = new Vector2(0, -1);
	const south = new Vector2(0, 1);
	const west = new Vector2(-1, 0);
	const east = new Vector2(1, 0);

	var directions = [north, east, south, west];

	for (let i = 0; i < directions.length; i++) {
		var direction = directions[i];
		var coord_to_check = coord.clone().addScaledVector(direction, 1);
		const key = String(coord_to_check.x)+"_"+String(coord_to_check.y);

		if (is_coord_in_bounds(grid, coord_to_check)) {

			if (maze_data.dfs_already_searched_tiles.has(key)) {
				//console.log("This tile has already been searched")
			}
			else {
				var tile = grid[coord_to_check.y][coord_to_check.x];
				if (tile.target_y === 1) {
					//console.log("This tile is a wall")
				} else {
					//Set new frontier
					let direction_to_source = direction.clone().multiplyScalar(-1);
					make_zeroes_in_vector_positive(direction_to_source);
	
					maze_data.dfs_frontier_tiles.push([coord_to_check, direction_to_source]);
					mark_tile(grid, coord_to_check, undefined, search_frontier_tile_color, globals);

				}
			}
		}
	}
}

export function bfs_generate_frontier(grid, maze_data, coord, search_frontier_tile_color, globals) {

	const north = new Vector2(0, -1);
	const south = new Vector2(0, 1);
	const west = new Vector2(-1, 0);
	const east = new Vector2(1, 0);

	var directions = [north, east, south, west];

	for (let i = 0; i < directions.length; i++) {
		var direction = directions[i];
		var coord_to_check = coord.clone().addScaledVector(direction, 1);
		const key = String(coord_to_check.x)+"_"+String(coord_to_check.y);

		if ( is_coord_in_bounds(grid, coord_to_check) ) {

			if (maze_data.bfs_already_searched_tiles.has(key)) {
				//console.log("This tile has already been searched:", key);
			}
			else if (maze_data.bfs_frontier_tiles_map.has(key)) {
				//console.log("This tile has already been added as a frontier:", key);
			}
			else {
				var tile = grid[coord_to_check.y][coord_to_check.x];
				if (tile.target_y === 1) {
					//console.log("This tile is a wall")
				}
				else {
					//Set new frontier
					let direction_to_source = direction.clone().multiplyScalar(-1);
					make_zeroes_in_vector_positive(direction_to_source);
	
					maze_data.bfs_frontier_tiles_array.push([coord_to_check, direction_to_source]);
					maze_data.bfs_frontier_tiles_map.add(key);

					mark_tile(grid, coord_to_check, undefined, search_frontier_tile_color, globals);

				}
			}
		}
	}
}

export function gfs_generate_frontier(grid, maze_data, coord, defaults, globals, scene) {

	const north = new Vector2(0, -1);
	const south = new Vector2(0, 1);
	const west = new Vector2(-1, 0);
	const east = new Vector2(1, 0);

	var directions = [north, east, south, west];

	var font_1 = globals.font_1;


	for (let i = 0; i < directions.length; i++) {
		var direction = directions[i];
		var coord_to_check = coord.clone().addScaledVector(direction, 1);
		const key = String(coord_to_check.x)+"_"+String(coord_to_check.y);

		if ( is_coord_in_bounds(grid, coord_to_check) ) {

			if (maze_data.gfs_already_searched_tiles.has(key)) {
				//console.log("This tile has already been searched:", key);
			}
			else if (maze_data.gfs_frontier_tiles_map.has(key)) {
				//console.log("This tile has already been added as a frontier:", key);
			}
			else {
				var tile = grid[coord_to_check.y][coord_to_check.x];
				if (tile.target_y === 1) {
					//console.log("This tile is a wall")
				}
				else {
					//Set new frontier
					let direction_to_source = direction.clone().multiplyScalar(-1);
					make_zeroes_in_vector_positive(direction_to_source);
					let distance_between_start_and_end_x = Math.abs(globals.start_position.x - globals.end_position.x);
					let distance_to_end_on_x = Math.abs(globals.end_position.x - coord_to_check.x);
					let score_x = distance_between_start_and_end_x - distance_to_end_on_x;

					let distance_between_start_and_end_y = Math.abs(globals.start_position.z - globals.end_position.z);
					let distance_to_end_on_y = Math.abs(globals.end_position.z - coord_to_check.y);
					let score_y = distance_between_start_and_end_y - distance_to_end_on_y;
					let score = score_x+score_y;
					tile.score = score;
					//console.log("coord_to_check.x:",coord_to_check.x);
					//console.log("coord_to_check.y:",coord_to_check.y);
					//console.log("crow distance:",crow_distance(coord_to_check.x, coord_to_check.y, globals.end_position.x, globals.end_position.z));

					if (maze_data.is_visual || maze_data.is_stepping) {
						make_score_geometry(key, coord_to_check, score, 0, scene, font_1, maze_data.gfs_score_numbers, .3, "center");
						
					}


					maze_data.gfs_frontier_tiles_heap.push([score, coord_to_check, direction_to_source]);
					maze_data.gfs_frontier_tiles_map.add(key);

					mark_tile(grid, coord_to_check, undefined, defaults.search_frontier_tile_color, globals);

				}
			}
		}
	}
	
}


export function set_first_person_camera_targets(globals, current_coord, new_coord, direction) {
	if (current_coord.isVector3) {
		globals.first_person_camera_start_position = current_coord;
		globals.first_person_camera_target_position = new Vector3(new_coord.x, 1, new_coord.z);
		globals.first_person_camera_current_time_elapsed = 0;
		globals.first_person_camera_target_time_elapsed = globals.first_person_camera_delay_time;
		let rotation = (Math.PI/2 * -(direction.x)) + (Math.PI/2 * Math.floor(-direction.z/2)*2);
		globals.first_person_camera_start_rotation = globals.first_person_camera_target_rotation;
		globals.first_person_camera_target_rotation = rotation;
	}
	else {
		globals.first_person_camera_start_position = new Vector3(current_coord.x, 1, current_coord.y);
		globals.first_person_camera_target_position = new Vector3(new_coord.x, 1, new_coord.y);
		globals.first_person_camera_current_time_elapsed = 0;
		globals.first_person_camera_target_time_elapsed = globals.first_person_camera_delay_time;
		let rotation = (Math.PI/2 * -(direction.x)) + (Math.PI/2 * Math.floor(-direction.y/2)*2);
		globals.first_person_camera_start_rotation = globals.first_person_camera_target_rotation;
		globals.first_person_camera_target_rotation = rotation;
		
	}

}

export function set_new_tile_position(grid, globals, defaults, delta) {
	let instanced_mesh_holder = globals.instanced_mesh_holder;
	globals.index_holder = [];
	for(let i = 0; i < (instanced_mesh_holder.length); i++) {
		globals.index_holder.push(-1);
	}
	for(let i = 0; i < (globals.grid_size*globals.grid_size); i++) {
		let row_key = Math.floor(i/globals.grid_size);
		let column_key = i%globals.grid_size;
		const tile = grid[column_key][row_key];


		var color = new Color(tile.target_color);
		
		globals.index_holder[tile.tile_type] += 1
		//console.log("globals.index_holder:",globals.index_holder)
		
		let dummy = globals.dummy_holder[tile.tile_type];
		let instanced_mesh = instanced_mesh_holder[tile.tile_type];
		if (tile.is_animating) {

			//console.log("Is animating");
			//console.log("Is animating", tile);
			dummy.position.x = row_key;
			tile.current_time_elapsed += delta;
			dummy.position.y = interpolate_y(tile.animation_start_y, tile.target_y, tile.ease_type, tile.current_time_elapsed, tile.target_time_elapsed);
			dummy.position.z = column_key;

			//I also want to animate colors

			if (tile.current_time_elapsed >= tile.target_time_elapsed) {
				dummy.position.y = tile.target_y;
				tile.is_animating = false;
				tile.animation_start_y = tile.target_y;

				tile.is_animating = false;
				tile.current_time_elapsed = 0;
			}
		}
		else {
			//We want to just set it's position to the target position
			dummy.position.x = row_key;
			dummy.position.y = tile.target_y;
			dummy.position.z = column_key;
		}
		dummy.updateMatrix();
		instanced_mesh.setMatrixAt(globals.index_holder[tile.tile_type], dummy.matrix);
		instanced_mesh.instanceMatrix.needsUpdate = true;

		



		//COLOR SECTION
		if (tile.is_hovered === true) {
			//console.log("I am here")
			color = new Color(0xffffff);
			instanced_mesh.setColorAt(globals.index_holder[tile.tile_type], color)
		}
		else {
			//console.log("color 1:",color)
			
			color = new Color(tile.target_color); 

			if (tile.target_color !== defaults.path_tile_color) {
				//console.log("color 1:",color)
				//What shuold be going on in here?
				
			}
			//console.log("color 2:",color)
			instanced_mesh.setColorAt(globals.index_holder[tile.tile_type], color)
		}
		instanced_mesh.instanceColor.needsUpdate = true;
		//tile.is_hovered = false;
	}
	
}

export function mark_tile(grid, coord, height, color, globals) {
	const tile = grid[coord.y][coord.x];

	if (height != undefined) {
		tile.is_animating = true;
		tile.target_y = height;
		tile.target_time_elapsed = .5315;
	}
	
	if (color != undefined) {
		tile.target_color = color;
	}

	//console.log("tile to update:",coord)
	if (globals.tiles_to_update_set.has(coord) === false) {
		//console.log("coord:", coord)
		globals.tiles_to_update_set.add(coord);
		globals.tiles_to_update.push(coord);
	}

}

export function mark_tile_line(grid, start_coord, direction, steps, height, color, globals) {
	//const direction = 
	for (let i = 0; i < steps; i++) {
		const current_coord = start_coord.clone().addScaledVector(direction, i+1);
		//console.log("current_coord:", current_coord);
		mark_tile(grid, current_coord, height, color, globals);
	}
	
}

export function set_new_tile_position_optimized(grid, globals, defaults, delta) {
	let instanced_mesh_holder = globals.instanced_mesh_holder;
	//globals.tiles_to_update
	let tiles_to_keep_updating = [];
	let tiles_to_keep_updating_set = new Set();
	while ( globals.tiles_to_update.length > 0 ) {
		//console.log("length every step:",globals.tiles_to_update.length);
		let coord = globals.tiles_to_update.pop();
		globals.tiles_to_update_set.delete(coord);
		const tile = grid[coord.y][coord.x];

		if (tile.is_animating === false) {
		}

		let row_key = coord.x;
		let column_key = coord.y;
		//console.log("row_key:",row_key,"column_key:",column_key);

		let index_of_this_type = tile.index_of_this_type;
		
		let dummy = globals.dummy_holder[tile.tile_type];
		let instanced_mesh = instanced_mesh_holder[tile.tile_type];

		if (tile.is_animating) {
			tile.current_time_elapsed += delta;
			dummy.position.x = row_key;
			dummy.position.z = column_key;

			if (tile.current_time_elapsed >= tile.target_time_elapsed) {
				dummy.position.y = tile.target_y;
				tile.is_animating = false;
				tile.animation_start_y = tile.target_y;

				tile.is_animating = false;
				tile.current_time_elapsed = 0;
			} else {
				dummy.position.y = interpolate_y(tile.animation_start_y, tile.target_y, tile.ease_type, tile.current_time_elapsed, tile.target_time_elapsed);
				tiles_to_keep_updating.push(coord);
				tiles_to_keep_updating_set.add(coord);
			}
		}
		else {
			//We want to just set it's position to the target position
			dummy.position.x = row_key;
			dummy.position.y = tile.target_y;
			dummy.position.z = column_key;
		}
		dummy.updateMatrix();
		instanced_mesh.setMatrixAt(index_of_this_type, dummy.matrix);
		instanced_mesh.instanceMatrix.needsUpdate = true;

		let color;
		if (tile.is_hovered === true) {
			color = new Color(0xffffff);
		} else {
			color = new Color(tile.target_color);
		}
		instanced_mesh.setColorAt(index_of_this_type, color);
		instanced_mesh.instanceColor.needsUpdate = true;
	}

	globals.tiles_to_update = tiles_to_keep_updating;
	globals.tiles_to_update_set = tiles_to_keep_updating_set;
	
}


export function a_star_generate_frontier(grid, maze_data, coord, defaults, globals, scene) {
	//console.log("Generate frontier starts")
	const north = new Vector2(0, -1);
	const south = new Vector2(0, 1);
	const west = new Vector2(-1, 0);
	const east = new Vector2(1, 0);
	const north_west = new Vector2().addVectors(north, west);
	const north_east = new Vector2().addVectors(north, east);
	const south_west = new Vector2().addVectors(south, west);
	const south_east = new Vector2().addVectors(south, east);
	//const center = new Vector2(0,0);

	//var directions = [north_west, north, north_east, west, east, south_west, south, south_east];
	//var corners = new Set([north_west, north_east, south_west, south_east])
	var directions;
	if (globals.a_star_diagonal) {
		directions = [north_west, north, north_east, west, east, south_west, south, south_east];
	} else {
		directions = [north, east, south, west];
	}

	var font_1 = globals.font_1;


	for (let i = 0; i < directions.length; i++) {
		var direction = directions[i];
		var coord_to_check = coord.clone().addScaledVector(direction, 1);
		const key = String(coord_to_check.x)+"_"+String(coord_to_check.y);

		if ( is_coord_in_bounds(grid, coord_to_check) ) {

			var tile = grid[coord_to_check.y][coord_to_check.x];
			const source_key = String(coord.x)+"_"+String(coord.y);

			if (maze_data.a_star_already_searched_tiles.has(key) || maze_data.a_star_frontier_tiles_map.has(key)) {
				//console.log("This tile has already been searched:", key);
				var source_g_cost = maze_data.g_score_map.get(source_key)
				//console.log(source_key, "source_g_cost:", source_g_cost);
				var g_cost = source_g_cost + eight_dir_distance(coord.x, coord.y, coord_to_check.x, coord_to_check.y);
				var already_found_tile_g_cost = maze_data.g_score_map.get(key);
				//console.log(key, "g_cost:", g_cost);
				if (g_cost < already_found_tile_g_cost) {
					maze_data.g_score_map.set(key, g_cost);
					var old_g_score_mesh_text = maze_data.a_star_g_score_numbers.get(key);
					var old_score_mesh_text = maze_data.a_star_score_numbers.get(key);
					var already_found_tile_h_cost = maze_data.h_score_map.get(key);
					var f_cost = g_cost+already_found_tile_h_cost;
					maze_data.score_map.set(key, f_cost);
					maze_data.g_score_map.set(key, g_cost);


					maze_data.a_star_frontier_tiles_heap.push([f_cost, coord_to_check]);
					let direction_to_source = direction.clone().multiplyScalar(-1);
					maze_data.direction_to_source_map.set(key, direction_to_source);

					

					//scene.remove(old_g_score_mesh_text);
					//scene.remove(old_score_mesh_text);
					if (Array.isArray(old_score_mesh_text)) {
						for (let i = 0; i < old_g_score_mesh_text.length; i++) {
							let object_from_array = old_g_score_mesh_text[i];
							scene.remove(object_from_array);
						}
						for (let i = 0; i < old_score_mesh_text.length; i++) {
							let object_from_array = old_score_mesh_text[i];
							scene.remove(object_from_array);
						}

					}
					//console.log("I AM HERE");

					if (maze_data.is_visual || maze_data.is_stepping) {
						//Full score
						make_score_geometry(key, coord_to_check, f_cost, 1, scene, font_1, maze_data.a_star_score_numbers, .2, "center");

						//g score, ie distance from start
						make_score_geometry(key, coord_to_check, g_cost, 1, scene, font_1, maze_data.a_star_g_score_numbers, .1, "left");
					}

				}
			}
			else {
				if (tile.target_y === 1) {
					//console.log("This tile is a wall")
				}
				else {

					let direction_to_source = direction.clone().multiplyScalar(-1);
					make_zeroes_in_vector_positive(direction_to_source);

					//let g_cost_x = Math.abs(globals.start_position.x - coord_to_check.x);
					//let g_cost_y = Math.abs(globals.start_position.z - coord_to_check.y);
					//var g_cost = g_cost_x+g_cost_y;
					//var g_cost = parseInt(100*crow_distance(globals.start_position.x, globals.start_position.z, coord_to_check.x, coord_to_check.y))/100;
					//console.log("source_key:",source_key);
					var source_g_cost = maze_data.g_score_map.get(source_key)
					//console.log("source_g_cost:",source_g_cost);
					//var g_cost = source_g_cost + 1;
					//console.log("HI:", crow_distance(coord.x, coord.y, coord_to_check.x, coord_to_check.y));
					var g_cost = source_g_cost + eight_dir_distance(coord.x, coord.y, coord_to_check.x, coord_to_check.y);

					//var g_cost = crow_distance(globals.start_position.x, globals.start_position.z, coord_to_check.x, coord_to_check.y);

					//let h_cost_x = Math.abs(globals.end_position.x - coord_to_check.x);
					//let h_cost_y = Math.abs(globals.end_position.z - coord_to_check.y);
					//var h_cost = h_cost_x+h_cost_y;
					//var h_cost = parseInt(100*crow_distance(globals.end_position.x, globals.end_position.z, coord_to_check.x, coord_to_check.y))/100;
					var h_cost = eight_dir_distance(globals.end_position.x, globals.end_position.z, coord_to_check.x, coord_to_check.y);

					var f_cost = g_cost+h_cost;
					//console.log("g_cost:",g_cost);
					//console.log("h_cost:",h_cost);
					//Alight, I want to add all this shit to a map which I check against
					maze_data.score_map.set(key, f_cost);
					maze_data.g_score_map.set(key, g_cost);
					maze_data.h_score_map.set(key, h_cost);
					if (maze_data.is_visual || maze_data.is_stepping) {
						//Full score
						make_score_geometry(key, coord_to_check, f_cost, 1, scene, font_1, maze_data.a_star_score_numbers, .2, "center");

						//g score, ie distance from start
						make_score_geometry(key, coord_to_check, g_cost, 1, scene, font_1, maze_data.a_star_g_score_numbers, .1, "left");
						
						//h score
						make_score_geometry(key, coord_to_check, h_cost, 1, scene, font_1, maze_data.a_star_h_score_numbers, .1, "right");
					}
					
					maze_data.a_star_frontier_tiles_heap.push([f_cost, coord_to_check]);
					
					maze_data.direction_to_source_map.set(key, direction_to_source);
					maze_data.direction_to_source_arrow_objects.set(key, direction_to_source);

					maze_data.a_star_frontier_tiles_map.add(key);

					mark_tile(grid, coord_to_check, undefined, defaults.search_frontier_tile_color, globals);
				}
			}
		}
	}
	
}

export function set_end_position(globals, x, y) {
	globals.end_position = new Vector3(x,1,y);
	globals.end_object.position.copy(globals.end_position);
	let center_of_grid = new Vector3((globals.grid_size_x-1)/2, 1, (globals.grid_size_y-1)/2);
	let direction_from_end_to_center = new Vector3(x, 2, y).sub(center_of_grid).normalize().multiplyScalar(-1.414213562);
	globals.end_light_target_position = globals.end_position.clone().add(direction_from_end_to_center);
	globals.lights_still_moving = true;
}

export function set_start_position(globals, x, y) {
	globals.start_position = new Vector3(x,1,y);
	globals.start_object.position.copy(globals.start_position);
	let center_of_grid = new Vector3((globals.grid_size_x-1)/2, 1, (globals.grid_size_y-1)/2);
	let direction_from_start_to_center = new Vector3(x, 1, y).sub(center_of_grid).normalize().multiplyScalar(-1.414213562);
	//globals.start_light.position.copy(globals.start_position.clone().add(direction_from_start_to_center));
	globals.start_light_target_position = globals.start_position.clone().add(direction_from_start_to_center);
	globals.lights_still_moving = true;
}

export function make_score_geometry(key, coord_to_check, score, precision, scene, font, storage_map, scale, spot) {
	const geometry = new TextGeometry( String(score.toFixed(precision)), {
		font: font,
		size: scale,
		depth: .01,
		curveSegments: 12,
	} );
	const border_geometry = new TextGeometry( String(score.toFixed(precision)), {
		font: font,
		size: scale,
		depth: .01,
		curveSegments: 12,
		bevelEnabled: true,
		bevelThickness: .001,
		bevelSize: .01,
		bevelOffset: 0,
		bevelSegments: 0
	} );

	var textMesh = new Mesh( geometry, new MeshBasicMaterial() );
	var border_textMesh = new Mesh( border_geometry, new MeshBasicMaterial({color: 0x000000}) );

	let boundingBox = new Box3().setFromObject(textMesh);
	let size = new Vector3()
	boundingBox.getSize(size);
	
	let x_position;
	let z_position;
	if (spot === 'left') {
		x_position = coord_to_check.x-.35;
		z_position = coord_to_check.y-.2;

	} else if (spot === 'right') {
		x_position = coord_to_check.x-size.x+.35;
		z_position = coord_to_check.y-.2;
	}
	else {
		x_position = coord_to_check.x - ((size.x)/2);
		z_position = coord_to_check.y+.3;
	}
	textMesh.position.x = x_position;
	textMesh.position.z = z_position;
	textMesh.position.y = .5;
	textMesh.rotation.x =  -Math.PI/2;
	border_textMesh.position.copy(textMesh.position);
	border_textMesh.position.y = .495;
	border_textMesh.rotation.x =  -Math.PI/2;

	scene.add(textMesh);
	scene.add(border_textMesh);
	//storage_map.set(key, textMesh);
	storage_map.set(key, [textMesh, border_textMesh]);
}