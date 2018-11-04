class Help_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.help")) &&
			intention.attributes.length == 2) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		// execute the memorize action:
		console.log(ai.selfID + " help: " + intention);	

		let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.q.how("+requester+", verb.help('"+ai.selfID+"'[#id],"+intention.attributes[1]+")))", ai.o);
		ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"Help_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new Help_IntentionAction();
	}
}

