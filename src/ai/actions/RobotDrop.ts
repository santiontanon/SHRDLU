class RobotDrop_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.drop"))) return true;
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

		let itemID:string = null
		let locationID:string = null;

		if (intention.attributes.length == 2 && 
			(intention.attributes[0] instanceof ConstantTermAttribute) &&
			(intention.attributes[1] instanceof ConstantTermAttribute)) {
			itemID = (<ConstantTermAttribute>(intention.attributes[1])).value;
		}
		if (intention.attributes.length == 3 && 
			(intention.attributes[0] instanceof ConstantTermAttribute) &&
			(intention.attributes[1] instanceof ConstantTermAttribute) &&
			(intention.attributes[2] instanceof ConstantTermAttribute)) {
			itemID = (<ConstantTermAttribute>(intention.attributes[1])).value;
			locationID = (<ConstantTermAttribute>(intention.attributes[2])).value;
		}
		if (intention.attributes.length == 3 && 
			(intention.attributes[0] instanceof ConstantTermAttribute) &&
			(intention.attributes[1] instanceof ConstantTermAttribute) &&
			(intention.attributes[2] instanceof VariableTermAttribute) &&
			intention.attributes[2].sort.is_a(ai.o.getSort("space.here"))) {
			itemID = (<ConstantTermAttribute>(intention.attributes[1])).value;
		}

		if (itemID == null) {
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}

		let item:A4Object = null;
		for(let o of ai.robot.inventory) {
			if (o.ID == itemID) {
				item = o;
				break;
			}
		}
		if (item == null) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				let cause:Term = Term.fromString("#not(verb.have('"+ai.selfID+"'[#id], '"+itemID+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
			}
			return true;
		}

		if (locationID == null) {
			// just drop the object:
	        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
	        let s:A4Script = null
	    	s = new A4Script(A4_SCRIPT_DROP, itemID, null, 0, false, false);
	        q.scripts.push(s);
			ai.currentAction_scriptQueue = q;
			ai.currentActionHandler = null;
			ai.currentAction = intention;
			ai.currentAction_requester = requester;
			ai.addLongTermTerm(new Term(intention.functor,
										[new ConstantTermAttribute(ai.selfID,ai.cache_sort_id),
										 new TermTermAttribute(intention)]), PERCEPTION_PROVENANCE);
			ai.intentionsCausedByRequest.push(ir);
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}

		} else {
			let targetLocation:AILocation = ai.game.getAILocationByID(locationID);
			let destinationMap:A4Map = null;
			let destinationX:number;
			let destinationY:number;
			if (targetLocation == null) {
				// check if it's an object, and redirect to put-in!
				let containerObjectL:A4Object[] = ai.game.findObjectByID(locationID);
				if (containerObjectL != null && containerObjectL.length > 0) {
					let term2:Term = intention.clone([]);
					term2.functor = ai.o.getSort("action.put-in");
					ai.intentions.push(new IntentionRecord(term2, null, null, null, ai.time_in_seconds));
					return true;
				}
			} else {
				let tmp2:[number,number] = targetLocation.centerWalkableCoordinatesInMap(ai.robot.map, ai.robot);
				if (tmp2 != null) {
					destinationMap = ai.robot.map;
					destinationX = tmp2[0];
					destinationY = tmp2[1];
				} else {
					if (targetLocation.maps.length > 0 && 
						targetLocation.maps.indexOf(ai.robot.map) == -1) {
						// we set this so that we can later give the proper reason for why we cannot go
						destinationMap = targetLocation.maps[0];
					}
				}
			}

			// Check if the robot can go:
			let cannotGoCause:Term = ai.canGoTo(destinationMap, locationID, requester);
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

			if (destinationMap == null) {
				if (requester != null) {
					let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
					let cause:Term = Term.fromString("#not(verb.know('"+ai.selfID+"'[#id], #and(the(P:'path'[path], N:[singular]), noun(P, N))))", ai.o);
					let term:Term = Term.fromString(tmp, ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
				}
				return true;
			}

			// go to destination:
	        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
	        let s:A4Script = null
	        s = new A4Script(A4_SCRIPT_GOTO_OPENING_DOORS, destinationMap.name, null, 0, false, false);
	        s.x = destinationX;
	        s.y = destinationY;
	        q.scripts.push(s);
	        s = new A4Script(A4_SCRIPT_DROP, itemID, null, 0, false, false);
	        q.scripts.push(s);
			ai.currentAction_scriptQueue = q;
			ai.currentActionHandler = null;
			ai.currentAction = intention;
			ai.currentAction_requester = requester;
			ai.addLongTermTerm(new Term(intention.functor,
										[new ConstantTermAttribute(ai.selfID,ai.cache_sort_id),
										 new TermTermAttribute(intention)]), PERCEPTION_PROVENANCE);
			ai.intentionsCausedByRequest.push(ir);
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}

		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"RobotDrop_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new RobotDrop_IntentionAction();
	}
}
