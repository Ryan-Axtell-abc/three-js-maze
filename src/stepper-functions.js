import { 
    Vector2, Vector3, Euler,
    Color
} from 'three';

import { bfs_generate_frontier, clear_around_coord, dfs_generate_frontier, gfs_generate_frontier,
    make_zeroes_in_vector_positive, mark_tile, mark_tile_line, prim_generate_frontier, set_first_person_camera_targets,
    rotate_vector_90deg,
    a_star_generate_frontier,
} from './functions.js';


import { is_coord_in_bounds, is_coord_path, is_coord_wall, is_dead_end, lerp_hsl, lerp_rgb, mix, shuffle } from './pure_functions.js';


//MAZE GEN SECTION

export function backtracker_maze_stepper(grid, maze_gen, defaults, globals) {
	//console.log("START OF ITTERATION")
	const north = new Vector2(0, -1);
	const south = new Vector2(0, 1);
	const west = new Vector2(-1, 0);
	const east = new Vector2(1, 0);

	var directions = [north, south, east, west];

	var current_direction;
	var chosen_coord;


	var coord_to_check;

	let top_of_previous_coords_stack = maze_gen.backtracking_previously_visited_stack[maze_gen.backtracking_previously_visited_stack.length - 1];
	let current_coord = top_of_previous_coords_stack;
	
	for (let i = 0; i < directions.length; i++) {
		var direction = directions[i]
		if (direction.x === maze_gen.backtracking_direction_from_previous.x && direction.y === maze_gen.backtracking_direction_from_previous.y) {
			directions.splice(i, 1);
		}
	}

	directions = shuffle(directions);
	

	for (let i = 0; i < directions.length; i++) {
		current_direction = directions[i];
		coord_to_check = current_coord.clone().addScaledVector(current_direction, 2);

		if (is_coord_wall(grid, coord_to_check)) {
			mark_tile_line(grid, current_coord, current_direction, 2, 0, defaults.gen_frontier_tile_color, globals);
			chosen_coord = coord_to_check;
			break;
		}
	}

	if (chosen_coord != null){
		//console.log("chosen_coord:",chosen_coord);
		maze_gen.backtracking_direction_from_previous = current_direction.clone().multiplyScalar(-1);
		make_zeroes_in_vector_positive(maze_gen.backtracking_direction_from_previous);

		maze_gen.backtracking_previously_visited_stack.push(chosen_coord);

		return maze_gen;
	}
	else {
		if (maze_gen.backtracking_previously_visited_stack.length <= 1) {
			//We ran out of spots to backtrack to
			maze_gen.is_running = false;
			//Clear space around 
			clear_around_coord(grid, globals.start_position, defaults.default_tile_height, defaults.path_tile_color, false, globals);
			clear_around_coord(grid, globals.end_position, defaults.default_tile_height, defaults.path_tile_color, false, globals);
			
			mark_tile(grid, current_coord, 0, defaults.path_tile_color, globals);
			return maze_gen;
		}
		else {
			//In a deadend, keep backtracking
			maze_gen.backtracking_previously_visited_stack.pop();
			top_of_previous_coords_stack = maze_gen.backtracking_previously_visited_stack[maze_gen.backtracking_previously_visited_stack.length - 1];

			maze_gen.backtracking_direction_from_previous = current_coord.clone().sub(top_of_previous_coords_stack).multiplyScalar(.5);
			make_zeroes_in_vector_positive(maze_gen.backtracking_direction_from_previous);

			mark_tile_line(grid, top_of_previous_coords_stack, maze_gen.backtracking_direction_from_previous, 2, 0, defaults.path_tile_color, globals);

			return maze_gen;

		}
	}
}

