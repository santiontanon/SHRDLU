var A4CHARACTER_STATE_NONE:number = -1;
var A4CHARACTER_STATE_IDLE:number = 0;
var A4CHARACTER_STATE_WALKING:number = 1;
var A4CHARACTER_STATE_INTERACTING:number = 2;
var A4CHARACTER_STATE_TALKING:number = 3;
var A4CHARACTER_STATE_THOUGHT_BUBBLE:number = 4;
var A4CHARACTER_STATE_IN_VEHICLE:number = 5;
var A4CHARACTER_STATE_IN_BED:number = 6;
var A4CHARACTER_STATE_IN_BED_CANNOT_GETUP:number = 7;
var A4CHARACTER_STATE_IN_BED_TALKING:number = 8;
var A4CHARACTER_STATE_IN_BED_CANNOT_GETUP_TALKING:number = 9;
var A4CHARACTER_STATE_IN_BED_THOUGHT_BUBBLE:number = 10;
var A4CHARACTER_STATE_IN_BED_CANNOT_GETUP_THOUGHT_BUBBLE:number = 11;
var A4CHARACTER_STATE_DYING:number = 12;
var A4CHARACTER_STATE_IN_VEHICLE_TALKING:number = 13;
var A4CHARACTER_STATE_IN_VEHICLE_THOUGHT_BUBBLE:number = 14;

var A4CHARACTER_COMMAND_IDLE:number = 0;
var A4CHARACTER_COMMAND_WALK:number = 1;
// note: "TAKE" turns into "USE" when there is no takeable object, but there is an "useable" object
var A4CHARACTER_COMMAND_TAKE:number = 2;
var A4CHARACTER_COMMAND_DROP:number = 3;
var A4CHARACTER_COMMAND_USE	:number = 4;
var A4CHARACTER_COMMAND_UNEQUIP:number = 5;
var A4CHARACTER_COMMAND_INTERACT:number = 6;
var A4CHARACTER_COMMAND_TALK:number = 7;
var A4CHARACTER_COMMAND_THOUGHT_BUBBLE:number = 8;
var A4CHARACTER_COMMAND_GIVE:number = 9;
//var A4CHARACTER_COMMAND_SELL:number = 10;
//var A4CHARACTER_COMMAND_BUY:number = 11;
var A4CHARACTER_COMMAND_PUSH:number = 12;


class A4CharacterCommand {
    constructor(c:number, a:number, d:number, target:A4Object, t:string, p:number) 
    {
        this.command = c;
        this.argument = a;
        this.direction = d;
        this.target = target;  // if there are multiple objects in the same direction, this allows to specify which one to target
        this.text = t;
        this.priority = p;
    }

    command:number;
    argument:number;
    direction:number;
    target:A4Object;
    text:string;
    priority:number;
}


class A4Character extends A4WalkingObject {
	constructor(name:string, sort:Sort)
    {
        super(name, sort);

        this.state = A4CHARACTER_STATE_IDLE;
        this.canSwim = false;
        this.interacteable = true;
    }

    
    loadObjectAdditionalContent(xml:Element, game:A4Game, of:A4ObjectFactory, objectsToRevisit_xml:Element[], objsctsToRevisit_object:A4Object[])
    {
        super.loadObjectAdditionalContent(xml, game, of, objectsToRevisit_xml, objsctsToRevisit_object);

        let items_xml:Element = getFirstElementChildByTag(xml, "items");
        if (items_xml!=null) {
//            let item_xml_l:NodeListOf<Element> = items_xml.children;
            let item_xml_l:HTMLCollection = items_xml.children;
            for(let i:number = 0;i<item_xml_l.length;i++) {
                let item_xml:Element = item_xml_l[i];
                let tmp:string = item_xml.getAttribute("probability");
                if (tmp != null) {
                    if (Math.random() >= Number(tmp)) continue;
                }
                let completeRedefinition:boolean = false;
                if (item_xml.getAttribute("completeRedefinition") == "true") completeRedefinition = true;
                let classStr:string = item_xml.getAttribute("class");
                if (classStr == null) classStr = item_xml.getAttribute("type");
                let item:A4Object = of.createObject(classStr, game, false, completeRedefinition);
                if (item == null) {
                    console.error("object factory returned null for object of class " + item_xml.getAttribute("class"));
                } else {
                    let id:string = item_xml.getAttribute("id");
                    if (id!=null) {
                        item.ID = id;
                        if (!isNaN(Number(id)) &&
                            Number(id) >= A4Object.s_nextID) A4Object.s_nextID = Number(id)+1;
                    }
                    item.loadObjectAdditionalContent(item_xml, game, of, objectsToRevisit_xml, objsctsToRevisit_object);
                    this.addObjectToInventory(item, game);
                }
            }
        }

        // check if the character is in a vehicle or bed:
        let attributes_xml:Element[] = getElementChildrenByTag(xml,"attribute");
        for(let i:number = 0;i<attributes_xml.length;i++) {
            let attribute_xml:Element = attributes_xml[i];
            if (attribute_xml.getAttribute("name") == "vehicle") {
                objectsToRevisit_xml.push(xml);
                objsctsToRevisit_object.push(this);
                break;
            }
            if (attribute_xml.getAttribute("name") == "sleepingInBed") {
                objectsToRevisit_xml.push(xml);
                objsctsToRevisit_object.push(this);
                break;
            }
        }
    }


    loadObjectAttribute(attribute_xml:Element) : boolean
    {
        if (super.loadObjectAttribute(attribute_xml)) return true;
        let a_name:string = attribute_xml.getAttribute("name");

        if (a_name == "vehicle") {
            // this is loaded in "revisitObject"
            return true;
        } else if (a_name == "sleepingInBed") {
            // this is loaded in "revisitObject"
            return true;
        } else if (a_name == "hungerTimer") {
            this.hungerTimer = Number(attribute_xml.getAttribute("value"));
            return true;
        } else if (a_name == "thirstTimer") {
            this.thirstTimer = Number(attribute_xml.getAttribute("value"));
            return true;
        } else if (a_name == "strength") {
            this.strength = Number(attribute_xml.getAttribute("value"));
            return true;
        }

        return false;
    }


