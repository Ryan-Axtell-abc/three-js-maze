import { 
	Vector2, MeshStandardMaterial, Vector3,
} from 'three';

export class defaults_data {
	constructor() {
		this.default_tile_height = 0;
		this.alt_tile_height = 0;
		this.extended_block_height = 1;

		this.block_raise_time = .315;

		this.path_tile_color = 0xff000;
		this.wall_tile_color = 0x6F4A95;
		this.search_frontier_tile_color = "rgb(254, 110, 1)";
		this.gen_frontier_tile_color = 0xfea401;
        this.solver_tile_color = 0xfea401;
		this.return_trail_tile_color = 0x0000FF;
		
		this.max_cool_tile_color = "rgb(0, 0, 255)";
		this.max_warm_tile_color = "rgb(255, 0, 0)";


		this.default_material = new MeshStandardMaterial({toneMapped: false, roughness: 1, metalness: 0,});
		this.black_material = new MeshStandardMaterial( { color: 0x000000 } );

		this.amount_of_tile_types = 2;

		this.narrow_mode_threshold = 471;
	}
}

export class globals_data {
	constructor()
		{
		//flags
		this.running_setup = true;
		this.loading_models_tiles = true;
		this.loading_models_start = true;
		this.loading_models_end = true;
		this.loading_models_arrow = true;
		this.loading_font_1 = true;
		this.loading_fps_counter = true;
		this.loading_models_run_once_toggle = true;
		this.is_dragging_start = false;
		this.is_dragging_end = false;
		this.use_first_person_camera = false;
		this.is_first_person_camera_blocked = false;
		this.is_nothing_blocking_grid = false;
		this.is_narrow = false;
		this.lights_still_moving = true;
		this.is_highlighting = true;
		this.is_warm_cold_coloring = false;
		this.a_star_diagonal = false;

		//holders
		this.geometry_holder = [];
		this.instanced_mesh_holder = [];
		this.dummy_holder = [];
		this.index_holder = [];
		this.point_light_holder = [];
		this.recently_hovered = [];
		this.tiles_to_update = [];
		this.tiles_to_update_set = new Set();


		this.currently_hovered = new Vector2(-1, -1);

		this.amount_of_each_tile_type_0 = 0;
		this.amount_of_each_tile_type_1 = 0;

		this.start_object;
		this.start_position = new Vector3(0,1,0);
        this.start_light;

		this.end_object;
		this.end_position = new Vector3(0,1,0);
        this.end_light;
		
		this.first_person_camera_current_time_elapsed = 0;
		this.first_person_camera_target_time_elapsed = 0;
		this.first_person_camera_start_position = this.end_position;
		this.first_person_camera_target_position = this.end_position;
		this.first_person_camera_delay_time = .1;
		this.first_person_camera_start_rotation = 0;
		this.first_person_camera_target_rotation = 0;
		
		this.font_1;

		this.arrow_object;
		this.arrow_object_fast;

		this.grid_size = 11;
        this.grid_size_x = this.grid_size;
        this.grid_size_y = this.grid_size;
	}
}

export class max_heap_for_data {
    constructor() {
        this.heap = new Array();
        this.heap.push(0);
    }

    push(val) {
        this.heap.push(val);
		let index = this.heap.length - 1;
		let value = this.heap[index];
		let parent_index = Math.floor(index / 2);
		let parent_value = this.heap[parent_index];

        // Percolate up
        while (index > 1 && value[0] > this.heap[Math.floor(index / 2)][0]) {
			value = this.heap[index];

			parent_index = Math.floor(index / 2);
			parent_value = this.heap[parent_index];

            let tmp = value;
            this.heap[index] = parent_value;
            this.heap[parent_index] = tmp;
            index = Math.floor(index / 2);
        }
		//console.log("Heap after percolating up:", this.heap);
		//fancy_print_heap(this.heap);
    }

	pop() {
        if (this.heap.length == 1) {
            // Normally we would throw an exception if heap is empty.
            return -1;
        }
        if (this.heap.length == 2) {
            return this.heap.pop();
        }

        let old_root_node = this.heap[1];
        // Move last value to root
        this.heap[1] = this.heap.pop();

        let index = 1;
		
		//If the left child index would be greater than the heap length, that means that the index is already on the bottom row
		let is_on_bottom_row = 2 * index >= this.heap.length;
        while(is_on_bottom_row === false) {
			let value = this.heap[index];
			let left_child_index = 2 * index;
			let right_child_index = 2 * index + 1;

			let index_to_swap_with = left_child_index;

			let left_child_value = this.heap[left_child_index];
			//Check if the right child index is in bounds
            if (right_child_index < this.heap.length) {
				let right_child_value = this.heap[right_child_index];
				//We want to swap with the larger side
				if (right_child_value[0] > left_child_value[0]) {
					index_to_swap_with = right_child_index;
				}
            }
			
			let higher_child_value = this.heap[index_to_swap_with]

			if (higher_child_value[0] > value[0]) {
				this.heap[index] = higher_child_value;
				this.heap[index_to_swap_with] = value;
				index = index_to_swap_with;
			} else {
				break;
			}
			is_on_bottom_row = 2 * index >= this.heap.length
        }
        return old_root_node;
    }
}

