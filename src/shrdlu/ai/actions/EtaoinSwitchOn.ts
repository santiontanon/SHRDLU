class EtaoinSwitchOn_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.switch-on"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:EtaoinAI = <EtaoinAI>ai_raw;
		let requester:TermAttribute = ir.requester;
		let alternative_actions:Term[] = ir.alternative_actions;
		if (alternative_actions == null) alternative_actions = [ir.action];
		let denyrequestCause:Term = null;
		let anyTurnedOn:boolean = false;
		let numberConstraint:number = ir.resolveNumberConstraint(ir.numberConstraint, alternative_actions.length);

		for(let intention of alternative_actions) {
			let targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
			let light:A4Object = ai.game.findObjectByIDJustObject(targetID);
			if (light.sort.is_a(ai.o.getSort("light"))) {
				let room:AILocation = ai.game.getAILocation(light);
				if (ai.game.turnLightOn(room.id)) {
					anyTurnedOn = true;

					// If the object was not mentioned explicitly in the performative, add it to the natural language context:
					if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(light.ID, ai.o);
					
					// add a causation record:
					let causetext:string = "relation.cause(powered.state('"+targetID+"'[#id], 'powered.on'[powered.on]), verb.switch-on('"+ai.selfID+"'[#id], '"+targetID+"'[#id]))";
					let causeTerm:Term = Term.fromString(causetext, ai.o);
					ai.addLongTermTerm(causeTerm, PERCEPTION_PROVENANCE);

		        	app.achievement_nlp_all_etaoin_actions[3] = true;
		        	app.trigger_achievement_complete_alert();
		        	numberConstraint --;
		        	if (numberConstraint <= 0) break;
				} else {
					denyrequestCause = Term.fromString("powered.state('"+targetID+"'[#id], 'powered.on'[powered.on])", ai.o);
					continue;
				}
			} else {
				denyrequestCause = Term.fromString("#not(light('"+targetID+"'[#id]))", ai.o);
				continue;
			}
		}

		if (requester != null) {
			if (anyTurnedOn) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			} else {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				if (denyrequestCause == null) {
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				} else {
					ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(denyrequestCause, null, ai.timeStamp), ai.timeStamp));
				}
			}
		}
		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"EtaoinSwitchOn_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new EtaoinSwitchOn_IntentionAction();
	}
}
