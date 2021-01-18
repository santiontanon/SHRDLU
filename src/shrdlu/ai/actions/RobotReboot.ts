class RobotReboot_IntentionAction extends IntentionAction {


	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.reboot")) &&
			intention.attributes.length == 1) return true;
		return false;
	}

	
	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		this.ir = ir;		
		let ai:RobotAI = <RobotAI>ai_raw;
		let requester:TermAttribute = ir.requester;

		// Reset the AI variables:
		for(let c of ai.contexts) c.reset();
		ai.intentions = [];
		ai.queuedIntentions = [];
		ai.intentionsCausedByRequest = [];
		ai.currentInferenceProcess = null;
		ai.queuedInferenceProcesses = [];
		ai.respondToPerformatives = true;
		ai.terminateConversationAfterThisPerformative = false;
		ai.clearCurrentAction();

		app.achievement_nlp_all_robot_actions[14] = true;
		app.trigger_achievement_complete_alert();

		if (requester != null) {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
			ai.queueIntention(term, requester, null);
		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"RobotReboot_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		let a:RobotReboot_IntentionAction = new RobotReboot_IntentionAction();
		return a;
	}

}
