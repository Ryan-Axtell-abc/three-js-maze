import { 
	Vector2,
	Vector3,
	Euler,
} from 'three';
//This is for pure functions


//This section is for easing functions
export function linear_ease(x){
    return x;

}

export function easeInOutCirc_ease(x){
    let calculation = x < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2;
    return calculation;

}

export function easeInOutQuad_ease(x){
    let calculation = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    return calculation;

}

export function easeOutElastic_ease(x){
    const c4 = (2 * Math.PI) / 3;
    let calculation = x === 0
    ? 0
    : x === 1
    ? 1
    : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    return calculation;

}

export function easeOutQuad_ease(x){
    let calculation = 1 - (1 - x) * (1 - x);
    return calculation;

}

export function exp_decay(current, target, decay, dt){
	let difference = (current-target);
	let fraction_of_remaining_distance_to_add = Math.exp(-decay*dt)
	let amount_to_change = difference*fraction_of_remaining_distance_to_add;

	let new_current =  target+amount_to_change;
    return new_current;

}

export function is_coord_in_bounds(grid, coord_to_check) {
	if (grid.length > 0) {
		let row_coord;
		let column_coord;

		row_coord = coord_to_check.x;
		//First check if vector3 or vector2
		if (coord_to_check.isVector3) {
			column_coord = coord_to_check.z;
		} else {
			//Assume vector2
			column_coord = coord_to_check.y;
		}

		if (row_coord >= 0 && row_coord <= grid[0].length -1 && column_coord >= 0 && column_coord <= grid.length -1) {
			return true;
		}
	}
	return false;

}

export function is_dead_end(grid, coord_to_check) {
	if (is_coord_path(grid, coord_to_check)) {
		let row = coord_to_check.x;
		let column = coord_to_check.y;

		var top_coord = new Vector2(row, column-1);
		var bottom_coord = new Vector2(row, column+1);
		var left_coord = new Vector2(row-1, column);
		var right_coord = new Vector2(row+1, column);

		var adjacent_coords = [top_coord, bottom_coord, left_coord, right_coord];
		var adjacent_walls_counter = 0;
		for(let i = 0; i < adjacent_coords.length; i++) {
			let adjacent_coord = adjacent_coords[i];
			if (is_coord_in_bounds(grid, adjacent_coord)) {
				if (is_coord_wall(grid, adjacent_coord)) {
					adjacent_walls_counter+=1;
				}
			}
			else {
				adjacent_walls_counter+=1;
			}
		}
		if (adjacent_walls_counter >= 3) {
			return true;
		}
		else {
			return false;
		}
	}
	return false;
}

export function is_coord_path(grid, coord_to_check) {
	let row_coord;
	let column_coord;

	row_coord = coord_to_check.x;
	//First check if vector3 or vector2
	if (coord_to_check.isVector3) {
		column_coord = coord_to_check.z;
	} else {
		//Assume vector2
		column_coord = coord_to_check.y;
	}

	if (is_coord_in_bounds(grid, coord_to_check)) {
		var tile_data = grid[column_coord][row_coord];
		if (tile_data !== undefined) {
			if (tile_data.target_y === 0) {
				return true;
			}
		}
	}
	return false;
}

export function is_coord_wall(grid, coord_to_check) {
	let row_coord;
	let column_coord;

	row_coord = coord_to_check.x;
	//First check if vector3 or vector2
	if (coord_to_check.isVector3) {
		column_coord = coord_to_check.z;
	} else {
		//Assume vector2
		column_coord = coord_to_check.y;
	}

	if (is_coord_in_bounds(grid, coord_to_check)) {
		var tile_data = grid[column_coord][row_coord];
		if (tile_data !== undefined) {
			if (tile_data.target_y === 1) {
				return true;
			}
		}
	}
	return false;
}

export function shuffle(array) {
	//Okay this shuffle function is bad
	let currentIndex = array.length;
	let working_array = array.slice();
  
	// While there remain elements to shuffle...
	while (currentIndex != 0) {
  
	  // Pick a remaining element...
	  let randomIndex = Math.floor(Math.random() * currentIndex);
	  currentIndex--;
  
	  // And swap it with the current element.
	  [working_array[currentIndex], working_array[randomIndex]] = [
		working_array[randomIndex], working_array[currentIndex]];
	}
	return working_array;
}

export function tile_type_oracle(x,y) {
	if ((x+y) % 2 == 0  && x%2 == 0) {
		return 1
	}
	else {
		return 0
	}

}

export function interpolate_y(starting_y, target_y, ease_type, current_time_elapsed, target_time_elapsed) {

	let percent_done = current_time_elapsed/target_time_elapsed;
	if (percent_done > 1) {
		percent_done = 1
	}

	let multiplier;
	
	if (ease_type === "linear") {
		multiplier = linear_ease(percent_done);
	}
	else if (ease_type === "easeInOutCirc") {
		multiplier = easeInOutCirc_ease(percent_done);
	}
	else if (ease_type === "easeInOutQuad") {
		multiplier = easeInOutQuad_ease(percent_done);
	}
	else if (ease_type === "easeOutElastic") {
		multiplier = easeOutElastic_ease(percent_done);
	}
	else if (ease_type === "easeOutQuad") {
		multiplier = easeOutQuad_ease(percent_done);
	}

	const distance_from_start_to_end = target_y-starting_y;
	const current_position = starting_y + (distance_from_start_to_end*multiplier);
	return current_position;
}