    revisitObject(xml:Element, game:A4Game)
    {
        super.revisitObject(xml, game);
        
        let attributes_xml:Element[] = getElementChildrenByTag(xml, "attribute");
        for(let attribute_xml of attributes_xml) {
            let a_name:string = attribute_xml.getAttribute("name");
            if (a_name == "vehicle") {
                let o_ID:string = attribute_xml.getAttribute("value");
                let tmp:A4Object = game.findObjectByIDJustObject(o_ID);
                if (tmp==null) {
                    console.error("Revisiting A4Character, and cannot find object with ID " + o_ID);
                } else {
                    let o:A4Object = tmp;
                    this.vehicle = <A4Vehicle>o;
                }
                break;
            } else if (a_name == "sleepingInBed") {
                let o_ID:string = attribute_xml.getAttribute("value");
                let tmp:A4Object = game.findObjectByIDJustObject(o_ID);
                if (tmp==null) {
                    console.error("Revisiting A4Character, and cannot find object with ID " + o_ID);
                } else {
                    this.sleepingInBed = tmp;
                    this.sleepingInBed.setStoryStateVariable("characterIn","true",game);
                }
                break;
            }
        }
    }


    savePropertiesToXML(game:A4Game) : string
    {
        let xmlString:string = super.savePropertiesToXML(game);

        if (this.vehicle!=null) xmlString += this.saveObjectAttributeToXML("vehicle",this.vehicle.ID) + "\n";
        if (this.sleepingInBed!=null) xmlString += this.saveObjectAttributeToXML("sleepingInBed",this.sleepingInBed.ID) + "\n";
        xmlString += this.saveObjectAttributeToXML("hungerTimer",this.hungerTimer) + "\n";
        xmlString += this.saveObjectAttributeToXML("thirstTimer",this.thirstTimer) + "\n";
        xmlString += this.saveObjectAttributeToXML("strength",this.strength) + "\n";

        if (this.inventory.length>0) {
            xmlString += "<items>\n";
            for(let o of this.inventory) {
                xmlString += o.saveToXML(game, 0, false) + "\n";
            }
            xmlString += "</items>\n";
        }
        return xmlString;
    }


