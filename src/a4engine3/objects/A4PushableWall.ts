class A4PushableWall extends A4Object {
	
	constructor(name:string, sort:Sort, a:A4Animation)
	{
		super(name, sort);
		this.animations[A4_ANIMATION_IDLE] = a;		
	}


	isWalkable() : boolean
	{
		return false;
	}


	isPushable() : boolean
	{
		return true;
	}


	event(a_event:number, character:A4Character, map:A4Map, game:A4Game)
	{
		super.event(a_event, character, map, game);

		if (a_event == A4_EVENT_PUSH && 
			character.canMoveIgnoringObject(character.direction, true, this) &&
			this.canMoveIgnoringObject(character.direction, true, character)) {
			var d:number = character.direction;
			this.x += direction_x_inc[d]*map.tileWidth;
			this.y += direction_y_inc[d]*map.tileHeight;
	        if (character != null) map.reevaluateVisibilityRequest();
		}
	}


    loadObjectAttribute(attribute_xml:Element) : boolean
    {
        if (super.loadObjectAttribute(attribute_xml)) return true;
        var a_name:string = attribute_xml.getAttribute("name");

        if (a_name == "weight") {
            this.weight = Number(attribute_xml.getAttribute("value"));
            return true;
        }

        return false;
    }


    savePropertiesToXML(game:A4Game) : string
    {
        var xmlString:string = super.savePropertiesToXML(game);

        xmlString += this.saveObjectAttributeToXML("weight",this.weight) + "\n";

        return xmlString;
    }


    weight:number = 1;
}
