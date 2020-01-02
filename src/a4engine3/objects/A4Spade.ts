class A4Spade extends A4Item {
	constructor(sort:Sort, a:A4Animation, gold:number)
	{
		super("Spade", sort);
		this.animations[A4_ANIMATION_IDLE] = a;
		this.gold = gold;
	    this.usable = true;
	}


	event(a_event:number, otherCharacter:A4Character, map:A4Map, game:A4Game): boolean
	{
		let retval:boolean = super.event(a_event, otherCharacter, map, game);
	    
	    if (a_event == A4_EVENT_USE) {
	        let o:A4Object = map.getBurrowedObject(otherCharacter.x, otherCharacter.y,
	                                              otherCharacter.getPixelWidth(), otherCharacter.getPixelHeight());
	        if (o==null) {
	            game.addMessage("Nothing to dig here...");
	        } else {
	            o.burrowed = false;
	            return true;
	        }
	    }

	    return retval;
	}
}