    update(game:A4Game) : boolean
    {
        let ret:boolean = super.update(game);

        this.hungerTimer++;
        this.thirstTimer++;

        // update the inventory items:
        for(let o of this.inventory) {
            o.update(game);
        }

        let max_movement_pixels_requested:number = 0;
        
        // direction control:
        for(let i:number = 0;i<A4_NDIRECTIONS;i++) {
            if (this.direction_command_received_this_cycle[i]) {
                this.continuous_direction_command_timers[i]++;
            } else {
                this.continuous_direction_command_timers[i] = 0;
            }
        }
        if (this.state == A4CHARACTER_STATE_IDLE) {
            let most_recent_viable_walk_command:number = A4_DIRECTION_NONE;
            let timer:number = 0;
            for(let i:number = 0;i<A4_NDIRECTIONS;i++) {
                if (this.direction_command_received_this_cycle[i]) {//} && this.canMove(i, false)) {
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
//                        this.animations[this.currentAnimation].update();
                    }
                    if ((this.x%this.map.tileWidth == 0) && (this.y%this.map.tileHeight == 0)) {
                        let bridge:A4MapBridge = null;
                        if (!this.canMove(this.direction, false) || 
                            (this.y<=0 && this.direction == A4_DIRECTION_UP) ||
                            (this.x<=0 && this.direction == A4_DIRECTION_LEFT)) {
                            this.state = A4CHARACTER_STATE_IDLE;
                            this.currentAnimation = A4_ANIMATION_IDLE_LEFT+this.direction;
                            this.animations[this.currentAnimation].reset();
                            bridge = this.checkIfPushingAgainstMapEdgeBridge(this.direction)
                            if (bridge == null) break;
                        }
                        // check if we are pushing against the edge of a map with a "bridge":
                        if (bridge == null) bridge = this.checkIfPushingAgainstMapEdgeBridge(this.direction)
                        if (bridge != null) {
                            // teleport!
                            let target:[number, number] = bridge.linkedTo.findAvailableTargetLocation(this, this.map.tileWidth, this.map.tileHeight);
                            if (target!=null) {
                                if (game.checkPermissionToWarp(this, bridge.linkedTo.map)) {
                                    game.requestWarp(this,bridge.linkedTo.map, target[0], target[1]);
                                }
                            } else {
                                if (this == <A4Character>game.currentPlayer) game.addMessage("Something is blocking the way!");
                            }
                            break;
                        }
                    }
                    this.stateCycle++;

                    // the following kind of messy code just makes characters walk at the proper speed
                    // it follows the idea of Bresenham's algorithms for proportionally scaling the speed of
                    // the characters without using any floating point calculations.
                    // it also makes the character move sideways a bit, if they need to align to fit through a corridor
                    let step:number = game.tileWidth;
                    if (this.direction==A4_DIRECTION_UP || this.direction==A4_DIRECTION_DOWN) step = game.tileHeight;
                    let bridge:A4MapBridge = null;
                    let pixelsMoved:number = 0;
                    while(this.walkingCounter<=step) {
                        let dir:number = this.direction;
                        this.x += direction_x_inc[dir];
                        this.y += direction_y_inc[dir];
                        this.walkingCounter += this.getWalkSpeed();
                        pixelsMoved++;
                        if ((this.x%game.tileWidth)==0 && (this.y%game.tileHeight)==0) {
                            this.state = A4CHARACTER_STATE_IDLE;
                            this.walkingCounter = 0;
                            bridge = this.map.getBridge(this.x+this.getPixelWidth()/2,this.y+this.getPixelHeight()/2);
                            if (bridge!=null) {
                                // if we enter a bridge, but it's not with the first pixel we moved, then stop and do not go through the bridge,
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
                        // teleport!
                        let target:[number, number] = bridge.linkedTo.findAvailableTargetLocation(this, this.map.tileWidth, this.map.tileHeight);
                        if (target!=null) {
                            if (game.checkPermissionToWarp(this, bridge.linkedTo.map)) {
                                game.requestWarp(this,bridge.linkedTo.map, target[0], target[1]);//, this.layer);
                            }
                        } else {
                            if (this == <A4Character>game.currentPlayer) game.addMessage("Something is blocking the way!");
                        }
                    }
                    break;
                }
            case A4CHARACTER_STATE_INTERACTING:
                if (this.stateCycle==0) {
                    if (this.animations[A4_ANIMATION_INTERACTING_LEFT+this.direction]!=null) {
                        this.currentAnimation = A4_ANIMATION_INTERACTING_LEFT+this.direction;
                    } else if (this.animations[A4_ANIMATION_INTERACTING]!=null) {
                        this.currentAnimation = A4_ANIMATION_INTERACTING;
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
                    this.state = A4CHARACTER_STATE_IDLE;
                }
                break;
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
    //                this.animations[this.currentAnimation].update();
                }
                this.stateCycle++;
                if (this.stateCycle>=this.getWalkSpeed()) {
                    // drop all the items:
                    for(let o of this.inventory) {
                        game.requestWarp(o, this.map, this.x, this.y);//, A4_LAYER_FG);
                        o.event(A4_EVENT_DROP, null, this.map, game);    // pass 'null' as the character, since this character is dead
                    }
                    this.inventory = [];
                    return false;
                }
                break;
            case A4CHARACTER_STATE_IN_VEHICLE:
                if (this.map!=this.vehicle.map) {
                    game.requestWarp(this, this.vehicle.map, this.vehicle.x, this.vehicle.y);//, this.layer);
                } else {
                    this.x = this.vehicle.x;
                    this.y = this.vehicle.y;
                }
                break;
            case A4CHARACTER_STATE_TALKING:
                if (this.stateCycle==0) {
                    if (this.animations[A4_ANIMATION_TALKING_LEFT+this.direction]!=null) {
                        this.currentAnimation = A4_ANIMATION_TALKING_LEFT+this.direction;
                    } else if (this.animations[A4_ANIMATION_TALKING]!=null) {
                        this.currentAnimation = A4_ANIMATION_TALKING;
                    } else if (this.animations[A4_ANIMATION_IDLE_LEFT+this.direction]!=null) {
                        this.currentAnimation = A4_ANIMATION_IDLE_LEFT+this.direction;
                    } else {
                        this.currentAnimation = A4_ANIMATION_IDLE;
                    }
                    this.animations[this.currentAnimation].reset();
//                    console.log("animation due to talking: " + this.currentAnimation);

                    if (this.map == game.currentPlayer.map) {
                        if (this == <A4Character>(game.currentPlayer)) {
                            game.addMessageWithColor(">"+this.talkingText, MSX_COLOR_LIGHT_GREEN);
                        } else {
                            game.addMessageWithColor(this.name + ": " +this.talkingText, MSX_COLOR_WHITE);
                        }
                    }
                }
                this.stateCycle++;
                if (this.stateCycle>=this.talkingBubbleDuration) {
                    if (this.map == game.currentPlayer.map) {
                        this.map.addPerceptionBufferRecord(
                            new PerceptionBufferRecord("talk", this.ID, this.sort, 
                                                       null, null, this.talkingText,
                                                       null, null,
                                                       this.x, this.y, this.x+this.getPixelWidth(), this.y+this.getPixelHeight()));
                    }
                    /*
                    if (this.talkingTarget!=null && game.contains(this.talkingTarget)) {
                        this.talkingTarget.receiveSpeechAct(this, this.talkingTarget, this.talkingSpeechAct);
                        this.receiveSpeechAct(this, this.talkingTarget, this.talkingSpeechAct);
                    }
                    */
                    // after the speech bubble is done, we record it in the map:
                    this.talkingText = null;
                    this.talkingBubble = null;
                    this.talkingBubbleDuration = 0;
                    this.state = A4CHARACTER_STATE_IDLE;
                    this.talkingTarget = null;
                }
                break;
            case A4CHARACTER_STATE_THOUGHT_BUBBLE:
                if (this.stateCycle==0) {
                    this.currentAnimation = A4_ANIMATION_IDLE;
                    if (this == <A4Character>game.currentPlayer) {
                        if (this == <A4Character>(game.currentPlayer)) {
                            game.addMessageWithColor("("+this.talkingText + ")", MSX_COLOR_GREEN);
                        }
                    }
                }            
                this.stateCycle++;
                if (this.stateCycle>=this.talkingBubbleDuration) {
                    this.talkingText = null;
                    this.talkingBubble = null;
                    this.talkingBubbleDuration = 0;
                    this.state = A4CHARACTER_STATE_IDLE;
                    this.talkingTarget = null;
                }
                break;               
            case A4CHARACTER_STATE_IN_BED:
            case A4CHARACTER_STATE_IN_BED_CANNOT_GETUP:
                break;
            case A4CHARACTER_STATE_IN_BED_TALKING:
                if (this.stateCycle==0) {
                    if (this.map == game.currentPlayer.map) {
                        if (this == <A4Character>(game.currentPlayer)) {
                            game.addMessageWithColor(">"+this.talkingText, MSX_COLOR_LIGHT_GREEN);
                        } else {
                            game.addMessageWithColor(this.name + ": " +this.talkingText, MSX_COLOR_WHITE);
                        }
                    }
                }
                this.stateCycle++;
                if (this.stateCycle>=this.talkingBubbleDuration) {
                    // after the speech bubble is done, we record it in the map:
                    if (this.map == game.currentPlayer.map) {
                        this.map.addPerceptionBufferRecord(
                            new PerceptionBufferRecord("talk", this.ID, this.sort, 
                                                       null, null, this.talkingText,
                                                       null, null,
                                                       this.x, this.y, this.x+this.getPixelWidth(), this.y+this.getPixelHeight()));
                    }                    
                    this.talkingText = null;
                    this.talkingBubble = null;
                    this.state = A4CHARACTER_STATE_IN_BED;
                    this.talkingTarget = null;
                }
                break;        
            case A4CHARACTER_STATE_IN_BED_CANNOT_GETUP_TALKING:
                if (this.stateCycle==0) {
                    if (this.map == game.currentPlayer.map) {
                        if (this == <A4Character>(game.currentPlayer)) {
                            game.addMessageWithColor(">"+this.talkingText, MSX_COLOR_LIGHT_GREEN);
                        } else {
                            game.addMessageWithColor(this.name + ": " +this.talkingText, MSX_COLOR_WHITE);
                        }
                    }
                }
                this.stateCycle++;
                if (this.stateCycle>=this.talkingBubbleDuration) {
                    // after the speech bubble is done, we record it in the map:
                    if (this.map == game.currentPlayer.map) {
                        this.map.addPerceptionBufferRecord(
                            new PerceptionBufferRecord("talk", this.ID, this.sort, 
                                                       null, null, this.talkingText,
                                                       null, null,
                                                       this.x, this.y, this.x+this.getPixelWidth(), this.y+this.getPixelHeight()));
                    }
                    this.talkingText = null;
                    this.talkingBubble = null;
                    this.talkingBubbleDuration = 0;
                    this.state = A4CHARACTER_STATE_IN_BED_CANNOT_GETUP;
                    this.talkingTarget = null;
                }
                break;  
                
            case A4CHARACTER_STATE_IN_BED_THOUGHT_BUBBLE:
                if (this.stateCycle==0) {
                    if (this.map == game.currentPlayer.map) {
                        if (this == <A4Character>(game.currentPlayer)) {
                            game.addMessageWithColor("("+this.talkingText + ")", MSX_COLOR_GREEN);
                        }
                    }
                }
                this.stateCycle++;
                if (this.stateCycle>=this.talkingBubbleDuration) {
                    this.talkingText = null;
                    this.talkingBubble = null;
                    this.talkingBubbleDuration = 0;
                    this.state = A4CHARACTER_STATE_IN_BED;
                    this.talkingTarget = null;
                }
                break;        

            case A4CHARACTER_STATE_IN_BED_CANNOT_GETUP_THOUGHT_BUBBLE:
                if (this.stateCycle==0) {
                    if (this.map == game.currentPlayer.map) {
                        if (this == <A4Character>(game.currentPlayer)) {
                            game.addMessageWithColor("("+this.talkingText + ")", MSX_COLOR_GREEN);
                        }
                    }
                }
                this.stateCycle++;
                if (this.stateCycle>=this.talkingBubbleDuration) {
                    // after the speech bubble is done, we record it in the map:
                    this.talkingText = null;
                    this.talkingBubble = null;
                    this.talkingBubbleDuration = 0;
                    this.state = A4CHARACTER_STATE_IN_BED_CANNOT_GETUP;
                    this.talkingTarget = null;
                }
                break;  

            case A4CHARACTER_STATE_IN_VEHICLE_TALKING:
                if (this.stateCycle==0) {
                    if (this.map == game.currentPlayer.map) {
                        if (this == <A4Character>(game.currentPlayer)) {
                            game.addMessageWithColor(">"+this.talkingText, MSX_COLOR_LIGHT_GREEN);
                        } else {
                            game.addMessageWithColor(this.name + ": " +this.talkingText, MSX_COLOR_WHITE);
                        }
                    }
                }
                this.stateCycle++;
                if (this.stateCycle>=this.talkingBubbleDuration) {
                    // after the speech bubble is done, we record it in the map:
                    if (this.map == game.currentPlayer.map) {
                        this.map.addPerceptionBufferRecord(
                            new PerceptionBufferRecord("talk", this.ID, this.sort, 
                                                       null, null, this.talkingText,
                                                       null, null,
                                                       this.x, this.y, this.x+this.getPixelWidth(), this.y+this.getPixelHeight()));
                    }                    
                    this.talkingText = null;
                    this.talkingBubble = null;
                    this.talkingBubbleDuration = 0;
                    this.state = A4CHARACTER_STATE_IN_VEHICLE;
                    this.talkingTarget = null;
                }
                break;     

            case A4CHARACTER_STATE_IN_VEHICLE_THOUGHT_BUBBLE:
                if (this.stateCycle==0) {
                    if (this.map == game.currentPlayer.map) {
                        if (this == <A4Character>(game.currentPlayer)) {
                            game.addMessageWithColor("("+this.talkingText + ")", MSX_COLOR_GREEN);
                        }
                    }
                }
                this.stateCycle++;
                if (this.stateCycle>=this.talkingBubbleDuration) {
                    this.talkingText = null;
                    this.talkingBubble = null;
                    this.talkingBubbleDuration = 0;
                    this.state = A4CHARACTER_STATE_IN_VEHICLE;
                    this.talkingTarget = null;
                }
                break;     
            }

        return ret;
    }


    draw(offsetx:number, offsety:number, game:A4Game)
    {
        // when character is sleeping, the grapic is displayed by the bed itself, so, no need to draw:
        if (!this.isInVehicle() &&
            this.state != A4CHARACTER_STATE_IN_BED &&
            this.state != A4CHARACTER_STATE_IN_BED_CANNOT_GETUP &&
            this.state != A4CHARACTER_STATE_IN_BED_TALKING &&
            this.state != A4CHARACTER_STATE_IN_BED_CANNOT_GETUP_TALKING &&
            this.state != A4CHARACTER_STATE_IN_BED_THOUGHT_BUBBLE &&
            this.state != A4CHARACTER_STATE_IN_BED_CANNOT_GETUP_THOUGHT_BUBBLE) {
            super.draw(offsetx, offsety, game);
        }
    }
    

    drawTextBubbles(offsetx:number, offsety:number, screenWidth:number, screenHeight:number, game:A4Game)
    {
        if (this.talkingBubble!=null && 
            this.stateCycle < this.talkingBubbleDuration-15) {
            let focus:A4Object = this;
            if (this.sleepingInBed != null) focus = this.sleepingInBed;
            let px:number = Math.floor(focus.x + offsetx + focus.getPixelWidth()/2);
            let bx:number = Math.floor(px - this.talkingBubble.width/2);
            if (bx<0) bx = 0;
            if (bx+this.talkingBubble.width>=screenWidth) bx = screenWidth - this.talkingBubble.width;
            let py:number = (focus.y + offsety - focus.pixel_tallness);
            let by:number = py - (8 + this.talkingBubble.height);
//            console.log("drawTextBubbles: " + by + " vs " + screenHeight);
            if (by<0 || py<screenHeight/3) {
                py = focus.y + offsety + focus.getPixelHeight();
                by = py + 8;
            }
            
            let f:number = 1;
            let fade_speed:number = 15;
            if (this.stateCycle<fade_speed) f = this.stateCycle/fade_speed;
            let limit:number = Math.floor(this.talkingBubbleDuration);
            if (this.stateCycle>limit-fade_speed) f = (limit - this.stateCycle)/fade_speed;
            if (f<0) f = 0;
            if (f>1) f = 1;
            this.talkingBubble.draw(bx,by,px,py, this.state == A4CHARACTER_STATE_THOUGHT_BUBBLE ||
                                                 this.state == A4CHARACTER_STATE_IN_BED_THOUGHT_BUBBLE ||
                                                 this.state == A4CHARACTER_STATE_IN_BED_CANNOT_GETUP_THOUGHT_BUBBLE, f);
        }
    }


    isIdle() : boolean
    {
        if (this.vehicle==null) {
            return this.state == A4CHARACTER_STATE_IDLE;
        } else {
            return this.state == A4CHARACTER_STATE_IN_VEHICLE && this.vehicle.state == A4CHARACTER_STATE_IDLE;
        }
    }


    isTalking() : boolean
    {
        return this.state == A4CHARACTER_STATE_TALKING ||
               this.state == A4CHARACTER_STATE_IN_BED_TALKING ||
               this.state == A4CHARACTER_STATE_IN_BED_CANNOT_GETUP_TALKING ||
               this.state == A4CHARACTER_STATE_THOUGHT_BUBBLE ||
               this.state == A4CHARACTER_STATE_IN_BED_THOUGHT_BUBBLE ||
               this.state == A4CHARACTER_STATE_IN_BED_CANNOT_GETUP_THOUGHT_BUBBLE ||
               this.state == A4CHARACTER_STATE_IN_VEHICLE_TALKING ||
               this.state == A4CHARACTER_STATE_IN_VEHICLE_THOUGHT_BUBBLE;
    }


    issueCommand(command:A4CharacterCommand, game:A4Game)
    {
        if (command.text!=null) {
            this.issueCommandWithString(command.command, command.text, command.direction, game);
        } else {
            this.issueCommandWithArguments(command.command, command.argument, command.direction, command.target, game);
        }
    }


//	issueCommandWithSpeechAct(command:number, argument:SpeechAct, direction:number, target:A4Character, game:A4Game)
    issueCommandWithString(command:number, argument:string, direction:number, game:A4Game) : boolean
    {
        if (this.state!=A4CHARACTER_STATE_IDLE &&
            this.state!=A4CHARACTER_STATE_IN_BED &&
            this.state!=A4CHARACTER_STATE_IN_BED_CANNOT_GETUP &&
            this.state!=A4CHARACTER_STATE_IN_VEHICLE) return false;

        switch(command) {
            case A4CHARACTER_COMMAND_TALK:
            case A4CHARACTER_COMMAND_THOUGHT_BUBBLE:
            {
                this.talkingText = argument;
                if (this.talkingText != null) {
                    this.talkingBubble = new A4TextBubble(this.talkingText, 24, fontFamily8px, 6, 8, game, this);
                    if (game.debugTextBubbleLog != null) {
                        game.debugTextBubbleLog.push([game.cycle, this.ID, this.talkingBubble]);
                    }
                    if (game.drawTextBubbles) {
                        this.talkingBubbleDuration = TEXT_INITIAL_DELAY+this.talkingText.length*TEXT_SPEED;
                    } else {
                        // if we are not drawing them, make it faster:
                        this.talkingBubbleDuration = (TEXT_INITIAL_DELAY+this.talkingText.length*TEXT_SPEED)/2;
                    }
    //                this.talkingTarget = target;
                    if (this.state == A4CHARACTER_STATE_IDLE) {
                        if (command == A4CHARACTER_COMMAND_TALK) {
                            this.state = A4CHARACTER_STATE_TALKING;
                        } else {
                            this.state = A4CHARACTER_STATE_THOUGHT_BUBBLE;
                        }
                    } else if (this.state == A4CHARACTER_STATE_IN_BED) {
                        if (command == A4CHARACTER_COMMAND_TALK) {
                            this.state = A4CHARACTER_STATE_IN_BED_TALKING;
                        } else {
                            this.state = A4CHARACTER_STATE_IN_BED_THOUGHT_BUBBLE;
                        }
                    } else if (this.state == A4CHARACTER_STATE_IN_BED_CANNOT_GETUP) {
                        if (command == A4CHARACTER_COMMAND_TALK) {
                            this.state = A4CHARACTER_STATE_IN_BED_CANNOT_GETUP_TALKING;
                        } else {
                            this.state = A4CHARACTER_STATE_IN_BED_CANNOT_GETUP_THOUGHT_BUBBLE;
                        }
                    } else if (this.state == A4CHARACTER_STATE_IN_VEHICLE) {
                        if (command == A4CHARACTER_COMMAND_TALK) {
                            this.state = A4CHARACTER_STATE_IN_VEHICLE_TALKING;
                        } else {
                            this.state = A4CHARACTER_STATE_IN_VEHICLE_THOUGHT_BUBBLE;
                        }
                    }
                    this.stateCycle = 0;                
                } else {
                    console.error("issueCommandWithString: this.talkingText = " + this.talkingText);
                }
                return true;
            }
        }
        return false;
    }
  

    issueCommandWithArguments(command:number, argument:number, direction:number, target:A4Object, game:A4Game)
    {
        //console.log("issueCommandWithArguments: " + command);
        if (this.state==A4CHARACTER_STATE_IN_VEHICLE) {
            if (command==A4CHARACTER_COMMAND_WALK ||
                command==A4CHARACTER_COMMAND_INTERACT) {
                this.vehicle.issueCommand(command, argument, direction, target, game);
                return;
            } else {
                if (command!=A4CHARACTER_COMMAND_TAKE) return;
            }
        } else {
            if (this.state == A4CHARACTER_STATE_IN_BED) {
                if (command!=A4CHARACTER_COMMAND_TAKE &&
                    command!=A4CHARACTER_COMMAND_WALK) return;
            } else {
                if (this.state!=A4CHARACTER_STATE_IDLE) return;
            }
        }

//        console.log("issueCommandWithArguments: " + command);
        
        switch(command) {
            case A4CHARACTER_COMMAND_IDLE:
                break;
            case A4CHARACTER_COMMAND_WALK:
                if (this.state == A4CHARACTER_STATE_IN_BED) {
                    this.getOutOfBed(game);
                } else {
                    //<shrdluSpecific>
                    // When a player is interacting with a container, but decides to walk away,
                    // we need to close the split inventory screen
                    if (this == (<A4Character>game.currentPlayer) && 
                        game.HUD_state == SHRDLU_HUD_STATE_SPLIT_INVENTORY) {
                        game.HUD_state = SHRDLU_HUD_STATE_INVENTORY;
                        game.HUD_remote_inventory = null;
                    }
                    //</shrdluSpecific>
                    this.direction_command_received_this_cycle[direction] = true;
                    this.continuous_direction_command_max_movement[direction] = argument;
                }
                break;
            case A4CHARACTER_COMMAND_TAKE:
                {
                    if (this.isInVehicle()) {
                        // Humans can only get out of vehicles if they have a spacesuit:
                        if (this.sort.is_a_string("human")) {
                            let helmet:A4Item = null;
                            let suit:A4Item = null;
                            for(let item of game.currentPlayer.inventory) {
                                if (item.sort.is_a_string("helmet")) helmet = <A4Item>item;
                                if (item.sort.is_a_string("workingspacesuit")) suit = <A4Item>item;
                            }
                            if (helmet != null && suit != null) {
                                helmet.droppable = false;
                                suit.droppable = false;
                                game.setStoryStateVariable("spacesuit", "helmet");
                            } else {
                                this.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
                                                            "I am not going out there without a spacesuit!!", A4_DIRECTION_NONE, game);
                                break;
                            }
                        }

                        this.map.addPerceptionBufferRecord(new PerceptionBufferRecord("disembark", this.ID, this.sort, 
                                                                                      this.vehicle.ID, this.vehicle.sort, null,
                                                                                      null, null,
                                                                                      this.x, this.y, this.x+this.getPixelWidth(), this.y+this.getPixelHeight()));
                        let vehicle:A4Object = this.vehicle;
                        if (this.disembark()) {
                            game.inGameActionsForLog.push(["disembark("+this.ID+","+vehicle.ID+")",""+game.in_game_seconds]);
                        }
                    } else {
                        if (this.state == A4CHARACTER_STATE_IN_BED) {
                            this.getOutOfBed(game);
                        } else {
                            if (!this.takeAction(game)) {
                                if (!this.useAction(game)) {
                                    /*
                                    // see if there is a vehicle:
                                    let v:A4Object = this.map.getVehicleObject(this.x + this.getPixelWidth()/2 - 1, this.y + this.getPixelHeight()/2 - 1, 2, 2);
                                    if (v!=null) {
                                        this.embark(<A4Vehicle>v);
                                        this.map.addPerceptionBufferRecord(new PerceptionBufferRecord("embark", this.ID, this.sort, 
                                                                                                      v.ID, v.sort, null,
                                                                                                      null, null,
                                                                                                      this.x, this.y, this.x+this.getPixelWidth(), this.y+this.getPixelHeight()));
                                        game.inGameActionsForLog.push(["embark("+this.ID+","+v.ID+")",""+game.in_game_seconds]);
                                    } else {
                                    */
                                    // interact with the object in front:
                                    this.issueCommandWithArguments(A4CHARACTER_COMMAND_INTERACT,A4_DIRECTION_NONE,direction, null, game);
                                    //}
                                }
                            }
                        }
                    }
                }
                break;
            case A4CHARACTER_COMMAND_DROP:
                {
                    let o:A4Object = this.inventory[argument];
                    if (o!=null) {
                        if ((<A4Item>o).droppable) {
                            // drop:
                            this.inventory.splice(argument, 1);
                            game.requestWarp(o, this.map, this.x, this.y);//, A4_LAYER_FG);
                            this.map.addPerceptionBufferRecord(new PerceptionBufferRecord("drop", this.ID, this.sort, 
                                                                                          o.ID, o.sort, null,
                                                                                          null, null,
                                                                                          this.x, this.y, this.x+this.getPixelWidth(), this.y+this.getPixelHeight()));
                            o.event(A4_EVENT_DROP, this, this.map, game);
                            this.eventWithObject(A4_EVENT_ACTION_DROP, null, o, this.map, game);
                            game.playSound("data/sfx/itemPickup.wav")
                            game.inGameActionsForLog.push(["drop("+this.ID+","+o.ID+")",""+game.in_game_seconds]);
                        }
                    }
                }
                break;
            case A4CHARACTER_COMMAND_USE:
                {
                    let o:A4Object = this.inventory[argument];
                    if (o!=null) {
                        if (o.usable) {
                            o.event(A4_EVENT_USE, this, this.map, game);
                            this.eventWithObject(A4_EVENT_ACTION_USE, null, o, this.map, game);
                            game.inGameActionsForLog.push(["use("+this.ID+","+o.ID+")",""+game.in_game_seconds]);
                        }
                    }
                }
                break;
            case A4CHARACTER_COMMAND_INTERACT:
                {
                    // get the object to interact with:
                    let collisions:A4Object[] = this.map.getAllObjectCollisionsOnlyWithOffset(this, direction_x_inc[direction], direction_y_inc[direction]);
                    if (collisions == null || collisions.length == 0) collisions = this.map.getAllObjectCollisionsWithOffset(this, direction_x_inc[direction], direction_y_inc[direction]);
//                    console.log("Character received the interact command for direction " + direction + " resulting in " + collisions.length + " collisions");
                    for(let o of collisions) {
//                        console.log("considering " + o.name);
                        if (o.interacteable) {
                            if ((o instanceof A4Character) && (<A4Character>o).isInVehicle()) continue;
    //                            console.log(o.name + " is interacteable!");
                            // interact:
                            this.direction = direction;
                            this.state = A4CHARACTER_STATE_INTERACTING;
                            this.stateCycle = 0;
                            this.map.addPerceptionBufferRecord(new PerceptionBufferRecord("interact", this.ID, this.sort, 
                                                                                          o.ID, o.sort, null,
                                                                                          null, null,
                                                                                          this.x, this.y, this.x+this.getPixelWidth(), this.y+this.getPixelHeight()));
                            o.event(A4_EVENT_INTERACT,this,this.map,game);
                            this.eventWithObject(A4_EVENT_ACTION_INTERACT, null, o, this.map, game);
                            game.inGameActionsForLog.push(["interact("+this.ID+","+o.ID+")",""+game.in_game_seconds]);
                            break;
                        }
                    }
                    // just default to a walk:
                    //this.issueCommandWithArguments(A4CHARACTER_COMMAND_WALK, argument, direction, target, game);
                }
                break;
            case A4CHARACTER_COMMAND_PUSH:
                {
//                    console.log("got the push command");
                    // get the object to interact with:
                    let collisions:A4Object[] = this.map.getAllObjectCollisionsWithOffset(this, direction_x_inc[direction], direction_y_inc[direction]);
                    for(let o of collisions) {
//                        console.log("checking object " + o.name);
                        if (o.isPushable()) {
                            this.pushAction(o, argument, game);
                            break;
                        }
                    }
                }
                break;                

            case A4CHARACTER_COMMAND_GIVE:
                {
                    let item_to_give:A4Object = this.inventory[argument];
                    let item_weight:number = 1;
                    if (item_to_give==null) {
                        // error!
                        console.error("Character "+this.name+" trying to give item "+argument+", which it does not have...");
                    } else {
                        let x2:number = target.x + target.getPixelWidth()/2;
                        let y2:number = target.y + target.getPixelHeight()/2;
                        let dx:number = Math.floor((this.x + this.getPixelWidth()/2) - x2);
                        let dy:number = Math.floor((this.y + this.getPixelHeight()/2) - y2);
                        let d:number = dx*dx + dy*dy;
                        let maxd:number = Math.max(game.tileWidth, game.tileHeight)*5;
                        if (d>maxd*maxd) {
                            // too far!
                            console.log("Character "+this.name+" trying to give item "+argument+" to a character that is too far...");
//                            if (this == <A4Character>game.currentPlayer) game.addMessageWithOriginator(this, "I need to get closer!");
                        } else {
                            let target_c:A4Character = <A4Character>target;
                            if (item_to_give instanceof A4Item) {
                                item_weight = (<A4Item>item_to_give).weight;
                            }
                            if (target_c.inventory.length>=A4_INVENTORY_SIZE) {
//                                if (this == <A4Character>game.currentPlayer) game.addMessageWithOriginator(this, "The other's inventory is full!");
                            } else if (item_weight > target_c.strength) {
                                // too heavy for the receiver!
                            } else {
                                // give!
                                this.inventory.splice(argument,1);
                                target_c.addObjectToInventory(item_to_give, game);
//                                if (this == <A4Character>game.currentPlayer) game.addMessageWithOriginator(this, "Here, take this.");
                                this.map.addPerceptionBufferRecord(new PerceptionBufferRecord("give", this.ID, this.sort,
                                        target_c.ID, target_c.sort, null,
                                        item_to_give.ID, item_to_give.sort,
                                        this.x, this.y, this.x+this.getPixelWidth(), this.y+this.getPixelHeight()));
                                target_c.eventWithObject(A4_EVENT_RECEIVE, this, item_to_give, this.map, game);
                                this.eventWithObject(A4_EVENT_ACTION_GIVE, target_c, item_to_give, this.map, game);
                                game.playSound("data/sfx/itemPickup.wav");
                                game.inGameActionsForLog.push(["give("+this.ID+","+item_to_give.ID+","+target_c.ID+")",""+game.in_game_seconds]);
                            }
                        }
                    }
                }
                break;
        }
    }


    pushAction(o:A4Object, direction:number, game:A4Game): boolean
    {
        if (this.strength >= (<A4PushableWall>o).weight) {
//                            console.log("object " + o.name + " is pushable");
            this.direction = direction;
            this.state = A4CHARACTER_STATE_WALKING;
            this.stateCycle = 0;
            this.map.addPerceptionBufferRecord(new PerceptionBufferRecord("push", this.ID, this.sort, 
                                                                          o.ID, o.sort, null,
                                                                          null, null,
                                                                          this.x, this.y, this.x+this.getPixelWidth(), this.y+this.getPixelHeight()));
            if (!o.event(A4_EVENT_PUSH,this,this.map,game)) return false;
            this.eventWithObject(A4_EVENT_ACTION_INTERACT, null, o, this.map, game);
            game.inGameActionsForLog.push(["push("+this.ID+","+o.ID+")",""+game.in_game_seconds]);
            return true;
        } else {
            if (this == <A4Character>game.currentPlayer) {
                this.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, "too heavy for me, I'd need to get a robot to move this!!", A4_DIRECTION_NONE, game);
            } else if (this.name == "Shrdlu") {
                this.issueCommandWithString(A4CHARACTER_COMMAND_TALK, "I do not have energy for moving the huge boulder. Please bring me to Aurora Station.", A4_DIRECTION_NONE, game);
            }
            return false;
        }
    }


