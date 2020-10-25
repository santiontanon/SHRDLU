var NAVIGATION_BUFFER_WALKABLE:number = 0;
var NAVIGATION_BUFFER_NOT_WALKABLE:number = 1;
var NAVIGATION_BUFFER_BRIDGE:number = 2;

var PERCEIVED_ACTION_ACTIVATION:number = 100;
var PERCEIVED_WARP_ACTIVATION:number = 200;


class PFTarget {
    x0:number;
    y0:number;
    x1:number;
    y1:number;
    priority:number;
    action:number;
    flee:boolean;
    target:A4Object;
}


class A4PathFinding {
    constructor(c:A4Character)
    {
        this.character = c;
    }
    
    
    update(game:A4Game)
    {        
        if (this.character.isIdle()) {
            // pathfinding:
            let c:A4CharacterCommand = this.navigationCycle(game);
            if (c!=null) this.character.issueCommand(c, game);
        }
        this.pathfinding_targets = [];

        this.cycle++;
    }
  

    perception(game:A4Game)
    {
        if (this.lastPerceptionCycle != -1 &&
            this.lastPerceptionCycle + this.period > this.cycle) return;
        this.lastPerceptionCycle = this.cycle;

        let map:A4Map = this.character.map;
        this.tileWidth = map.getTileWidth();
        this.tileHeight = map.getTileHeight();

        let tx:number = Math.floor(this.character.x/this.tileWidth);
        let ty:number = Math.floor(this.character.y/this.tileHeight);
        let perception_x0:number = this.character.x-this.tileWidth*this.sightRadius;
        let perception_y0:number = this.character.y-this.tileHeight*this.sightRadius;
        let perception_x1:number = this.character.x+this.character.getPixelWidth()+this.tileWidth*this.sightRadius;
        let perception_y1:number = this.character.y+this.character.getPixelHeight()+this.tileHeight*this.sightRadius;
        
        let region:number = map.visibilityRegion(tx,ty);
        this.object_perception_buffer = map.getAllObjectsInRegionPlusDoorsAndObstacles(
                                                perception_x0, perception_y0,
                                                perception_x1-perception_x0, perception_y1-perception_y0, 
                                                region);
    }


