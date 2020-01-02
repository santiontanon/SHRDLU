class A4WalkingObject extends A4Object {
    constructor(name:string, sort:Sort)
    {
        super(name, sort);
        this.currentAnimation = A4_ANIMATION_IDLE_RIGHT;
        this.direction = A4_DIRECTION_RIGHT;
        for(let i:number = 0;i<A4_NDIRECTIONS;i++) {
            this.continuous_direction_command_timers[i] = 0;
            this.continuous_direction_command_max_movement[i] = 0;
            this.direction_command_received_this_cycle[i] = false;
        }
    }
    

    checkIfPushingAgainstMapEdgeBridge(direction:number) : A4MapBridge
    {
        if (direction == A4_DIRECTION_LEFT && this.x <= 0) {
            let bridge:A4MapBridge = this.map.getBridge(1, this.y+this.getPixelHeight()/2);
            return bridge;
        } else if (direction == A4_DIRECTION_RIGHT && this.x >= (this.map.width*this.map.tileWidth-this.getPixelWidth())) {
            let bridge:A4MapBridge = this.map.getBridge(this.map.width*this.map.tileWidth-1, this.y+this.getPixelHeight()/2);
            return bridge;
        } else if (direction == A4_DIRECTION_UP && this.y <= 0) {
            let bridge:A4MapBridge = this.map.getBridge(this.x+this.getPixelWidth()/2, 1);
            return bridge;
        } else if (direction == A4_DIRECTION_DOWN && this.y >= (this.map.height*this.map.tileHeight-this.getPixelHeight())) {
            let bridge:A4MapBridge = this.map.getBridge(this.x+this.getPixelWidth()/2, this.map.height*this.map.tileHeight-1);
            return bridge;
        }
        return null;
    }


    loadObjectAttribute(attribute_xml:Element) : boolean
    {
        if (super.loadObjectAttribute(attribute_xml)) return true;
        let a_name:string = attribute_xml.getAttribute("name");

        if (a_name == "walk_speed") {
            this.walkSpeed = Number(attribute_xml.getAttribute("value"));
            return true;
        } else if (a_name == "previous_direction") {
            this.previousDirection = Number(attribute_xml.getAttribute("value"));
            return true;
        } else if (a_name == "state") {
            this.state = Number(attribute_xml.getAttribute("value"));
            return true;
        } else if (a_name == "previous_state") {
            this.previousState = Number(attribute_xml.getAttribute("value"));
            return true;
        } else if (a_name == "state_cycle") {
            this.stateCycle = Number(attribute_xml.getAttribute("value"));
            return true;
        }
        return false;
    }


    savePropertiesToXML(game:A4Game) : string
    {
        let xmlString:string = super.savePropertiesToXML(game);
        
        xmlString += this.saveObjectAttributeToXML("previous_direction",this.previousDirection) + "\n";
        xmlString += this.saveObjectAttributeToXML("state",this.state) + "\n";
        xmlString += this.saveObjectAttributeToXML("previous_state",this.previousState) + "\n";
        xmlString += this.saveObjectAttributeToXML("state_cycle",this.stateCycle) + "\n";    
        xmlString += this.saveObjectAttributeToXML("walk_speed",this.walkSpeed) + "\n";
        
        return xmlString;
    }


    // I need a function for this, since items can change it!
    getWalkSpeed() : number
    {
        return this.walkSpeed;
    }


    // attributes:
    walkSpeed:number = 16;    
    
    previousDirection:number = A4_DIRECTION_NONE;
    state:number = A4CHARACTER_STATE_IDLE;
    previousState:number = A4CHARACTER_STATE_NONE;
    stateCycle:number = 0;
    
    // walking temporary counters (to make sure characters walk at the desired speed):
    walkingCounter:number = 0;  

          // some variables to make moving the character around intuitive:
    continuous_direction_command_timers:number[] = new Array(A4_NDIRECTIONS);
    continuous_direction_command_max_movement:number[] = new Array(A4_NDIRECTIONS);    // a command might specify a direction and a maximum amount of pixels to move in that direction
    direction_command_received_this_cycle:boolean[] = new Array(A4_NDIRECTIONS);
}
