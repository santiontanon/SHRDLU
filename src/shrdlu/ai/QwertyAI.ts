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


	canSatisfyActionRequest(ir:IntentionRecord) : number
	{
		let actionRequest:Term = ir.action;
		let repairSort:Sort = this.o.getSort("verb.repair");
		if (actionRequest.functor.is_a(repairSort) && actionRequest.attributes.length>=2) {
			let thingToRepair:TermAttribute = actionRequest.attributes[1];
			if (thingToRepair instanceof ConstantTermAttribute) {
				let thingToRepair_id:string = (<ConstantTermAttribute>thingToRepair).value;
				if (thingToRepair_id == "spacesuit") {
					let thingToRepairObject:A4Object = this.game.findObjectByIDJustObject(thingToRepair_id);
					if (thingToRepairObject.sort.name == "brokenspacesuit") {
						// broken space suit:
						app.achievement_nlp_all_robot_actions[11] = true;
						app.trigger_achievement_complete_alert();

						return ACTION_REQUEST_CAN_BE_SATISFIED;
					}
				} else if (thingToRepair_id == "shuttle-datapad") {
					app.achievement_nlp_all_robot_actions[11] = true;
					app.trigger_achievement_complete_alert();

					return ACTION_REQUEST_CAN_BE_SATISFIED;
				}
			} else {
				return ACTION_REQUEST_CANNOT_BE_SATISFIED;
			}
		}
		
		return super.canSatisfyActionRequest(ir);
	}


	executeIntention(ir:IntentionRecord) : boolean
	{
		let intention:Term = ir.action;
		let repairSort:Sort = this.o.getSort("verb.repair");
		if (intention.functor.is_a(repairSort)) {
			// just ignore, the story script will take charge of making qwerty do the repair...
			this.clearCurrentAction();

			return true;
		}

		return super.executeIntention(ir);
	}		


	/*
	- If it returns "null", it means the robot can go
	- If it returns a Term, it means the robot cannot go, for the reason specified in the Term (e.g., not allowed)
	*/
	canGoTo(map:A4Map, locationID:string, requester:TermAttribute) : Term
	{
		if (map != this.robot.map) {
			let cause:Term = Term.fromString("#not(verb.can(ME:'"+this.selfID+"'[#id], verb.go(ME, [space.outside])))", this.o);
			return cause;
		}
		return super.canGoTo(map, locationID, requester);
	}


}