export function prim_maze_stepper(grid, maze_gen, defaults, globals) {
	//Pick random frontier

    var frontier_keys = Array.from( maze_gen.prim_frontier_tiles.keys() );
	if (frontier_keys.length <= 0) {
		maze_gen.is_running = false;
		clear_around_coord(grid, globals.start_position, defaults.default_tile_height, defaults.path_tile_color, false, globals);
		clear_around_coord(grid, globals.end_position, defaults.default_tile_height, defaults.path_tile_color, false, globals);
		return
	}
    var random_index = Math.floor(Math.random()*frontier_keys.length);
    var random_key = frontier_keys[random_index];

	var chosen_frontier_coord = new Vector2(parseInt(random_key.split("_")[0]), parseInt(random_key.split("_")[1]));
	var direction_to_source_tile = maze_gen.prim_frontier_tiles.get(random_key);

	mark_tile_line(grid, chosen_frontier_coord, direction_to_source_tile, 2, 0, defaults.path_tile_color, globals);
	mark_tile(grid, chosen_frontier_coord, 0, defaults.path_tile_color, globals);
	prim_generate_frontier(grid, maze_gen, chosen_frontier_coord, defaults.solver_tile_color, globals);

	maze_gen.prim_frontier_tiles.delete(random_key);
	maze_gen.prim_existing_path_tiles.set(random_key, 0);

}

export function noise_maze_stepper(grid, maze_gen, defaults, globals) {
	//Pick random frontier
	if (maze_gen.noise_maze_gen_index >= (grid.length*grid[0].length)) {
		maze_gen.is_running = false;
		clear_around_coord(grid, globals.start_position, defaults.default_tile_height, defaults.path_tile_color, false, globals);
		clear_around_coord(grid, globals.end_position, defaults.default_tile_height, defaults.path_tile_color, false, globals);
		return;
	}

	let row = maze_gen.noise_maze_gen_index % grid[0].length;
	let column = Math.floor(maze_gen.noise_maze_gen_index / grid.length);
	let coord = new Vector2(row, column);
	
	//let current_noise = Math.floor(Math.random()*10000);
	
	let current_noise = mix(maze_gen.noise_seed*10000000+row, column, maze_gen.noise_seed*10000000);
	
	//console.log("current_noise:",current_noise);

	let height;
	let color;
	if (current_noise % 3 === 0) {
		height = defaults.extended_block_height;
		color = defaults.wall_tile_color;
	}
	else {
		height = defaults.default_tile_height;
		color = defaults.path_tile_color;
	}

	mark_tile(grid, coord, height, color, globals);
	maze_gen.noise_maze_gen_index += 1;
}


//SOLVER SECTION


export function dfs_maze_stepper(grid, maze_solver, defaults, globals) {
	//var frontier_keys = Array.from( maze_solver.dfs_frontier_tiles.keys() );
	if (maze_solver.dfs_frontier_tiles.length > 0){
		if (maze_solver.found_target) {
			var current_coord = maze_solver.previous_coord_in_path_back;
			//console.log("current_coord:",current_coord);
			if (current_coord.x === globals.start_position.x && current_coord.y === globals.start_position.z) {
                globals.use_first_person_camera = false;
				maze_solver.is_running = false;
				return
			}

			mark_tile(grid, current_coord, undefined, defaults.return_trail_tile_color, globals);
			
			const key = String(current_coord.x)+"_"+String(current_coord.y);
			
			var direction = maze_solver.dfs_already_searched_tiles.get(key);
			var new_coord = current_coord.clone().add(direction);
			maze_solver.previous_coord_in_path_back = new_coord;
            set_first_person_camera_targets(globals, current_coord, new_coord, direction);
		}
		else {
			var stack_top = maze_solver.dfs_frontier_tiles.pop();
			var current_coord = stack_top[0];
			var direction_to_previous = stack_top[1];
			if (current_coord.x === globals.end_position.x && current_coord.y === globals.end_position.z) {
				maze_solver.found_target = true;
				maze_solver.previous_coord_in_path_back = current_coord;
				//maze_solver.is_running = false;
                if (maze_solver.is_rescuing) {
                    if (globals.is_first_person_camera_blocked === false) {
                        globals.use_first_person_camera = true;
                    }
                }
                globals.first_person_camera_start_position = new Vector3(current_coord.x, 1, current_coord.y);;
			    globals.first_person_camera_target_position = new Vector3(current_coord.x, 1, current_coord.y);;
			}

			mark_tile(grid, current_coord, undefined, defaults.solver_tile_color, globals);
			const key = String(current_coord.x)+"_"+String(current_coord.y);
			maze_solver.dfs_already_searched_tiles.set(key, direction_to_previous);
	
			//console.log("maze_solver.dfs_frontier_tiles:",maze_solver.dfs_frontier_tiles);
			//console.log("current_coord:",current_coord);
			dfs_generate_frontier(grid, maze_solver, current_coord, defaults.search_frontier_tile_color, globals);
		}
		
	}
	else {
		maze_solver.is_running = false;
		return
	}

}