    navigationCycle(game:A4Game) : A4CharacterCommand
    {
        let subject:A4WalkingObject = this.character;
        if (this.character.isInVehicle()) {
            if (this.canDriveVehicles) {
                subject = this.character.vehicle;
            } else {
                return;
            }
        }
        if (subject == null) return;
        if (subject.map != this.navigationBuffer_map ||
            game.requestedWarp(this.character)) {
            this.pathfinding_result_x = -1;
            this.pathfinding_result_y = -1;
            this.pathfinding_result_priority = 0;
            return;
        }
        let highest_priority_target:number = -1;
        let highest_priority:number = 0;

        if (this.pathfinding_targets.length == 0) return null;

        for(let i:number = 0;i<this.pathfinding_targets.length;i++) {            
            if (highest_priority_target == -1 ||
                this.pathfinding_targets[i].priority > highest_priority) {
                highest_priority_target = i;
                highest_priority = this.pathfinding_targets[i].priority;
            }
        }

        let pathfind:boolean = false;
        if (this.pathfinding_result_x==-1 ||
            (this.cycle - this.pathFinding_lastUpdated)>subject.getWalkSpeed()) {
            pathfind = true;
        }

        if (pathfind) {
            this.pathfinding_result_x = -1;
            this.pathfinding_result_y = -1;
            this.pathfinding_result_priority = 0;
            if (this.navigationBuffer_lastUpdated < this.cycle) this.updateNavigationPerceptionBuffer(game, true);
            this.pathFinding(subject);
        }

        if (this.pathfinding_result_x!=-1) {
            let pixelx:number = subject.x;
            let pixely:number = subject.y;
            //let pixelx1:number = subject.x + subject.getPixelWidth();
            //let pixely1:number = subject.y + subject.getPixelHeight();
            let pixel_target_x:number = this.pathfinding_result_x * this.tileWidth;
            let pixel_target_y:number = this.pathfinding_result_y * this.tileHeight;
            this.pathfinding_result_offset_x = pixel_target_x - pixelx;
            this.pathfinding_result_offset_y = pixel_target_y - pixely;
            let abs_diff_x:number = (this.pathfinding_result_offset_x<0 ? -this.pathfinding_result_offset_x:this.pathfinding_result_offset_x);
            let abs_diff_y:number = (this.pathfinding_result_offset_y<0 ? -this.pathfinding_result_offset_y:this.pathfinding_result_offset_y);
//            console.log("pixelx: " + pixelx + ", pixely: " + pixely);
//            console.log("abs_diff_x: " + abs_diff_x + ", abs_diff_y: " + abs_diff_y);
//            console.log("this.pathfinding_result_offset_x: " + this.pathfinding_result_offset_x + ", this.pathfinding_result_offset_y: " + this.pathfinding_result_offset_y);
            if (abs_diff_x>0 && (abs_diff_x<=abs_diff_y || abs_diff_y==0)) {
                if (this.pathfinding_result_offset_x>0) {
                    return new A4CharacterCommand(A4CHARACTER_COMMAND_WALK, abs_diff_x, A4_DIRECTION_RIGHT, null, null, this.pathfinding_result_priority);
                } else {
                    return new A4CharacterCommand(A4CHARACTER_COMMAND_WALK, abs_diff_x, A4_DIRECTION_LEFT, null, null, this.pathfinding_result_priority);
                }
            } else if (abs_diff_y>0) {
                if (this.pathfinding_result_offset_y>0) {
                    return new A4CharacterCommand(A4CHARACTER_COMMAND_WALK, abs_diff_y, A4_DIRECTION_DOWN, null, null, this.pathfinding_result_priority);
                } else {
                    return new A4CharacterCommand(A4CHARACTER_COMMAND_WALK, abs_diff_y, A4_DIRECTION_UP, null, null, this.pathfinding_result_priority);
                }
            } else {
                // check if the goal is underneath us and action is TAKE
                if ((this.pathfinding_targets[highest_priority_target].action == A4CHARACTER_COMMAND_TAKE ||
                     this.pathfinding_targets[highest_priority_target].action == A4CHARACTER_COMMAND_INTERACT) &&
                    this.pathfinding_targets[highest_priority_target].x0 == pixelx &&
                    this.pathfinding_targets[highest_priority_target].y0 == pixely) {
                    return new A4CharacterCommand(this.pathfinding_targets[highest_priority_target].action, 0, 0, null, null, this.pathfinding_result_priority);
                }

                // we are at the goal, stay!
                return new A4CharacterCommand(A4CHARACTER_COMMAND_IDLE, 0, 0, null, null, this.pathfinding_result_priority);
            }
        }
        return null;
    }


    addBridgeToLongTermMemory(o:A4Object)
    {
        this.long_term_object_perception_buffer.push(o);    
    }


    canSeeObject(object:A4Object, game:A4Game)
    {
        this.perception(game);

        if (this.object_perception_buffer.indexOf(object) != -1) return true;
        if (this.long_term_object_perception_buffer.indexOf(object) != -1) return true;
        return false;
    }


