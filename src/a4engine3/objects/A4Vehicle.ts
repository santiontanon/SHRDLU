class A4Vehicle extends A4WalkingObject {

    constructor(name:string, sort:Sort)
    {
        super(name, sort);
        this.currentAnimation = A4_ANIMATION_IDLE_RIGHT;
        this.walkingCounter = 0;        
    }
        

    loadObjectAdditionalContent(xml:Element, game:A4Game, of:A4ObjectFactory, objectsToRevisit_xml:Element[], objsctsToRevisit_object:A4Object[])
    {
        super.loadObjectAdditionalContent(xml, game, of, objectsToRevisit_xml, objsctsToRevisit_object);
        
        var l:Element[] = getElementChildrenByTag(xml, "load");
        if (l.length>0) {
            objectsToRevisit_xml.push(xml);
            objsctsToRevisit_object.push(this);
        }
    }


    loadObjectAttribute(attribute_xml:Element) : boolean
    {
        if (super.loadObjectAttribute(attribute_xml)) return true;
        var a_name:string = attribute_xml.getAttribute("name");

        if (a_name == "hp") {
            this.hp = Number(attribute_xml.getAttribute("value"));
            this.max_hp = this.hp;
            return true;
        } else if (a_name == "max_hp") {
            this.max_hp = Number(attribute_xml.getAttribute("value"));
            return true;
        } else if (a_name == "magicImmune") {
            this.magicImmune = false;
            if (attribute_xml.getAttribute("value") == "true") this.magicImmune = true;
            return true;
        }
        return false;
    }


    revisitObject(xml:Element, game:A4Game)
    {
        var l:Element[] = getElementChildrenByTag(xml,"load");
        for(let n of l) {
            var o_ID:string = n.getAttribute("ID");
            var tmp:A4Object[] = game.findObjectByID(o_ID);
            if (tmp==null) {
                console.error("Revisiting A4Vehicle, and cannot find object with ID " + o_ID);
            } else {
                var o:A4Object = tmp[tmp.length-1];
                this.load.push(o);
            }
        }
    }


    savePropertiesToXML(game:A4Game) : string
    {
        var xmlString:string = super.savePropertiesToXML(game);

        xmlString += this.saveObjectAttributeToXML("hp",this.hp) + "\n";
        xmlString += this.saveObjectAttributeToXML("max_hp",this.max_hp) + "\n";
        xmlString += this.saveObjectAttributeToXML("magicImmune",this.magicImmune) + "\n";
        for(let o of this.load) {
            xmlString += "<load ID=\""+o.ID+"\"/>\n";
        }

        return xmlString;
    }


    update(game:A4Game) : boolean
    {
        var max_movement_pixels_requested:number = 0;
        
        if (this.hp<=0) this.state = A4CHARACTER_STATE_DYING;

        // direction control:
        for(let i:number = 0;i<A4_NDIRECTIONS;i++) {
            if (this.direction_command_received_this_cycle[i]) {
                this.continuous_direction_command_timers[i]++;
            } else {
                this.continuous_direction_command_timers[i] = 0;
            }
        }
        if (this.state == A4CHARACTER_STATE_IDLE) {
            var most_recent_viable_walk_command:number = A4_DIRECTION_NONE;
            var timer:number = 0;
            for(let i:number = 0;i<A4_NDIRECTIONS;i++) {
                if (this.direction_command_received_this_cycle[i] && this.canMove(i, false)) {
                    if (most_recent_viable_walk_command==A4_DIRECTION_NONE ||
                        this.continuous_direction_command_timers[i]<timer) {
                        most_recent_viable_walk_command = i;
                        timer = this.continuous_direction_command_timers[i];
                    }
                }
            }
            if (most_recent_viable_walk_command!=A4_DIRECTION_NONE) {
                this.state = A4CHARACTER_STATE_WALKING;
                this.direction = most_recent_viable_walk_command;
                max_movement_pixels_requested = this.continuous_direction_command_max_movement[most_recent_viable_walk_command];
            }
        }
        for(let i:number = 0;i<A4_NDIRECTIONS;i++) this.direction_command_received_this_cycle[i] = false;

        if (this.state!=this.previousState || this.direction!=this.previousDirection) this.stateCycle = 0;
        this.previousState = this.state;
        this.previousDirection = this.direction;
        
        switch(this.state) {
            case A4CHARACTER_STATE_IDLE:
                if (this.stateCycle==0) {
                    if (this.animations[A4_ANIMATION_IDLE_LEFT+this.direction]!=null) {
                        this.currentAnimation = A4_ANIMATION_IDLE_LEFT+this.direction;
                    } else {
                        this.currentAnimation = A4_ANIMATION_IDLE;
                    }
                    this.animations[this.currentAnimation].reset();
                } else {
//                    this.animations[this.currentAnimation].update();
                }
                this.stateCycle++;
                break;
            case A4CHARACTER_STATE_WALKING:
            {
                if (this.stateCycle==0) {
                    if (this.animations[A4_ANIMATION_MOVING_LEFT+this.direction]!=null) {
                        this.currentAnimation = A4_ANIMATION_MOVING_LEFT+this.direction;
                    } else if (this.animations[A4_ANIMATION_MOVING]!=null) {
                        this.currentAnimation = A4_ANIMATION_MOVING;
                    } else if (this.animations[A4_ANIMATION_IDLE_LEFT+this.direction]!=null) {
                        this.currentAnimation = A4_ANIMATION_IDLE_LEFT+this.direction;
                    } else {
                        this.currentAnimation = A4_ANIMATION_IDLE;
                    }
                    this.animations[this.currentAnimation].reset();
                } else {
//                    this.animations[this.currentAnimation].update();
                }
                this.stateCycle++;

                // the following kind of messy code just makes characters walk at the proper speed
                // it follows the idea of Brsenham's algorithms for proportionally scaling the speed of
                // the characters without using any floating point calculations.
                // it also makes the character move sideways a bit, if they need to align to fit through a corridor
                var step:number = game.tileWidth;
                if (this.direction==A4_DIRECTION_UP || this.direction==A4_DIRECTION_DOWN) step = game.tileHeight;
                var bridge:A4MapBridge = null;
                var pixelsMoved:number = 0;
                var old_x:number = this.x;
                var old_y:number = this.y;
                while(this.walkingCounter<=step) {
                    var dir:number = this.direction;
                    this.x += direction_x_inc[dir];
                    this.y += direction_y_inc[dir];
                    this.walkingCounter += this.getWalkSpeed();
                    pixelsMoved++;
                    if ((this.x%game.tileWidth)==0 && (this.y%game.tileHeight)==0) {
                        this.state = A4CHARACTER_STATE_IDLE;
                        this.walkingCounter = 0;
                        bridge = this.map.getBridge(this.x+this.getPixelWidth()/2,this.y+this.getPixelHeight()/2);
                        if (bridge!=null) {
                            // if we enter a bridge, but it's not with the first pixel we moved, then stop and do not go through the bridfge,
                            // to give the AI a chance to decide whether to go through the bridge or not
                            if (pixelsMoved>1) {
                                this.x -= direction_x_inc[dir];
                                this.y -= direction_y_inc[dir];
                                bridge = null;
                            }
                            break;
                        }
                    }                    

                    // walk in blocks of a tile wide:
                    if (direction_x_inc[dir]!=0 && (this.x%game.tileWidth)==0) {
                        this.walkingCounter = 0;
                        break;
                    }
                    if (direction_y_inc[dir]!=0 && (this.y%game.tileHeight)==0) {
                        this.walkingCounter = 0;
                        break;
                    }
                    if (max_movement_pixels_requested>0) {
                        max_movement_pixels_requested--;
                        if (max_movement_pixels_requested<=0) break;
                    }
                    if ((this.x%game.tileWidth)==0 && (this.y%game.tileHeight)==0) break;
                }
                if (this.walkingCounter>=step) this.walkingCounter-=step;
                if (bridge!=null) {
                    //                        output_debug_message("Stepped over a bridge!\n");
                    // teleport!
                    var target:[number,number] = bridge.linkedTo.findAvailableTargetLocation(this, game.tileWidth, game.tileHeight);
                    if (target!=null) {
                        game.requestWarp(this,bridge.linkedTo.map, target[0], target[1]);//, this.layer);
                    } else {
                        this.x = old_x;
                        this.y = old_y;
                        if (this.load.indexOf(game.currentPlayer)!=-1)
                            game.addMessage("Something is blocking the way!");
                    }
                }
                break;
            }
            case A4CHARACTER_STATE_DYING:
                if (this.stateCycle==0) {
                    if (this.animations[A4_ANIMATION_DEATH_LEFT+this.direction]!=null) {
                        this.currentAnimation = A4_ANIMATION_DEATH_LEFT+this.direction;
                    } else if (this.animations[A4_ANIMATION_DEATH]!=null) {
                        this.currentAnimation = A4_ANIMATION_DEATH;
                    } else if (this.animations[A4_ANIMATION_IDLE_LEFT+this.direction]!=null) {
                        this.currentAnimation = A4_ANIMATION_IDLE_LEFT+this.direction;
                    } else {
                        this.currentAnimation = A4_ANIMATION_IDLE;
                    }
                    this.animations[this.currentAnimation].reset();
                } else {
//                    this.animations[this.currentAnimation].update();
                }
                this.stateCycle++;
                if (this.stateCycle>=this.getWalkSpeed()) {
                    // drop the load of characters:
                    var l:A4Object[] = [];    // we need "l" to avoic concurrent modifications of this.load
                    for(let o of this.load) {
                        l.push(o);
                        game.requestWarp(o, this.map, this.x, this.y);//, o.layer);
                    }
                    this.load = [];
                    for(let o of l) {
                        (<A4Character>o).disembark();
                    }
                    return false;
                }
                break;
        }

        return true;
    }


    issueCommand(command:number, argument:number, direction:number, target:A4Object, game:A4Game)
    {
        if (this.state==A4CHARACTER_STATE_IN_VEHICLE) {
            if (command!=A4CHARACTER_COMMAND_TAKE) return;
        } else {
            if (this.state!=A4CHARACTER_STATE_IDLE) return;
        }
        switch(command) {
            case A4CHARACTER_COMMAND_WALK:
            case A4CHARACTER_COMMAND_INTERACT:
                this.direction_command_received_this_cycle[direction] = true;
                this.continuous_direction_command_max_movement[direction] = argument;
                break;
        }
    }


    embark(l:A4Object) 
    {
        this.load.push(l);
    }


    disembark(l:A4Object) 
    {
        var idx:number = this.load.indexOf(l);
        if (idx>=0) {
            this.load.splice(idx, 1);
        }
    }
    
    
    isEmpty():boolean 
    {
        return this.load.length == 0;
    }


    isWalkable():boolean {return false;}    // vehicles are not walkable, there is a special case in the collision function the maps
                                            // that makes them walkable to characters

    isHeavy():boolean {return true;}        // this is used by pressure plates


    isVehicle():boolean {return true;}


    objectRemoved(o:A4Object)
    {
        super.objectRemoved(o);

        for(let o2 of this.load) {
            o2.objectRemoved(o);
        }
    }


    findObjectByName(name:string) : A4Object[]
    {
        for(let o of this.load) {
            if (o.name == name) return [o];
            var o2:A4Object[] = o.findObjectByName(name);
            if (o2!=null) return [o].concat(o2);
        }
        return null;
    }  
    

    findObjectByID(ID:string) : A4Object[]
    {
        for(let o of this.load) {
            if (o.ID == ID) return [o];
            var o2:A4Object[] = o.findObjectByID(ID);
            if (o2!=null) return [o].concat(o2);
        }
        return null;
    }   


    // attributes:
    hp:number = 10;
    max_hp:number = 10;
    magicImmune:boolean = false;
    load:A4Object[] = [];
}