export function bfs_maze_stepper(grid, maze_solver, defaults, globals) {
	//Okay, the main difference between this and dfs is that I'm picking a frontier from the bottom and not the top
	//Which sucks because I don't want to delete from the bottom every time
	//So I'm going to keep track on an index

	if (maze_solver.bfs_frontier_tiles_array.length > 0){
		//This section is for doubling back when we've found the target
		if (maze_solver.found_target) {
			var current_coord = maze_solver.previous_coord_in_path_back;
			//console.log("current_coord:",current_coord);
			if (current_coord.x === globals.start_position.x && current_coord.y === globals.start_position.z) {
                globals.use_first_person_camera = false;
				maze_solver.is_running = false;
				return
			}

			mark_tile(grid, current_coord, undefined, defaults.return_trail_tile_color, globals);
			const key = String(current_coord.x)+"_"+String(current_coord.y);
			
			var direction = maze_solver.bfs_already_searched_tiles.get(key);
			var new_coord = current_coord.clone().add(direction);
			maze_solver.previous_coord_in_path_back = new_coord;
            set_first_person_camera_targets(globals, current_coord, new_coord, direction);
		}
		//This section if for searching for the target
		else {
			//We want stack bottom instead of stack top
			//console.log("I am here");
			//console.log(":)");

			var stack_unchecked_bottom = maze_solver.bfs_frontier_tiles_array[maze_solver.bfs_frontier_index];
			if (stack_unchecked_bottom === undefined) {
				maze_solver.is_running = false;
				return
			}

			maze_solver.bfs_frontier_index += 1;
			var current_coord = stack_unchecked_bottom[0];
			var direction_to_previous = stack_unchecked_bottom[1];

            if (current_coord.x === globals.end_position.x && current_coord.y === globals.end_position.z) {
				maze_solver.found_target = true;
				maze_solver.previous_coord_in_path_back = current_coord;
                if (maze_solver.is_rescuing) {
                    if (globals.is_first_person_camera_blocked === false) {
                        globals.use_first_person_camera = true;
                    }
                }
                globals.first_person_camera_start_position = new Vector3(current_coord.x, 1, current_coord.y);;
			    globals.first_person_camera_target_position = new Vector3(current_coord.x, 1, current_coord.y);;
			}

			const key = String(current_coord.x)+"_"+String(current_coord.y);
			maze_solver.bfs_already_searched_tiles.set(key, direction_to_previous);
			
			mark_tile(grid, current_coord, undefined, defaults.solver_tile_color, globals);
			bfs_generate_frontier(grid, maze_solver, current_coord, defaults.search_frontier_tile_color, globals);
			
		}
		
	}
	else {
		maze_solver.is_running = false;
		return
	}

}

