#Let's try to convert this to python

import random

area = []
size = 19

for i in range(size):
    #Make row
    row = []
    for j in range(size):
        row.append("#")
    area.append(row)

for i in range(len(area)):
    row = area[i]
    for j in range(len(row)):
        row_value = row[j]
        if j == len(row)-1:
            print(row_value+row_value)
        else:
            print(row_value+row_value, end="")
    #print(row)

counter = 0
def crave_passage(y, x):
    #The 4 directions, we can go.
    directions = ["north", "south", "west", "east"]

    #Randomly shuffle the order of the directions
    random.shuffle(directions)

    chosen_direction = ''
    global counter
    counter += 1
    print("directions:",directions)

    #loop through the shuffled directions.
    for i in range(len(directions)):
        current_direction = directions[i]
        print("counter:",counter)
        print("current_direction:",current_direction)
        for i in range(len(area)):
            row = area[i]
            for j in range(len(row)):
                row_value = row[j]
                if j == len(row)-1:
                    print(row_value+row_value)
                else:
                    print(row_value+row_value, end="")
        #print("current_direction:",current_direction)
        if current_direction == "north":
            chosen_direction = current_direction
            #If it is possible to go north, then crave a passage and call the function again.
            #What does 2u mean?
            #Ah, area is a 2d list
            #First check if y is in range
            #Elaborate more on what this means literally
            #We move in steps of 2, so the next spot to check is two units up
            #Checking up in space 2 units means decreasing the y index by 2
            y_to_check = y-2
            if y_to_check >= 1:
                #
                if area[y_to_check][x] == "#":
                    for j in range(3):
                        area[y_to_check+j][x] = " "
                    crave_passage(y_to_check, x)
                else:
                    print("Failed a check")
            else:
                print("Failed a check")
        
        elif current_direction == "south":
            chosen_direction = current_direction
            #If it is possible to go south, then crave a passage and call the function again.
            y_to_check = y+2
            if y_to_check < len(area)-1:
                if area[y_to_check][x] == "#":
                    for j in range(3):
                        area[y+j][x] = " "
                    crave_passage(y_to_check, x)
        
        elif current_direction == "west":
            chosen_direction = current_direction
            #If it is possible to go west, then crave a passage and call the function again.
            x_to_check = x-2
            if x_to_check >= 1:
                if area[y][x_to_check] == "#":
                    for j in range(3):
                        area[y][x_to_check+j] = " "
                    crave_passage(y, x_to_check)
        elif current_direction == "east":
            chosen_direction = current_direction
            #If it is possible to go east, then crave a passage and call the function again.
            x_to_check = x+2
            if x_to_check < len(area)-1:
                if area[y][x_to_check] == "#":
                    for j in range(3):
                        area[y][x+j] = " "
                    crave_passage(y, x_to_check)
        
        
    

    


crave_passage(1, 1)
    