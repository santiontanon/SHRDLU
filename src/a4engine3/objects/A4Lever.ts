class A4Lever extends A4Object {

	constructor(sort:Sort, ID:string, state:boolean, a_closed:A4Animation, a_open:A4Animation)
	{
		super("lever", sort);
		this.leverID = ID;
		this.leverState = state;
		this.animations[A4_ANIMATION_CLOSED] = a_closed;
		this.animations[A4_ANIMATION_OPEN] = a_open;
		if (this.leverState) this.currentAnimation = A4_ANIMATION_CLOSED;
	                    else this.currentAnimation = A4_ANIMATION_OPEN;
		this.usable = true;
	}


    loadObjectAttribute(attribute_xml:Element) : boolean
    {
        if (super.loadObjectAttribute(attribute_xml)) return true;
        var a_name:string = attribute_xml.getAttribute("name");
	    
	    if (a_name == "leverID") {
	        this.leverID = attribute_xml.getAttribute("value");
	        return true;
	    } else if (a_name == "leverState") {
	    	this.leverState = false;
	        if (attribute_xml.getAttribute("value") == "true") this.leverState = true;
	        if (this.leverState) this.currentAnimation = A4_ANIMATION_CLOSED;
	                        else this.currentAnimation = A4_ANIMATION_OPEN;
	        return true;
	    }
        return false;
	}


    savePropertiesToXML(game:A4Game) : string
    {
        var xmlString:string = super.savePropertiesToXML(game);

        xmlString += this.saveObjectAttributeToXML("leverID",this.leverID) + "\n";
        xmlString += this.saveObjectAttributeToXML("leverState",this.leverState) + "\n";

        return xmlString;
    }


	event(event_type:number, character:A4Character, map:A4Map, game:A4Game): boolean
	{
		let retval:boolean = super.event(event_type, character, map, game);
		if (event_type == A4_EVENT_USE) {
	        var s:A4Script = new A4Script(A4_SCRIPT_OPENDOORS, this.leverID, null, 0, false, false);
	        s.execute(this, map, game, character);
	        
			this.leverState = (this.leverState ? false:true);
			if (this.leverState) {
				this.event(A4_EVENT_ACTIVATE, character, this.map, game);
			} else {
				this.event(A4_EVENT_DEACTIVATE, character, this.map, game);
			}
			if (this.leverState) this.currentAnimation = A4_ANIMATION_CLOSED;
	                        else this.currentAnimation = A4_ANIMATION_OPEN;
	        return true;
		}	
		return retval;
	}



	leverID:string;
	leverState:boolean;
}