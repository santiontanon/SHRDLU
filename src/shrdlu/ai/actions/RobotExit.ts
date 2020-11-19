class RobotExit_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.leave"))) {
			if (intention.attributes.length>=2 &&
				(intention.attributes[1] instanceof ConstantTermAttribute)) {
				//let id:string = (<ConstantTermAttribute>intention.attributes[1]).value;
				//let targetObject:A4Object = (<RobotAI>ai).game.findObjectByIDJustObject(id);
				//if (targetObject != null &&
				//	targetObject.map == (<RobotAI>ai).robot.map) {
					return true;
				//}
			}
			if (/*(<RobotAI>ai).robot.isInVehicle() && */
				intention.attributes.length == 1) {
				return true;
			}
		}
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:RobotAI = <RobotAI>ai_raw;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		if (!ai.robot.isInVehicle()) {
			if (intention.attributes.length == 1) {
				let term2:Term = new Term(ai.o.getSort("verb.go"), [intention.attributes[0], new VariableTermAttribute(ai.o.getSort("space.outside"), null)]);
				ai.intentions.push(new IntentionRecord(term2, requester, null, null, ai.timeStamp));
				return true;				
			} else if (intention.attributes.length == 2) {
				let term2:Term = new Term(ai.o.getSort("verb.go"), [intention.attributes[0], 
																	new TermTermAttribute(new Term(ai.o.getSort("space.outside.of"), 
																						  		   [intention.attributes[1]]))]);
				ai.intentions.push(new IntentionRecord(term2, requester, null, null, ai.timeStamp));
				return true;				
			} else {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				}
				return true;
			}
		}		

		if (ai.selfID == "shrdlu" && !ai.visionActive) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.request.action('player'[#id], verb.bring('player'[#id], 'shrdlu'[#id], 'location-aurora-station'[#id])))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
			return true;
		}

		if (intention.attributes.length==0 ||
			!(intention.attributes[0] instanceof ConstantTermAttribute)) {
			// we should never get here:
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
			return true;
		}

		if (intention.attributes.length == 1) {
			// just exit:
			ai.robot.disembark();
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
		} else if (intention.attributes.length >= 2 &&
				   (intention.attributes[1] instanceof ConstantTermAttribute)) {
			// make sure ID and vehicle match:
			let id:string = (<ConstantTermAttribute>intention.attributes[1]).value;
			if (ai.robot.vehicle.ID == id) {
				ai.robot.disembark();
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				}
			} else {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				}
				return true;
			}
			
		} else {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
			return true;
		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"RobotExit_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new RobotExit_IntentionAction();
	}
}