    takeAction(game:A4Game) : boolean 
    {
        let item:A4Object = this.map.getTakeableObject(this.x + this.getPixelWidth()/2 - 1, 
                                                       this.y + this.getPixelHeight()/2 - 1, 2, 2);
        if (item == null) {
            // no item under the player, check to see if there is something right in front:
            let collisions:A4Object[] = this.map.getAllObjectCollisionsWithOffset(this, direction_x_inc[this.direction], direction_y_inc[this.direction]);
            for(let o of collisions) {
                if (o.takeable) {
                    item = o;
                    break;
                }
            }
        }
        if (item!=null) {
            let weight:number = 0;
            if (item instanceof A4Item) {
                weight = (<A4Item>item).weight;
            }
            if (weight > this.strength) {
                // if (this == <A4Character>game.currentPlayer) game.addMessageWithOriginator(this, "Too heavy!");
                return false;
            } else if (this.inventory.length<A4_INVENTORY_SIZE) {
                game.requestWarp(item, null, 0, 0);//, 0);
                this.addObjectToInventory(item, game);
                this.map.addPerceptionBufferRecord(new PerceptionBufferRecord("take", this.ID, this.sort, 
                                                                              item.ID, item.sort, null,
                                                                              null, null,
                                                                              this.x, this.y, this.x+this.getPixelWidth(), this.y+this.getPixelHeight()));
                item.event(A4_EVENT_PICKUP, this, this.map, game);
                this.eventWithObject(A4_EVENT_ACTION_TAKE, null, item, this.map, game);
                game.playSound("data/sfx/itemPickup.wav");
                game.inGameActionsForLog.push(["take("+this.ID+","+item.ID+")",""+game.in_game_seconds]);
                return true;
            } else {
                if (this == <A4Character>game.currentPlayer) game.addMessageWithOriginator(this, "Inventory full!");
                return false;
            }
        }
        return false;
    }