export class min_heap_for_data {
    constructor() {
        this.heap = new Array();
        this.heap.push(0);
    }

    push(val) {
        this.heap.push(val);
		let index = this.heap.length - 1;
		let value_container = this.heap[index];

		//[f_cost, coord_to_check]

        let score = value_container[0];
        let coord = value_container[1];
		const key = String(coord.x)+"_"+String(coord.y);

		let parent_index = Math.floor(index / 2);
		let parent_value_container = this.heap[parent_index];

        // Percolate up
        while (index > 1 && score < this.heap[Math.floor(index / 2)][0]) {
			value_container = this.heap[index];

			parent_index = Math.floor(index / 2);
			parent_value_container = this.heap[parent_index];
            const parent_key = String(parent_value_container[1].x)+"_"+String(parent_value_container[1].y);

            let tmp = value_container;
            this.heap[index] = parent_value_container;
            this.heap[parent_index] = tmp;

            index = Math.floor(index / 2);
        }
    }

	pop() {
        if (this.heap.length == 1) {
            // Normally we would throw an exception if heap is empty.
            return -1;
        }
        if (this.heap.length == 2) {
            //console.log("heap has only one item:", this.heap);
            let value_container = this.heap.pop();
            let coord = value_container[1];
            const key = String(coord.x)+"_"+String(coord.y);
            return value_container;
        }

        let old_root_node = this.heap[1];
        let old_root_coord = old_root_node[1];
        const old_root_key = String(old_root_coord.x)+"_"+String(old_root_coord.y);

        // Move last value to root
        let last_value_container = this.heap.pop();

        this.heap[1] = last_value_container;

        let index = 1;
		
		//If the left child index would be greater than the heap length, that means that the index is already on the bottom row
		let is_on_bottom_row = 2 * index >= this.heap.length;
        while(is_on_bottom_row === false) {
			let value = this.heap[index];
			let left_child_index = 2 * index;
			let right_child_index = 2 * index + 1;

			let index_to_swap_with = left_child_index;

			let left_child_value = this.heap[left_child_index];
			//Check if the right child index is in bounds
            if (right_child_index < this.heap.length) {
				let right_child_value = this.heap[right_child_index];
				//We want to swap with the smaller side
				if (right_child_value[0] < left_child_value[0]) {
					index_to_swap_with = right_child_index;
				}
            }
			
			let higher_child_value = this.heap[index_to_swap_with]

			if (higher_child_value[0] < value[0]) {
				this.heap[index] = higher_child_value;
				this.heap[index_to_swap_with] = value;

				index = index_to_swap_with;
			} else {
				break;
			}
			is_on_bottom_row = 2 * index >= this.heap.length;
        }
        return old_root_node;
    }
}

export class tile_data {
	constructor({
			tile_type = 0,
			index_of_this_type = 0,
			animation_start_y = 0,
			target_y = 0,
			is_animating = false,
			is_looping = false,
			current_time_elapsed = 0,
			target_time_elapsed = 0,
			ease_type = "easeOutElastic",
			target_color = 0,
			is_hovered = false,
			position_x,
			position_z,
			index_in_instanced_mesh,
		} = {})
		{
		this.tile_type = tile_type;
		this.index_of_this_type = index_of_this_type;
		this.animation_start_y = animation_start_y;
		this.target_y = target_y;
		this.is_animating = is_animating;
		this.is_looping = is_looping;
		this.current_time_elapsed = current_time_elapsed;
		this.target_time_elapsed = target_time_elapsed;
		this.ease_type = ease_type;
		this.target_color = target_color;
		this.is_hovered = is_hovered;
		this.position_x = position_x;
		this.position_z = position_z;
		this.index_in_instanced_mesh = index_in_instanced_mesh;
	}
}

export class maze_gen_data {
	constructor({
			algorithm = null,
			is_running = false,
			is_visual = false,
			backtracking_direction_from_previous = new Vector2(0,0),
			backtracking_previously_visited_stack = [],
			prim_frontier_tiles = new Map(),
			prim_existing_path_tiles = new Map(),
			noise_maze_gen_index = 0,
			noise_seed = Math.random(),
		} = {})
		{
		this.algorithm = algorithm;
		this.is_running = is_running;
		this.is_visual = is_visual;
		this.backtracking_direction_from_previous = backtracking_direction_from_previous;
		this.backtracking_previously_visited_stack = backtracking_previously_visited_stack;
		this.prim_frontier_tiles = prim_frontier_tiles;
		this.prim_existing_path_tiles = prim_existing_path_tiles;
		this.noise_maze_gen_index = noise_maze_gen_index;
		this.noise_seed = noise_seed;
	}
}