export function gfs_maze_stepper(grid, maze_solver, defaults, globals, scene) {
	//We want to pick the frontier with the highest score

	//console.log("maze_solver.gfs_frontier_tiles_map:",maze_solver.gfs_frontier_tiles_map);

	if (maze_solver.gfs_frontier_tiles_map.size > 0){
		//This section is for doubling back when we've found the target
		if (maze_solver.found_target) {
			var current_coord = maze_solver.previous_coord_in_path_back;
			//console.log("current_coord:",current_coord);
			if (current_coord.x === globals.start_position.x && current_coord.y === globals.start_position.z) {
                globals.use_first_person_camera = false;
				maze_solver.is_running = false;
				return
			}

			mark_tile(grid, current_coord, undefined, defaults.return_trail_tile_color, globals);
			const key = String(current_coord.x)+"_"+String(current_coord.y);
			
			var direction = maze_solver.gfs_already_searched_tiles.get(key);
			var new_coord = current_coord.clone().add(direction);
			maze_solver.previous_coord_in_path_back = new_coord;
            set_first_person_camera_targets(globals, current_coord, new_coord, direction);
		}
		//This section if for searching for the target
		else {
			//console.log("maze_solver.gfs_frontier_tiles_heap:",maze_solver.gfs_frontier_tiles_heap);
			var frontier_with_highest_score = maze_solver.gfs_frontier_tiles_heap.pop();
			//console.log("mazfrontier_with_highest_score:", frontier_with_highest_score);
			
			var current_coord = frontier_with_highest_score[1];
			var direction_to_previous = frontier_with_highest_score[2];
			if (current_coord === undefined) {
				maze_solver.is_running = false;
				return;
			}

			if (current_coord.x === globals.end_position.x && current_coord.y === globals.end_position.z) {
				maze_solver.found_target = true;
				maze_solver.previous_coord_in_path_back = current_coord;
                if (maze_solver.is_rescuing) {
                    if (globals.is_first_person_camera_blocked === false) {
                        globals.use_first_person_camera = true;
                    }
                }
                globals.first_person_camera_start_position = new Vector3(current_coord.x, 1, current_coord.y);;
			    globals.first_person_camera_target_position = new Vector3(current_coord.x, 1, current_coord.y);;
			}
	
			var tile = grid[current_coord.y][current_coord.x];

            let percentage;
			let chosen_color;

            if (globals.is_warm_cold_coloring && tile.score<0) {
                percentage = tile.score/maze_solver.manhattan_min_score;
                chosen_color = new Color(defaults.solver_tile_color).lerp(new Color(defaults.max_cool_tile_color), percentage);
            }else if (globals.is_warm_cold_coloring && tile.score>0) {
                percentage = tile.score/maze_solver.manhattan_max_score;
                chosen_color = new Color(defaults.solver_tile_color).lerp(new Color(defaults.max_warm_tile_color), percentage);
            }else {
                percentage = 0;
                chosen_color = defaults.solver_tile_color;
            }
			mark_tile(grid, current_coord, undefined, chosen_color, globals);

			const key = String(current_coord.x)+"_"+String(current_coord.y);
			maze_solver.gfs_already_searched_tiles.set(key, direction_to_previous);

			gfs_generate_frontier(grid, maze_solver, current_coord, defaults, globals, scene);
		}
		
	}
	else {
		maze_solver.is_running = false;
		return
	}
}

