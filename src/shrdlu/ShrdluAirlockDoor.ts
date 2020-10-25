class ShrdluAirlockDoor extends A4Obstacle {

    constructor(name:string, sort:Sort)
    {
        super(name, sort);
        this.interacteable = true;

    }

  
    loadObjectAttribute(attribute_xml:Element) : boolean
    {
        if (super.loadObjectAttribute(attribute_xml)) return true;
        let a_name:string = attribute_xml.getAttribute("name");

        if (a_name == "otherDoorID") {
            this.otherDoorID = attribute_xml.getAttribute("value");
            if (this.otherDoorID == "null") this.otherDoorID = null;
            return true;
        } else if (a_name == "requireSuit") {
	        this.requireSuit = false;
	        if (attribute_xml.getAttribute("value") == "true") this.requireSuit = true;
	        return true;
        } else if (a_name == "targetMap") {
            this.targetMap = attribute_xml.getAttribute("value");
            return true;
        } else if (a_name == "targetX") {
            this.targetX = Number(attribute_xml.getAttribute("value"));
            return true;
        } else if (a_name == "targetY") {
            this.targetY = Number(attribute_xml.getAttribute("value"));
            return true;
        }
        return false;
    }


    savePropertiesToXML(game:A4Game) : string
    {
        let xmlString:string = super.savePropertiesToXML(game);

        if (this.otherDoorID != null) xmlString += this.saveObjectAttributeToXML("otherDoorID",this.otherDoorID) + "\n";
        xmlString += this.saveObjectAttributeToXML("requireSuit",this.requireSuit) + "\n";
        xmlString += this.saveObjectAttributeToXML("targetMap",this.targetMap) + "\n";
        xmlString += this.saveObjectAttributeToXML("targetX",this.targetX) + "\n";
        xmlString += this.saveObjectAttributeToXML("targetY",this.targetY) + "\n";

        return xmlString;
    }
    

    isEquipable() : boolean
    {
        return true;
    }


    event(event_type:number, character:A4Character, map:A4Map, game:A4Game): boolean
    {
        let retval:boolean = super.event(event_type, character, map, game);
        if (event_type == A4_EVENT_INTERACT) {
            if (this.otherDoorID != null) {
                let otherdoor:A4Door = <A4Door>game.findObjectByIDJustObject(this.otherDoorID);

                if (!otherdoor.closed) {
                    let script:A4Script = new A4Script(A4_SCRIPT_TALK, null, "I need to close the other airlock door first", 0, true, true);
                    character.pushScripttoExecute(script, map, game, null);
                    return false;
                }
            }

            if (this.requireSuit) {
                let suit:string = game.getStoryStateVariable("spacesuit");
                if (suit != "helmet") {
                    let script:A4Script = new A4Script(A4_SCRIPT_TALK, null, "I cannot go through the airlock without a spacesuit!", 0, true, true);
                    character.pushScripttoExecute(script, map, game, null);
                    return false;
                }
            }

            // go to the target destination:
            let targetMap:A4Map = game.getMap(this.targetMap);
            if (targetMap != null) {
                game.requestWarp(character, targetMap, this.targetX, this.targetY);
            }
            return true;
        }

        return retval;
    }


    otherDoorID:string = null;
    requireSuit:boolean = false;
    targetMap:string = null;
    targetX:number = -1;
    targetY:number = -1;
};