    useAction(game:A4Game) : boolean
    {
        let object:A4Object = this.map.getUsableObject(this.x + this.getPixelWidth()/2 - 1, 
                                                       this.y + this.getPixelHeight()/2 - 1, 2, 2);
        if (object!=null) {
            //console.log("useAction on " + object.name);
            this.state = A4CHARACTER_STATE_INTERACTING;
            this.map.addPerceptionBufferRecord(new PerceptionBufferRecord("interact", this.ID, this.sort, 
                                                                          object.ID, object.sort, null,
                                                                          null, null,
                                                                          this.x, this.y, this.x+this.getPixelWidth(), this.y+this.getPixelHeight()));
            object.event(A4_EVENT_USE, this, this.map, game);
            this.eventWithObject(A4_EVENT_ACTION_USE, null, object, this.map, game);
            game.inGameActionsForLog.push(["interact("+this.ID+","+object.ID+")",""+game.in_game_seconds]);
            return true;
        }
        return false;
    }


    // embark/disembark vehicles:
    embark(v:A4Vehicle)
    {
        this.vehicle = v;
        this.vehicle.embark(this);
        if (this.state == A4CHARACTER_STATE_TALKING) {
            this.state = A4CHARACTER_STATE_IN_VEHICLE_TALKING;
        } else if (this.state == A4CHARACTER_STATE_THOUGHT_BUBBLE) {
            this.state = A4CHARACTER_STATE_IN_VEHICLE_THOUGHT_BUBBLE;
        } else {
            this.talkingText = null;
            this.talkingBubble = null;
            this.state = A4CHARACTER_STATE_IN_VEHICLE;
            this.stateCycle = 0;
        }
    }