export class maze_solver_data {
	constructor({
			algorithm = null,
			is_running = false,
			is_visual = false,
			found_target = false,
			previous_coord_in_path_back = new Vector2(0,0),
			is_stepping = false,
			dead_ends = new Set(),
			is_rescuing = false,
			manhattan_min_score = 0,
			manhattan_max_score = 0,
			crow_max_score = 0,
			crow_min_score = 0,
            score_map = new Map(),
            direction_to_source_map = new Map(),
            direction_to_source_arrow_objects = new Map(),

			dfs_frontier_tiles = [],
			dfs_already_searched_tiles = new Map(),

			bfs_frontier_tiles_array = [],
			bfs_frontier_tiles_map = new Set(),
			bfs_already_searched_tiles = new Map(),
			bfs_frontier_index = 0,

			gfs_frontier_tiles_heap = new max_heap_for_data(),
			gfs_frontier_tiles_map = new Set(),
			gfs_already_searched_tiles = new Map(),
			gfs_score_numbers = new Map(),

			wall_follower_already_searched_tiles = new Map(),
			wall_follower_current_position = new Vector3(0,0,0),
			wall_follower_direction_vector = new Vector3(0,0,-1),

			wall_follower_fast_current_position = new Vector3(0,0,0),
			wall_follower_fast_direction_vector = new Vector3(0,0,-1),

			dead_end_finder_index = 0,
			dead_end_finder_already_searched_tiles = new Set(),
			dead_end_finder_frontier_tiles_map = new Set(),
			dead_end_finder_found_all_dead_ends = false,

            a_star_frontier_tiles_heap = new min_heap_for_data(),
			a_star_frontier_tiles_map = new Set(),
			a_star_already_searched_tiles = new Map(),
			a_star_score_numbers = new Map(),
			a_star_g_score_numbers = new Map(),
			a_star_h_score_numbers = new Map(),
            g_score_map = new Map(),
            h_score_map = new Map(),
		} = {})
		{
		this.algorithm = algorithm;
		this.is_running = is_running;
		this.is_visual = is_visual;
		this.found_target = found_target;
		this.previous_coord_in_path_back = previous_coord_in_path_back;
		this.is_stepping = is_stepping;
		this.dead_ends = dead_ends;
		this.is_rescuing = is_rescuing;
		this.manhattan_min_score = manhattan_min_score;
		this.manhattan_max_score = manhattan_max_score;
        this.crow_max_score = crow_max_score;
        this.crow_min_score = crow_min_score;
        this.score_map = score_map;
        this.direction_to_source_map = direction_to_source_map;
        this.direction_to_source_arrow_objects = direction_to_source_arrow_objects;

		this.dfs_frontier_tiles = dfs_frontier_tiles;
		this.dfs_already_searched_tiles = dfs_already_searched_tiles;

		this.bfs_frontier_tiles_array = bfs_frontier_tiles_array;
		this.bfs_frontier_tiles_map = bfs_frontier_tiles_map;
		this.bfs_already_searched_tiles = bfs_already_searched_tiles;
		this.bfs_frontier_index = bfs_frontier_index;

		this.gfs_frontier_tiles_heap = gfs_frontier_tiles_heap;
		this.gfs_frontier_tiles_map = gfs_frontier_tiles_map;
		this.gfs_already_searched_tiles = gfs_already_searched_tiles;
		this.gfs_score_numbers = gfs_score_numbers;

		this.wall_follower_already_searched_tiles = wall_follower_already_searched_tiles;
		this.wall_follower_current_position = wall_follower_current_position;
		this.wall_follower_direction_vector = wall_follower_direction_vector;

		this.wall_follower_fast_current_position = wall_follower_fast_current_position;
		this.wall_follower_fast_direction_vector = wall_follower_fast_direction_vector;


		this.dead_end_finder_index = dead_end_finder_index;
		this.dead_end_finder_already_searched_tiles = dead_end_finder_already_searched_tiles;
		this.dead_end_finder_frontier_tiles_map = dead_end_finder_frontier_tiles_map;
		this.dead_end_finder_found_all_dead_ends = dead_end_finder_found_all_dead_ends;

        this.a_star_frontier_tiles_heap = a_star_frontier_tiles_heap;
		this.a_star_frontier_tiles_map = a_star_frontier_tiles_map;
		this.a_star_already_searched_tiles = a_star_already_searched_tiles;
		this.a_star_score_numbers = a_star_score_numbers;
        this.a_star_g_score_numbers = a_star_g_score_numbers;
        this.a_star_h_score_numbers = a_star_h_score_numbers;
        this.g_score_map = g_score_map;
        this.h_score_map = h_score_map;

	}
}