export function wall_follower_left_hand_maze_stepper(grid, maze_solver, defaults, globals) {
	const left = Math.PI/2;
	const forwards = 0;
	const right = -Math.PI/2;
	const behind = Math.PI;

	var directions = [left, forwards, right, behind];
	var chosen_direction;
	var chosen_coord;

	if (maze_solver.found_target) {
		var current_coord = maze_solver.previous_coord_in_path_back;
		//console.log("current_coord:",current_coord);
		if (current_coord.x === globals.start_position.x && current_coord.z === globals.start_position.z) {
			maze_solver.is_running = false;
            globals.use_first_person_camera = false;
			return
		}

		mark_tile(grid, new Vector2(current_coord.x, current_coord.z), undefined, defaults.return_trail_tile_color, globals);
		const key = String(current_coord.x)+"_"+String(current_coord.z);
		
		var direction = maze_solver.wall_follower_already_searched_tiles.get(key);
		var new_coord = current_coord.clone().add(direction);
        //console.log("Got to exit")

        //Let's get the camera tracking
		set_first_person_camera_targets(globals, current_coord, new_coord, direction);

		maze_solver.previous_coord_in_path_back = new_coord;
	}
	else {
		for (let i = 0; i < directions.length; i++) {
			var direction = directions[i];
			let pointing_vector = rotate_vector_90deg(maze_solver.wall_follower_direction_vector, direction);
			var coord_to_check = maze_solver.wall_follower_current_position.clone().add(pointing_vector);

			if (is_coord_path(grid, coord_to_check)) {
				chosen_direction = pointing_vector.clone();
				chosen_coord = coord_to_check.clone();
				break
			}
		}
		maze_solver.wall_follower_current_position = chosen_coord;
		maze_solver.wall_follower_current_position.y = 1;
		maze_solver.wall_follower_direction_vector = chosen_direction;

		globals.arrow_object.position.copy(chosen_coord);

		let rotation_euler = new Euler(0, (Math.PI/2 * -(chosen_direction.x)) + (Math.PI/2 * Math.floor(-chosen_direction.z/2)*2), 0);
		globals.arrow_object.rotation.copy(rotation_euler);

		const key = String(chosen_coord.x)+"_"+String(chosen_coord.z);
		let chosen_color;

		if (maze_solver.wall_follower_already_searched_tiles.has(key)) {
			chosen_color = defaults.solver_tile_color;
		} else {
			chosen_color = defaults.search_frontier_tile_color;
			let direction_to_source = chosen_direction.clone().multiplyScalar(-1);
			make_zeroes_in_vector_positive(direction_to_source);
			maze_solver.wall_follower_already_searched_tiles.set(key, direction_to_source);
		}
		//console.log("chosen_color:", chosen_color);
		//console.log("chosen_coord:", chosen_coord);
		mark_tile(grid, new Vector2(chosen_coord.x, chosen_coord.z), undefined, chosen_color, globals);

		if (chosen_coord.x === globals.end_position.x && chosen_coord.z === globals.end_position.z) {
			maze_solver.found_target = true;

            if (maze_solver.is_rescuing) {
                if (globals.is_first_person_camera_blocked === false) {
                    globals.use_first_person_camera = true;
                }
            }
            
			
			globals.first_person_camera_start_position = chosen_coord;
			globals.first_person_camera_target_position = chosen_coord;
			
			maze_solver.previous_coord_in_path_back = chosen_coord;
		}

		if (maze_solver.wall_follower_fast_current_position.x === maze_solver.wall_follower_current_position.x && maze_solver.wall_follower_fast_current_position.z === maze_solver.wall_follower_current_position.z) {
			if (maze_solver.wall_follower_fast_direction_vector.x === maze_solver.wall_follower_direction_vector.x && maze_solver.wall_follower_fast_direction_vector.z === maze_solver.wall_follower_direction_vector.z) {
				console.log("We've hit a cycle");
				maze_solver.is_running = false;
                globals.use_first_person_camera = false;
				return;
			}
		}
	}
}

export function wall_follower_fast_left_hand_maze_stepper(grid, maze_solver, defaults, globals) {
	const left = Math.PI/2;
	const forwards = 0;
	const right = -Math.PI/2;
	const behind = Math.PI;
	
	var directions = [left, forwards, right, behind];
	var chosen_direction;
	var chosen_coord;

	if (maze_solver.found_target === false) {
		for (let i = 0; i < directions.length; i++) {
			var direction = directions[i];
			let pointing_vector = rotate_vector_90deg(maze_solver.wall_follower_fast_direction_vector, direction);
			var coord_to_check = maze_solver.wall_follower_fast_current_position.clone().add(pointing_vector);

			if (is_coord_path(grid, coord_to_check)) {
				chosen_direction = pointing_vector.clone();
				chosen_coord = coord_to_check.clone();
				break
			}
		}

		maze_solver.wall_follower_fast_current_position = chosen_coord;
		maze_solver.wall_follower_fast_direction_vector = chosen_direction;


		maze_solver.wall_follower_fast_current_position.y = 1;

		globals.arrow_object_fast.position.copy(chosen_coord);

		let rotation_euler = new Euler(0, (Math.PI/2 * -(chosen_direction.x)) + (Math.PI/2 * Math.floor(-chosen_direction.z/2)*2), 0);
		globals.arrow_object_fast.rotation.copy(rotation_euler);
	}
}

