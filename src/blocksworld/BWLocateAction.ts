class BWLocate_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.locate"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:BlocksWorldRuleBasedAI = <BlocksWorldRuleBasedAI>ai_raw;
		let world:ShrdluBlocksWorld = ai.world;
		let requester:TermAttribute = ir.requester;
		let alternative_actions:Term[] = ir.alternative_actions;
		if (alternative_actions == null) alternative_actions = [ir.action];
		let denyrequestCause:Term = null;

		for(let intention of alternative_actions) {
			let targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;

			// Check if it's an object:
			this.targetObject = world.getObject(targetID);
			if (this.targetObject == null) {
				denyrequestCause = Term.fromString("#not(verb.see('"+ai.selfID+"'[#id], '"+targetID+"'[#id]))", ai.o);
			}

			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));

			// If the object was not mentioned explicitly in the performative, add it to the natural language context:
			if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(targetID, ai.o);
			return true;
		}

		let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
		if (denyrequestCause == null) {
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
		} else {
			ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(denyrequestCause, null, ai.timeStamp), ai.timeStamp));
		}
		return true;		
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		let str = "<IntentionAction type=\"BWLocate_IntentionAction\"";
		if (this.targetObject == null) {
			return str + "/>";
		} else {
			return str + " targetObject=\""+this.targetObject.ID+"\"/>";
		}
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		let a:BWLocate_IntentionAction = new BWLocate_IntentionAction();
		if (xml.getAttribute("targetObject") != null) {
			let world:ShrdluBlocksWorld = (<BlocksWorldRuleBasedAI>ai).world;
			a.targetObject = world.getObject(xml.getAttribute("targetObject"));
		}
		return a;
	}

	targetObject:ShrdluBlock = null;

}
