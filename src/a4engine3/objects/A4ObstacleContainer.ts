class A4ObstacleContainer extends A4Container {

    constructor(name:string, sort:Sort, ID:string, closed:boolean, consumeKey:boolean, 
    			a_closed:A4Animation, a_open:A4Animation)
    {
        super(name, sort, closed ? a_closed:a_open);

        this.doorID = ID;
        this.closed = closed;
        this.consumeKey = consumeKey;
        this.interacteable = true;
        this.takeable = false;
        this.animations[A4_ANIMATION_CLOSED] = a_closed;
        this.animations[A4_ANIMATION_OPEN] = a_open;
        if (this.closed) this.currentAnimation = A4_ANIMATION_CLOSED;
                    else this.currentAnimation = A4_ANIMATION_OPEN;
    }


    loadObjectAttribute(attribute_xml:Element) : boolean
    {
        if (super.loadObjectAttribute(attribute_xml)) return true;
        var a_name:string = attribute_xml.getAttribute("name");
        
        if (a_name == "doorID") {
            this.doorID = attribute_xml.getAttribute("value");
            return true;
        } else if (a_name == "closed") {
            this.closed = false;
            if (attribute_xml.getAttribute("value") == "true") this.closed = true;
            if (this.closed) this.currentAnimation = A4_ANIMATION_CLOSED;
                        else this.currentAnimation = A4_ANIMATION_OPEN;
            return true;
        } else if (a_name == "closeable") {
            this.closeable = false;
            if (attribute_xml.getAttribute("value") == "true") this.closeable = true;
            if (!this.closeable) this.closed = false;
            if (this.closed) this.currentAnimation = A4_ANIMATION_CLOSED;
                        else this.currentAnimation = A4_ANIMATION_OPEN;
            return true;
        } else if (a_name == "consumeKey") {
            this.consumeKey = false;
            if (attribute_xml.getAttribute("value") == "true") this.consumeKey = true;
            return true;
        }

        return false;
    }


    savePropertiesToXML(game:A4Game) : string
    {
        var xmlString:string = super.savePropertiesToXML(game);

        if (this.doorID!=null) xmlString += this.saveObjectAttributeToXML("doorID",this.doorID) + "\n";
        xmlString += this.saveObjectAttributeToXML("closed",this.closed) + "\n";
        xmlString += this.saveObjectAttributeToXML("closeable",this.closeable) + "\n";
        xmlString += this.saveObjectAttributeToXML("consumeKey",this.consumeKey) + "\n";

        return xmlString;
    }


    event(a_event:number, character:A4Character, map:A4Map, game:A4Game)
    {
        super.event(a_event,character,map,game);

        if (a_event == A4_EVENT_INTERACT) {

        	//console.log(this.name + " receives event interact!");
            if (this.consumeKey && !this.closed) return;  // if it consumes the key, it cannot be reopened!
            if (this.doorID == null) {
            	this.eventWithID(A4_EVENT_OPEN, null, character, map, game);
            } else {
	            // see if the character has the key:
	            for(let o of character.inventory) {
	                if (o.isKey()) {
	                    var key:A4Key = <A4Key>o;
	                    if (key.keyID == this.doorID) {
	                        // the player has the proper key!
	                        this.eventWithID(A4_EVENT_OPEN, key.keyID, character, map, game);
	                        if (this.consumeKey) {
	                            character.removeFromInventory(key);
	                            game.requestDeletion(key);
	                        }
	                        break;
	                    }
	                }
	            }
	        }
        }
    }


    eventWithID(a_event:number, ID:string, character:A4Character, map:A4Map, game:A4Game)
    {
        super.eventWithID(a_event,ID,character,map,game);

        if (a_event == A4_EVENT_OPEN && this.doorID == ID) {
        	//console.log(this.name + " receives event open " + ID + "!");

            if (this.eventScripts[a_event]!=null) {
                for(let rule of this.eventScripts[a_event]) {
                    rule.executeEffects(this, map, game, character);
                }
            }

            if (this.closeable) this.closed = (this.closed ? false:true);
            if (this.closed) {
                this.currentAnimation = A4_ANIMATION_CLOSED;
                if (this.content.length>0 && this.animations[A4_ANIMATION_CLOSED_FULL]!=null) this.currentAnimation = A4_ANIMATION_CLOSED_FULL;
                this.event(A4_EVENT_CLOSE,character,map,game);

                //<shrdluspecific>
                if (character == game.currentPlayer && 
                	game.HUD_state == SHRDLU_HUD_STATE_SPLIT_INVENTORY) {
                	game.HUD_state = SHRDLU_HUD_STATE_INVENTORY;
                    game.HUD_remote_inventory = null;
                }
                //</shrdluspecific>

            } else {
                this.currentAnimation = A4_ANIMATION_OPEN;
                if (this.content.length>0 && this.animations[A4_ANIMATION_OPEN_FULL]!=null) this.currentAnimation = A4_ANIMATION_OPEN_FULL;
                this.event(A4_EVENT_OPEN,character,map,game);

                //<shrdluspecific>
                if (character == game.currentPlayer) {
                	game.HUD_state = SHRDLU_HUD_STATE_SPLIT_INVENTORY;
                    game.HUD_remote_inventory = this;
                    game.HUD_remote_inventory_start = 0;
                    game.HUD_remote_inventory_selected = -1;
                }
                //</shrdluspecific>
            }
            if (this.animations[this.currentAnimation]!=null) this.animations[this.currentAnimation].reset();
        }
    }

  
    isWalkable():boolean {return false;}
    isTakeable():boolean {return false;}


    addContent(o:A4Object) 
    {
        this.content.push(o);
        if (this.closed) {
            if (this.currentAnimation == A4_ANIMATION_CLOSED_EMPTY) {
                if (this.animations[A4_ANIMATION_CLOSED_FULL] != null) this.currentAnimation = A4_ANIMATION_CLOSED_FULL;
            }
        } else {
            if (this.currentAnimation == A4_ANIMATION_OPEN_EMPTY) {
                if (this.animations[A4_ANIMATION_OPEN_FULL] != null) this.currentAnimation = A4_ANIMATION_OPEN_FULL;
            }
        }
        if (this.animations[this.currentAnimation]!=null) this.animations[this.currentAnimation].reset();
    }


    objectRemoved(o:A4Object)
    {
        super.objectRemoved(o);

        for(let o2 of this.content) {
            o2.objectRemoved(o);
        }

        if (this.content.length == 0) {
            if (this.closed) {
                if (this.currentAnimation == A4_ANIMATION_CLOSED_FULL) {
                    if (this.animations[A4_ANIMATION_CLOSED_EMPTY] != null) this.currentAnimation = A4_ANIMATION_CLOSED_EMPTY;
                }
            } else {
                if (this.currentAnimation == A4_ANIMATION_OPEN_FULL) {
                    if (this.animations[A4_ANIMATION_OPEN_EMPTY] != null) this.currentAnimation = A4_ANIMATION_OPEN_EMPTY;
                }
            }
            if (this.animations[this.currentAnimation]!=null) this.animations[this.currentAnimation].reset();
        }
    }


	doorID:string;
	closed:boolean = true;
    closeable:boolean = true;
    consumeKey:boolean = true;
};