export function dead_end_filling_stepper(grid, maze_solver, defaults, globals) {
	if (maze_solver.found_target) {
		maze_solver.is_running = false;
		//I think on the way back we'll just use a different algorithm
		//Or do nothing, can't decide
	}

    if ( maze_solver.dead_end_finder_found_all_dead_ends === false ) {
        for(let i = maze_solver.dead_end_finder_index; i < (grid[0].length * grid.length); i++) {
            let row = i%grid[0].length;
            let column = Math.floor(i/grid[0].length);
            let coord_to_check = new Vector2(row, column);
            if (is_dead_end(grid, coord_to_check)) {
                //console.log("dead end found");
                mark_tile(grid, coord_to_check, 0, defaults.search_frontier_tile_color, globals);

		        const key = String(coord_to_check.x)+"_"+String(coord_to_check.y);
                maze_solver.dead_end_finder_frontier_tiles_map.add(key);
                maze_solver.dead_end_finder_index = i+1;
                break
            }
            if ( i === (grid[0].length * grid.length)-1 ) {
                //maze_solver.is_running = false;
                maze_solver.dead_end_finder_found_all_dead_ends = true;
                //console.log("Looped through everything");
            }
        }
    } else {
		var temp_dead_end_finder_frontier_tiles_map = new Set();
        maze_solver.dead_end_finder_frontier_tiles_map.forEach((key) => {
            let row = parseInt(key.split('_')[0]);
            let column = parseInt(key.split('_')[1]);
            let coord_to_check = new Vector2(row, column);
            //console.log("coord_to_check:",coord_to_check);

            var top_coord = new Vector2(row, column-1);
            var bottom_coord = new Vector2(row, column+1);
            var left_coord = new Vector2(row-1, column);
            var right_coord = new Vector2(row+1, column);

            var adjacent_coords = [top_coord, bottom_coord, left_coord, right_coord];
            var adjacent_paths = [];
            for(let i = 0; i < adjacent_coords.length; i++) {
                var adjacent_coord = adjacent_coords[i];

                if (is_coord_in_bounds(grid, adjacent_coord)) {
                    if (is_coord_path(grid, adjacent_coord)) {
                        let adj_key = String(adjacent_coord.x)+"_"+String(adjacent_coord.y);
                        if ( maze_solver.dead_end_finder_already_searched_tiles.has(adj_key) === false ) {
                            adjacent_paths.push(adjacent_coord);
                        }
                    }
                }
            }
            //console.log("adjacent_paths:", adjacent_paths);
            if (adjacent_paths.length > 0) {
                if (adjacent_paths.length === 1) {
                    let new_key = String(adjacent_paths[0].x)+"_"+String(adjacent_paths[0].y);
                    mark_tile(grid, coord_to_check, 0, defaults.solver_tile_color, globals);
                    maze_solver.dead_end_finder_frontier_tiles_map.delete(key);
                    maze_solver.dead_end_finder_already_searched_tiles.add(key);
                    temp_dead_end_finder_frontier_tiles_map.add(new_key);
                    mark_tile(grid, adjacent_paths[0], 0, defaults.search_frontier_tile_color, globals);
                }
				else {
                    maze_solver.dead_end_finder_frontier_tiles_map.delete(key);
                    mark_tile(grid, coord_to_check, 0, defaults.path_tile_color, globals);
				}
            }
            else {
                mark_tile(grid, coord_to_check, 0, defaults.search_frontier_tile_color, globals);
                maze_solver.dead_end_finder_already_searched_tiles.add(key);
                maze_solver.dead_end_finder_frontier_tiles_map.delete(key);
            }
            //Loop through adjacent coords 
        });
		maze_solver.dead_end_finder_frontier_tiles_map = new Set([...maze_solver.dead_end_finder_frontier_tiles_map, ...temp_dead_end_finder_frontier_tiles_map])
        //console.log("maze_solver.dead_end_finder_frontier_tiles_map:",maze_solver.dead_end_finder_frontier_tiles_map);
		if (maze_solver.dead_end_finder_frontier_tiles_map.size === 0) {
			maze_solver.found_target = true;
		}
    }
}