export function fancy_print_heap(heap) {

	const width_of_bottom = 2**( parseInt( Math.ceil( Math.log2(heap.length) ) )-1 );

	const number_of_rows = parseInt(Math.ceil(Math.log2(heap.length)));

	for (let i = 0; i < number_of_rows; i++) {
		let spacing;

		let row_width = 2**(parseInt(Math.ceil(Math.log2(heap.length)))-(number_of_rows-i));

		if (i === 0) {
			spacing = parseInt((width_of_bottom - 1) / row_width);
		} else {
			spacing = parseInt(width_of_bottom / row_width);
		}
		let array_to_print = [];
		for (let j = 0; j < row_width; j++) {
			let index = row_width + j;
			if (index < heap.length) {
				let value_to_print = heap[index];

				for (let k = 0; k < spacing; k++) {
					array_to_print.push('  ');
				}
				let number = value_to_print[0];
				let formattedNumber = number.toLocaleString('en-US', {
					minimumIntegerDigits: 2,
					useGrouping: false
				  })
				if (j === parseInt(row_width/2)) {
					for (let k = 0; k < spacing; k++) {
						array_to_print.push('  ');
					}
				}
				array_to_print.push(formattedNumber)
			}
		}
		let string_to_print = array_to_print.join("");
		console.log(string_to_print);
	}
}

export function mix(a, b, c) {
	a=a-b;  a=a-c;  a=a^(c >>> 5);
	b=b-c;  b=b-a;  b=b^(a << 2);
	c=c-a;  c=c-b;  c=c^(b >>> 2);
	a=a-b;  a=a-c;  a=a^(c >>> 5);
	b=b-c;  b=b-a;  b=b^(a << 4);
	c=c-a;  c=c-b;  c=c^(b >>> 2);
	a=a-b;  a=a-c;  a=a^(c >>> 1);
	b=b-c;  b=b-a;  b=b^(a << 3);
	c=c-a;  c=c-b;  c=c^(b >>> 7);
	return c;
}

export function lerp_rgb(color_string_1, color_string_2, percentage) {
    
    let split_color_string_1 = color_string_1.split(",");

    let r_1 = parseInt(split_color_string_1[0].split("(")[1]);
    let g_1 = parseInt(split_color_string_1[1]);
    let b_1 = parseInt(split_color_string_1[2]);

    let split_color_string_2 = color_string_2.split(",");

    let r_2 = parseInt(split_color_string_2[0].split("(")[1]);
    let g_2 = parseInt(split_color_string_2[1]);
    let b_2 = parseInt(split_color_string_2[2]);

    let r_difference = r_2-r_1;
    let g_difference = g_2-g_1;
    let b_difference = b_2-b_1;

    let r_output = Math.round(r_1+(r_difference*percentage));
    let g_output = Math.round(g_1+(g_difference*percentage));
    let b_output = Math.round(b_1+(b_difference*percentage));

    let output_string = "rgb("+String(r_output)+", "+String(g_output)+", "+String(b_output)+")"
    return output_string;
}


export function lerp_hsl(color_string_1, color_string_2, percentage) {
    
    let split_color_string_1 = color_string_1.split(",");

    let h_1 = parseInt(split_color_string_1[0].split("(")[1]);
    let s_1 = parseInt(split_color_string_1[1]);
    let l_1 = parseInt(split_color_string_1[2]);

    let split_color_string_2 = color_string_2.split(",");

    let h_2 = parseInt(split_color_string_2[0].split("(")[1]);
    let s_2 = parseInt(split_color_string_2[1]);
    let l_2 = parseInt(split_color_string_2[2]);

    let h_difference = h_2-h_1;
    let s_difference = s_2-s_1;
    let l_difference = l_2-l_1;

    let h_output = Math.round(h_1+(h_difference*percentage));
    let s_output = Math.round(s_1+(s_difference*percentage));
    let l_output = Math.round(l_1+(l_difference*percentage));

    let output_string = "hsl("+String(h_output)+", "+String(s_output)+"%, "+String(l_output)+"%)"
    return output_string;
}

export function crow_distance(x_1, y_1, x_2, y_2) {
    let x = x_1-x_2;
    let y = y_1-y_2;
    let r = Math.sqrt(x**2+y**2);
    return r
}

export function eight_dir_distance(x_1, y_1, x_2, y_2) {
    let x = Math.abs(x_1-x_2);
    let y = Math.abs(y_1-y_2);
    let total_distance;
    let smaller_side;
    let larger_side;
    if (x > y) {
        larger_side = x;
        smaller_side = y;

    } else if (x < y) {
        larger_side = y;
        smaller_side = x;

    } else {
        let r = Math.sqrt(x**2+y**2);
        return r;
    }
    let diff = larger_side - smaller_side;

    let r = Math.sqrt(2*(smaller_side**2));
    total_distance = diff+r;
    return total_distance;
}
