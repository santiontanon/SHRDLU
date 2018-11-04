
var TRIGGER_PRESSURE_ITEM:number = 1;
var TRIGGER_PRESSURE_HEAVY_ITEM:number = 2;
var TRIGGER_PRESSURE_PLAYER:number = 3;


class A4PressurePlate extends A4Object {

	constructor(sort:Sort, pressed:A4Animation, released:A4Animation, pr:number)
	{
		super("pressure-plate", sort);
		this.animations[A4_ANIMATION_CLOSED] = pressed;
		this.animations[A4_ANIMATION_OPEN] = released;
		this.pressureRequired = pr;
		if (this.pressurePlateState) this.currentAnimation = A4_ANIMATION_CLOSED;
	                            else this.currentAnimation = A4_ANIMATION_OPEN;

	}


    loadObjectAttribute(attribute_xml:Element) : boolean
    {
        if (super.loadObjectAttribute(attribute_xml)) return true;
        var a_name:string = attribute_xml.getAttribute("name");

	    if (a_name == "pressurePlateState") {
	        this.pressurePlateState = false;
	        if (attribute_xml.getAttribute("value") == "true") this.pressurePlateState = true;
	        return true;
	    } else if (a_name == "pressureRequired") {
	        this.pressureRequired = Number(attribute_xml.getAttribute("value"));
	        return true;
        }

        return false;
    }


    savePropertiesToXML(game:A4Game) : string
    {
        var xmlString:string = super.savePropertiesToXML(game);

        xmlString += this.saveObjectAttributeToXML("pressureRequired",this.pressureRequired) + "\n";
        xmlString += this.saveObjectAttributeToXML("pressurePlateState",this.pressurePlateState) + "\n";

        return xmlString;
    }


	update(game:A4Game) : boolean
	{
		super.update(game);

		var l:A4Object[] = this.map.getAllObjectCollisions(this);
		var heaviest:A4Object = null;
		var pressure:number = 0;

		for(let o of l) {
			if (pressure<TRIGGER_PRESSURE_ITEM) {
				pressure = TRIGGER_PRESSURE_ITEM;	// if there is an object, at least there is pressure 1
				heaviest = o;
			}
			if (pressure<TRIGGER_PRESSURE_HEAVY_ITEM && o.isHeavy()) {
				pressure = TRIGGER_PRESSURE_HEAVY_ITEM;
				heaviest = o;
			}
			if (pressure<TRIGGER_PRESSURE_PLAYER && o.isPlayer()) {
				pressure = TRIGGER_PRESSURE_PLAYER;
				heaviest = o;
			}
		}

		if (this.pressurePlateState) {
			if (pressure>=this.pressureRequired) {
				// nothing to do, keep pressed
			} else {
				// release
				this.pressurePlateState = false;
				this.event(A4_EVENT_DEACTIVATE, null, this.map, game);
				this.event(A4_EVENT_USE, null, this.map, game);
			    this.currentAnimation = A4_ANIMATION_OPEN;	
			}
		} else {
			if (heaviest!=null && pressure>=this.pressureRequired) {
				// press!
				this.pressurePlateState = true;
				if (heaviest.isPlayer()) {
					this.event(A4_EVENT_ACTIVATE, <A4Character>heaviest, this.map, game);
					this.event(A4_EVENT_USE, <A4Character>heaviest, this.map, game);
				} else {
					this.event(A4_EVENT_ACTIVATE, null, this.map, game);
					this.event(A4_EVENT_USE, null, this.map, game);
				}
			    this.currentAnimation = A4_ANIMATION_CLOSED;	
			} else {
				// nothing to do, keep released
			}
		}

		return true;
	}

	pressurePlateState:boolean = false;
	pressureRequired:number;	// 0 : any item, 1: only heavy objects, characters/walls, 2: only players
}