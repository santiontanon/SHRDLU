class RobotEnter_IntentionAction extends IntentionAction {


	constructor()
	{
		super();
		this.needsContinuousExecution = true;
	}


	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.enter"))) {
			if (intention.attributes.length>=2 &&
				(intention.attributes[1] instanceof ConstantTermAttribute)) {
				let id:string = (<ConstantTermAttribute>intention.attributes[1]).value;
				let targetObject:A4Object = (<RobotAI>ai).game.findObjectByIDJustObject(id);
				if (targetObject != null &&
					targetObject.map == (<RobotAI>ai).robot.map) {
					return true;
				}
			}
		}
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:RobotAI = <RobotAI>ai_raw;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		if (ai.robot.isInVehicle()) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}			

		if (intention.attributes.length==0 ||
			!(intention.attributes[0] instanceof ConstantTermAttribute)) {
			// we should never get here:
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}

		if (intention.attributes.length>=2 &&
			(intention.attributes[1] instanceof ConstantTermAttribute)) {
			let id:string = (<ConstantTermAttribute>intention.attributes[1]).value;
			this.targetObject = ai.game.findObjectByIDJustObject(id);
		}

		if (this.targetObject == null ||
			this.targetObject.map != ai.robot.map) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}

		// Check if the robot can go:
		let destinationMap:A4Map = this.targetObject.map;
		let destinationLocation:AILocation = ai.game.getAILocation(this.targetObject);
		let destinationLocationID:string = null;
		if (destinationLocation != null) destinationLocationID = destinationLocation.id;
		if (this.targetObject instanceof A4Vehicle) {
			// assume we are going to go far:
			destinationMap = ai.game.getMap("Spacer Valley South");
			destinationLocationID = "spacer-valley-south";
		}
		let cannotGoCause:Term = ai.canGoTo(destinationMap, destinationLocationID, requester);
		if (cannotGoCause != null) {
			if (requester != null) {
				// deny request:
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				let causeRecord:CauseRecord = new CauseRecord(cannotGoCause, null, ai.time_in_seconds)
				ai.intentions.push(new IntentionRecord(term, null, null, causeRecord, ai.time_in_seconds));

				// explain cause:
				term = new Term(ai.o.getSort("action.talk"), 
								[new ConstantTermAttribute(ai.selfID, ai.o.getSort("#id")),
								 new TermTermAttribute(new Term(ai.o.getSort("perf.inform"),
								 		  			   [requester, new TermTermAttribute(cannotGoCause)]))]);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}

		if (requester != null) {
			var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
		}

		ai.intentionsCausedByRequest.push(ir);
		ai.setNewAction(intention, requester, null, this);
		ai.addLongTermTerm(new Term(ai.o.getSort("verb.do"),
									  [new ConstantTermAttribute(ai.selfID,ai.cache_sort_id),
									   new TermTermAttribute(intention)]), PERCEPTION_PROVENANCE);

		return true;
	}


	executeContinuous(ai_raw:RuleBasedAI) : boolean
	{
		var ai:RobotAI = <RobotAI>ai_raw;
		var destinationMap:A4Map = this.targetObject.map;

		// if the targt is outside the map, we just wait
		if (destinationMap == null || destinationMap != ai.robot.map) return false;

		let distance:number = ai.robot.pixelDistance(this.targetObject);
		if (distance == 0) {
			// we made it!
			if (this.targetObject instanceof A4Vehicle) {
				ai.robot.embark(this.targetObject);
			} else {
				if (ai.currentAction_requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+ai.currentAction_requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
			}
			return true;
		} else {
			// go to destination:
	        var q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
	        var s:A4Script = new A4Script(A4_SCRIPT_GOTO_CHARACTER, this.targetObject.ID, null, 0, false, false);
	        q.scripts.push(s);
			ai.currentAction_scriptQueue = q;
		}

		return false;
	}	


	saveToXML(ai:RuleBasedAI) : string
	{
		let str = "<IntentionAction type=\"RobotEnter_IntentionAction\"";
		if (this.targetObject == null) {
			return str + "/>";
		} else {
			return str + " targetObject=\""+this.targetObject.ID+"\"/>";
		}
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		let a:RobotEnter_IntentionAction = new RobotEnter_IntentionAction();
		if (xml.getAttribute("targetObject") != null) {
			let game:A4Game = (<A4RuleBasedAI>ai).game;
			let o:A4Object = game.findObjectByIDJustObject(xml.getAttribute("targetObject"));
			a.targetObject = o;
		}
		return a;
	}


	targetObject:A4Object = null;
}
