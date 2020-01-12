class AnswerHearSee_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.hear")) ||
		    intention.functor.is_a(ai.o.getSort("verb.see"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		if (requester == null) return true;
		if (intention.attributes.length==2 &&
			(intention.attributes[0] instanceof ConstantTermAttribute) &&
			(<ConstantTermAttribute>(intention.attributes[0])).value == ai.selfID) {

			if (intention.attributes[1] instanceof ConstantTermAttribute) {
				// Case where the target is a constant:
				if (intention.functor.is_a(ai.o.getSort("verb.see"))) {
					if (ai.canSee((<ConstantTermAttribute>(intention.attributes[1])).value)) {
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'yes'[symbol]))", ai.o);
						ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.time_in_seconds));
					} else {
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'no'[symbol]))", ai.o);
						ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.time_in_seconds));
					}				
				} else if (intention.functor.is_a(ai.o.getSort("verb.hear"))) {
					if (ai.canHear((<ConstantTermAttribute>(intention.attributes[1])).value)) {
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'yes'[symbol]))", ai.o);
						ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.time_in_seconds));
					} else {
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'no'[symbol]))", ai.o);
						ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.time_in_seconds));
					}				
				} else {
					// we should never get here...
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'unknown'[symbol]))", ai.o);
					ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.time_in_seconds));
				}
			} else {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'unknown'[symbol]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.time_in_seconds));
			}
			
		} else {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'unknown'[symbol]))", ai.o);
			ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.time_in_seconds));
		}
		
		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"AnswerHearSee_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new AnswerHearSee_IntentionAction();
	}
}
