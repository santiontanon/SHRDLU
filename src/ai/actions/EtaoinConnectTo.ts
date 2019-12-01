class EtaoinConnectTo_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.connect-to")) &&
			intention.attributes.length == 3 &&
			(intention.attributes[1] instanceof ConstantTermAttribute) &&
			(intention.attributes[2] instanceof ConstantTermAttribute)) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:EtaoinAI = <EtaoinAI>ai_raw;
		let game:A4Game = ai.game;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		// execute the memorize action:
		console.log(ai.selfID + " connect to: " + intention);	

		let target:string = (<ConstantTermAttribute>intention.attributes[2]).value;
		if (target == "etaoin") {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #and(#and(X:verb.can("+requester+", #and(Y:action.talk("+requester+"), relation.target(Y, '"+target+"'[#id]))), relation.tool(X, 'communicator'[#id]), time.now(X)))))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
		} else {
			let targetObject:A4Object = game.findObjectByIDJustObject(target);
			if (targetObject != null &&
				ai.withinEtaoinViewRange(targetObject)) {
				// Etaoin can see the target:
				if (target == "qwerty" ||
					target == "shrdlu") {

					game.communicatorConnectedTo = target;
					game.communicatorConnectionTime = ai.time_in_seconds;
				
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #and(#and(X:verb.can("+requester+", #and(Y:action.talk("+requester+"), relation.target(Y, '"+target+"'[#id]))), relation.tool(X, 'communicator'[#id]), time.now(X)))))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));

		        	app.achievement_nlp_all_etaoin_actions[0] = true;
		        	app.trigger_achievement_complete_alert();
				} else {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					let cause:Term = Term.fromString("#not(verb.can('"+target+"'[#id], action.talk('"+target+"'[#id])))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
				}
			} else {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				let cause:Term = Term.fromString("#not(verb.see('"+ai.selfID+"'[#id],'"+target+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
			}
		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"EtaoinConnectTo_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new EtaoinConnectTo_IntentionAction();
	}
}