    updateNavigationPerceptionBuffer(game:A4Game, force:boolean)
    {
        let subject:A4Object = this.character;
        if (this.character.isInVehicle()) {
            if (this.canDriveVehicles) {
                subject = this.character.vehicle;
            } else {
                return;
            }
        }
        if (subject == null) return;

        if (!force && this.navigationBuffer!=null && this.navigationBuffer_lastUpdated > this.cycle-this.period) return;

        // update the perceived objects:
        this.perception(game);

        if (this.navigationBuffer == null) {
            this.navigationBuffer_size = Math.floor(this.sightRadius*2 + subject.getPixelWidth()/subject.map.getTileWidth());
            this.navigationBuffer = new Array(this.navigationBuffer_size*this.navigationBuffer_size);
            this.navigationBuffer_bridges = new Array(this.navigationBuffer_size*this.navigationBuffer_size);
        }

        let map:A4Map = subject.map;
        this.navigationBuffer_map = map;
        this.navigationBuffer_mapWidth = map.width;
        let cx:number = Math.floor((subject.x + subject.getPixelWidth()/2) / this.tileWidth);
        let cy:number = Math.floor((subject.y + subject.getPixelHeight()/2) / this.tileHeight);
        this.navigationBuffer_x = cx - Math.floor(this.sightRadius + (subject.getPixelWidth()/2)/this.tileWidth);
        this.navigationBuffer_y = cy - Math.floor(this.sightRadius + (subject.getPixelHeight()/2)/this.tileHeight);
        
        for(let i:number = 0;i<this.navigationBuffer_size;i++) {
            for(let j:number = 0;j<this.navigationBuffer_size;j++) {
                this.navigationBuffer_bridges[j+i*this.navigationBuffer_size] = null;
//                if (map.walkableOnlyBackground((this.navigationBuffer_x+j)*this.tileWidth,(this.navigationBuffer_y+i)*this.tileHeight, character_tileWidth*this.tileWidth, character_tileHeight*this.tileHeight, subject)) {
                if (map.walkableOnlyBackground((this.navigationBuffer_x+j)*this.tileWidth,(this.navigationBuffer_y+i)*this.tileHeight, this.tileWidth, this.tileHeight, subject)) {
                    this.navigationBuffer[j+i*this.navigationBuffer_size] = NAVIGATION_BUFFER_WALKABLE;
                } else {
                    this.navigationBuffer[j+i*this.navigationBuffer_size] = NAVIGATION_BUFFER_NOT_WALKABLE;
                }
            }
        }
        
        // add objects:
        for(let o of this.object_perception_buffer) {
            if (o!=this.character && !o.isWalkable() && o!=this.character.vehicle) {
                // if it's a door, and we have the key, then ignore the door:
                let add:boolean = true;
                if ((o instanceof A4Door) && 
                    this.doorsNotToOpenWhileWalking.indexOf((<A4Door>o).doorID) == -1 &&
                    ((<A4Door>o).canOpen(this.character, game) ||    
                     (<A4Door>o).automatic)) add = false;

                if (add) {
                    let x0:number = Math.floor(o.x/this.tileWidth) - this.navigationBuffer_x;
                    let y0:number = Math.floor(o.y/this.tileHeight) - this.navigationBuffer_y;
                    let x1:number = Math.floor((o.x+o.getPixelWidth()-1)/this.tileWidth) - this.navigationBuffer_x;
                    let y1:number = Math.floor((o.y+o.getPixelHeight()-1)/this.tileHeight) - this.navigationBuffer_y;
    //                x0 -= (character_tileWidth - 1);
    //                y0 -= (character_tileHeight - 1);
                    for(let y:number = y0;y<=y1;y++) {
                        if (y>=0 && y<this.navigationBuffer_size) {
                            for(let x:number = x0;x<=x1;x++) {
                                if (x>=0 && x<this.navigationBuffer_size) {
                                    this.navigationBuffer[x+y*this.navigationBuffer_size] = NAVIGATION_BUFFER_NOT_WALKABLE;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // add bridges:
        for(let b of map.bridges) {
            let x0:number = Math.floor(b.x/this.tileWidth) - this.navigationBuffer_x;
            let y0:number = Math.floor(b.y/this.tileHeight) - this.navigationBuffer_y;
            let x1:number = Math.floor((b.x+b.width-1)/this.tileWidth) - this.navigationBuffer_x;
            let y1:number = Math.floor((b.y+b.height-1)/this.tileHeight) - this.navigationBuffer_y;
//            x0 -= (character_tileWidth - 1);
//            y0 -= (character_tileHeight - 1);
            for(let y:number = y0;y<=y1;y++) {
                if (y>=0 && y<this.navigationBuffer_size) {
                    for(let x:number = x0;x<=x1;x++) {
                        if (x>=0 && x<this.navigationBuffer_size) {
                            if (this.navigationBuffer[x+y*this.navigationBuffer_size] == NAVIGATION_BUFFER_WALKABLE) {
                                this.navigationBuffer[x+y*this.navigationBuffer_size] = NAVIGATION_BUFFER_BRIDGE;
                                this.navigationBuffer_bridges[x+y*this.navigationBuffer_size] = b;
                            }
                        }
                    }
                }
            }
        }
        
        this.navigationBuffer_lastUpdated = this.cycle;

        /*
        console.log("Navigation buffer:");
        for(let i:number = 0;i<this.navigationBuffer_size;i++) {
            let line:string = "";
            for(let j:number = 0;j<this.navigationBuffer_size;j++) {
                if (this.navigationBuffer[j+i*this.navigationBuffer_size] == NAVIGATION_BUFFER_WALKABLE) {
                    line += ".";
                } else {
                    line += "X";
                }
            }
            console.log(line + " -> " + i);
        }
        */
    }


    // pathfinding:
    addPFTargetObject(action:number, priority:number, flee:boolean, target:A4Object, game:A4Game)
    {
        if (this.navigationBuffer_lastUpdated == -1 ||
            this.navigationBuffer_lastUpdated <= this.cycle-this.period) {
            this.updateNavigationPerceptionBuffer(game, false);
        }
        if (target.map != this.navigationBuffer_map) {
            this.addPFTargetMap(action, priority, flee, target.map, game);
            return;
        }

        let x0:number = target.x;
        let y0:number = target.y;
        let x1:number = (target.x+target.getPixelWidth());
        let y1:number = (target.y+target.getPixelHeight());
        for(let pft of this.pathfinding_targets) {
            if (pft.flee) continue;
            if (pft.x0 == x0 && pft.y0 == y0 &&
                pft.x1 == x1 && pft.y1 == y1) {
                if (pft.priority<=priority) {
                    pft.action = action;
                    pft.priority = priority;
                    pft.target = target;
                }
                return;
            }
        }

        let pft2:PFTarget = new PFTarget();
        pft2.x0 = x0;
        pft2.y0 = y0;
        pft2.x1 = x1;
        pft2.y1 = y1;
        pft2.action = action;
        pft2.priority = priority;
        pft2.flee = flee;
        pft2.target = target;
        this.pathfinding_targets.push(pft2);
    }


    // pathfinding:
    addPFTarget(x0:number, y0:number, x1:number, y1:number, map:A4Map, game:A4Game, action:number, priority:number, flee:boolean, target:A4Object)
    {
        if (this.navigationBuffer_lastUpdated == -1 ||
            this.navigationBuffer_lastUpdated <= this.cycle-this.period) {
            this.updateNavigationPerceptionBuffer(game, false);
        }
        if (map != this.navigationBuffer_map) {
            this.addPFTargetMap(action, priority, flee, map, game);
            return;
        }

        for(let pft of this.pathfinding_targets) {
            if (pft.flee) continue;
            if (pft.x0 == x0 && pft.y0 == y0 &&
                pft.x1 == x1 && pft.y1 == y1) {
                if (pft.priority<=priority) {
                    pft.action = action;
                    pft.priority = priority;
                    pft.target = target;
                }
                return;
            }
        }

        let pft2:PFTarget = new PFTarget();
        pft2.x0 = x0;
        pft2.y0 = y0;
        pft2.x1 = x1;
        pft2.y1 = y1;
        pft2.action = action;
        pft2.priority = priority;
        pft2.flee = flee;
        pft2.target = target;
        this.pathfinding_targets.push(pft2);
    }


    addPFTargetMap(action:number, priority:number, flee:boolean, map:A4Map, game:A4Game)
    {
        // different map, just target the map:
        let targetMapName:string = map.name;
        if (this.navigationBuffer_map == null) return;
        if (this.map2mapPaths != null) {
            let idx1:number = game.getMapIndex(this.navigationBuffer_map.name);
            let idx2:number = game.getMapIndex(targetMapName);
            if (idx1 >= 0 && idx2 >= 0 && this.map2mapPaths[idx1][idx2] != null) {
                targetMapName = this.map2mapPaths[idx1][idx2];
            }
        }
        for(let o of this.long_term_object_perception_buffer) {
            if (o instanceof A4MapBridge) {
                let b:A4MapBridge = <A4MapBridge>o;
                if (b.map == this.navigationBuffer_map &&
                    b.linkedTo.map.name == targetMapName) {
                    this.addPFTarget(b.x, b.y,
                                     b.x + b.width, b.y + b.height,
                                     this.navigationBuffer_map,
                                     game,
                                     A4CHARACTER_COMMAND_IDLE, priority, flee, null);                    
                }
            } else if (o instanceof ShrdluAirlockDoor) {
                let b:ShrdluAirlockDoor = <ShrdluAirlockDoor>o;
                if (b.map == this.navigationBuffer_map &&
                    b.targetMap == targetMapName) {
                    this.addPFTarget(b.x, b.y,
                                     b.x + b.getPixelWidth(), b.y + b.getPixelHeight(),
                                     this.navigationBuffer_map,
                                     game,
                                     A4CHARACTER_COMMAND_IDLE, priority, flee, null);                    
                }
            }
        }
    }


    pathFinding(subject:A4Object) : boolean
    {
        if (this.pathfinding_targets.length == 0) return false;
        if (isNaN(this.navigationBuffer_x)) return false;

        let otx:number;
        let oty:number;
        // compute the origin tile cordinates (from the center of the top-left tile of the sprite):
        let pw:number = subject.getPixelWidth();
        let ph:number = subject.getPixelHeight();
        let tw:number = Math.floor(pw/this.tileWidth);
        let th:number = Math.floor(ph/this.tileHeight);
        if (pw>this.tileWidth) {
            otx = Math.floor((subject.x + this.tileWidth/2)/this.tileWidth);
        } else {
            otx = Math.floor((subject.x + pw/2)/this.tileWidth);
        }
        if (ph>this.tileHeight) {
            oty = Math.floor((subject.y + this.tileHeight/2)/this.tileHeight);
        } else {
            oty = Math.floor((subject.y + ph/2)/this.tileHeight);
        }
        
        if (otx<this.navigationBuffer_x || otx>this.navigationBuffer_x+this.navigationBuffer_size ||
            oty<this.navigationBuffer_y || oty>this.navigationBuffer_y+this.navigationBuffer_size) {
            console.error("A4PathFinding: character is out of the navigation buffer!!!\n");
            return false;
        }

        let start:number = (otx - this.navigationBuffer_x) + (oty - this.navigationBuffer_y)*this.navigationBuffer_size;
        let openInsertPosition:number = 0;
        let openRemovePosition:number = 0;
        let current:number,currentx:number,currenty:number;
        let next:number;
        let i:number;
        let bestScore:number = undefined;
        let bestPriority:number = undefined;
        let bestTarget:number = start;
        let score:number = 0, priority = 0;
        let size_sq:number = this.navigationBuffer_size*this.navigationBuffer_size;

        // initialize open/closed lists:
        if (this.pathfinding_open==null) {
            this.pathfinding_open = new Array(size_sq);
            this.pathfinding_closed = new Array(size_sq);
        }
        for(i = 0;i<size_sq;i++) this.pathfinding_closed[i] = -1;
        this.pathfinding_open[openInsertPosition++] = start;
        this.pathfinding_closed[start] = start;
        openInsertPosition = openInsertPosition % size_sq;

        // pathfinding:
        this.pathFinding_iterations = 0;
        while(openRemovePosition!=openInsertPosition) {
            current = this.pathfinding_open[openRemovePosition];
            currentx = (current % this.navigationBuffer_size) + this.navigationBuffer_x;
            currenty = Math.floor(current / this.navigationBuffer_size) + this.navigationBuffer_y;
            openRemovePosition++;
            openRemovePosition = openRemovePosition % size_sq;

            [score, priority] = this.pathFindingScore(currentx, currenty, subject);
//            console.log("pfs: " + currentx +", " + currenty + " -> " + score);
            if ((bestPriority==undefined || priority > bestPriority) ||
                (priority == bestPriority && score > bestScore)) {
                bestScore = score;
                bestTarget = current;
                bestPriority = priority;
            }

            // neighbors:
            if (this.navigationBuffer[current]!=NAVIGATION_BUFFER_BRIDGE || current == start) {
                // LEFT:
                if (currentx > this.navigationBuffer_x) {
                    next = current-1;
                    let canWalk:boolean = true;
                    for(i = 0;i<th;i++) {
                        if (this.navigationBuffer[next+i*this.navigationBuffer_size]==NAVIGATION_BUFFER_NOT_WALKABLE) {
                            canWalk = false;
                            break;
                        }
                    }
                    if (canWalk &&
                        this.pathfinding_closed[next]==-1) {
                        this.pathfinding_open[openInsertPosition++] = next;
                        openInsertPosition = openInsertPosition % size_sq;
                        this.pathfinding_closed[next] = current;   // store the parent
                    }
                }
                // RIGHT:
                if (currentx < this.navigationBuffer_x+this.navigationBuffer_size - tw) {
                    next = current+1;
                    let canWalk:boolean = true;
                    for(i = 0;i<th;i++) {
                        if (this.navigationBuffer[next+(tw-1)+i*this.navigationBuffer_size]==NAVIGATION_BUFFER_NOT_WALKABLE) {
                            canWalk = false;
                            break;
                        }
                    }
                    if (canWalk &&
                        this.pathfinding_closed[next]==-1) {
                        this.pathfinding_open[openInsertPosition++] = next;
                        openInsertPosition = openInsertPosition % size_sq;
                        this.pathfinding_closed[next] = current;   // store the parent
                    }
                }
                // UP:
                if (currenty > this.navigationBuffer_y) {
                    next = current-this.navigationBuffer_size;
                    let canWalk:boolean = true;
                    for(i = 0;i<tw;i++) {
                        if (this.navigationBuffer[next+i]==NAVIGATION_BUFFER_NOT_WALKABLE) {
                            canWalk = false;
                            break;
                        }
                    }
                    if (canWalk &&
                        this.pathfinding_closed[next]==-1) {
                        this.pathfinding_open[openInsertPosition++] = next;
                        openInsertPosition = openInsertPosition % size_sq;
                        this.pathfinding_closed[next] = current;   // store the parent
                    }
                }
                // DOWN:
                if (currenty < this.navigationBuffer_y+this.navigationBuffer_size - th) {
                    next = current+this.navigationBuffer_size;
                    let canWalk:boolean = true;
                    for(i = 0;i<tw;i++) {
                        if (this.navigationBuffer[next+(th-1)*this.navigationBuffer_size+i]==NAVIGATION_BUFFER_NOT_WALKABLE) {
                            canWalk = false;
                            break;
                        }
                    }
                    if (canWalk &&
                        this.pathfinding_closed[next]==-1) {
                        this.pathfinding_open[openInsertPosition++] = next;
                        openInsertPosition = openInsertPosition % size_sq;
                        this.pathfinding_closed[next] = current;   // store the parent
                    }
                }
            }
            this.pathFinding_iterations++;
        }
        
        current = bestTarget;
        while(this.pathfinding_closed[current]!=-1 && this.pathfinding_closed[current]!=start) {
            current = this.pathfinding_closed[current];
        }

        this.pathfinding_result_x = (current % this.navigationBuffer_size) + this.navigationBuffer_x;
        this.pathfinding_result_y = Math.floor(current / this.navigationBuffer_size) + this.navigationBuffer_y;
        this.pathfinding_result_priority = bestPriority;

        this.pathFinding_lastUpdated = this.cycle;

        return true;
    }



    pathFindingScore(character_x0:number, character_y0:number, subject:A4Object) : [number,number]
    {
        let out_score:number;
        let priority:number;
        let bestGotoScorePriority:number = -1;
        let bestGotoScore:number = Number.MAX_VALUE;
        let bestFleeScorePriority:number = -1;
        let bestFleeScore:number = 0;
        let score:number = 0;
        let dx:number;
        let dy:number;
        let x0:number,y0:number; //,x1:number,y1:number;
        
        for(let i:number = 0;i<this.pathfinding_targets.length;i++) {
            if (this.pathfinding_targets[i].flee) {
                if (this.pathfinding_targets[i].priority >= bestFleeScorePriority) {
//                    dx = dy = 0;
                    x0 = Math.floor(this.pathfinding_targets[i].x0/this.tileWidth);
                    y0 = Math.floor(this.pathfinding_targets[i].y0/this.tileHeight);
//                    x1 = Math.floor((this.pathfinding_targets[i].x1-1)/this.tileWidth);
//                    y1 = Math.floor((this.pathfinding_targets[i].y1-1)/this.tileHeight);
//                    if (character_x1<x0) dx = x0 - character_x1;
//                    if (character_x0>x1) dx = character_x0 - x1;
//                    if (character_y1<y0) dy = y0 - character_y1;
//                    if (character_y0>y1) dy = character_y0 - y1;
                    dx = Math.abs(x0 - character_x0);
                    dy = Math.abs(y0 - character_y0);
                    
                    score = dx + dy;
                    if (this.pathfinding_targets[i].priority == bestFleeScorePriority) {
                        bestFleeScore += score; // for "flee", if it's the same priority, just add the scores (to "flee" from all of them, and not just one)
                    } else {
                        if (score > bestFleeScore) {
                            bestFleeScore = score;
                            bestFleeScorePriority = this.pathfinding_targets[i].priority;
                        }
                    }
                }
            } else {
                if (this.pathfinding_targets[i].priority >= bestGotoScorePriority) {
//                    dx = dy = 0;
                    x0 = Math.floor(this.pathfinding_targets[i].x0/this.tileWidth);
                    y0 = Math.floor(this.pathfinding_targets[i].y0/this.tileHeight);
//                    x1 = Math.floor((this.pathfinding_targets[i].x1-1)/this.tileWidth);
//                    y1 = Math.floor((this.pathfinding_targets[i].y1-1)/this.tileHeight);
//                    if (character_x1<x0) dx = x0 - character_x1;
//                    if (character_x0>x1) dx = character_x0 - x1;
//                    if (character_y1<y0) dy = y0 - character_y1;
//                    if (character_y0>y1) dy = character_y0 - y1;
                    dx = Math.abs(x0 - character_x0);
                    dy = Math.abs(y0 - character_y0);
                    score = dx + dy;
                    if (score < bestGotoScore) {
                        bestGotoScore = score;
                        bestGotoScorePriority = this.pathfinding_targets[i].priority;
                    }
                } 
            }
        }
        if (bestGotoScorePriority > bestFleeScorePriority) {
            out_score = - bestGotoScore;
            priority = bestGotoScorePriority;
        } else if (bestGotoScorePriority < bestFleeScorePriority) {
            out_score = bestFleeScore;
            priority = bestFleeScorePriority;
        } else {
            out_score = bestFleeScore - bestGotoScore;
            priority = bestGotoScorePriority;
        }
        return [out_score, priority];
    }


    objectRemoved(o:A4Object) 
    {
        let idx:number = this.object_perception_buffer.indexOf(o);
        if (idx != -1) this.object_perception_buffer.splice(idx, 1)
        idx = this.long_term_object_perception_buffer.indexOf(o);
        if (idx != -1) this.long_term_object_perception_buffer.splice(idx, 1)
    }


    precomputeMap2mapPaths(game:A4Game)
    {
        let map:boolean[][] = [];
        let n:number = game.maps.length;
        this.map2mapNames = [];
        this.map2mapPaths = [];
        for(let i:number = 0;i<n;i++) {
            let row:boolean[] = [];
            let rowPaths:string[] = [];
            for(let j:number = 0;j<n;j++) {
                let linked:boolean = false;
                // see if there is a bridge or an airlock linking the two maps:
                for(let b of game.maps[i].bridges) {
                    if (b.linkedTo != null && 
                        b.linkedTo.map == game.maps[j]) {
                        linked = true;
                    }
                }
                for(let o of game.maps[i].objects) {
                    if (o instanceof ShrdluAirlockDoor) {
                        if (o.targetMap == game.maps[j].name) {
                            linked = true;
                        }
                    }
                }
                rowPaths.push(null);
                row.push(linked);
            }
            map.push(row);
            this.map2mapPaths.push(rowPaths);
            this.map2mapNames.push(game.maps[i].name);
        }

        for(let i:number = 0;i<n;i++) {
            for(let j:number = 0;j<n;j++) {
                if (i == j) continue;
                // find a path from one map to the other:
                let path:number[] = this.map2mapPath(i, j, map);

                // cache the first step of the path in this.map2mapPaths:
                if (path != null && path.length > 1) {
                    this.map2mapPaths[i][j] = game.maps[path[1]].name;
                }
            }
        }

        console.log(map);
        console.log(this.map2mapPaths);
    }


    // BFS (since the map is very small, it's fast enough):
    map2mapPath(start:number, end:number, map:boolean[][]) : number[]
    {
        let open:number[][] = [[start]];
        let closed:number[] = [];

        while(open.length > 0) {
            let currentPath:number[] = open[0];
            let current:number = currentPath[currentPath.length-1];
            if (current == end) {
                return currentPath;
            }
            open.splice(0, 1);
            closed.push(current);
            for(let i:number = 0;i<map.length;i++) {
                if (map[current][i] && closed.indexOf(i) == -1) {
                    open.push(currentPath.concat([i]));
                }
            }
        }

        return null;
    }


    // navigation perception buffer (this is public, since it will be used by all the behaviors):
    navigationBuffer_lastUpdated:number = -1;
    navigationBuffer:number[] = null;
    navigationBuffer_bridges:A4MapBridge[] = null;
    navigationBuffer_size:number = 0;
    navigationBuffer_mapWidth:number = 0;
    navigationBuffer_x:number = 0;
    navigationBuffer_y:number = 0;
    navigationBuffer_map:A4Map = null;

    // pathfinding: all in tile coordinates
    pathfinding_result_x:number = -1;
    pathfinding_result_y:number = -1;
    pathfinding_result_priority:number = -1;
    pathfinding_result_offset_x:number = 0;
    pathfinding_result_offset_y:number = 0;

    pathfinding_targets:PFTarget[] = [];
    
    pathfinding_closed:number[] = null;
    pathfinding_open:number[] = null; // internal buffers for pathfinding
    pathFinding_lastUpdated:number = -1;
    pathFinding_iterations:number = 0;    // for debugging purposes

    doorsNotToOpenWhileWalking:string[] = [];

    period:number = 2;       // the AI will only run once each period cycles
    cycle:number = 0;        // current cycle
    sightRadius:number = 5;
    character:A4Character = null;

    lastPerceptionCycle:number = -1;
        
    // some values cached for efficiency:
    tileWidth:number = 0;
    tileHeight:number = 0;

    object_perception_buffer:A4Object[] = [];
    long_term_object_perception_buffer:A4Object[] = [];    // this stores objects of the "familiar" maps
    maps_familiar_with:string[] = [];

    map2mapNames:string[] = null;
    map2mapPaths:string[][] = null;

    canDriveVehicles:boolean = false;
}
