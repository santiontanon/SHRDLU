class ShrdluAI extends RobotAI {
	constructor(o:Ontology, nlp:NLParser, shrdlu:A4AICharacter, game:A4Game,
				rulesFileNames:string[])
	{
		super(o, nlp, shrdlu, game, rulesFileNames);
		console.log("ShrdluAI.constructor end...");
		this.robot.ID = "shrdlu";
		this.selfID = "shrdlu";
		this.visionActive = false;

		this.addLongTermTerm(Term.fromString("name('"+this.robot.ID+"'[#id],'shrdlu'[symbol])", this.o), BACKGROUND_PROVENANCE);
		
		this.objectsNotAllowedToGive.push("master-key2");

		console.log("ShrdluAI.constructor end...");
	}


	/*
	return values:
	0: request cannot be satisfied
	1: request can be satisfied
	2: request can be satisfied, but will be handled externally, so, we do not need to do anything
	*/
	canSatisfyActionRequest(actionRequest:Term) : number
	{
		let repairSort:Sort = this.o.getSort("verb.repair");
		if (actionRequest.functor.is_a(repairSort) && actionRequest.attributes.length>=2) {
			let thingToRepair:TermAttribute = actionRequest.attributes[1];
			if (thingToRepair instanceof ConstantTermAttribute) {
				let thingToRepair_id:string = (<ConstantTermAttribute>thingToRepair).value;
				if (thingToRepair_id == "garage-shuttle") {
					let thingToRepairObject:A4Object = this.game.findObjectByIDJustObject(thingToRepair_id);
					if (thingToRepairObject.sort.name == "brokenshuttle") {
						// broken shuttle:
						return 1;
					}
				}
			} else {
				return 0;
			}
		}
		
		return super.canSatisfyActionRequest(actionRequest);
	}


	executeIntention(ir:IntentionRecord) : boolean
	{
		let intention:Term = ir.action;
		let repairSort:Sort = this.o.getSort("verb.repair");
		if (intention.functor.is_a(repairSort)) {
			// just ignore, the story script will take charge of making shrdlu do the repair...
            this.currentAction_scriptQueue = null;
            this.currentAction = null;
            this.currentAction_requester = null;
            this.currentActionHandler = null;
			return true;
		}

		return super.executeIntention(ir);
	}		


	/*
	- If it returns "null", it means the robot can go
	- If it returns a Term, it means the robot cannot go, for the reason specified in the Term (e.g., not allowed)
	*/
	canGoTo(map:A4Map, locationID:string) : Term
	{
		if ((this.robot.map.name == "Aurora Station" || this.robot.map.name == "Aurora Station Outdoors") &&
			map.name != "Aurora Station" &&
			map.name != "Aurora Station Outdoors") {
			if (this.game.getStoryStateVariable("permission-to-take-shrdlu") == "false") {
				let cause:Term = Term.fromString("verb.need('"+this.selfID+"'[#id], #and(X:[permission-to], relation.origin(X, 'etaoin'[#id])))", this.o);
				return cause;
			}
		}
		return super.canGoTo(map, locationID);
	}

}
