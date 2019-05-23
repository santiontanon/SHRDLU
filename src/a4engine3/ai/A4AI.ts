/*

Note (santi):
This class is the old AI class I implemented for the A4Engine. I stripped out all the conversation and reasoning capabilities though, 
since that is all handled by the RuleBasedAI and A4RuleBasedAI classes in this game. I also removed the concept of "behaviors". 
I left the short/long-term memory structures, since pathfinding depends on them (short term memory is used to recosntruct the
navigation buffer). But I should probably remove them, since these are now replicated in the RuleBasedAI class.

The only real functionality left in this class is pathfinding.

*/

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


class A4AI {
    constructor(c:A4AICharacter)
    {
        // 3000 = 50*60 (50 fps * 60 seconds: a character remembers something if it has been activated for 1 minute continuously)
        this.memory = new AIMemory(3000);
        this.character = c;
    }
    
    
    update(game:A4Game)
    {

        // 1) perception & 2) fact checking:
        this.perception(game);

        // 4) memory updates:
        this.memory.update(this.period);
        
        // 6: behavior:
        if (this.character.isIdle()) {
            // pathfinding:
            var c:A4CharacterCommand = this.navigationCycle(game);
            if (c!=null) this.character.issueCommand(c, game);
        }
        this.pathfinding_targets = [];

        this.cycle++;
    }
  

    updateAllObjectsCache()
    {
        var map:A4Map = this.character.map;
        var tx:number = Math.floor(this.character.x/this.tileWidth);
        var ty:number = Math.floor((this.character.y+this.character.tallness)/this.tileHeight);
        var perception_x0:number = this.character.x-this.tileWidth*this.character.sightRadius;
        var perception_y0:number = this.character.y+this.character.tallness-this.tileHeight*this.character.sightRadius;
        var perception_x1:number = this.character.x+this.character.getPixelWidth()+this.tileWidth*this.character.sightRadius;
        var perception_y1:number = this.character.y+this.character.getPixelHeight()+this.tileHeight*this.character.sightRadius;
        
        var region:number = map.visibilityRegion(tx,ty);
        this.all_objects_buffer = map.getAllObjectsInRegionPlusDoors(perception_x0, perception_y0,
                                                                     perception_x1-perception_x0, perception_y1-perception_y0,
                                                                     region);
    }


    perception(game:A4Game)
    {
        this.lastPerceptionCycle = this.cycle;
        var map:A4Map = this.character.map;
        this.tileWidth = map.getTileWidth();
        this.tileHeight = map.getTileHeight();

        var perception_x0:number = this.character.x-this.tileWidth*this.character.sightRadius;
        var perception_y0:number = this.character.y+this.character.tallness-this.tileHeight*this.character.sightRadius;
        var perception_x1:number = this.character.x+this.character.getPixelWidth()+this.tileWidth*this.character.sightRadius;
        var perception_y1:number = this.character.y+this.character.getPixelHeight()+this.tileHeight*this.character.sightRadius;

        this.updateAllObjectsCache();
        
        var triggerSort:Sort = game.ontology.getSort("trigger");
        for(let o of this.all_objects_buffer) {
            if (o!=this.character && !o.burrowed && !o.is_a(triggerSort)) {
                this.updateObjectPerceptionWME(o, 100, true, true);
            }
        }

        for(let o of this.character.inventory) {
            this.updateObjectPerceptionWME(o, this.period*2, false, false);
        }
        
        {
            for(let pbr of map.perceptionBuffer) {
                if (pbr.x0<perception_x1 && pbr.x1>perception_x0 &&
                    pbr.y0<perception_y1 && pbr.y1>perception_y0) {
                    // perceived an action!:
                    this.addPerceptionBufferWMEs(pbr);
                }
            }
            for(let wpbr of map.warpPerceptionBuffer) {
                if (wpbr.x0<perception_x1 && wpbr.x1>perception_x0 &&
                    wpbr.y0<perception_y1 && wpbr.y1>perception_y0) {
                    // perceived an warp!:
                    this.addWarpPerceptionBufferWMEs(wpbr);
                }
            }

            for(let b of map.bridges) {
                if (b.x<perception_x1 && b.x+b.width>perception_x0 &&
                    b.y<perception_y1 && b.y+b.height>perception_y0) {
                    // perceived a bridge:
                    if (b.linkedTo != null) {
                        var wme:WME = new WME("bridge", this.period*2);
                        wme.addParameter(b.linkedTo.map.name, WME_PARAMETER_SYMBOL);
                        wme.addParameter(b.x, WME_PARAMETER_INTEGER);
                        wme.addParameter(b.y, WME_PARAMETER_INTEGER);
                        wme.addParameter(b.x + b.width, WME_PARAMETER_INTEGER);
                        wme.addParameter(b.y + b.height, WME_PARAMETER_INTEGER);
                        wme.addParameter(map.name, WME_PARAMETER_SYMBOL);
                        wme.sourceObject = b;
                        this.memory.addShortTermWME(wme);
                    }
                }
            }
        }
        
        // 2) fact checking:
        // pick a wme at random from the long term memory, and see if it contradicts perceptions:
        var wme:WME = this.memory.getRandomLongTermWME();
        if (wme!=null && wme.functor == "object") this.factCheckObject(wme, map, perception_x0, perception_y0, perception_x1, perception_y1);
        if (wme!=null && wme.functor == "inventory") this.factCheckInventory(wme);
    }