    disembark() : boolean
    {
        // 1) find a non-colliding position around the vehicle:
        let best_x:number, best_y:number;
        let best_d:number = null;
        let cx:number = this.vehicle.x + this.vehicle.getPixelWidth()/2;
        let cy:number = this.vehicle.y + this.vehicle.getPixelHeight()/2;
        let ccx:number = this.getPixelWidth()/2;
        let ccy:number = this.getPixelHeight()/2;
        for(let y:number = this.vehicle.y-this.getPixelHeight();y<this.vehicle.y+this.vehicle.getPixelHeight()+this.getPixelHeight();y+=this.map.tileHeight) {
            for(let x:number = this.vehicle.x-this.getPixelWidth();x<this.vehicle.x+this.vehicle.getPixelWidth()+this.getPixelWidth();x+=this.map.tileWidth) {
                if (this.map.walkable(x, y, this.getPixelWidth(), this.getPixelHeight(), this)) {
                    let d:number = Math.abs(x+ccx-cx) + Math.abs(y+ccy-cy);
                    if (best_d == null || d<best_d) {
                        best_d = d;
                        best_x = x;
                        best_y = y;
                    }
                }
            }
        }
        if (best_d != null) {
            if (this.vehicle != null) this.vehicle.disembark(this);
            this.x = best_x;
            this.y = best_y;
            if (this.state == A4CHARACTER_STATE_IN_VEHICLE_TALKING) {
                this.state = A4CHARACTER_STATE_TALKING;
            } else if (this.state == A4CHARACTER_STATE_IN_VEHICLE_THOUGHT_BUBBLE) {
                this.state = A4CHARACTER_STATE_THOUGHT_BUBBLE;
            } else {
                this.talkingText = null;
                this.talkingBubble = null;
                this.state = A4CHARACTER_STATE_IDLE;
                this.stateCycle = 0;
            }
            this.vehicle = null;
            return true;
        }
        return false;
    }


