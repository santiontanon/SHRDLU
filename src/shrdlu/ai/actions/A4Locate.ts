class A4Locate_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.locate"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:A4RuleBasedAI = <A4RuleBasedAI>ai_raw;
		let requester:TermAttribute = ir.requester;
		let alternative_actions:Term[] = ir.alternative_actions;
		if (alternative_actions == null) alternative_actions = [ir.action];
		let denyrequestCause:Term = null;

		for(let intention of alternative_actions) {
			let targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;

			// Check if it's an object:
			let targetObjectL:A4Object[] = ai.game.findObjectByID(targetID);
			if (targetObjectL == null) {
				denyrequestCause = Term.fromString("#not(verb.see('"+ai.selfID+"'[#id], '"+targetID+"'[#id]))", ai.o);
				continue;
			}
			this.targetObject = targetID;

			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));

			// If the object was not mentioned explicitly in the performative, add it to the natural language context:
			if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(targetID, ai.o);
			return true;
		}

		let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
		if (denyrequestCause == null) {
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
		} else {
			ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(denyrequestCause, null, ai.time_in_seconds), ai.time_in_seconds));
		}
		return true;		
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		let str = "<IntentionAction type=\"A4Locate_IntentionAction\"";
		if (this.targetObject == null) {
			return str + "/>";
		} else {
			return str + " targetObject=\""+this.targetObject+"\"/>";
		}
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		let a:A4Locate_IntentionAction = new A4Locate_IntentionAction();
		if (xml.getAttribute("targetObject") != null) {
			a.targetObject = xml.getAttribute("targetObject");
		}
		return a;
	}

	targetObject:string = null;

}