    navigationCycle(game:A4Game) : A4CharacterCommand
    {
        var subject:A4WalkingObject = this.character;
        if (this.character.isInVehicle()) {
            return;    // in shrdlu, we don't want the robots to drive vehicles
            // subject = this.character.vehicle;
        }
        if (subject == null) return;
        var command:A4CharacterCommand = null;
        var highest_priority_target:number = -1;
        var highest_priority:number = 0;

        if (this.pathfinding_targets.length == 0) return null;

        for(let i:number = 0;i<this.pathfinding_targets.length;i++) {            
            if (highest_priority_target == -1 ||
                this.pathfinding_targets[i].priority > highest_priority) {
                highest_priority_target = i;
                highest_priority = this.pathfinding_targets[i].priority;
            }
        }

        var pathfind:boolean = false;
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
            var pixelx:number = subject.x;
            var pixely:number = subject.y + subject.tallness;
            var pixelx1:number = subject.x + subject.getPixelWidth();
            var pixely1:number = subject.y + subject.getPixelHeight();
            var pixel_target_x:number = this.pathfinding_result_x * this.tileWidth;
            var pixel_target_y:number = this.pathfinding_result_y * this.tileHeight;
            this.pathfinding_result_offset_x = pixel_target_x - pixelx;
            this.pathfinding_result_offset_y = pixel_target_y - pixely;
            var abs_diff_x:number = (this.pathfinding_result_offset_x<0 ? -this.pathfinding_result_offset_x:this.pathfinding_result_offset_x);
            var abs_diff_y:number = (this.pathfinding_result_offset_y<0 ? -this.pathfinding_result_offset_y:this.pathfinding_result_offset_y);
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


    updateObjectPerceptionWME(o:A4Object, activation:number, includePosition:boolean, includeMap:boolean) : WME
    {
        var n_parameters:number = 6;
        var hash:number = stringHashFunction("object") % WME_HASH_SIZE;
        for(let wme2 of this.memory.short_term_memory[hash]) {
            if (wme2.functor == "object" &&
                wme2.parameters[0] == o.ID && wme2.parameters.length == n_parameters) {
                if (includePosition) {
                    wme2.parameters[1] = o.x;
                    wme2.parameterTypes[1] = WME_PARAMETER_INTEGER;
                    wme2.parameters[2] = o.y + o.tallness;
                    wme2.parameterTypes[2] = WME_PARAMETER_INTEGER;
                    wme2.parameters[3] = o.x + o.getPixelWidth();
                    wme2.parameterTypes[3] = WME_PARAMETER_INTEGER;
                    wme2.parameters[4] = o.y + o.getPixelHeight();
                    wme2.parameterTypes[4] = WME_PARAMETER_INTEGER;
                } else {
                    wme2.parameters[1] = 0;
                    wme2.parameterTypes[1] = WME_PARAMETER_WILDCARD;
                    wme2.parameters[2] = 0;
                    wme2.parameterTypes[2] = WME_PARAMETER_WILDCARD;
                    wme2.parameters[3] = 0;
                    wme2.parameterTypes[3] = WME_PARAMETER_WILDCARD;
                    wme2.parameters[4] = 0;
                    wme2.parameterTypes[4] = WME_PARAMETER_WILDCARD;
                }
                if (includeMap) {
                    wme2.parameters[5] = o.map.name;
                    wme2.parameterTypes[5] = WME_PARAMETER_SYMBOL;
                } else {
                    wme2.parameters[5] = 0;
                    wme2.parameterTypes[5] = WME_PARAMETER_WILDCARD;
                }
                if (activation > wme2.activation) wme2.activation = activation;
                this.updateObjectSortPerceptionWME(o, activation);
                return wme2;
            }
        }
        
        // NOTE: this is a bit weird (updating long-term WMEs), think of a better way when I have time:
        for(let wme2 of this.memory.long_term_memory[hash]) {
            if (wme2.functor == "object" &&
                wme2.parameters[0] == o.ID && wme2.parameters.length == n_parameters) {
                if (includePosition) {
                    wme2.parameters[1] = o.x;
                    wme2.parameterTypes[1] = WME_PARAMETER_INTEGER;
                    wme2.parameters[2] = o.y + o.tallness;
                    wme2.parameterTypes[2] = WME_PARAMETER_INTEGER;
                    wme2.parameters[3] = o.x + o.getPixelWidth();
                    wme2.parameterTypes[3] = WME_PARAMETER_INTEGER;
                    wme2.parameters[4] = o.y + o.getPixelHeight();
                    wme2.parameterTypes[4] = WME_PARAMETER_INTEGER;
                } else {
                    wme2.parameters[1] = 0;
                    wme2.parameterTypes[1] = WME_PARAMETER_WILDCARD;
                    wme2.parameters[2] = 0;
                    wme2.parameterTypes[2] = WME_PARAMETER_WILDCARD;
                    wme2.parameters[3] = 0;
                    wme2.parameterTypes[3] = WME_PARAMETER_WILDCARD;
                    wme2.parameters[4] = 0;
                    wme2.parameterTypes[4] = WME_PARAMETER_WILDCARD;
                }
                if (includeMap) {
                    wme2.parameters[5] = o.map.name;
                    wme2.parameterTypes[5] = WME_PARAMETER_SYMBOL;
                } else {
                    wme2.parameters[5] = 0;
                    wme2.parameterTypes[5] = WME_PARAMETER_WILDCARD;
                }
                if (activation > wme2.activation) wme2.activation = activation;
                this.updateObjectSortPerceptionWME(o, activation);
                return wme2;
            }
        }

        // add new WME:
        var wme:WME = new WME("object", activation);
        wme.addParameter(o.ID, WME_PARAMETER_SYMBOL);
        if (includePosition) {
            wme.addParameter(o.x, WME_PARAMETER_INTEGER);
            wme.addParameter(o.y + o.tallness, WME_PARAMETER_INTEGER);
            wme.addParameter(o.x + o.getPixelWidth(), WME_PARAMETER_INTEGER);
            wme.addParameter(o.y + o.getPixelHeight(), WME_PARAMETER_INTEGER);
        } else {
            wme.addParameter(0, WME_PARAMETER_WILDCARD);
            wme.addParameter(0, WME_PARAMETER_WILDCARD);
            wme.addParameter(0, WME_PARAMETER_WILDCARD);
            wme.addParameter(0, WME_PARAMETER_WILDCARD);
        }
        if (includeMap) {
            wme.addParameter(o.map.name, WME_PARAMETER_SYMBOL);
        } else {
            wme.addParameter(0, WME_PARAMETER_WILDCARD);
        }
        wme.sourceObject = o;
        wme = this.memory.addShortTermWME(wme);

        var wme2:WME = new WME("is_a", activation);
        wme2.addParameter(o.ID, WME_PARAMETER_SYMBOL);
        wme2.addParameter(o.sort, WME_PARAMETER_SORT);
        wme2.sourceObject = o;
        this.memory.addShortTermWME(wme2);
        return wme;
    }


    updateObjectSortPerceptionWME(o:A4Object, activation:number) : WME
    {
        var hash:number = stringHashFunction("is_a") % WME_HASH_SIZE;
        for(let wme2 of this.memory.short_term_memory[hash]) {
            if (wme2.functor == "is_a" &&
                wme2.parameters[0] == o.ID) {
                wme2.parameters[1] = o.sort;
                wme2.parameterTypes[1] = WME_PARAMETER_SORT;
                if (activation > wme2.activation) wme2.activation = activation;
                return wme2;
            }
        }
        
        // NOTE: this is a bit weird (updating long-term WMEs), think of a better way when I have time:
        for(let wme2 of this.memory.long_term_memory[hash]) {
            if (wme2.functor == "is_a" &&
                wme2.parameters[0] == o.ID) {
                wme2.parameters[1] = o.sort;
                wme2.parameterTypes[1] = WME_PARAMETER_SORT;
                return wme2;
            }
        }
        
        // add new WME:
        var wme2:WME = new WME("is_a", activation);
        wme2.addParameter(o.ID, WME_PARAMETER_SYMBOL);
        wme2.addParameter(o.sort, WME_PARAMETER_SORT);
        wme2.sourceObject = o;
        wme2 = this.memory.addShortTermWME(wme2);
        return wme2;
    }


    addPerceptionBufferWMEs(pbr:PerceptionBufferRecord) : WME
    {
        if (pbr.directObjectSymbol==null && pbr.directObjectSort==null) {
            // 1 parameter:
            var wme:WME = new WME(pbr.action, PERCEIVED_ACTION_ACTIVATION);
            wme.addParameter(pbr.subjectID, WME_PARAMETER_SYMBOL);
            var wme2:WME = new WME("is_a", PERCEIVED_ACTION_ACTIVATION);
            wme.addParameter(pbr.subjectID, WME_PARAMETER_SYMBOL);
            wme.addParameter(pbr.subjectSort, WME_PARAMETER_SORT);
            this.memory.addShortTermWME(wme);
            this.memory.addShortTermWME(wme2);
            return wme;
        } else {
            // 2 or 3 parameter:
            var p2:any;
            var p2_type:number;
            if (pbr.directObjectSymbol!=null) {
                p2 = pbr.directObjectSymbol;
                p2_type = WME_PARAMETER_SYMBOL;
            } else {
                if (pbr.directObjectID!=null) {
                    p2 = pbr.directObjectID;
                    p2_type = WME_PARAMETER_SYMBOL;
                    var wme3:WME = new WME("is_a", PERCEIVED_ACTION_ACTIVATION);
                    wme3.addParameter(p2, p2_type);
                    wme3.addParameter(pbr.directObjectSort, WME_PARAMETER_SORT);
                    this.memory.addShortTermWME(wme3);
                } else {
                    p2 = pbr.directObjectSort;
                    p2_type = WME_PARAMETER_SORT;
                }
            }
            
            if (pbr.indirectObjectSort==null) {
                // 2 parameter:
                var wme:WME = new WME(pbr.action, PERCEIVED_ACTION_ACTIVATION);
                wme.addParameter(pbr.subjectID, WME_PARAMETER_SYMBOL);
                wme.addParameter(p2, p2_type);

                var wme2:WME = new WME("is_a", PERCEIVED_ACTION_ACTIVATION);
                wme2.addParameter(pbr.subjectID, WME_PARAMETER_SYMBOL);
                wme2.addParameter(pbr.subjectSort, WME_PARAMETER_SORT);
                this.memory.addShortTermWME(wme);
                this.memory.addShortTermWME(wme2);
                return wme;
            } else {
                var wme:WME = new WME(pbr.action, PERCEIVED_ACTION_ACTIVATION);
                wme.addParameter(pbr.subjectID, WME_PARAMETER_SYMBOL);
                wme.addParameter(p2, p2_type);
                wme.addParameter(pbr.indirectObjectID, WME_PARAMETER_SYMBOL);

                var wme2:WME = new WME("is_a", PERCEIVED_ACTION_ACTIVATION);
                wme2.addParameter(pbr.subjectID, WME_PARAMETER_SYMBOL);
                wme2.addParameter(pbr.subjectSort, WME_PARAMETER_SORT);

                var wme4:WME = new WME("is_a", PERCEIVED_ACTION_ACTIVATION);
                wme4.addParameter(pbr.indirectObjectID, WME_PARAMETER_SYMBOL);
                wme4.addParameter(pbr.indirectObjectSort, WME_PARAMETER_SORT);

                this.memory.addShortTermWME(wme);
                this.memory.addShortTermWME(wme2);
                this.memory.addShortTermWME(wme4);
                return wme;
            }
        }
    }


    addWarpPerceptionBufferWMEs(pbr:PerceptionBufferObjectWarpedRecord) : WME
    {
        var n_parameters:number = 6;
        var hash:number = stringHashFunction("object") % WME_HASH_SIZE;
        for(let wme2 of this.memory.short_term_memory[hash]) {
            if (wme2.functor == "object" &&
                wme2.parameters[0] == pbr.ID && wme2.parameters.length == n_parameters) {
                wme2.parameters[1] = 0;
                wme2.parameterTypes[1] = WME_PARAMETER_WILDCARD;
                wme2.parameters[2] = 0;
                wme2.parameterTypes[2] = WME_PARAMETER_WILDCARD;
                wme2.parameters[3] = 0;
                wme2.parameterTypes[3] = WME_PARAMETER_WILDCARD;
                wme2.parameters[4] = 0;
                wme2.parameterTypes[4] = WME_PARAMETER_WILDCARD;
                wme2.parameters[5] = pbr.targetMap;
                wme2.parameterTypes[5] = WME_PARAMETER_SYMBOL;
                if (PERCEIVED_WARP_ACTIVATION > wme2.activation) wme2.activation = PERCEIVED_WARP_ACTIVATION;
                this.addWarpPerceptionBufferSortWMEs(pbr);
                return wme2;
            }
        }
        
        // NOTE: this is a bit weird (updating long-term WMEs), think of a better way when I have time:
        for(let wme2 of this.memory.long_term_memory[hash]) {
            if (wme2.functor == "object" &&
                wme2.parameters[0] == pbr.ID && wme2.parameters.length == n_parameters) {
                wme2.parameters[1] = 0;
                wme2.parameterTypes[1] = WME_PARAMETER_WILDCARD;
                wme2.parameters[2] = 0;
                wme2.parameterTypes[2] = WME_PARAMETER_WILDCARD;
                wme2.parameters[3] = 0;
                wme2.parameterTypes[3] = WME_PARAMETER_WILDCARD;
                wme2.parameters[4] = 0;
                wme2.parameterTypes[4] = WME_PARAMETER_WILDCARD;
                wme2.parameters[5] = pbr.targetMap;
                wme2.parameterTypes[5] = WME_PARAMETER_SYMBOL;
                if (PERCEIVED_WARP_ACTIVATION > wme2.activation) wme2.activation = PERCEIVED_WARP_ACTIVATION;
                this.addWarpPerceptionBufferSortWMEs(pbr);
                return wme2;
            }
        }        

        // add new WME:
        var wme:WME = new WME("object",PERCEIVED_WARP_ACTIVATION);
        wme.addParameter(pbr.ID, WME_PARAMETER_SYMBOL);
        wme.addParameter(0, WME_PARAMETER_WILDCARD);
        wme.addParameter(0, WME_PARAMETER_WILDCARD);
        wme.addParameter(0, WME_PARAMETER_WILDCARD);
        wme.addParameter(0, WME_PARAMETER_WILDCARD);
        wme.addParameter(pbr.targetMap, WME_PARAMETER_SYMBOL);
        wme = this.memory.addShortTermWME(wme);
        var wme2:WME = new WME("is_a", PERCEIVED_WARP_ACTIVATION);
        wme2.addParameter(pbr.ID, WME_PARAMETER_SYMBOL);
        wme2.addParameter(pbr.sort, WME_PARAMETER_SORT);
        this.memory.addShortTermWME(wme2);
        return wme;
    }


    addWarpPerceptionBufferSortWMEs(pbr:PerceptionBufferObjectWarpedRecord) : WME
    {
        var hash:number = stringHashFunction("is_a") % WME_HASH_SIZE;
        for(let wme2 of this.memory.short_term_memory[hash]) {
            if (wme2.functor == "is_a" &&
                wme2.parameters[0] == pbr.ID) {
                wme2.parameters[1] = pbr.sort;
                if (PERCEIVED_WARP_ACTIVATION > wme2.activation) wme2.activation = PERCEIVED_WARP_ACTIVATION;
                return wme2;
            }
        }
        
        // NOTE: this is a bit weird (updating long-term WMEs), think of a better way when I have time:
        for(let wme2 of this.memory.long_term_memory[hash]) {
            if (wme2.functor == "is_a" &&
                wme2.parameters[0] == pbr.ID) {
                wme2.parameters[1] = pbr.sort;
                if (PERCEIVED_WARP_ACTIVATION > wme2.activation) wme2.activation = PERCEIVED_WARP_ACTIVATION;
                return wme2;
            }
        }
        
        // add new WME:
        var wme2:WME = new WME("is_a", PERCEIVED_WARP_ACTIVATION);
        wme2.addParameter(pbr.ID, WME_PARAMETER_SYMBOL);
        wme2.addParameter(pbr.sort, WME_PARAMETER_SORT);
        wme2 = this.memory.addShortTermWME(wme2);
        return wme2;
    }


    getObjectPerceptionCache() : A4Object[]
    {
        return this.all_objects_buffer;
    }


    getObjectPerceptionCacheSize() : number
    {
        return this.all_objects_buffer.length;
    }


    updateNavigationPerceptionBuffer(game:A4Game, force:boolean)
    {
        var subject:A4Object = this.character;
        if (this.character.isInVehicle()) {
            return;    // in shrdlu, we don't want the robots to drive vehicles
            // subject = this.character.vehicle;
        }
        if (subject == null) return;

        if (!force && this.navigationBuffer!=null && this.navigationBuffer_lastUpdated > this.cycle-this.period) return;

        if (this.navigationBuffer == null) {
            this.navigationBuffer_size = Math.floor(this.character.sightRadius*2 + subject.getPixelWidth()/subject.map.getTileWidth());
            this.navigationBuffer = new Array(this.navigationBuffer_size*this.navigationBuffer_size);
            this.navigationBuffer_bridges = new Array(this.navigationBuffer_size*this.navigationBuffer_size);
        }

        var map:A4Map = subject.map;
        this.navigationBuffer_map = map;
        this.navigationBuffer_mapWidth = map.width;
        var cx:number = Math.floor((subject.x + subject.getPixelWidth()/2) / this.tileWidth);
        var cy:number = Math.floor((subject.y + subject.tallness + (subject.getPixelHeight() - subject.tallness)/2) / this.tileHeight);
        this.navigationBuffer_x = cx - Math.floor(this.character.sightRadius + (subject.getPixelWidth()/2)/this.tileWidth);
        this.navigationBuffer_y = cy - Math.floor(this.character.sightRadius + ((subject.getPixelHeight() - subject.tallness)/2)/this.tileHeight);
//        var character_tileWidth:number = subject.getPixelWidth()/this.tileWidth;
//        var character_tileHeight:number = (subject.getPixelHeight() - subject.tallness)/this.tileHeight;
        
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
        for(let o of this.all_objects_buffer) {
            if (o!=this.character && !o.isWalkable() && o!=this.character.vehicle) {
                // if it's a door, and we have the key, then ignore the door:
                var add:boolean = true;
                if ((o instanceof A4Door) && 
                    ((this.doorsNotToOpenWhileWalking.indexOf((<A4Door>o).doorID) == -1 &&
                      (this.character.hasKey((<A4Door>o).doorID) ||
                      this.character.hasKey("MASTERKEY"))) ||    
                     (<A4Door>o).automatic)) add = false;

                if (add) {
                    var x0:number = Math.floor(o.x/this.tileWidth) - this.navigationBuffer_x;
                    var y0:number = Math.floor((o.y + o.tallness)/this.tileHeight) - this.navigationBuffer_y;
                    var x1:number = Math.floor((o.x+o.getPixelWidth()-1)/this.tileWidth) - this.navigationBuffer_x;
                    var y1:number = Math.floor((o.y+o.getPixelHeight()-1)/this.tileHeight) - this.navigationBuffer_y;
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
            var x0:number = Math.floor(b.x/this.tileWidth) - this.navigationBuffer_x;
            var y0:number = Math.floor(b.y/this.tileHeight) - this.navigationBuffer_y;
            var x1:number = Math.floor((b.x+b.width-1)/this.tileWidth) - this.navigationBuffer_x;
            var y1:number = Math.floor((b.y+b.height-1)/this.tileHeight) - this.navigationBuffer_y;
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
            var line:string = "";
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
    addPFTargetObject(action:number, priority:number, flee:boolean, target:A4Object)
    {
        var tilex0:number = target.x;///this.tileWidth;
        var tiley0:number = (target.y+target.tallness);///this.tileWidth;
        var tilex1:number = (target.x+target.getPixelWidth());///this.tileWidth;
        var tiley1:number = (target.y+target.getPixelHeight());///this.tileWidth;
        for(let pft of this.pathfinding_targets) {
            if (pft.flee) continue;
            if (pft.x0 == tilex0 && pft.y0 == tiley0 &&
                pft.x1 == tilex1 && pft.y1 == tiley1) {
                if (pft.priority<=priority) {
                    pft.action = action;
                    pft.priority = priority;
                    pft.target = target;
                }
                return;
            }
        }

        var pft2:PFTarget = new PFTarget();
        pft2.x0 = tilex0;
        pft2.y0 = tiley0;
        pft2.x1 = tilex1;
        pft2.y1 = tiley1;
        pft2.action = action;
        pft2.priority = priority;
        pft2.flee = flee;
        pft2.target = target;
        this.pathfinding_targets.push(pft2);
    }


    // pathfinding:
    addPFTarget(tilex0:number, tiley0:number, tilex1:number, tiley1:number, action:number, priority:number, flee:boolean, target:A4Object)
    {
        for(let pft of this.pathfinding_targets) {
            if (pft.flee) continue;
            if (pft.x0 == tilex0 && pft.y0 == tiley0 &&
                pft.x1 == tilex1 && pft.y1 == tiley1) {
                if (pft.priority<=priority) {
                    pft.action = action;
                    pft.priority = priority;
                    pft.target = target;
                }
                return;
            }
        }

        var pft2:PFTarget = new PFTarget();
        pft2.x0 = tilex0;
        pft2.y0 = tiley0;
        pft2.x1 = tilex1;
        pft2.y1 = tiley1;
        pft2.action = action;
        pft2.priority = priority;
        pft2.flee = flee;
        pft2.target = target;
        this.pathfinding_targets.push(pft2);
    }


    addPFTargetWME(w:WME, a_game:A4Game, action:number, priority:number, flee:boolean)
    {
//        console.log("addPFTargetWME: " + w.toString());
        if (w.parameterTypes[5] == WME_PARAMETER_SYMBOL) {
            if (this.navigationBuffer_lastUpdated == -1 ||
                this.navigationBuffer_lastUpdated <= this.cycle-this.period) {
                this.updateNavigationPerceptionBuffer(a_game, false);
            }
            var target:A4Object = w.sourceObject;
            if (target!=null && !this.navigationBuffer_map.contains(target)) target = null;
                    
            var map2:A4Map = a_game.getMap(<string>w.parameters[5]);
            if (map2==this.navigationBuffer_map) {
                // same map where a_character is:
                //console.log("addPFTargetWME: same map.");
                if (w.parameterTypes[1] == WME_PARAMETER_INTEGER) {
                    this.addPFTarget(w.parameters[1],
                                     w.parameters[2],
                                     w.parameters[3],
                                     w.parameters[4],
                                     action, priority, flee, target);
                } else {
                    // we are the the right map, but we don't know where the object is, so nothing to be done ...
                }
            } else {
                // different map, just target the map:
                //console.log("addPFTargetWME: different map.");
                var l:WME[] = this.memory.retrieveByFunctor("bridge");
                for(let wme of l) {
                    if (wme.parameterTypes[0] == WME_PARAMETER_SYMBOL &&
                        wme.parameterTypes[1] == WME_PARAMETER_INTEGER &&
                        wme.parameterTypes[5] == WME_PARAMETER_SYMBOL &&
                        wme.parameters[5] == this.navigationBuffer_map.name &&
                        wme.parameters[0] == w.parameters[5]) {
                        this.addPFTarget(wme.parameters[1],
                                         wme.parameters[2],
                                         wme.parameters[3],
                                         wme.parameters[4],
                                         A4CHARACTER_COMMAND_IDLE, priority, flee, null);
                    }
                }
            }
        } else {
            // we don't know where the object is, so nothing to be done ...
        }
    }


    pathFinding(subject:A4Object) : boolean
    {
        if (this.pathfinding_targets.length == 0) return false;
        if (isNaN(this.navigationBuffer_x)) return false;

        var otx:number;
        var oty:number;
        // compute the origin tile cordinates (from the center of the top-left tile of the sprite):
        var pw:number = subject.getPixelWidth();
        var ph:number = subject.getPixelHeight() - subject.tallness;
        var tw:number = Math.floor(pw/this.tileWidth);
        var th:number = Math.floor(ph/this.tileHeight);
        if (pw>this.tileWidth) {
            otx = Math.floor((subject.x + this.tileWidth/2)/this.tileWidth);
        } else {
            otx = Math.floor((subject.x + pw/2)/this.tileWidth);
        }
        if (ph>this.tileHeight) {
            oty = Math.floor((subject.y + subject.tallness + this.tileHeight/2)/this.tileHeight);
        } else {
            oty = Math.floor((subject.y + subject.tallness + ph/2)/this.tileHeight);
        }
        
        if (otx<this.navigationBuffer_x || otx>this.navigationBuffer_x+this.navigationBuffer_size ||
            oty<this.navigationBuffer_y || oty>this.navigationBuffer_y+this.navigationBuffer_size) {
            console.error("A4AI: character is out of the navigation buffer!!!\n");
            return false;
        }

        var start:number = (otx - this.navigationBuffer_x) + (oty - this.navigationBuffer_y)*this.navigationBuffer_size;
        var openInsertPosition:number = 0;
        var openRemovePosition:number = 0;
        var current:number,currentx:number,currenty:number;
        var next:number;
        var i:number;
        var bestScore:number = undefined;
        var bestPriority:number = undefined;
        var bestTarget:number = start;
        var score:number = 0, priority = 0;
        var size_sq:number = this.navigationBuffer_size*this.navigationBuffer_size;

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

//            [score, priority] = this.pathFindingScore(currentx, currenty-subject.tallness/this.tileHeight, subject);
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
                    var canWalk:boolean = true;
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
                    var canWalk:boolean = true;
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
                    var canWalk:boolean = true;
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
                    var canWalk:boolean = true;
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
        var out_score:number;
        var priority:number;
        var bestGotoScorePriority:number = -1;
        var bestGotoScore:number = Number.MAX_VALUE;
        var bestFleeScorePriority:number = -1;
        var bestFleeScore:number = 0;
        var score:number = 0;
        var dx:number;
        var dy:number;
//        var character_x1:number = character_x0 + Math.floor(subject.getPixelWidth()/this.tileWidth)-1;
//        var character_y1:number = character_y0 + Math.floor((subject.getPixelHeight()-subject.tallness)/this.tileHeight)-1;
        var x0:number,y0:number,x1:number,y1:number;
        
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


    // fact check:
    factCheckObject(wme:WME, map:A4Map, perception_x0:number, perception_y0:number, perception_x1:number, perception_y1:number)
    {
        if (wme.parameters.length==6 &&
            wme.parameterTypes[5]  == WME_PARAMETER_SYMBOL &&
            wme.parameters[5] == map.name &&
            wme.parameterTypes[1] == WME_PARAMETER_INTEGER) {
            var ltox0:number = <number>wme.parameters[1];
            var ltoy0:number = <number>wme.parameters[2];
            var ltox1:number = <number>wme.parameters[3];
            var ltoy1:number = <number>wme.parameters[4];
            if (ltox0<perception_x1 && ltox1>perception_x0 &&
                ltoy0<perception_y1 && ltoy1>perception_y0) {
                var found:boolean = false;
                for(let o of this.all_objects_buffer) {
                    if (!o.burrowed) {
                        if (o.x==ltox0 && o.y+o.tallness==ltoy0 && wme.parameters[0] == o.ID) {
                            // found!
                            found = true;
                        }
                    }
                }
                if (!found) {
                    // perception contradicts memory!
                    this.memory.preceptionContradicts(wme);
                }
            }
        }
    }
 

    factCheckInventory(wme:WME)
    {
        var found:boolean = false;
        for(let o of this.character.inventory) {
            if (o.ID == wme.parameters[0]) found = true;
        }
        if (!found) {
            // perception contradicts memory!
            this.memory.preceptionContradicts(wme);
        }
    }


    objectRemoved(o:A4Object) 
    {
        if (this.memory!=null) this.memory.objectRemoved(o);
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

    period:number = 1;       // the AI will only run once each m_period cycles
    cycle:number = 0;        // current cycle
    character:A4AICharacter = null;
    memory:AIMemory = null;

    lastPerceptionCycle:number = -1;
        
    // some values cached for efficiency:
    tileWidth:number = 0;
    tileHeight:number = 0;

    all_objects_buffer:A4Object[] = [];

    // cached WMEs:
    is_a_pattern:WME = null;
}
