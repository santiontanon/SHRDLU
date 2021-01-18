class AnswerHearSee_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.hear")) ||
		    intention.functor.is_a(ai.o.getSort("verb.see"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		this.ir = ir;		
		let requester:TermAttribute = ir.requester;
		let best:string = null;
		let l:Term[] = [ir.action];
		if (requester == null) return true;

		if (ir.alternative_actions != null && ir.alternative_actions.length > 0) l = ir.alternative_actions;

		for(let intention of l) {
			if (intention.attributes.length==2 &&
				(intention.attributes[0] instanceof ConstantTermAttribute) &&
				(<ConstantTermAttribute>(intention.attributes[0])).value == ai.selfID) {

				if (intention.attributes[1] instanceof ConstantTermAttribute) {
					// Case where the target is a constant:
					if (intention.functor.is_a(ai.o.getSort("verb.see"))) {
						if (ai.canSee((<ConstantTermAttribute>(intention.attributes[1])).value)) {
							// If the object was not mentioned explicitly in the performative, add it to the natural language context:
							if (ir.requestingPerformative != null) {
								ir.requestingPerformative.addMentionToPerformative((<ConstantTermAttribute>(intention.attributes[1])).value, ai.o);
							}

							let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'yes'[symbol]))", ai.o);
							ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.timeStamp));
							ir.succeeded = true;
							return true;
						} else {
							if (best == null) best = "no";
						}				
					} else if (intention.functor.is_a(ai.o.getSort("verb.hear"))) {
						if (ai.canHear((<ConstantTermAttribute>(intention.attributes[1])).value)) {
							// If the object was not mentioned explicitly in the performative, add it to the natural language context:
							if (ir.requestingPerformative != null) {
								ir.requestingPerformative.addMentionToPerformative((<ConstantTermAttribute>(intention.attributes[1])).value, ai.o);
							}
							
							let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'yes'[symbol]))", ai.o);
							ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.timeStamp));
							ir.succeeded = true;
							return true;
						} else {
							if (best == null) best = "no";
						}				
					} else {
						// we should never get here...
						if (best == null || best=="no") best = "unknown";
					}
				} else {
					if (best == null || best=="no") best = "unknown";
				}
				
			} else {
				if (best == null || best=="no") best = "unknown";
			}
		}

		if (best == "no") {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'no'[symbol]))", ai.o);
			ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.timeStamp));
		} else {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'unknown'[symbol]))", ai.o);
			ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.timeStamp));
		}
		ir.succeeded = true;
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