    getInBed(b:A4Object,game:A4Game)
    {
        this.sleepingInBed = b;
        this.state = A4CHARACTER_STATE_IN_BED;
        this.stateCycle = 0;
        this.sleepingInBed.setStoryStateVariable("characterIn","true",game);
    }


    getOutOfBed(game:A4Game)
    {
        this.sleepingInBed.setStoryStateVariable("characterIn","false",game);
        this.sleepingInBed = null;
        this.state = A4CHARACTER_STATE_IDLE;
        this.stateCycle = 0;
    }


    isInVehicle() : boolean 
    {
        if (this.vehicle != null) return true;
        return false;
    }
    

	addObjectToInventory(o:A4Object, game:A4Game)
    {
        if (this.inventory.length>=A4_INVENTORY_SIZE) {
            game.requestWarp(o, this.map, this.x, this.y);//, A4_LAYER_FG);
            o.event(A4_EVENT_DROP, this, this.map, game);
            let pbr:PerceptionBufferRecord = new PerceptionBufferRecord("drop", this.ID, this.sort, 
                                                                        null, null, null,
                                                                        null, null,
                                                                        this.x, this.y, this.x+this.getPixelWidth(), this.y+this.getPixelHeight());
            pbr.directObjectID = o.ID;
            pbr.directObjectSort = o.sort;
            this.map.addPerceptionBufferRecord(pbr);
        } else {
            this.inventory.push(o);
        }        
    }


