class QwertyAI extends RobotAI {
	constructor(o:Ontology, nlp:NLParser, qwerty:A4AICharacter, game:A4Game,
				rulesFileNames:string[])
	{
		super(o, nlp, qwerty, game, rulesFileNames);
		console.log("QwertyAI.constructor end...");
		this.robot.ID = "qwerty";
		this.selfID = "qwerty";

		this.addLongTermTerm(Term.fromString("name('"+this.robot.ID+"'[#id],'qwerty'[symbol])", this.o), BACKGROUND_PROVENANCE);

		this.objectsNotAllowedToGive.push("garage-key");
		this.objectsNotAllowedToGive.push("master-key1");
		// this.objectsNotAllowedToGive.push("science-key");
		this.objectsNotAllowedToGive.push("command-key");
		this.objectsNotAllowedToGive.push("stasis-key");

		console.log("QwertyAI.constructor end...");
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
				if (thingToRepair_id == "spacesuit") {
					let thingToRepairObject:A4Object = this.game.findObjectByIDJustObject(thingToRepair_id);
					if (thingToRepairObject.sort.name == "brokenspacesuit") {
						// broken space suit:
						return 1;
					}
				} else if (thingToRepair_id == "shuttle-datapad") {
					return 1;
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
			// just ignore, the story script will take charge of making qwerty do the repair...
            this.currentAction_scriptQueue = null;
            this.currentAction = null;
            this.currentAction_requester = null;

			return true;
		}

		return super.executeIntention(ir);
	}		


}
