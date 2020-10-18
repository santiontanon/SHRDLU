class EtaoinReboot_IntentionAction extends IntentionAction {


	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.reboot")) &&
			(intention.attributes.length == 1 ||
			 intention.attributes.length == 2)) return true;
		return false;
	}

	
	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:EtaoinAI = <EtaoinAI>ai_raw;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		if (intention.attributes.length == 1) {
			// Reset the AI variables:
			for(let c of ai.contexts) c.reset();
			ai.intentions = [];
			ai.queuedIntentions = [];
			ai.intentionsCausedByRequest = [];
			ai.currentInferenceProcess = null;
			ai.queuedInferenceProcesses = [];
			ai.respondToPerformatives = true;
			ai.terminateConversationAfterThisPerformative = false;
			ai.currentEpisodeTerms = [];
			ai.oxygen_message_timer = 0;

			app.achievement_nlp_all_etaoin_actions[6] = true;
			app.trigger_achievement_complete_alert();

			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
				ai.queueIntention(term, requester, null);
			}

			return true;
		} else if (intention.attributes.length == 2 &&
				   intention.attributes[1] instanceof ConstantTermAttribute) {
			let target:string = (<ConstantTermAttribute>intention.attributes[1]).value;
			if (target == "shrdlu") {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
				let term2:Term = new Term(ai.o.getSort("verb.reboot"),[intention.attributes[0]]);
				ai.game.shrdluAI.queueIntention(term2, null, null);
				return true;
			} else if (target == "qwerty") {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
				let term2:Term = new Term(ai.o.getSort("verb.reboot"),[intention.attributes[0]]);
				ai.game.qwertyAI.queueIntention(term2, null, null);
				return true;
			} else if (target == "etaoin") {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
				let term2:Term = new Term(ai.o.getSort("verb.reboot"),[intention.attributes[0]]);
				ai.queueIntention(term2, null, null);
				return true;
			}
		}

		if (requester != null) {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
		}
		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"EtaoinReboot_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		let a:EtaoinReboot_IntentionAction = new EtaoinReboot_IntentionAction();
		return a;
	}

}
