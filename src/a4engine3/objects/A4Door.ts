class A4Door extends A4Object {

	constructor(sort:Sort, ID:string, closed:boolean, consumeKey:boolean, 
                a_closed:A4Animation, a_open:A4Animation)
    {
        super("door", sort);
        this.doorID = ID;
        this.closed = closed;
        this.consumeKey = consumeKey;
        this.interacteable = true;
        this.canBeOpen = true;
        this.animations[A4_ANIMATION_CLOSED] = a_closed;
        this.animations[A4_ANIMATION_OPEN] = a_open;
        if (this.closed) this.currentAnimation = A4_ANIMATION_CLOSED;
                    else this.currentAnimation = A4_ANIMATION_OPEN;
    }


    loadObjectAttribute(attribute_xml:Element) : boolean
    {
        if (super.loadObjectAttribute(attribute_xml)) return true;
        let a_name:string = attribute_xml.getAttribute("name");
        
        if (a_name == "doorID") {
            this.doorID = attribute_xml.getAttribute("value");
            return true;
        } else if (a_name == "doorgroup") {
            this.doorGroupID = attribute_xml.getAttribute("value");
            return true;
        } else if (a_name == "closed") {
            this.closed = false;
            if (attribute_xml.getAttribute("value") == "true") this.closed = true;
            if (this.closed) this.currentAnimation = A4_ANIMATION_CLOSED;
                        else this.currentAnimation = A4_ANIMATION_OPEN;
            return true;
        } else if (a_name == "consumeKey") {
            this.consumeKey = false;
            if (attribute_xml.getAttribute("value") == "true") this.consumeKey = true;
            return true;
        } else if (a_name == "automatic") {
            this.automatic = false;
            if (attribute_xml.getAttribute("value") == "true") this.automatic = true;
            return true;
        } else if (a_name == "canBeOpen") {
            this.canBeOpen = false;
            if (attribute_xml.getAttribute("value") == "true") this.canBeOpen = true;
            return true;
        }

        return false;
    }


    savePropertiesToXML(game:A4Game) : string
    {
        let xmlString:string = super.savePropertiesToXML(game);

        if (this.doorID!=null) xmlString += this.saveObjectAttributeToXML("doorID",this.doorID) + "\n";
        if (this.doorGroupID!=null) xmlString += this.saveObjectAttributeToXML("doorgroup",this.doorGroupID) + "\n";
        xmlString += this.saveObjectAttributeToXML("closed",this.closed) + "\n";
        xmlString += this.saveObjectAttributeToXML("consumeKey",this.consumeKey) + "\n";
        xmlString += this.saveObjectAttributeToXML("automatic",this.automatic) + "\n";
        xmlString += this.saveObjectAttributeToXML("canBeOpen",this.canBeOpen) + "\n";

        return xmlString;
    }


	isWalkable() : boolean 
    {
        return !this.closed;
    }


    update(game:A4Game) : boolean
    {
        let ret:boolean = super.update(game);
    
        if (this.canBeOpen && this.automatic) {
            // do not check every frame
            this.automaticTimmer--;
            if (this.automaticTimmer<=0) {
                let radius:number = 2;
                let x1:number = this.x-radius*this.map.tileWidth;
                let dx:number = this.getPixelWidth()+(2*radius)*this.map.tileWidth;
                let y1:number = this.y-radius*this.map.tileHeight;
                let dy:number = this.getPixelHeight()+(2*radius)*this.map.tileHeight;

                let l:A4Object[] = this.map.getAllObjects(x1,y1,dx,dy);
                let characterAround:A4Character = null;
                for(let o of l) {
                    if (o.isCharacter()) {
                        characterAround = <A4Character>o;
                        break;
                    }
                }

                if (this.closed) {
                    if (characterAround!=null) {
                        this.changeStateRecursively(false, characterAround, this.map, game);
                    }
                } else {
                    if (characterAround==null) {
                        this.changeStateRecursively(true, null, this.map, game);
                    }
                }

                this.automaticTimmer = 8;
            } 
        }

        return ret;
    }


    canOpen(character:A4Character, game:A4Game) : boolean
    {
        if (!this.canBeOpen) return false;
        if (this.doorID == null) return true;

        // see if the character has the key:
        for(let o of character.inventory) {
            if (o.isKey()) {
                let key:A4Key = <A4Key>o;
                // the player has the proper key!
                if (key.keyID == this.doorID) return true;
                if (key.keyID == "MASTERKEY") {
                    return true;
                }
            }
        }
        return false;        
    }


    canOpenKey(character:A4Character, game:A4Game) : A4Object
    {
        if (!this.canBeOpen) return null;
        if (this.doorID == null) return null;

        // see if the character has the key:
        for(let o of character.inventory) {
            if (o.isKey()) {
                let key:A4Key = <A4Key>o;
                // the player has the proper key!
                if (key.keyID == this.doorID) return key;
                if (key.keyID == "MASTERKEY") {
                    return key;
                }
            }
        }
        return null;
    }

    event(a_event:number, character:A4Character, map:A4Map, game:A4Game) : boolean
    {
        let retval:boolean = super.event(a_event,character,map,game);

        if (a_event == A4_EVENT_INTERACT) {
            if (this.consumeKey && !this.closed) return false;  // if it consumes the key, it cannot be reopened!
            if (this.canOpen(character, game)) {
                if (this.checkForBlockages(!this.closed, character, map, game, [])) {
                    let key:A4Object = this.canOpenKey(character, game);
                    // change all the doors in the same doorgroup:
                    if (this.doorGroupID==null) {
                        this.changeStateRecursively(!this.closed, character, map, game);
                        if (this.consumeKey && key != null) {
                            character.removeFromInventory(key);
                            game.requestDeletion(key);
                        }
                        return true;
                    } else {
                        if (game.checkIfDoorGroupStateCanBeChanged(this.doorGroupID, this.closed, character)) {
                            this.changeStateRecursively(!this.closed, character, map, game);
                            game.setDoorGroupState(this.doorGroupID, this.closed, character);
                            if (this.consumeKey && key != null) {
                                character.removeFromInventory(key);
                                game.requestDeletion(key);
                                return true;
                            }
                        }
                    }
                }                
            }
        }

        return retval;
    }


    eventWithID(a_event:number, ID:string, character:A4Character, map:A4Map, game:A4Game)
    {
        super.eventWithID(a_event,ID,character,map,game);

        if ((a_event == A4_EVENT_OPEN ||
             a_event == A4_EVENT_CLOSE) && this.doorID == ID) {
            if (this.eventScripts[a_event]!=null) {
                for(let rule of this.eventScripts[a_event]) {
                    rule.executeEffects(this, map, game, character);
                }
            }

            this.closed = (this.closed ? false:true);
            if (this.closed) {
                this.currentAnimation = A4_ANIMATION_CLOSED;
                this.event(A4_EVENT_CLOSE,character,map,game);
            } else {
                this.currentAnimation = A4_ANIMATION_OPEN;
                this.event(A4_EVENT_OPEN,character,map,game);
            }
            if (this.animations[this.currentAnimation]!=null) this.animations[this.currentAnimation].reset();

//            if (character!=null) {
//            map.reevaluateVisibilityRequest();
//            }
        }
    }

  
    isDoor() : boolean
    {
        return true;
    }
  

    changeStateRecursively(closed:boolean, character:A4Character, map:A4Map, game:A4Game)
    {
        if (this.closed==closed) return;

        this.eventWithID(A4_EVENT_OPEN, this.doorID, character, map, game);
    }


    checkForBlockages(closed:boolean, character:A4Character, map:A4Map, game:A4Game, alreadyVisited:A4Door[]) : boolean
    {
        if (closed) {
            for(let d of alreadyVisited) {
                if (this == d) return true;
            }
            alreadyVisited.push(this);
            
            // closing the doors:
            let blockage:boolean = false;
            let l:A4Object[] = this.map.getAllObjectCollisions(this);
            for(let caught of l) {
                if (caught.isCharacter()) {
                    blockage = true;
                } else if (caught.isVehicle()) {
                    blockage = true;
                }
            }
            
            return !blockage;
        } else {
            // opening the doors:
            return true;
        }
    }


    getPixelWidth() : number
    {
        if (this.pixel_width_cache_cycle == this.cycle) return this.pixel_width_cache;
        let dx1:number = (this.animations[A4_ANIMATION_CLOSED]==null ? 0:this.animations[A4_ANIMATION_CLOSED].getPixelWidth());
        let dy1:number = (this.animations[A4_ANIMATION_CLOSED]==null ? 0:this.animations[A4_ANIMATION_CLOSED].getPixelHeight() - this.pixel_tallness);
        let dx2:number = (this.animations[A4_ANIMATION_OPEN]==null ? 0:this.animations[A4_ANIMATION_OPEN].getPixelWidth());
        let dy2:number = (this.animations[A4_ANIMATION_OPEN]==null ? 0:this.animations[A4_ANIMATION_OPEN].getPixelHeight() - this.pixel_tallness);
        let dx:number = (dx1>dx2 ? dx1:dx2);
        let dy:number = (dy1>dy2 ? dy1:dy2);
        this.pixel_width_cache = dx;
        this.pixel_height_cache = dy;
        this.pixel_width_cache_cycle = this.cycle;
        return this.pixel_width_cache;
    }


    getPixelHeight() : number
    {
        if (this.pixel_width_cache_cycle == this.cycle) return this.pixel_height_cache;
        let dx1:number = (this.animations[A4_ANIMATION_CLOSED]==null ? 0:this.animations[A4_ANIMATION_CLOSED].getPixelWidth());
        let dy1:number = (this.animations[A4_ANIMATION_CLOSED]==null ? 0:this.animations[A4_ANIMATION_CLOSED].getPixelHeight() - this.pixel_tallness);
        let dx2:number = (this.animations[A4_ANIMATION_OPEN]==null ? 0:this.animations[A4_ANIMATION_OPEN].getPixelWidth());
        let dy2:number = (this.animations[A4_ANIMATION_OPEN]==null ? 0:this.animations[A4_ANIMATION_OPEN].getPixelHeight() - this.pixel_tallness);
        let dx:number = (dx1>dx2 ? dx1:dx2);
        let dy:number = (dy1>dy2 ? dy1:dy2);
        this.pixel_width_cache = dx;
        this.pixel_height_cache = dy;
        this.pixel_width_cache_cycle = this.cycle;
        return this.pixel_height_cache;
    }


	doorID:string;
    doorGroupID:string = null;
	closed:boolean = true;
    consumeKey:boolean = true;
    automatic:boolean = false;
    automaticTimmer:number = 0;
    canBeOpen:boolean = true;
}
