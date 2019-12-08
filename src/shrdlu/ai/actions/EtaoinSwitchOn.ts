class EtaoinSwitchOn_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.switch-on"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		var ai:EtaoinAI = <EtaoinAI>ai_raw;
		var intention:Term = ir.action;
		var requester:TermAttribute = ir.requester;

		var targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
		var light:A4Object = ai.game.findObjectByIDJustObject(targetID);
		if (light.sort.is_a(ai.o.getSort("light"))) {
			var room:AILocation = ai.game.getAILocation(light);
			if (ai.game.turnLightOn(room.id)) {
				var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				// add a causation record:
				let causetext:string = "relation.cause(powered.state('"+targetID+"'[#id], 'powered.on'[powered.on]), verb.switch-on('"+ai.selfID+"'[#id], '"+targetID+"'[#id]))";
				let causeTerm:Term = Term.fromString(causetext, ai.o);
				ai.addLongTermTerm(causeTerm, PERCEPTION_PROVENANCE);

	        	app.achievement_nlp_all_etaoin_actions[3] = true;
	        	app.trigger_achievement_complete_alert();
			} else {
				if (requester != null) {
					var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					var cause:Term = Term.fromString("powered.state('"+targetID+"'[#id], 'powered.on'[powered.on])", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
				}
			}
		} else {
			if (requester != null) {
				var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				var cause:Term = Term.fromString("#not(light('"+targetID+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
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
