class RobotStop_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.stop"))) return true;
		return false;
	}

	
	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		var ai:RobotAI = <RobotAI>ai_raw;
		var intention:Term = ir.action;
		var requester:TermAttribute = ir.requester;

		if (intention.attributes.length==1) {
			if (requester != null) {
				var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
				var term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			ai.currentAction_scriptQueue = null;
			ai.currentAction = null;
			ai.currentActionHandler = null;
			ai.currentAction_requester = null;
			ai.addLongTermTerm(Term.fromString("verb.do('"+ai.selfID+"'[#id], 'nothing'[nothing])", ai.o), PERCEPTION_PROVENANCE);
		} else if (intention.attributes.length == 2 &&
				   (intention.attributes[1] instanceof VariableTermAttribute) &&
			 		(intention.attributes[1].sort.is_a(ai.o.getSort("space.here")) ||
			 		 intention.attributes[1].sort.is_a(ai.o.getSort("space.there")))) {
			if (requester != null) {
				var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
				var term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			ai.currentAction_scriptQueue = null;
			ai.currentAction = null;
			ai.currentActionHandler = null;
			ai.currentAction_requester = null;
			ai.addLongTermTerm(Term.fromString("verb.do('"+ai.selfID+"'[#id], 'nothing'[nothing])", ai.o), PERCEPTION_PROVENANCE);
		} else {
			if (requester != null) {
				var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				var term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"RobotStop_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new RobotStop_IntentionAction();
	}
}