export function a_star_maze_stepper(grid, maze_solver, defaults, globals, scene) {
    //console.log("Stepper starts");

	if (maze_solver.a_star_frontier_tiles_map.size > 0){
		//This section is for doubling back when we've found the target
		if (maze_solver.found_target) {
			var current_coord = maze_solver.previous_coord_in_path_back;
			//console.log("current_coord:",current_coord);
			if (current_coord.x === globals.start_position.x && current_coord.y === globals.start_position.z) {
                globals.use_first_person_camera = false;
				maze_solver.is_running = false;
				return
			}
			mark_tile(grid, current_coord, undefined, defaults.return_trail_tile_color, globals);
			const key = String(current_coord.x)+"_"+String(current_coord.y);
			
			var direction = maze_solver.a_star_already_searched_tiles.get(key);
			var new_coord = current_coord.clone().add(direction);
			maze_solver.previous_coord_in_path_back = new_coord;
            set_first_person_camera_targets(globals, current_coord, new_coord, direction);
		}
		//This section if for searching for the target
		else {
            let keep_looping = true;
            var key;
            var current_coord;
            var frontier_with_lowest_score;
            while (keep_looping) {
                frontier_with_lowest_score = maze_solver.a_star_frontier_tiles_heap.pop();
                if (frontier_with_lowest_score === -1) {
                    maze_solver.is_running = false;
                    return;
                }
                current_coord = frontier_with_lowest_score[1];
                //console.log("frontier_with_lowest_score:", frontier_with_lowest_score)
                key = String(current_coord.x)+"_"+String(current_coord.y);
                if (maze_solver.a_star_already_searched_tiles.has(key)) {
					//Dead value
                }
                else {
                    keep_looping = false;
                }
				/*
                const keyz = String(current_coord.x)+"_"+String(current_coord.y);
                if (maze_solver.a_star_frontier_tiles_heap.index_tracking_map.has(keyz)) {
                    for (let i = 1; i < maze_solver.a_star_frontier_tiles_heap.heap.length; i++) {
                        let value = maze_solver.a_star_frontier_tiles_heap.heap[i];
                        let key = String(value[1].x)+"_"+String(value[1].y);
                        //console.log(i, key, value[0]);
                    }
                }
				*/
            }

            var direction_to_previous = maze_solver.direction_to_source_map.get(key);
			//var direction_to_previous = frontier_with_lowest_score[2];
			if (current_coord === undefined) {
				maze_solver.is_running = false;
				return;
			}

			if (current_coord.x === globals.end_position.x && current_coord.y === globals.end_position.z) {
				maze_solver.found_target = true;
				maze_solver.previous_coord_in_path_back = current_coord;
                if (maze_solver.is_rescuing) {
                    if (globals.is_first_person_camera_blocked === false) {
                        globals.use_first_person_camera = true;
                    }
                }
                globals.first_person_camera_start_position = new Vector3(current_coord.x, 1, current_coord.y);;
			    globals.first_person_camera_target_position = new Vector3(current_coord.x, 1, current_coord.y);;
			}
	
            var h_score = maze_solver.h_score_map.get(key);

			let chosen_color;
			if (globals.is_warm_cold_coloring && h_score != 0) {
				let percentage = 1-(h_score / maze_solver.crow_min_score);
				//defaults.max_warm_tile_color
				//defaults.search_frontier_tile_color
				//chosen_color = new Color(defaults.solver_tile_color).lerp(new Color(0x00ffff), percentage);
				//defaults.max_warm_tile_color
				//chosen_color = new Color(defaults.solver_tile_color).lerpHSL(new Color(defaults.max_warm_tile_color), percentage);
				chosen_color = new Color(defaults.solver_tile_color).lerp(new Color(defaults.max_warm_tile_color), percentage);
				//chosen_color = defaults.solver_tile_color;
			}else {
				chosen_color = defaults.solver_tile_color;
			}
            

			mark_tile(grid, current_coord, undefined, chosen_color, globals);

			maze_solver.a_star_already_searched_tiles.set(key, direction_to_previous);

			a_star_generate_frontier(grid, maze_solver, current_coord, defaults, globals, scene);
		}
		
	}
	else {
		maze_solver.is_running = false;
		return
	}

    //Set the position of every small arrow object
}