	removeFromInventory(o:A4Object) 
    {
        let idx:number = this.inventory.indexOf(o);
        if (idx>=0) this.inventory.splice(idx, 1);
    }


	isWalkable() : boolean 
    {
        return this.isInVehicle();
    }


	isHeavy() : boolean 
    {
        return true;
    }		// this is used by pressure plates
	

    isCharacter() : boolean
    {
        return true;
    }


    findObjectByName(name:string) : A4Object[]
    {
        for(let o of this.inventory) {
            if (o.name == name) return [o];
            let o2:A4Object[] = o.findObjectByName(name);
            if (o2!=null) return [o].concat(o2);
        }
        return null;
    }   


    findObjectByID(ID:string) : A4Object[]
    {
        for(let o of this.inventory) {
            if (o.ID == ID) return [o];
            let o2:A4Object[] = o.findObjectByID(ID);
            if (o2!=null) return [o].concat(o2);
        }
        return null;
    }   


    hasKey(ID:string) : boolean
    {
        for(let o of this.inventory) {
            if ((o instanceof A4Key) &&
                (<A4Key>o).keyID == ID) return true;
        }
        return false;
    }

	// attributes:
    inventory:A4Object[] = [];
    strength:number = 1

//    talking_state:number;
//    talking_state_cycle:number;

    vehicle:A4Vehicle = null;
    sleepingInBed:A4Object = null;
    
    // talking:
    //talkingSpeechAct:SpeechAct = null;
    talkingText:string = null;
    talkingBubble:A4TextBubble = null;
    talkingTarget:A4Character = null;
    talkingBubbleDuration:number = 0;

    hungerTimer:number = 0;
    thirstTimer:number = 0;
}

