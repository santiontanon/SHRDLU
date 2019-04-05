class EtaoinSwitchOff_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.switch-off"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:EtaoinAI = <EtaoinAI>ai_raw;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		let targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
		let light:A4Object = ai.game.findObjectByIDJustObject(targetID);
		if (light.sort.is_a(ai.o.getSort("light"))) {
			let room:AILocation = ai.game.getAILocation(light);
			if (ai.game.turnLightOff(room.id)) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				// add a causation record:
				let causetext:string = "relation.cause(powered.state('"+targetID+"'[#id], 'powered.off'[powered.off]), verb.switch-off('"+ai.selfID+"'[#id], '"+targetID+"'[#id]))";
				let causeTerm:Term = Term.fromString(causetext, ai.o);
				ai.addLongTermTerm(causeTerm, PERCEPTION_PROVENANCE);
			} else {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					let cause:Term = Term.fromString("powered.state('"+targetID+"'[#id], 'powered.off'[powered.off])", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
				}
			}
		} else {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				let cause:Term = Term.fromString("#not(light('"+targetID+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
			}
		}
		
		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"EtaoinSwitchOff_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new EtaoinSwitchOff_IntentionAction();
	}
}
